# Python 中 GC 导致的内存溢出

通常谈到内存溢出时, 且不说没有使用 `free` 这个 syscall 将 heap 内存归还给 OS
的情况, 像 Python 这样有 GC 且 VM/runtime 沉重的语言中, 没有及时删除引用,
或者在 C 语言中 heap object 的生命周期过长, 这些 *存活过久的内存* 所导致的溢出,
也算是一种老生常谈啦.

此文所讲的是另一种情况, 足以让你思考一个问题: *GC 如此聪明, 反被聪明误咋办?*

## 什么情况?

在描述这个情景之前, 我先注明一下文章一大部分皆参考了此篇
[博文](https://blog.nelhage.com/post/three-kinds-of-leaks/), 但是作者用到的工具
`guppy` 自从 2013 年就没再维护了, 安装时跑出了语法错误...  看着是个很受欢迎的
profiling 工具怎么就没人接手维护了呢, 难道 Pythonista 们都对性能不讲究 *:(*?
开个玩笑啦, 优秀的 profiler 还是很多的, 如 `memory_profiler` 和 `psutil` 等,
但我选择了 DIY, 因为官方和 OS 的工具足够了.
