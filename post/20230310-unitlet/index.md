# 将 Kubernetes API 翻译成 systemd 操作

* 2023-03-10
* 💼

---

| 想法复杂度 | 实现难度 |
|:-----:|:----:|
|  3/5  | 1/5  |

自己在 Shopee 的工作中, 即使是最近很长一段时间做的分布式存储的项目, 或者是以前一些偏重 CRUD 的项目,
服务的部署都相当的野蛮:

* 平台服务的一组实例基本会独占一台 bare metal (例如 Go 服务配上各种 exporter/sidecar 进程)
* 对于一些有特殊用途的 bare metal, 甚至提供了 64 CPU + 200+ GiB memory + 50+ TiB disks 的配置
* 服务一般不期望有任何的资源隔离, 存活在一个简单的 cgroup 就可以了, 因为有的需要直接读写块设备
* 一个服务实例一般是个 systemd unit

目前集群管理的手段, 是将各个可能的操作写成了不同的 Ansible roles. 那么有没有什么办法, 将这种简单的服务调度的场景转换成使用
K8s 呢?

这样的好处就是:

* 许多 K8s 现有的功能可以实时地在各种平台中使用, 例如集群状态查询, pod 失败重试等等
* 能利用起 K8s 的 container logs 和 exposed metrics 等功能
* 可以做基于 image 的部署 (而且 image 不一定要遵循 OCI image layout)

## Virtual Kubelet

翻来翻去, 找到了 [systemk] 这个项目, 但是这个项目做的事情太多了 (volumes, secrets, configMap, emptyDir 等等),
而它底下基于的框架 [Virtual Kubelet], 用户只要实现 [`PodLifecycleHandler`] 接口, 就能假扮成一个 kubelet 并适配上
apiserver 的各种行为操作, 看起来很有望.

接下来就要关注 K8s 概念和 systemd 概念之间的静态对应关系:

* Pod: 一组 systemd unit
* Container: 一个 systemd unit
* Image: 可以直接忽略, 或者是某个服务的安装包
* Namespace: 也是一组 systemd unit, 在 pod 概念之上

Systemd unit 服务名遵循这样的命名规则:

```plaintext
unitlet.NAMESPACE_NAME.POD_NAME.CONTAINER_NAME.service
```

接下来就可以关注 pod 本身的生命周期了.

[systemk]: https://github.com/virtual-kubelet/systemk

[Virtual Kubelet]: https://github.com/virtual-kubelet/virtual-kubelet

[`PodLifecycleHandler`]: https://github.com/virtual-kubelet/virtual-kubelet/blob/v1.7.0/node/podcontroller.go#L47

## Introducing unitlet

我花了两天的时间, 用了 1k 左右的代码, 实现了 [unitlet] 这个项目. 整个项目分成了几个核心模块 (interface 的形式):

* Unit store, 存放 unit 数据的模块, 具体实现就是一个 file store, 将 systemd unit 文件存放在某个目录里
* Unit state, 即 unit 的运行状态, 具体实现就是 D-Bus 的一些操作
* Virtual Kubelet provider, 即 unitlet 本身, 内部是对 unit store 和 unit state 操作的组合

整个实现没有什么复杂的地方, 查询/创建/删除 pod 等变成操作 systemd unit 文件以及 systemctl 的各种命令就完事儿了.

一些未来可以做的事情:

* 实现 get container logs, 这个当时有点懒了, 可以转换成对 journalctl 的调用
* 实现 exposed metrics, 这个也是暴露相应的接口方法就可以了
* 将从 image registry 下载的功能包装成一个接口, 并可以简单实现成从某个 URL 下载并解压软件包的方式达到版本发布的目的
* 将我组的服务接入到公司的 K8s 平台去, 让服务部署更加的规范

[unitlet]: https://github.com/anqur/unitlet
