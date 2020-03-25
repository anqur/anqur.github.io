# C++ vs Java?

其实这篇文章不是比较这两门语言的, 而是仅仅回答 "为什么当初选择把更多时间花在了
C++ 上而不是 Java" 这个问题, 并且对未来 (三四年吧) 进行一个构想,
更多算是一个阶段性的总结.

我在大三第一学期结束的时候开始选择潜心学习和接触 C++ 的社区和种种,
到现在也是一年的时间了, 也算是理解了邓师兄那句 "我到了大三才知道什么是编程"
的含义, 这门语言确实给了我很多难以言喻的影响.

那么问题来了, 也很简单, 为什么选择了 C++?

## TL; DR

整篇文章也只是论述以下三点:

1. 学 Java 难, 可能比学 C++ 还难
2. 比较两者不太合适, 理念和领域不同
3. 两者的学习是循序渐进的过程

## 为什么学 Java 难?

想要深入理解 Java 里面的很多概念的原理是比较难的, 从两个角度来讲,
第一就是这些概念的学习可不可以追溯.  Java 是一个不断进化的语言规范,
和其他语言一样, 拥有很多的实现 (implementation), 但使用人群较多的 Oracle 的 Java
SE 并不开源, 而开源的 OpenJDK 又在一些场合被建议更换和替代 (比如 Android Studio
会建议用户替换掉 OpenJDK).  在工作和学习中难免要为一项技术的缺陷买单,
研究这些内部的原理是一项必须进行的长期投资, 而现在暂且只能通过性能稍差的 OpenJDK
来进行, 未免有些可惜.  当然也可以说源代码的追溯都不是事,
完全可以通过书籍的阅读来进行, 但是我认为能做到看完书以后,
把书丢到一旁凭理解和记忆着手进行实验,
肯定比阅读代码后将关键代码抽取进行自我实验效果差一些吧.

可能说了这些你还不清楚哪一些概念的理解和学习是要去看代码的, 举个例子, 书本上说
Java 的对象中的方法都是 virtual 的, 而且只能往自己或者父类的虚表中查找,
所以就不存在 C++ 中那种父类指针转换成子类并调用子类方法的技巧了, 这些过程在 Java
的编译期就能指出 "标识符不存在" 这样的错误.  但仅仅这样说就能了解 Java
中的虚表的实现细节了吗?  仅仅这样就能在未来遇到问题时及时想到原因吗?
我觉得去看标准和最佳实践或者书中的总结, 没有直接阅读代码来得直接 (当然可以去
OpenJDK 看看啦).

第二个角度当然就是和语言本身有关了, Java 是一门 runtime 比较厚重的语言, C++
相对而言是编译期干的事情更多的语言.  光是学习让 Java 如此出名的 GC 系统,
已经算是讨论一个很大的话题了.  目测它还有自己维护的一套内存分配机制, 以应对
boxing, string interning 这样的优化需求, 对于学习 C++ 来说, `malloc`
本身的实现已经是个不小的话题了.

话说回来, 也并不是说 C++ 不存在 GC, 我认为 C++ 可以算是有一个微小的 GC runtime
的, 比如 `std::unique_ptr` 与 `std::shared_ptr`/`std::weak_ptr` 之流, 除此以外,
比如其实能应对大部分情况的 RAII, 非要讨论 string interning 特性也有
`boost::flyweight` 这样支持微小 immutable object 的模板类, 以及对 `static`
关键词的利用, 内存管理对于 C++ 也不是一个 nontrivial 的话题.

## 两者虽然有相似之处, 但是不好比较

不能单单看到 Java 的强类型, 甚至是它的 generics 就说它和 C++ 很相似了, 举个例子,
Java 中的 generics 和 C++ 的 `template` 其实是两码事, Java
中在编译期检查没有发现源代码问题后, 进行了一项工作叫做 type erasure, 将带有类似
`List<Integer>` 的 generics 消息给抹除, 而在源码中仅留下一份拷贝, 也就是说
`List<Integer>` 和 `List<String>` 其实是一个东西, 而 `javac` 仅仅在编译期以类似
type hinting 的方式帮你检查好了类型安全, 但是没有帮你准备两份对象拷贝, 这和
`template` 当然完全不同了, 也就不存在 C++ 中 `template` 和 `virtual` 函数的
tradeoff 问题, 因为 Java 中只有后者.  这也是为什么在捕获异常时不能捕获 type
variable 不同但类相同的异常, 因为 `GenericException<Integer>` 和
`GenericException<String>` 是一个东西.  也因为这样的设定, 在 Java 中也就有了 raw
type 的概念.

其实这个例子只是从语法等特点去谈, 我们不妨放大眼光去看看目前很多解决方案的内部,
从而去分析 C++ 和 Java 两者的定位.  在我的眼里, 有三样东西是长得非常相像的:

* Android
* 浏览器
* 早期端游

Android 的解决方案, 大体是 Linux 负责驱动和图像等硬件级别的工作, 在用 C 等布置好
OpenGL 等相关核心接口以后, 在这个操作系统上 boot 了一个 JVM, 这个 JVM
就能完成大量的需要长期迭代的核心用户服务以及业务逻辑, 还能通过 JNI 调用 OpenGL
等内核提供的 API 及服务 (话说还听说过 JNI 的 overhead 和性能有些问题).
用户直接通过 JVM 编写 app.

浏览器的解决方案和 Android 类似, 但是留给用户来操作的服务不多, 不像 Android
那样需要 JVM 操作 `SurfaceFlinger` 等那么底层的事情, 所以同样也是 C++
负责核心业务如 layout engine 和 JavaScript engine, 用户通过 HTML/CSS/JavaScript
来编写 app.  可以说在 C++ 写的系统上 boot 了一个 JS VM, 而且还有 JIT 性能.

早期端游很多的技术栈是基于操作系统提供的 GUI 库, 用 C++ 编写相应的核心服务
(比如网络啊资源管理啊建模渲染等等), 通过 Lua 等脚本语言处理业务相关的东西.
嗯哼, 同样是在 C++ 写的系统上 boot 了一个虚拟机, Lua VM, 它同样有 JIT 实现.

选择 Java 当然重要的一点就是它的灵活性, 开发者不必和原生平台直接打交道,
应付字节码就可以了, 以及核心相关的各种 FFI.  在我看来, "Write once, run
anywhere" 已经不再是这个时代技术选型的核心, 它更像是一种基本要求.  Java
本身开发的便捷与灵活性和 JIT 带来的优越性能更是它的亮点.  举个例子,
想要不关闭这个进程从而热替换服务所跑的代码 (其实就是更换字节码), 当然是基于 VM
的语言更好实现了.

至于 C++ 的定位也不打算多讲, 就算不言而喻吧, 简单硬套 systems programming
这个老词.

## 学习 Java 有其他语言可以辅助

通过学习一些基于 VM 的语言的内部原理是对学习 Java 很有帮助的, 比如五脏俱全的
Lua, 较新的版本都是个 register-based VM, 而且其 string interning 和 GC
等的学习会很有启发, 如果是 JavaScript 或 Python 这样的语言, 当然可以研究其
prototype 的设计, 从这个角度思考子类父类思想在这些语言是怎么呈现的, 而 Java
的继承这个话题, 我认为更接近 C++ 的 object model 的设计一些.

无论是学习哪一门语言的内核, 都离不开要去接触 C/C++ 这两门语言, 所以 C++ 和 Java
两者的深入更像是一种辅助, 而不是像 Python 和 Ruby 这样勉强能搬上擂台的关系.

## 我认为的未来三四年会怎样

目前而言, 能够明确感受到 C/C++ 哲学存在的语言我认为有 Go, Rust, D 等等,
毕竟都是直接编译到 native code, 学习它们的第一反应也是写完代码后,
先不多想打印汇编出来看一看再说.  Go 和 Rust 中一个很明显的特点就是,
前者更加注重 protocol 和 interface 两种结构,
这和它对异步编程和网络两个方向的选择我认为有很大的联系, 同时极大地弱化了 OO 中
inheritance 带来的子类父类的耦合, 当然是有利有弊的.  到了后者, Rust 使用了
traits 的概念, 将 protocol 和 traits 通过 implementor 联系了起来, 类似 Haskell
中的 `typeclass`, 在保证 strong type safety 的同时也增加了 polymorphism
的多样性.

我认为 C++ 的一些核心思想会继续延续在更多新的语言中, 比如 RAII 和 smart pointer
等等.  我个人青睐网络和操作系统的发展更多, 所以我认为 Rust 中的 strong type
system, Go 中的 coroutine-based CSP, 以及如 Erlang 中的 actor 等,
还是会继续成为未来多核计算的选择.  在 programming constructs 中, 函数式编程的
immutablity 和 first-class citizen 等属性的结构会发挥更大的作用, 已经看到很多从
Haskell 中搬出来的东西.  至于新语言里面, 我个人最看好的还是 Go, 其次是 Rust.

当然一门语言包揽所有工作是不现实的, 我也不是什么 PL 专家, 学习 C/C++
还只是第一步, 还有太多的坑等着我来挖呢.
