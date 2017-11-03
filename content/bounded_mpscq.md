# 有界 MPMC 队列的巧妙设计

之前解决一些并发问题的时候没有认真地考虑到数据结构的问题,
直到公司带我的导师和我提及了一些有关 Go 语言的 `chan` 的实现时,
我才意识到自己的问题可以分为很多细小的子领域.

目前遇到的并发问题是希望有一个支持 MPMC (multi-producer multi-consumer)
的队列, 并且希望使用无锁的结构来实现, 以防止多线程过多的被唤起/睡眠.

关于使用互斥锁实现的 MPMC 队列, 可以参考 Python 实用库中
[Queue](https://github.com/python/cpython/blob/master/Lib/queue.py) 的实现,
一个经典的由 互斥锁/条件变量 控制的十分适合编写任务机制的结构, 由于使用锁,
它还包含了线程安全的 *优先队列*, *LIFO* 等结构 (毕竟锁操作比较方便).

然而到了无锁的世界, 就很可能要重新从数据结构的设计思路上去考虑了.
类似 `std::list` 和 `std::deque` 有什么区别这样的问题,
如果是基于节点的链表式的队列, 在无锁实现中很容易发生
[ABA 问题](https://en.wikipedia.org/wiki/ABA_problem),
出队和入队两个过程的大部分代码块都要 *事务性* 地实现,
也就是说连续的原子步骤并不能保证指针检查, 节点插入,
头尾指针更新等连续过程的原子性, 而且很可能产生的副作用需要一定程度的回滚.

环形缓冲 (circular/ring buffer) 其实在很多业务场景中都是很重要的部分,
比如系统内核及套接字中用于 `send`/`read` 等的 kernel buffer 和 socket buffer
的具体实现就是一个环形缓冲, 它具有边界, 不像链表的容量容易扩展,
但是在并发编程中可以进行一种很微妙的改造, 使多个线程的读入和写入仅仅需要一次 CAS
操作, 并且保证了高度的一致性.  现在我们尝试实现一个非常基本的无锁 MPMC 队列.

## 元素

一个环形数组就是一个定长线性表, 使用取余操作防止遍历用的指针超出边界.
由于使用取余, 我们可以将此步骤优化成位操作: 数组长度取 2 的幂,
则某整数对该数组长度的取余操作可以优化为

```
seq % bufsiz == seq & (bufsiz - 1) iff bufsiz >= 2 && bufsiz & (bufsiz - 1) == 0
let mask = bufsiz - 1
```

线性表的元素类型由两部分组成, 一部分是用于检验读写位是否可用的 *序列值*,
一部分用于放置具体的数据.

```cpp
struct node_t {
    std::atomic_size_t seq;
    T data;
};
```

序列值具体有什么用, 我们之后分析.

## 成员

成员部分主要包括了缓冲的指针, 缓冲区长度, 用于取余操作的掩码, 以及头尾位置.
除此之外, 还使用了一些无用的字符串数组填充在其中, 具体原因也稍后分析.

```cpp
private:
    // 各种对齐.
    typedef typename std::aligned_storage<sizeof(node_t),
            std::alignment_of<node_t>::value>::type aligned_node_t;
    typedef char __cache_line_pad_t[64];

    __cache_line_pad_t pad0_{};

    // 缓冲长度, 
    const std::size_t siz_;
    const std::size_t buf_mask_;
    node_t* const buf_;

    __cache_line_pad_t pad1_{};

    std::atomic_size_t dequeue_pos_;

    __cache_line_pad_t pad2_{};

    std::atomic_size_t enqueue_pos_;

    __cache_line_pad_t pad3_{};
};
```

## ctor/dtor

构造和析构只有一小部分需要扩展解读的地方, 其他的部分比较好容易理解.

```cpp
template <typename T>
class bounded_mpmc_queue {
public:
    // 这里对每一个节点进行了强制对齐的操作, 原因一样在最后进行解释.
    explicit bounded_mpmc_queue(std::size_t siz)
        : siz_(siz)
        , buf_mask_(siz - 1)
        , buf_(reinterpret_cast<node_t*>(new aligned_node_t[siz]))
    {
        // 保证缓冲大小是 2 的幂, 加快取余操作.
        assert(siz >= 2 && (siz & (siz - 1)) == 0);

        // 初始化序列值.
        for (std::size_t i = 0; i < siz; ++i) buf_[i].seq.store(i,
                std::memory_order_relaxed);

        // 初始化头尾位置.
        dequeue_pos_.store(0, std::memory_order_relaxed);
        enqueue_pos_.store(0, std::memory_order_relaxed);
    }

    // 释放节点数组.
    ~bounded_mpmc_queue() { delete[] buf_; }
// ...
```
