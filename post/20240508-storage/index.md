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

// ObjectID 对象 ID.
type ObjectID string

type ObjectStorage interface {
	// PutObject 上传数据, 获取对象 ID.
	PutObject(data []byte) (id ObjectID, err error)

	// GetObject 通过对象 ID 下载数据.
	GetObject(id ObjectID) (data []byte, err error)

	// DeleteObject 删除对象.
	DeleteObject(key ObjectID) error
}

```

我们注意到这个 object ID 是存储服务分配给我们的, 它可能长得像 `"cafebabe114514"` 这样的 无 意 义 的字符串, 所以用户看到这一串
ID 的时候, 它可能没法和自己关心的文件的内容联系起来, 但是这种方式对于对象存储的开发者来说是最好实现的
(后面讲存储的实现细节时会讲具体理由).

因为看不懂 object ID 的意义, 这时候用户会烦了:

### 用户需求: "我想上传时用什么文件名, 下载时用这个文件名下载"

这个时候, 我们就要引入 *文件名* 的概念了, 这里一般的云厂商都叫做 **object key**.

```go
// Package s3almost 接近 S3 的对象存储接口.
package s3almost

// ObjectKey 用户自己关心的对象的名字.
type ObjectKey string

type ObjectStorage interface {
	// PutObject 上传数据.
	PutObject(key ObjectKey, data []byte) error

	// GetObject 通过对象 key 下载数据.
	GetObject(key ObjectKey) (data []byte, err error)

	// DeleteObject 删除对象.
	DeleteObject(key ObjectKey) error
}

```

那么我们这回已经接近 S3 服务提供的接口了, 还差些什么呢?

### 用户需求: "我想要个类似文件夹的功能, 可能有重名的文件"

这里, 我们就要引入 *文件夹* 的概念了, 云厂商一般叫做 **bucket (桶)**.

```go
// Package s3 基础 S3 服务的样子.
package s3

// BucketName 桶名称.
type BucketName string

type ObjectKey string

type ObjectStorage interface {
	// CreateBucket 创建新的 bucket.
	CreateBucket(bucket BucketName) error

	// DeleteBucket 删除 bucket.
	DeleteBucket(bucket BucketName) error

	// ListBuckets 列出所有 bucket.
	ListBuckets() ([]BucketName, error)

	// ListObjects 列出某个 bucket 下的所有对象名.
	ListObjects(bucket BucketName) ([]ObjectKey, error)

	// 以下接口都是老接口加上新的 bucket 参数.

	PutObject(bucket BucketName, key ObjectKey, data []byte) error
	GetObject(bucket BucketName, key ObjectKey) (data []byte, err error)
	DeleteObject(bucket BucketName, key ObjectKey) error
}

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

一般的业务用户很难遇到这些场景, 但是实现的细节大同小异.

## 那么, 如何实现对象存储?

好了, 终于开始这个话题了! 如何实现一个对象存储呢? 也就是实现上面的 `ObjectStorage` 接口.

首先我们要从如何实现一个分布式系统开始说起.

首先, 平台提供给用户的服务一般有两种形态:

* 无状态 (stateless) 服务: 帮忙做请求的转发, 或者做简单的计算, 亦或是运行的时候会建立起一些缓存或内部状态,
  但服务挂掉失去这些状态是可以容忍的, 这样的一类服务. 例如:
    * 网关服务, 如 nginx
    * 缓存服务, 如各类 CDN
* 有状态 (stateful) 服务: 状态是持久化 (persistent) 的, 即服务挂掉以后重启, 状态会恢复成挂掉之前的状态, 这样的一类服务.
  例如:
    * 数据库, 如 MySQL
    * 存储, 如 S3

无状态服务的分布式太简单了, 直接横向扩容 (scale out) 部署多个实例, 用一个网关做做负载均衡 (nginx 加一条 upstream 或者
backup), 就了事了, 这是最简单的分布式, 也没人会真的讨论这种分布式.

有状态的分布式才是真正的挑战, 但是也没有想象中那么难, 遇到一个问题, 解决, 就完事儿了.

### 📁 最简单的有状态服务: 存放到内存或文件

不就是实现一下接口么, 简单, 当服务端接收到请求的时候, 分配一个 object ID (比如使用 UUID), 然后存到内存里面的一个 map
里头 (e.g. `map[ObjectID][]byte`) 不就行了.

但是放在内存里, 进程挂了就没了, 所以我们可以放到文件中去, 即:

* Bucket name 对应一个机器上的一个文件夹
* Object key 对应一个文件名

简简单单就能实现一个能用的服务了.

### 👀 单点故障: 这台机器/这个磁盘坏了怎么办? 复制!

应对这个问题, 我们可以把请求数据复制 (replication) 一份, 发送给另外一个备用 (backup, follower) 服务, 当主服务挂掉了,
我们可以利用 nginx 的 `backup` 参数 (directive) 自动的实现故障转移 (fail over).

这个时候, 我们就会思考, 是由用户主动往 *主服务* (leader, main) 和 *备服务* 去双写 (dual write), 还是用户只需要和主服务交互,
由主服务往备服务写数据呢 (代理写/proxy write)?

```plaintext
  Dual write       vs      Proxy write

User -----> Main        User -----> Main
  |                                  |
  |                                  v
  +-------> Backup                  Backup
```

考虑到用户的行为一般是不可信的, 如果用户 (或者我们提供的 SDK) 双写失败了, 这条数据就真没了, 所以一般会考虑代理写的方式.

代理写又有三种方式, 也就是 MySQL 主从备份里面常提到的几个概念:

* 异步 (asynchronous)
* 半同步 (semi-synchronous)
* 全同步 (fully synchronous)

理解起来也很简单:

* 异步

当用户的请求数据在主服务上落盘了 (写到磁盘上了), 就返回用户成功, 然后再由异步任务把数据发往备服务.
异步的方式缺点也很明显: 已经返回给用户成功了, 结果数据来不及异步发送给备服务就永久挂了, 那这块数据就确实没了,
用户会认为你返回了成功, 结果数据没了, 这就妥妥是平台的问题.

* 半同步

当数据已经保证发往备服务了, 就给用户返回成功. 这个时候, 备服务可能还没将数据落盘, 但是这时已经保证在备服务的内存里头了,
此时返回用户成功会比异步更安全, 但是时延会高一些. 真正会出现问题的时间区间在备服务收到数据但是没来得及落盘, 备服务挂了,
那这些数据就完全丢失了, 这种场景是非常非常少见的, 比如主备不在同一个机房, 主机房被核爆完全找不到数据了, 备机房忽然断电,
这个概率是非常非常小的.

* 全同步

等到备服务完全将数据也落盘, 才给用户返回成功, 这个比半同步明显更安全, 但是要求的时延也更高.

### 📔 操作 (operation) 是一种特殊的数据: 如何实现删除操作的复制? 日志!

当用户在主服务上面删除了一个对象, 我们要实现备服务上也要对应删除这个数据, 应该怎么实现呢? 这个时候, 我们就要引入
*日志* (journal, 或者叫 WAL, 即 write-ahead log) 的概念. 我们把操作 (注意, 仅仅只封装写操作, 读不需要管) 封装成一条条的日志,
发往备服务:

```go
package wal

type (
	BucketName string
	ObjectKey  string
)

// Op 即操作名.
type Op string

const (
	// OpPut 对象上传操作.
	OpPut Op = "put"
	// OpDel 对象删除操作.
	OpDel Op = "delete"
)

// WAL 写操作日志.
type WAL struct {
	Op     Op
	Bucket BucketName
	Key    ObjectKey
}

var _ = []*WAL{
	// 上传操作的日志例子.
	{Op: OpPut, Bucket: "hello", Key: "world.txt"},
	// 删除操作的日志例子.
	{Op: OpDel, Bucket: "hello", Key: "world.txt"},
}

```

WAL 还有一个好处, 就是它永远是 append only 不断追加写的一个数组, 数组上的操作顺序就是并发写确定下来以后的顺序, 所以 WAL
还能做并发顺序的最终仲裁.

假设我们选择半同步的方式, 并且支持 WAL, 那么一个用户的对象上传流程就变成了这样:

```plaintext
     5. Response OK
  +------------------+
  v                  |
User ------------> Main 
     1. PutObject   | ^
                    | |
 2. Send WAL & data | | 4. Replication OK
                    v |
                   Backup
                   |   ^
                   |   | 3. Store WAL
                    \_/  4. (Asynchronously) Store data
```

### 🚽 空间的节省: 日志不能无限长下去啊... 快照 (snapshot)!

WAL 太多的话, 我们最好是用一种手段, 将 WAL 序号对应的那些全量数据打成一个快照, 这样一台全新的备节点加入到集群之后,
它不用去从第 0 个 WAL 开始恢复数据, 而是可以从现有的快照和一个较新的序号为起点, 从快照追赶到最新的数据.

接着, 快照之前的 WAL 我们就可以安全地删除 (retention) 掉了.

### 🧠 角色与脑裂: 集群内角色的一致性是最难的挑战... Raft!

刚刚我们提到, 我们可以用 nginx 的 `backup` directive 去做 backup 的切换, 当主服务挂了, nginx 自动将用户流量导入到备服务上去,
但其实这有很大的问题:

* 此时, 用户的写请求全部倒向备服务, 备服务的事实角色 (actual role) 变成了 "主服务", 但是它内部配置的角色仍旧是 "备服务",
  产生了不一致
* 这个时候, 如果主服务忽然上线, 回到集群, 那么在备服务里新写入的数据同步不到主服务, 就变成了脏数据😈

这个主服务忽然上线的情况, 在事实上就产生了 "一个集群有两个主服务" 的情景, 这就是我们所说的 **脑裂** (split brain).
脑裂只是一种问题的现象, 实际上整个大的问题, 是我们要实现一个真正能用的 **故障转移** (fail over) 机制.

在双副本 (dual replica, 也就是主从两个角色) 的场景下, 低成本高效率地实现故障转移其实很简单, 这个原则就是:

> 尽量人为干预, 少用自动化机制.

具体方案:

1. 使用一个叫 **周期/term** 的概念, 一个自增的数字, 去表示历史上角色切换的次数
2. 当主服务挂掉时 (或者网络不可用了一段时间), 要 **永远将主服务踢出集群服务列表**, 这点其实 nginx 是做不到的 (没法实现自动将
   upstream 踢出去), 这里需要自己开发一些额外手段
3. 确定了主服务永远被踢出集群后, 人为设置备服务为新的主服务, 并且 term 加 1; 这里只是一个角色的设置, 实际上新的数据已经往备服务上读写了,
   备服务是事实上的 "主服务" 了
4. 部署新的服务进程, 当作全新的备服务加入到集群中, term 要和新的主服务一致
5. 之后, 如果老的主服务意外加入集群, 因为 term 不同, 你很容易识别它并将它下线, 并且它已经不在网关的 upstream 列表里头了,
   用户的流量不会进入

好麻烦啊, 确实很麻烦, 这里需要一个系统性的算法才能 cover 住这么麻烦的流程, 不然的话, 如果你违反我说的原则,
凭借自己的理解造出一堆自动的算法做角色切换和故障转移, 那么脑裂真的会是分分钟的事情...

这个算法是什么呢...? **Raft**!!! Raft (或者其他的共识算法, 比如 Paxos) 本质上就是把这几个事情给做了:

* WAL 的复制
* 角色切换和故障转移

没了, 然后我们调一调开源库就能用了, 具体算法的细节我们留作以后再回头细嚼.

借用 Hashicorp 的 Raft 库, [创建一个 Raft 节点], 需要提供以下接口的实现:

* log store: WAL 要存哪里, 一般可以存到本地文件, Hashicorp 有提供可用的实现
* stable store: Raft 元数据 (比如 term) 要存哪里, 一般可以存到一个本地的 KV store, Hashicorp 有提供可用的实现
* snapshot store: 快照要存哪里, 一般可以存到本地文件, Hashicorp 有提供可用的实现
* transport: 集群的各个节点信息以及对应的网络通道, Hashicorp 有提供可用的实现
* FSM (finite state machine/状态机): WAL 发送过来了以后, 要怎么把操作重现一遍的逻辑, 这里就是业务逻辑了

所以我们发现, 只需要提供一个 FSM 的实现就好了, 救命啊, 好简单啊.

关于这个库值得注意的是:

* 这个库只提供了类似 `GetLeader` 这样的查询方法, 所以当故障转移发生的时候, 用户的请求怎么转移到正确的 leader
  上, 这块的逻辑是要自己编写的
* 加入新角色等等集群管理的方法, 库里面都是有提供的, 但是暴露成 HTTP API 或者 RPC, 这个也需要自己简单封装一下...

引入了 Raft 以后, 有一些额外注意的点:

* 一般我们是三节点部署的方式, 1 主 2 从, 这个时候成本就变成 66% 了, 成本极高
* 只有一台主服务能接收写请求, 但其他从服务是可以考虑接收读请求的, 只要牺牲一定的一致性

[创建一个 Raft 节点]: https://github.com/hashicorp/raft/blob/49bd61b66666fa76cb23fa81897e350f6e9b75de/api.go#L488

### Scalability: 主服务就一台, 磁盘顶多几百 TiB 不够用啊... 分片 (partitioning)!

TODO
