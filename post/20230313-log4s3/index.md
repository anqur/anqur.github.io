# S3 as an Append-only Log Store

* 2023-03-13
* 💼

---

| 想法复杂度 | 实现难度 | 是否已实现 |
|:-----:|:----:|:-----:|
|  4/5  | 4/5  |   ❌   |

试想有这样一个用户的场景:

> 用户有个服务集群, 每一个服务实例都往本地某个目录或是标准输出打印日志, 但是它想在不改变代码的情况下, 将打印的日志上传到
> S3 怎么办?

这个场景中, 用户服务的眼里 S3 成了一个 append-only 的日志存储, 或者说, S3 成为了 Go 中 [`io.Writer`] 接口的实现.

```go
package io

type Writer interface {
	Write(p []byte) (n int, err error)
}

```

在不新增中间件的情况下如何解决这个问题呢?

[`io.Writer`]: https://pkg.go.dev/io#Writer

## 替换用户的日志文件

用户的日志文件可能存放在某个目录, 也可能只是简单的 stdout, 那么静态地替换日志文件 (用户配置新的日志路径,
重启一下服务进程), 或者是动态地替换 (比如用 [`dup2`] 拷贝一下文件描述符) 都是比较 trivial 的, 当然静态的做法安全一些些.

那么具体是拿什么文件去替换呢? 没错! 我们可以用 UNIX domain socket, 将用户写文件的行为转换成本地进程间的 TCP 通信,
在另一个进程中处理用户的日志上传, 也就是业务 sidecar 的模式.

[`dup2`]: https://linux.die.net/man/2/dup2

## S3 中存放日志的形式是怎样的?

### 尝试 #1: One log line per object

* 一条日志即一个对象
* 一个日志文件即一个 bucket

是的, 这个做法一听就不是很靠谱, 虽然一个 bucket 中的对象数貌似是不受限的, 但是即使是有一个定时任务每天去将一个 bucket
里所有的对象合并成一个大对象, [ListObjectsV2] 接口会非常非常缓慢, 定时任务得跑相当长的时间. 并且一个用户的 bucket 数往往有限,
也可能是个问题.

[ListObjectsV2]: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html

### 尝试 #2: One log line per part

* 使用 multipart upload 机制, 一条日志即一个 part
* 当 upload part 写到 10,000 个的时候, commit multipart upload
* 一个日志文件即一个 bucket

这种方案下, multipart object 就是日志上传的写缓冲, 那么一个对象的大小就很容易达到 10KiB 的量级, 并可缩小 bucket 内对象的数量.
但是, 由于 part 数量过多, commit 的时候目测会卡顿非常长的时间, buffer 的效果就非常的不明显, 甚至可能会拖垮 sidecar
的系统资源 (比如 pthread 没法 clone 新的线程).

### 最终方案: Write buffer

既然如此, 那么其实就应该像 [lumberjack] 所倡导的那样, 既然日志都要上传到云端, 那么 *按天 rotate 日志* 就是一个伪需求, 即
sidecar 也应该直接使用一个内存中的 write buffer, 如写满 15MiB 后上传到 S3 就是了, 这样实现起来也非常地简单.

甚至每一个 buffer 的上传可以用 multipart upload, 这样一个日志文件理论上就有 `15MiB * 10,000 ~= 146GiB` 的大小,
这个其实也是这篇 [Stack Overflow 答案] 的推荐. 用户还可以设定 bucket lifecycle 自动过期掉不用的日志.

[lumberjack]: https://github.com/natefinch/lumberjack

[Stack Overflow 答案]: https://stackoverflow.com/a/47580108/7248733

## 如何处理日志 rotate?

如果用户本身带有日志 rotate 的功能, 单监听一个文件铁定是不够的, 这个时候还是只能借助如 [go-fuse] 项目去 mount 一个本地的文件系统,
识别用户的拷贝或者 symlink 的行为, 转换成日志上传到一个新的对象的逻辑; 或者干脆就不修改目标的日志对象了, 无视掉用户的
拷贝/symlink 操作即可.

[go-fuse]: https://github.com/hanwen/go-fuse

## 后续

实现整个想法, 甚至是 PoC 应该会很花时间, 咱就先不折腾了.

业界其他相关的产品有:

* [Amazon Kinesis Data Firehose], 一款 ETL 的产品, 背后可支持 S3
* [Amazon Elastic Block Store], 即块存储, 这个接近于我司内部的 networked filesystem 的解决方案, 我觉得不是很优雅,
  引进了太多中间件
* Alibaba OSS 支持 [append upload] 的功能

[Amazon Kinesis Data Firehose]: https://aws.amazon.com/kinesis/firehose/

[Amazon Elastic Block Store]: https://aws.amazon.com/cn/ebs/

[append upload]: https://www.alibabacloud.com/help/en/object-storage-service/latest/upload-files-append-upload
