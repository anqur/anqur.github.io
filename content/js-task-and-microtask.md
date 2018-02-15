# 初探 JavaScript 中的 task 和 microtask

农历新年第一天, 新春大吉了!

之前使用 `setjmp.h` 结合对 `%rsp`/`%esp` 栈指针寄存器的直接操作制作过一个
asymmetric coroutine 库 [acoro](https://github.com/anqurvanillapy/acoro),
不过说实话机制非常不成熟, 可能都算不上 asymmetric...  主要是对 coroutine
的简单调度算是有了一个浅层次的认识.  这篇文主要是初探 ECMAScript 6 标准下的 task
和 microtask 机制, 但是具体标准以及 spec 细节我还未深入阅读, 先从简单例子看起.
更多详细内容请参考
[此文](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/),
以下内容也做了大量参考.

什么是 JavaScript 的 task 和 microtask 呢?  其实一切都得从大佬 Jake Archibald 于
2015 年的一篇文章 (上述的链接) 和上星期他在推特发的
[quiz](https://twitter.com/jaffathecake/status/963007466471677953) 说起,
但我们不妨先来看看这个更简单的 quiz 作引导:

```js
setTimeout(() => console.log(1), 0)
console.log(2)
```

上述代码输出的数字序列是什么呢?  答案应该是很好得到的.  这里我们就可以引申 task
这个概念了, task 的水平抽象层次是比较深的, 意思是涉及到 JS 内部如延时和 DOM
操作等等深层次的同步行为的工作, 在 task 之间浏览器是有可能更新渲染的.  可以想象
event listener, parsing HTML 乃至脚本执行等工作应属于 task 的范畴.
所以代码执行步骤如下:

1. 将脚本的执行放入 task 队列中
2. 将 callback `() => console.log(1)` 放入 task 队列中
3. 在 JS 调用栈中执行 `console.log(2)`
4. task 队列中的脚本执行结束, 出列
5. 从 task 队列取出相应 callback, 执行 `console.log(1)`

答案即是 `21`.  换而言之, 我们可以认为是将 `() => console.log(1)` 这个闭包作为
coroutine 传入主线程调度器, 当主 coroutine (caller) 结束后将该闭包进行 resume
恢复执行.  了解这一点后, 我们就可以继续探讨 microtask 了, 来看以下 quiz:

```js
setTimeout(() => console.log(1), 0)

Promise.resolve()
  .then(() => console.log(2))
  .then(() => console.log(3))

console.log(4)
```

答案也不难猜, 但是 microtask 是怎么运作的呢?  首先 microtask 顾名思义是比 task
水平层次要浅的抽象, 通常在每个 task 之后运行 (别忘了 JS 栈上的脚本执行也算是一个
task), 它处理异步行为时比开启一个新的 task 要轻, 如 `Promise` 的 callback.
这段代码的执行步骤是这样的:

1. 将脚本执行放入 task 队列
2. 将 `setTimeout` 的 callback 放入 task 队列
3. 将 `Promise.resolve().then()` 的 callback 放入 microtask 队列
4. 在 JS 调用栈中执行 `console.log(4)`
5. task 队列中的脚本执行结束, 出列
6. 将 microtask 队列的第一个 callback 出列, 执行 `console.log(2)`, 返回
`undefined`
7. 将第二个 `.then()` 对应的 callback 放入 microtask 队列
8. 将此 callback 从 microtask 中出列, 执行 `console.log(3)`
9. 从 task 队列取出 `setTimeout` 相应 callback, 执行 `console.log(1)`

答案即是 `4231`, 但是这个例子是比较特殊的, 因为 `Promise.resolve()` 立即返回了
resolve 了的相当于没有内在逻辑的 `Promise`, 从而直接触碰了 `.then()` 而引起
microtask 的入列操作, 所以以下的 quiz 就更有意思了:

```js
new Promise(resolve => {
  resolve(1)
  Promise.resolve().then(() => console.log(2))
}).then(n => console.log(n))

console.log(3)
```

当然, 先留下十分钟的思考时间... 时间到!

代码的执行步骤是这样的:

1. 脚本执行入 task 列
2. `new Promise()` 内部执行 `resolve(1)` 语句
3. 遇到 `Promise.resolve().then()` 将 `() => console.log(2)` 放入 microtask 列
4. 遇到 `.then` 将 `n => console.log(n)` 放入 microtask 列
5. 退出 `new Promise()` 语句块, 执行 `console.log(3)`
6. 脚本执行从 task 出列
7. microtask 执行出列操作, 执行 `console.log(2)`
8. microtask 执行出列操作, 执行 `console.log(1)`

答案即是 `321`, `new Promise()` 的语句块按顺序执行导致以上的结果.  既然如此,
那么如何在保留 `resolve(1)` 语句的同时让 `n => console.log(n)` 先进入 microtask
队列呢?  一个巧妙的办法如下:

```js
new Promise(resolve => {
  Promise.resolve().then(() => {
    resolve(1)
    Promise.resolve().then(() => console.log(2))
  })
}).then(n => console.log(n))

console.log(3)
```

这样子遇到第二行的 `Promise.resolve().then()` 后, 把其 callback 放入 microtask
列, 接着就能把 `n => console.log(n)` 放入 microtask 列中了, 而第一次放入的这个
callback 的效用只是延缓了 `() => console.log(2)` 的入列而已,
虽然浪费了一个临时的对象.

这一个实践理解起来不难, 也算是我对非抢占式调度学习中的一些小插曲,
最大的意义其实在于不再停留在那种 "JS 引擎遇到耗时长的工作就 yield" 的错觉当中,
JS 的执行是有迹可循有所定义的, 并且这种根据浏览器和引擎本身做出来的 task 和
microtask 分级, 对我而言其实也算是一种解决问题的新思路.

新的一年也不能停止学习呀.
