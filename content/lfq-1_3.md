# 无锁队列实践 (1/3) - 使用智能指针

本文讨论的是一些关于无锁队列的实践以及自己的 PoC.  个人认为,
无锁编程与有锁编程其实是两个相辅相成的概念, 应该在不同的场景进行适当的交替使用,
例如内存顺序 (memory order) 中的 *acquire-release* 概念, 其实和 `std::mutex`
互斥锁带来的效果和理念是相似的, 一个线程 *释放锁之前*
的所有内存读写事件必须对执行同一个临界区的另一线程 *获得锁之后* 可见,
这个语义在内存顺序和互斥锁之间非常一致, 但具体的实现机制不同, 如 Linux 中,
`pthread_mutex_*` 的实现主要是通过 futex 调用在用户空间的优化,
与基本的内核态线程睡眠/唤醒相结合, 而内存顺序很可能对应某些系统中内存屏障
(memory fence/barrier) 的 CPU 指令, 或者一些强顺序系统内置的同步行为.
有/无锁的相互讨论有助于更好的发挥物理机与操作系统的潜能.

但在此文及未来的一些讨论中, 本人主要关注以下三个方面:

* 解决 [ABA 问题](https://en.wikipedia.org/wiki/ABA_problem)
* 以 ABA 问题为基础, 如何合理回收/重用资源
* 有/无锁的实践中, 哪些手段较为通用, 可伸缩性较好, 是否有助于实现良好的 STM

三次讨论的主题大概为:

* 依赖智能指针的引用计数回收资源
* 使用 hazard pointer 回收/重用资源
* 探讨其他 state-of-the-art 的无锁队列实现

首先我们讨论无锁队列的时候必须要理解的是, 一系列的 *原子操作*
并不代表该临界区域的所有读写操作是 *原子* 的, 这也是开发者陷入 ABA
问题的一个诱因.  在并发编程中, 同步总是要相对应地消耗一定的性能和效率,
在无锁的环境下, 我们对有可能不一致的内存区域要进行相应的判断和重试.
现在我们来尝试写一版基于智能指针的无锁队列.

> **为什么使用智能指针?**  智能指针大部分情况使用 `std::memory_order_relaxed`
> 的内存顺序对内存块进行引用计数和资源回收,
> 这样我们在实现无锁结构时不需要过多考虑使用到 `delete`
> 后的内存块这样的悬挂指针问题, 就像一个没有环检测的迷你 GC.

我们只需要 `memory` 和 `atomic` 两个头文件, 一个提供智能指针的定义,
一个提供原子变量的定义.

```cpp
#include <memory>
#include <atomic>
```

队列节点的定义比较简单, 只用把对应的 `next` 指针换为 `std::shared_ptr` 类型.

```cpp
template <typename T>
class sptr_lfq {
protected:
    struct lfq_node {
        T data;
        std::shared_ptr<lfq_node> next;
        lfq_node() { /* nop */ }
        explicit lfq_node(const T& data) : data(data) { /* nop */ }
    };
// ...
```

私有成员也类似传统单线程队列的声明, 但是这里用到了一个叫 `dummy_node_`
的默认初始化的共享指针, 其指向一个无用的节点.  至于为什么之后会涉及到.

```cpp
// ...
private:
    // 节点数量.
    std::atomic_size_t siz_{0};
    // 头, 尾, 无用节点.
    std::shared_ptr<lfq_node> head_, tail_, dummy_node_;
};
```

队列的初始化需要分配一些用于节点的动态内存, 而析构函数可以使用默认的,
将析构交付给每个私有成员自己, 当然这么做是安全的.

默认将有关于复制和移动的构造函数和操作符重载函数都删除,
暂时可以不用讨论数据的复制移动这些问题.

获取队列长度的函数我使用的是 `std::memory_order_seq_cst` 的内存顺序,
因为考虑到我没有提供 `empty` 这样的接口,
所以就不模仿共享指针对引用数量使用宽松顺序的做法,
尽量让队列的读写状态对获取队列长度的行为高度可见.

```cpp
// ...
public:
    sptr_lfq() : head_(std::make_shared<lfq_node>()), tail_(head_),
        dummy_node_(std::make_shared<lfq_node>()) { /* nop */ }
    ~sptr_lfq() = default;

    sptr_lfq(const sptr_lfq&) = delete;
    sptr_lfq& operator=(const sptr_lfq&) = delete;
    sptr_lfq(sptr_lfq&&) = delete;
    sptr_lfq& operator=(sptr_lfq&&) = delete;

    // `load' 没有传参则默认是 `std::memory_order_seq_cst'.
    size_t size() const { return siz_.load(); }
// ...
```

接下来就是最关键的 *出队/入队* 接口了, 首先我们来看入队的实现.

> **为何不先讨论出队的实现呢?**  是的你可能觉得为什么会有这么傻逼的问题.
在入队的整个行为中只有 `tail` 这个指针是危险的, 可能因为它不再指向既定的尾节点,
导致 `next`..., (Maged M. Michael 称之为 *ABA hazard*).

*TODO*
