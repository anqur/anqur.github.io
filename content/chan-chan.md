# Chan Chan

嗯哼, 这篇文当然不是关于推荐 Buena Vista Social Club 那首脍炙人口的歌曲
[Chan Chan](https://www.youtube.com/watch?v=KODWcrncnUU) 的昂.

`chan` 作为通道是 Go 语言 CSP 模型中的重要组成部分, 我在学习一些 Go
语言的同步机制时, 偶然间发现 `chan chan interface{}` 这种同步的方式.  举个例子,
如果要原子地增加一个全局整型变量的值, 可以简单的使用一个互斥锁 `sync.Mutex`
保护临界区.  为了比较性能和内存使用情况, 引入 `testing` 模块帮助我们完成测试.

```go
import (
	"sync"
	"testing"
)
```

假设我们要原子自增的次数为一百万次, 并用不占用内存的空结构体 `struct{}`
作为同步需要发送的消息类型.

```go
const NUM = 1000000

type Msg struct{}
```

我们先实现一个使用互斥锁的 benchmark 帮助我们做比较.  顺带一提, `-race`
选项开启 race detector 的功能只支持 64 位机唔.

```go
func BenchmarkMutex(b *testing.B) {
	// sync.WaitGroup 避免我们再多用一条通道同步两个 goroutine.
	var wg sync.WaitGroup
	var mtx sync.Mutex

	n := 0
	wg.Add(2)

	for i := 0; i < 2; i++ {
		// 开启两个 goroutine.
		go func() {
			// 延迟 `wg' 的提醒.
			defer wg.Done()
			for i := 0; i < NUM; i++ {
				mtx.Lock()
				n++
				mtx.Unlock()
			}
		}()
	}

	wg.Wait()
}
```

所以 `chan chan interface{}` 到底是什么东西呢?  从字面上理解,
`chan chan interface{}` 是用于传输 `chan interface{}` 的通道.  直接想确实很晦涩,
其实用 C/S 模型的思路就很好理解了:

* 客户端通过 `chan chan interface{}` 发送一个 `chan interface{}` 给服务端,
* 服务端通过这个 `chan interface{}` 把回应信息发回给客户端

我们来瞥一眼这个 benchmark 的内容吧.

```go
func BenchmarkChanChan(b *testing.B) {
	var wg sync.WaitGroup

	n := 0
	wg.Add(2)

	// Request 通道.
	req := make(chan chan Msg)

	// 客户端.
	go func() {
		defer wg.Done()
		for i := 0; i < NUM; i++ {
			// Response 通道.
			res := make(chan Msg)
			// 发送这个 chan 给服务端返回回应.
			req <- res
			// 从回应中拿出信息, 在此不需要这个值所以抛弃.
			<-res
			n++
		}
	}()

	// 服务端.
	go func() {
		defer wg.Done()
		for i := 0; i < NUM; i++ {
			// 拿到用作回应的 chan.
			c := <-req
			// 回应一个空信息.
			c <- Msg{}
			n++
		}
	}()

	wg.Wait()
}
```

你可能在想为什么要这么麻烦呢?  在你的脑子蹦出更多的问题之前,
这里其实有一些事实需要澄清, 首先, 我们的 `chan chan interface{}`
已经在抽象的层面做了一个很大步伐的跳跃, 从各种文档和书籍中我们可以读到的,
并需要我们跟随步伐来理解的其实长这样:

* Go 语言中的 `chan` 最好用于单向传输, 甚至使用 `chan<-` 和 `<-chan` 标识方向,
可以说是标识 read/write-only 的属性
* `chan` 用于双工 (bidirectional) 操作被认为是不可取的
* 双向沟通可以使用两个 `chan`, 一个用于请求, 一个用于回应

而我们的 `chan chan interface{}` 其实就是第三点的变体罢了.
既然我们提到了第三点, 不妨试一试更好理解的 请求/回应 双 `chan` 的方式来进行同步,
也就是经典的 *ping pong* 或 *wiff waff* 的模型.

> 打乒乓球!

```go
func BenchmarkPingPong(b *testing.B) {
	var wg sync.WaitGroup

	n := 0
	wg.Add(2)

	ping := make(chan Msg, 2)
	pong := make(chan Msg, 2)

	// 定义球拍动作.
	racket := func(c1 chan Msg, c2 chan Msg) {
		defer wg.Done()
		for i := 0; i < NUM; i++ {
			m := <-c1
			n++
			c2 <- m
		}
	}

	// 球拍 1 从球桌的 ping 端打到 pong.
	go racket(ping, pong)
	// 球拍 2 从球桌的 pong 端打到 ping.
	go racket(pong, ping)
	// 往球桌的其中一端放入一颗球.
	ping <- Msg{}

	wg.Wait()
}
```

这里有一个非常非常重要的细节, 两个通道在此使用了 `make(chan Msg, 2)` 的构造方法,
给通道定义了容量为 2 的缓冲区 (通道默认 unbuffered), 这样在 放入/取出
消息的时候就没有堵塞的必要了, 也不会发生死锁 (想象一下协程的 yield 操作!).

最后, 以下是在我机子里跑出来的性能报告, 可以做个参考.

```bash
$ go test -bench . -benchmem
goos: linux
goarch: amd64
BenchmarkMutex-4        1000000000           0.06 ns/op        0 B/op          0 allocs/op
BenchmarkChanChan-4     2000000000           0.31 ns/op        0 B/op          0 allocs/op
BenchmarkPingPong-4     2000000000           0.27 ns/op        0 B/op          0 allocs/op
PASS
```

可见, `chan chan interface{}` 的效率一般比两者要低.

> 要你何用...

当然, 妙用还是有滴.

如果熟悉 C++11 中的线程间同步机制的话, 一定会知道 `std::future<T>` 这个结构,
它可以承载 `std::async()`, `std::packaged_task<R(Args...)>` 以及
`std::promise<R>` 三种机制的异步结果.  是的, `chan chan interface{}`
第一眼过去难道长得不像 promise 吗!  为此我写了一个基于它的 future/promise 库,
其实 50 行代码都不到.  下面是这个库的一个基本的例子, 看两眼应该可以理解
`chan chan` 是怎么被运用在其中的相信我.

```go
package main

import (
	"fmt"
	"time"

	"github.com/anqurvanillapy/profut"
)

func main() {
	p := &profut.Promise{}
	f := p.GetFuture()

	go func(p *Promise) {
		// 类似 C++11 中的 std::promise::set_value_at_thread_exit
		defer p.SetValue(42)
		time.Sleep(100 * time.Millisecond)
	}(p)

	f.Wait()
	fmt.Println(f.Get())
	// Output: 42
}
```

当然, 异常的处理和 promises chaining 所需的 `Then` 接口还有待实现, 可以在这个
[仓库](https://github.com/anqurvanillapy/profut) 里找到相应的代码.  `chan chan`
的使用先说到这吧.
