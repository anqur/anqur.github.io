# 分布式存储, 你懂吗?

* 2024-05-08
* 💼

本文写给 Mirava 宝宝做行业科普, 另外也是我对这两年工作的一个小总结.

这个标题过于搞事情, 所以实际上这篇文章更好的一个标题是:

> 分布式存储, 太简单了!

## 什么是存储?

首先我们要清楚什么是存储, 以及为什么会有不同的存储形态, 以及用户的需求都是什么样子的.

### 最原始的用户需求: "我只想要一个存文件的服务"

这就是最原始的存储需求, 这样的存储我们一般提供叫做这种概念的服务:

* **Object storage/对象存储**

对应的行业产品:

* 公有云产品: S3 (AWS, 对象存储的事实标准), COS (腾讯云), OSS (阿里云), OBS (华为云), etc.
    * COS, OSS, OBS 等其他云服务厂商使用的接口一般和 S3 是兼容的
* 开源方案: Ceph, MinIO, etc.
    * 接口同样和 S3 兼容

意味着, 我给用户提供一个存放 object/blob 的裸数据块存储服务, 用户可以做这些事情, 以及这些 "事情" 的对应类型签名:

```go
// Package nots3 即 not S3, 最原始的对象存储服务接口, 不太符合绝大部分用户需求.
package nots3

// PutObject 上传数据, 获取对象 ID.
func PutObject(data []byte) (id ObjectID, err error)

// ObjectID 对象 ID.
type ObjectID string

// GetObject 通过对象 ID 下载数据.
func GetObject(id ObjectID) (data []byte, err error)

// DeleteObject 删除对象.
func DeleteObject(key ObjectID) error

```

我们注意到这个 object ID 是存储服务分配给我们的, 它可能长得像 `"cafebabe114514"` 这样的 无 意 义 的字符串, 所以用户看到这一串
ID 的时候, 它可能没法和自己关心的文件的内容联系起来, 但是这种方式对于对象存储的开发者来说是最好实现的
(后面讲存储的实现细节时会讲具体理由).

因为看不懂 object ID 的意义, 这时候用户会烦了:

### 用户需求: "我想上传时用什么文件名, 下载时用这个文件名下载"

这个时候, 我们就要引入 *文件名* 的概念了, 这里一般的云厂商都叫做 **object key**.

```go
// Package almosts3 即 almost S3, 接近 S3 的对象存储接口.
package almosts3

// ObjectKey 用户自己关心的对象的名字.
type ObjectKey string

// PutObject 上传数据.
func PutObject(key ObjectKey, data []byte) error

// GetObject 通过对象 key 下载数据.
func GetObject(key ObjectKey) (data []byte, err error)

// DeleteObject 删除对象.
func DeleteObject(key ObjectKey) error

```

那么我们这回已经接近 S3 服务提供的接口了, 还差些什么呢?

### 用户需求: "我想要个类似文件夹的功能, 可能有重名的文件"

这里, 我们就要引入 *文件夹* 的概念了, 云厂商一般叫做 **bucket (桶)**.

```go
// Package s3 基础 S3 服务的样子.
package s3

// BucketName 桶名称.
type BucketName string

// CreateBucket 创建新的 bucket.
func CreateBucket(bucket BucketName) error

// DeleteBucket 删除 bucket.
func DeleteBucket(bucket BucketName) error

// ListBuckets 列出所有 bucket.
func ListBuckets() ([]BucketName, error)

// ListObjects 列出某个 bucket 下的所有对象名.
func ListObjects(bucket BucketName) ([]ObjectKey, error)

// 以下接口都是老接口加上新的 bucket 参数.

type ObjectKey string

func PutObject(bucket BucketName, key ObjectKey, data []byte) error
func GetObject(bucket BucketName, key ObjectKey) (data []byte, err error)
func DeleteObject(bucket BucketName, key ObjectKey) error

```

当我们成功上传一个对象后, 可以通过这个 object URL 进行访问了:

```plaintext
https://my-own-s3.com/my-bucket/mygo.avi
```

至此, 基础的 S3 服务的接口就是长这个样子了, 值得注意的是, 上面的函数名字和 S3 是一模一样的, 可以自行搜索 AWS S3 文档看看真实的
API 是长什么样子的. 例如:

* AWS S3 原始的 RESTful API 文档:
  [GetObject - Amazon Simple Storage Service](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)
* AWS S3 Go SDK 代码:
  [GetObject - aws-sdk-go-v2](https://github.com/aws/aws-sdk-go-v2/blob/d7a70490838a3fba41d2d854394e74270e1c7266/service/s3/api_op_GetObject.go#L113)

### 其他对象存储需求

对象存储的需求非常非常多, 例如指定 `Content-Type`, user-defined metadata 等等等, 但这里有些值得关注的点:

* Endpoint, region, client ID

这些额外的概念都和 *"我的数据都存在哪里"* 有关, 很好理解:

1. Endpoint: 云服务厂商的服务总地址
2. Region (也叫 availability zone, AZ, bucket location 等): 服务的区域, 比如 `中国西南-1`, `us-west-2` 这样的标记,
   可以理解为厂商的机房位置
3. Client ID  (也叫 tenant ID, username 等等等): 就是你在云服务下面的账号名称

云厂商为了方便管理各个用户的数据分布, 以及用户可能有就近访问的需求, 所以额外设置了这些的概念.

* Bucket 和 object prefix

思考这么一个问题, 既然我 bucket 可以用做文件夹区分, 那么我对象名称有特殊的前缀不也可以区分吗?
例如上面我们上传的 `mygo.avi` 文件, 我是否可以这样:

```plaintext
https://my-own-s3.com/my-bucket/my-files/my-favorites/mygo.avi
```

这个时候, 对象的组成是这样的:

1. Endpoint: `my-own-s3.com`
2. Bucket name: `my-bucket`
3. Object key: `my-files/my-favorites/mygo.avi`

这么做是完全合理的, 但是这个做法的缺点也很质朴: S3 以及大部分云服务仅支持对 bucket 的一级索引, 如果要按照对象的 object
prefix 进行筛选, 虽然云服务厂商提供了对应的接口参数, 但实际上它只能复杂度 `O(n)` 地扫描 bucket 下面所有的 object key...

* 追加写, 随机写? 比如我想保存一个日志文件, 通过追加的方式不断上传数据到同一个文件?

不好意思, S3 不支持这个功能. 不过阿里云 OSS 支持这个功能, 需要用它自己提供的 API.

* (More questions and headache here...)

所以你这时候就发现了, 如果要继续往下深究, 我们可能得需要一个和 UNIX 文件系统一样的服务了!

### 对象存储总结

一些存储的论文里面会提到存储的特征, 以及性能评估的核心要点:

* **Namespacing**: 命名空间, 即类似文件夹一样, 能索引文件, 有目录树
* **Sequential read/write**: 顺序读写
* **Random read/write**: 随机读写

那么对象存储的特征就是:

| 特征               | 是否支持                                          |
|------------------|-----------------------------------------------|
| Namespacing      | ❓ 仅支持 bucket 的一级索引, 不支持完整目录树                  |
| Sequential read  | ✅ 可以通过传入 `Range` 参数选择读取的数据范围                  |
| Random read      | ✅ 同上                                          |
| Sequential write | ❌ 只支持整体文件写 (whole-file write), 第二次写需要重新覆盖整个对象 |
| Random write     | ❌ 同上                                          |

那么这类特征适合什么样的用户和场景呢?

* **电商, 视频平台** 等: 存放图片 (买卖家秀, 商品预览图等), 视频, 直播的片段等等内容文件
* **AI**: 存放模型文件等
* **备份**: 数据库, 日志, 私密文件等等

但是对象存储有这么多的缺点, 这些缺点又对应了哪些没法满足的用户需求呢?

## 特殊的存储需求: 文件存储

文件存储其实是很特殊的需求, 因为说句实话, 你很难想象得出来一定要 *完整目录树* 又要 *随机写* 的用户场景. 当然,
这里会列出来所谓特殊的需求都是长什么样子:

* 协同写作: 每个人协同编辑同一个文件, 编辑任意位置 (即 *随机写* 的功能)
* AI 训练: 挂载一个网络文件系统, 扩充训练机容量, 将原本 AI 训练框架的文件目录操作 (即 *完整目录树* 的功能) 换成网络文件系统的操作,
  并且可能存在文件的随机读写

这个时候, 我们的存储提供这种概念的服务:

* **File storage/文件系统**, 或者 **network filesystem/网络文件系统**

### 文件存储的接口: Linux VFS

文件存储需要提供的接口一般是要和 Linux VFS 兼容的, 也就是用户需要挂载一个新的文件系统到某一个目录, 不像对象存储那样只需要和云服务通过
RESTful API 进行交互.

在这个年头, 提供一个 Linux VFS 实现的难度很高, 你需要用 C 写一个 Linux driver, 并且很难调试. 当然, CephFS (即 Ceph
内部提供的文件系统客户端) 这个奇葩玩意不仅仅是个 driver, 而且还贡献到 kernel 代码去了, 并不是类似动态内核模块那样让用户更有选择更灵活的方式...
没有点钱和背景的情况下, 自己写 VFS 实现是不现实的.

但是我们还有一个选择, 即提供 FUSE (userspace filesystem) 实现, 虽然它更 💩, 但是能跑就行. 简单来说, 提供一个 FUSE 实现,
需要实现多达 30 多种方法, 纯纯的体力活. 详见以下接口定义:

[go-fuse `RawFileSystem` interface](https://github.com/hanwen/go-fuse/blob/7b4f97c3577b3b799babe8a6cf3eebe41dde7193/fuse/api.go#L314)

文件存储完美符合全部存储特征:

| 特征               | 是否支持                                        |
|------------------|---------------------------------------------|
| Namespacing      | ✅ 由 dentry (directory entry) 的概念实现          |
| Sequential read  | ✅ `open` 获得文件描述符后, `read`/`write` 等系统调用直接读写 |
| Random read      | ✅ 同上                                        |
| Sequential write | ✅ 同上                                        |
| Random write     | ✅ 同上                                        |

### 网络文件系统是怎么使用的呢?

既然网络文件系统是一个 VFS 实现, 那么它和本地的文件系统使用并无差异:

```bash
# 假设当前本地没有东西.
$ ls /mnt/my-network-files/

# 假设我们有一个文件系统的客户端, 后台开启并且挂载在随便一个地方.
$ nohup ./my-own-network-fs --mount /mnt/my-network-files &

# 这时候就有网络上的内容了.
$ ls /mnt/my-network-files/
mygo.avi    my-favorites/
```

### 网络文件系统的产品

我用的多的都是些开源的完全基于 FUSE 的精简方案, 例如:

* JuiceFS
* SeaweedFS

当然还有刚刚提到的 Linux 内置的奇葩玩意 CephFS.

但是如果你去看云厂商提供的网络文件系统方案, 一般使用了这些很古老的协议进行对接:

* SMB
* NFS

我的建议是这两个古早玩意应该早点扬了, 不用多去了解.

## 更特殊的存储形式: 块存储

块存储, 或称网络块设备 (network block device) 是更特殊的存储形式.

回想以下文件存储的场景特性:

* 接口基于 Linux VFS
* 当用户 A 打开网络文件系统客户端, B 也打开客户端, A 和 B 都能看到网络上有一个文件叫 `mygo.avi`, 即共享性

试想一下这样的存储产品:

* 接口是裸的块设备, 例如 `/dev/my-network-disk`, 甚至没有搭载文件系统
* 当 A 打开存储客户端时, 看得到某个位置有一串数据, 但是 B 打开存储客户端, 看不到这串数据

没错, 这就是块存储, 它不存在数据共享的特性, 性能会比文件存储高出几个数量级. 但它的用户场景是啥呢? 说来也非常偏门:

* 提供给虚拟机平台作为存储使用, 使虚拟机磁盘理论可到 PiB 级别大小
* 作为其他基础设施平台的存储底座, 如 RDS (高可用的数据库服务) 等等

一般的业务用户很难遇到这些场景.

## 如何实现对象存储?

TODO
