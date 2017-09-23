# C++11 风格的迷你任务队列

最近在看
[Learning Concurrenty Programming in Scala](https://www.packtpub.com/application-development/learning-concurrent-programming-scala)
这本书, 起因虽然不是对 Scala 有着强烈的好奇心, 而是因为 Scala
标准库和社区中有着大量优秀的, production-ready 的并发编程工具和实践, 譬如
`Future` 和 `Promise` 这样的跨线程的延时/同步结构, 还有 `STM ` (软件事物内存),
`Actor` 这样的利器, 当然由于依赖 JVM, 原子变量等特性也可以轻松使用 (有种在讨论
Clojure 的错觉).  但是 Scala 本身的 `Option` 类型/模式匹配, *by-name parameters*
这样的特性简直让人有种在写 Rust 的快感, 所以为了学习高级并发结构和工具来学习
Scala 算是不错的选择.

![future-mask-off-meme](https://pics.me.me/mask-on-fuck-it-mask-off-percocets-molly-percocets-sounds-18503717.png)

*s/o to Future!*

书内的第二章提到了一些 Java 线程和监视器的一些基本操作, 虽说介绍的是 Java
中一些基本的线程同步原语, 但是结合 Scala 的语言特性,
我们可以用少量代码实现一些抽象设计, 如 worker pool:

```scala
import scala.collection._

object SynchronizedPool extends App {
  // 不改变 `tasks' 的引用对象, 所以可以用 `val' 声明.  `() => Unit`
  // 即任务闭包的签名.
  private val tasks = mutable.Queue[() => Unit]()

  object Worker extends Thread {
    // 成为守护线程.
    setDaemon(true)

    def poll() = tasks.synchronized {
      // Java 线程的 wait 原语, 因为使用了 `tasks.synchronized`, wait
      // 能保证线程不再持有内置锁, 直到线程再次被唤起.
      while (tasks.isEmpty) tasks.wait()

      // 同 Rust, 函数中的最后一个表达式的返回值将作为函数返回值, 但是 Rust
      // 中用分号区分, Scala 没有.
      tasks.dequeue()
    }

    override def run(): Unit = while (true) {
      val task = poll()
      task()
    }
  }

  // Scala 的 by-name parameter, 将函数体本身包裹为参数名 body 并标记返回值.
  def async(body: => Unit): Unit = tasks.synchronized {
    tasks.enqueue(() => body)
    tasks.notify()
  }

  Worker.start()

  // `log' 是书中提供的打印线程信息和自定义字符串的函数.
  async { log("Hello") }
  async { log("World") }

  Thread.sleep(100)
}
```

代码中的两个插入到队列中的任务即 `async { log("Hello") }` 和
`async { log("World!") }`, 所以实际的调用过程可以算是 `() => body => Unit`.
这一段代码的设计算是比较优雅的, worker 线程没有任务时使用 `wait` 避免忙等,
防止对 CPU 时间片的滥用.  虽然在线程较多的情况,
线程的睡眠状态会导致大量的栈空间用作线程状态的记录, 潜在地浪费内存空间,
但暂时不需要考虑这个问题.  除了函数被作为第一公民, 函数的签名还能被
`mutable.Queue` 进行严格定义 (目测是泛型; 毕竟是静态类型语言嘛).

总结成以下几点:

* `synchronized` 内置锁保护任务队列的出入队
* 守卫线程
* `wait` 和 `notify` 控制线程睡眠/唤起
* 任务的类型为函数闭包

说了那么多, 让我们来试试把它写成 C++ 的风格.  把以上几点转换为 C++ 的语言:

* `std::mutex` 互斥锁保护任务队列, 以及 `std::lock_guard` 或 `std::unique_lock`
两种风格的上锁和解锁
* C++ 的守护线程目测就是 `std::thread::detach` 吧嗯
* UNIX 中的条件变量实现睡眠/唤起
* `std::function` 包裹任何 `Callable` 结构

首先, 整理一下我们需要的头文件:

```cpp
#include <iostream>
// 双端队列, 防止未来任务数量太大造成的内存分配瓶颈.
#include <deque>
// `std::function' 的相关定义.
#include <functional>
#include <thread>
#include <mutex>
// C++11 的条件变量, 暂时避免使用 OS 中的条件变量原语.
#include <condition_variable>
#include <chrono>
```

一些重要的变量, 如互斥锁等, 应该定义在全局中.

```cpp
std::deque<std::function<void()>> tasks;    // 任务队列, 默认使用 void()
                                            // 这个签名, 即参数和返回值都为
                                            // void.  在此注意一下 C/C++ 的
                                            // void 和 unit type 是有区别的.

std::mutex t_mtx;                           // 互斥锁
std::condition_variable cv;                 // 条件变量
```

现在可以开始设计我们的 `worker` 类了.

```cpp
class worker {
public:
    // 使用默认的 ctor 和 dtor.
    worker() = default;
    ~worker() = default;

    // 复制和移动 ctor 也使用默认, 在此不多声明; 创建线程会调用到这些 ctor.

    // 添加 Callable 属性, 直接装入此类创建线程即可.  默认执行任务轮询.
    void operator()() { while (true) poll(); }

    // 添加一个任务.
    void
    push_back(const std::function<void()>& f)   // 允许接受 lambda 字面量
    {
        {
            std::lock_guard<std::mutex> lk(t_mtx);
            tasks.push_back(f);
        }
        // 提醒所有 worker.  等待互斥锁的释放后再通知,
        // 避免被通知的线程再次进入阻塞的状态.
        cv.notify_all();
    }

    // 让一个任务出列.  和 C++ 的一些标准接口不同, 这里的 `pop_front`
    // 会返回该元素, 而 C++ 标准接口一般返回 void.
    std::function<void()>
    pop_front()
    {
        std::lock_guard<std::mutex> lk(t_mtx);
        auto ret = tasks.front();
        tasks.pop_front();
        return ret;
    }

    // 轮询队列中的任务.
    void
    poll()
    {
        // std::condition_variable 只接受 std::unique_lock.
        std::unique_lock<std::mutex> lk(t_mtx);

        // 等待队列中元素不为空.  这里提供了一个 lambda 函数来进行循环检查,
        // 所以不需要用 while 判断来包裹 `cv.wait` 来防止虚假唤醒的发生.
        cv.wait(lk, [&]{ return !tasks.empty(); });

        lk.unlock();

        // 执行任务.
        auto t = pop_front();
        t();
    }
};
```

嗯哼, 现在我们就可以测试 worker 能否正常的运作了, 可以写个简单的测试程序:

```cpp
int
main(int argc, const char *argv[])
{
    worker w;

    // 直接开启这个线程, 一开始目测会进入 cv 的等待.
    std::thread t1(w);

    // 装入任务.  这里不使用 `std::endl` 的原因是它会强制进行 flush 操作,
    // 导致输出的字符串可能会拼接在一起而不是独占一行.
    w.push_back([&] { std::cout << "good\n"; });
    w.push_back([&] { std::cout << "luck\n"; });

    // 等待 420 毫秒后再次装入任务.
    std::this_thread::sleep_for(std::chrono::milliseconds(420));

    w.push_back([&] { std::cout << "have\n"; });
    w.push_back([&] { std::cout << "fun\n"; });

    // 等待线程结束.
    t1.join();

    return 0;
}
```

编译时我没有使用优化, 直接链接一个 `pthread` 库完事.

```bash
$ g++ worker.cc -std=c++11 -lpthread
```

执行情况可以预见, 输出了两行文字后, 等待 420 毫秒再输出两行, 接着进入等待
(睡眠).  让我们检查 `a.out` 进程的资源消耗情况:

```bash
$ top -p `pgrep a.out`
```

一般而言, 当进入睡眠时可以见到 `a.out` 的 CPU 占用率是 0% 的.
我们的任务队列到此就完成的差不多啦!

这里有两个可以延伸的点:

* 为什么不使用 `t1.detach()`?  说好的守护进程呢?
* 可以不使用条件变量使线程睡眠/唤起吗?

关于第一个点, `t1.detach()` 让 worker 线程独立运行后, 我怀疑主线程的结束导致了
`cv` 变量的析构, 接着导致 worker 线程的结束.
实际情况中也是当最后两行文字输出完毕后, 进程便立即退出了.

第二个点的话, 我们可以使用 `std::this_thread::yield()` 的接口,
搭配队列的长度实现睡眠, 队列的长度可以用 `size` 接口用互斥锁跟踪,
也可以用外部的一个原子变量来优化性能.  轮询的循环可以写成
`while (t_siz.load() == 0) std::this_thread::yield()` 来使线程挂起.
但是这样写的坏处便是会消耗过多的 CPU 时间片,
因为本质上并不是一个订阅/发布的工作方式.
