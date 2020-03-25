# 在 C++17 中为用户函数提供 purity 检测

这几天一直在自己的毕设方向上往其他地方微微偏离... 之前对 *STM* (*software
transactional memory*) 的研究很快止了步, 但最近看到了这个 r/haskell 上的
[讨论](https://www.reddit.com/r/haskell/comments/175tjj/stm_vs_actors/),
元老们的观念一直都是 Haskell 中具有 *composable* 特性的 STM 结构 (其实就是各种
`Monad`) 对于 *Actor* 这种模型的构建是非常合适的, 比如 Haskell 三方库
`distributed-process` 给人带来在写 Erlang 的错觉, 但是 Actor 及其他并发结构
(如 *channel*-based *CSP*) 之于 STM 是更高层的概念, 做粒度太细 (*fine-grained*)
的同步逻辑反而是个 *poor model*. So sad, 难道我又陷入了 Haskell 圈子的鄙视链?

Sad 归 sad, *鄙视链* 这种观念是否是我的先入为主, 当然要靠个人的学习实践去验证.
于是我去尝试阅读了 Haskell 中 STM `Monad` 的相关
[论文](https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/),
结合帖子中的讨论和论文中的例子, 确实解决了我的一些疑惑.

帖子中有人强调, 如果实现一些经典的 *ITC* (*inter-thread communication*) 模型,
不得不和 *locking granularity* 与 -- 如果开发者真的愿意折腾 -- 稍微更好管理的
*optimistic locking* (乐观锁, 如原子变量等) 打交道, 开发维护成本较高.
这样的体验麻烦在哪呢?  论文中的一个例子做了解答:

1. 乐观锁情况, 假设从 `db0` 中取出键 `k` 对应的值 `v := get(db0, k)` 为原子操作,
放入 `db1` 中 `put(db1, k, v)` 也为原子操作, 两个操作组合成的逻辑便是记录迁移,
但是显然这个组合操作 *不是原子的*, 假设第二个操作失败需要重试, 而这个 `v` 作为
*intermediate state* 无法回滚, 会在某瞬间中被外界认为 `v` 在两个数据库中消失了!
2. 对此如果使用悲观锁, 恐怕实现者要暴露 `LockTable`/`UnlockTable` 两个方法,
破坏了数据库的抽象不说, 两个接口会诱导 *死锁* 的产生, 只要使用者疏忽大意!

较好的解决方法, 当然是用看似 Java 中的内置锁 `synchronized`, 但本质是 *TM*
(*transactional memory*) 的抽象, 假设就叫 `synchronized` 了吧 (GCC 有这玩意噢):

```
synchronized { v := get(db0, k); put(db1, k, v); }
```

第二个操作失败则该语句块整体将重试, 借以消除 `v` 凭空消失的情况.  结合个人经历,
我在编写 *lock-free bounded MPMC queue* 时 (说人话, 就是 *无锁定长循环队列*),
大量需要手写关于管理类似 `v` 这样的中间状态的 丢弃/回滚/重试/多步骤 等操作,
虽然逻辑还好处理, 但是已经严重暴露出了这种无法组合的问题.  论文的目的就是借由
STM 增强其 *composability*.

讲到这, 如果回头看看文章的标题, 其实这次确实不是想讲 STM, 虽然已经说了那么多了.
读完论文中介绍性的文字, 我并没有着急地去读那套 *transactional logging* 等等原理,
而是脑里抛出了个疑问:

> *为什么是 STM?*

再怎么说, 想要实现 TM, 特殊处理器的 HTM 指令 (也就是 *hardware* 级别的 TM),
失败后 fallback 到 STM 的逻辑, 为什么 Haskell 中认为 STM -- 即软件层面实现 --
作为首选是合理的?

答案令人汗颜, 因为 Haskell 的 `IO a` 这个 `Monad` 本身就是 *pure* 的 :(,
也就是说, `IO a` 中没有 *不可撤销的* 内存操作 (论文中 *不可撤销*/*irrevocable*
一词用的很妙, 所以牺牲下言辞) -- 比如 *发射导弹*, 预设尝试发射一次, 而很可能因为
*失败重试* 发射了多次而不可撤销, 所以不能在 `IO a` 中操作.  还不明白的话, 类比
C++, 在这样限制下 `new`/`throw`/`printf`/`write` 等皆不允许出现了.  取而代之的,
是 Haskell 为 STM 提供的 `IORef`/`TChans`/`TVar` 等所谓 *mutable cells*,
即使用频率很小的具有副作用的 mutable 结构.

因此, 论文接下来的原理, 以及几个星期前 clone 下来的 GCC 中可做 TM 的实验扩展库
`libitm`, 都不想读了, 脑子只有一个念头:

> *在系统编程语言中, 比如 C++, 能做到多高程度的 pure 呢?  如何确保呢?*

## 是的, 终于进入正题

检测 *purity* 并不是我的核心目的, 毕竟 `constexpr` 就能帮很大的忙,
这个问题之所以能让我组织那么长的语言, 难就难在怎么模仿 `IO a` 接收用户函数,
并且还要为这个函数提供 *compile-time* 的 purity 检查 (有无 scope 之外的副作用啊,
有无 IO 有关的 *syscall* 使用啊, 有无 *UB* 或例如超过 `std::numeric_limits<T>`
这种的实现限制啊, 等等), 以便我们分割 有/无 副作用的世界, 从而引入依赖无副作用 IO
的 mutable 结构, 同时也为 STM 的实现铺路.

不过自己的探索过程很混乱, 也几乎忘了自己做了什么阶段性的进步了 (勉强有几次 git
提交历史), 我会记录印象深的为主.  另外, 我认为我所完成的只能算 *pseudo*-purity,
也就是假装的 :).  pure 程度有多深, 除了需要研读 C++ 标准以外, 还要加以 *FP*
的理论支持, 这会是一个很大的课题.

### 理想中的用户函数

理想中的用户函数其实很简单, 就是希望 *强制* 用户使用 `constexpr` *specifier*
(保留英文是要强调它是个 specifier, 不是数据类型和参数类型的一部分, 而 `const`
是一个 *qualifier*, 所以强调英文是必要的).

```cpp
// 以下的代码都将遵守 C++17 标准.

int i = 0;

// C++14 后返回值可直接声明 auto.
constexpr auto
foo(auto n)
{
    // 我的最初理想中, 认为 n 可以 copy 进入函数.

    // 不能有类似以下的副作用.
    // ++i;

    return n;
}

// 到时经由返回类型 T 和参数类型 Args 传入给一个类, 这个类中使用静态的函数
// wrapper, 比如 `std::function', 封装用户的函数, 然后等待用户显式地调用它.
template <typename T, typename ...Args>
class pure_io {};
```

当然, 最初的想法是很 naive 的...

### 理想中的 *capture by copy* lambda 表达式

那么既然如此, 根据这个理想状况, 一个捕捉 `[=]` (copy 方式) 的 lambda
表达式也应该符合类似 `foo` 的设定 (吧?).

```cpp
// 全局中不可使用 `=' 捕捉.
auto foo = [](auto n) {
    return n;
};
```

但是这里要提前说明一个问题, 就是 lambda 表达式的类型是否能保存, 并用于匹配其他的
lambda 表达式呢?  因为我在想是否能通过此方法限定用户 lambda 表达式的
(参数和返回值的) 类型.  我们知道 lambda 表达式是 *匿名* 的, 果不其然, C++11 中
lambda 表达式的类型是 *unutterable* 的 (中文翻译无力...), 比如这个例子:

```cpp
int
main()
{
    auto a = [] {};
    auto b = [] {};
    // 编译期断言成功.
    static_assert(!std::is_same<decltype(a), decltype(b)>(), "unutterable");
    return 0;
}
```

所以尝试把 `[=]` 作为类型的一部分是不可行的, 但先剧透一下, 好在 C++17 中 lambda
表达式已经是 *core constant expressions* 的一部分, 所以 lambda 表达式的 *eval*
由编译期来操作是可行的.

### `std::function` 的局限性

刚刚提到在使用 `template` 的参数限定如 返回值类型/参数类型 后再装入
`std::function`, 当然是有原因的, 之前也提过 `constexpr` 是一个 specifier, 以
copy 形式让 `std::function` 作为参数类型接收 *address of overloaded function*
(如函数名作为赋值表达式的 *rhs*) 和 lambda 表达式是无法限制函数的 purity 的,
在此就不举例了唔.  具体 `std::function` 在 compile-time/runtime 是怎么存活的,
恐怕需要读编译器源码而不是文档啦 (大坑是也).

### 用 *CRTP* 接受无副作用函数 (非标准)

现在的问题, 是还有什么办法接受用户的函数呢?  第一个点子当然就是 *polymorphism*,
当然以 `virtual` 为核心的 *dynamic polymorphism* 想都不用想.  尝试 *static
polymorphism* 有好几种方法, 比如 *macros*, `template` 等等, macros 需要面对
*sanitization* (即用户输入处理) 的问题, 而大玄学 *template metaprogramming*
可以先放一放, 我的第一反应其实是先尝试 *CRTP* (*curiously recurring template
pattern*), 写起来大概长这样:

```cpp
int i = 0;

template <typename T>
class pure_io {
public:
    // 能用上的 specifier 都用上...
    constexpr void
    run() const noexcept
    {
        // 编译期 cast 成子类指针并保证没有修改, 然后执行子类的实现.
        static_cast<const T*>(this)->run_impl();
    }
};

// 通过 template 将子类传给父类.
class pure_io_impl : public pure_io<pure_io_impl> {
public:
    // 实现 run 方法.  这里皮了一下使用 `const' qualifier 防止修改类成员变量,
    // 而实际还存在副作用.
    void
    run_impl() const
    {
        // 副作用语句.
        ++i;
    }
};
```

但即使标注了 `constexpr`, 含有副作用的 `pure_io_impl::run_impl` 还是能够执行.
在查找了相当的文档之后, 我发现了 GCC 提供的两个 *function attributes*, `pure` 和
`const`, 有趣的是前者的强度并不比后者高.  `const` 属性保证了该函数不存在副作用,
如使用了全局的变量, 该属性可以保证在函数内有一个本地的拷贝, 但缺点也很明显, 它
*并不能* 在编译期提醒用户的函数有副作用的存在, 并且也使代码失去了 *可移植性*.

```cpp
#include <cassert>

int i = 0;

template <typename T>
class pure_io {
public:
    // 此属性只能在 GCC 中使用.
    constexpr void
    run() const noexcept __attribute__((const))
    {
        static_cast<const T*>(this)->run_impl();
    }
};

class pure_io_impl : public pure_io<pure_io_impl> {
public:
    void
    run_impl() const
    {
        ++i;
        // 在 runtime 断言成功.  在此函数之外, `i' 依旧是原始值 0.
        assert(i == 1);
    }
};
```

即使决定使用 `__attribute__((const))` 这个 GCC 的功能来阻止副作用的发生,
怎么接收用户的参数也是个大问题, 并且与 I/O 相关的 syscall 等同样更改状态的调用,
在这个例子中依旧未能被检查, 只好继续探索了.

### 逐渐在 template metaprogramming 的边缘试探

至此, 我已经放弃了三个想法, 即:

1. 使用 `std::function` 限定函数类型, 但因为 `constexpr` 不是 qualifier,
并且我对这个抽象的 runtime/compile-time 界限了解太少了, 不敢直接用它检查参数
(涉及到一些实现细节), 最终抛弃之
2. 使用一个 dummy 的 lambda 表达式用 `decltype` 获取类型来匹配用户的 lambda
表达式, 但 lambda 表达式是 unutterable 的, 就像 `NaN === NaN` 返回 `false`
一样的效果...
3. 使用 `__attribute__((const))` 但不符合标准, 并且不能检查一些 syscall

想要在 compile-time 完成大量的检查工作, 看来还是得依靠 template metaprogramming
这门玄学了 -- 其实也就是看看 `template` 能给我们带来什么.  在文档的查阅中,
我搜寻到了以下几个关键的特性:

1. `noexcept` 操作符, 判断表达式是否具有 *noexcept* 的属性
2. `staic_assert` 在编译期对表达式进行断言, 这就要求该表达式属于 core constant
expression 这个范畴
3. `if constexpr` 提供编译期的分支判断
4. `std::is_same` 提供编译期的类型判断, 比如防止取到 `void` 类型的值赋给变量,
产生 *incomplete type* 这样的错误, 或者 *invalid use of void expression*,
这样有关 `void` 类型的情景需要特殊处理
5. *Non-type template parameter*!  可以像 *function-call expressions* (比如
`foo(42)`) 一样给 `template` 塞入编译期进行类型推断的参数 (如 `foo<42>()`)
6. `std::tuple`!  一个具有 *immutable* 属性的神器, 可以基于这种类型的变量做
*constant* 的处理 (举个例子, 连取 *tuple* 元素的操作都需要依赖 `template`, 即
`std::get<0>(t)`

写到这我自己都心累了.  是的, 非常多的编译期特性, 但具体有什么作用呢?
到底适用于什么场景之下呢?  即使这么多眼花缭乱的东西, 看了代码就能马上明白的啦.
延续以上的思路, 我们先处理一般的函数 (即名字代表其地址的这种函数), 再尝试处理
lambda 表达式.

### 一般函数的处理: `fapply`

结合这些编译期特性后, 我们的代码似乎更加简洁了.

```cpp
// 这种写法即 non-type template parameter, 在 template 参数列表中像声明函数一样,
// 声明我们的 template 参数, 这里 auto F() 的意思是我们接收一个函数类型的参数 F,
// 函数 F 不能接受任何参数, 返回值类型由编译器推断.
template <auto F()>
static constexpr auto
fapply() noexcept
{
    // `noexcept(F())' 不仅检查函数是否有 noexcept 属性, 而且因为其用于
    // `static_assert' 之中, 它还帮忙检查了函数的 constant 属性.
    static_assert(noexcept(F()), "constant function required");

    // 我们的函数声明了 constexpr, 所以返回值类型一定是一个 LiteralType,
    // 而且也不用担心返回 `void` 的情况, 只要外界不要接收 `void` 值即可.
    return F();
}
```

现在, 我们来写一个相加俩参数的用户函数:

```cpp
// 还是刚才说的, X 和 Y 是两个 non-type template parameter, 类型由编译器推断.
template <auto X, auto Y>
// 必须声明 constexpr, 即使声明了 noexcept 都不行, 因为受到 `static_assert'
// 的限制.
constexpr auto
// 函数不能接受参数, 否则也不能通过 `static_assert' 的断言.
foo()
{
    return X + Y;
}
```

调用这个 `foo` 和平常的函数调用也非常类似:

```cpp
int
main()
{
    auto i = fapply<foo<0, 42>>(); // i == 42
    ++i; // 强迫症使用下 i, 否则有编译警告
    return 0;
}
```

按照这种方法, `static_assert` 和 `noexcept` 保证了用户必须主动加上 `constexpr`
specifier, 并且用户函数不能有任何参数, 用户便只能尝试使用 non-type template
parameter 来处理输入了.

### lambda 表达式的处理: `lapply`

处理 lambda 表达式首先要说明两个很关键的点,

1. 之前提到, lambda 表达式在 C++17 中是 core constant expression 的一部分,
这个标准到底说明了什么呢?  它揭示了一个非常关键的用法, 即如果 *lhs* 声明了
`constexpr`, 那么 rhs 的 lambda 表达式会开始检查各种副作用, 比如
`constexpr auto n = [] { ++i; return 42; }()`, 会提示 `++i` 非法!
2. `std::tuple` 借由上一点提到的 lambda 表达式特性, 可以生成我们需要的 constant
数值, 比如 `[] { return std::make_tuple(42); }()`

因此, 我设计 `lapply` 的思路是这样的, 限定它接受两个参数 `f` 和 `g`, 两个都是
lambda 表达式, 第一个 `f` 即正常的用户函数, 第二个 `g` 是所谓的 *argument
generator*, 就是用于获取 *apply* 给函数 `f` 的参数, 并限定 `g` 不允许接收参数.
讲的如此混乱, 那么先不看 `lapply` 的代码, 我们先看用户的使用场景吧:

```cpp
#include <tuple>

int
main()
{
    // 用户函数.  `auto [n] = t' 术语叫 structured binding declaration,
    // 类似模式匹配, 取出 t 这个 tuple 的第一个元素.
    auto f = [](auto t) { auto [n] = t; return n; };

    // 执行用户函数的 argument generator.
    auto g = [] { return std::make_tuple(42); };

    // template 相关语法都没用上, 因为编译器帮我们推断类型了.
    auto i = lapply(f, g);
    ++i;

    return 0;
}
```

大概的思路就是, `lapply` 从 `g` 中获得了 `f` 需要的 tuple, 然后传给 `f` 执行,
返回 `f` 的返回值.  接下来我们就看看 `lapply` 的声明吧:

```cpp
// F 和 G 两个类型可以由编译器推断出来.
template <typename F, typename G>
static constexpr auto
lapply(F f, G g) noexcept
{
    // 我们检查 g 是不是 constant 的, 并且它不能接受参数.
    static_assert(noexcept(g()), "no-param lambda required at arg#1");

    // 用 `std::is_same' 检查 g 的返回值是不是 void, 如果是的话不能直接传给 f,
    // 否则会产生 invalid use of void expression 的错误.
    // `else' 分支不能在 `if constexpr' 中省略.
    if constexpr (std::is_same<decltype(g()), void>::value) {
        return f();
    else {
        return f(g());
    }
}
```

更多的 *test cases* 和可用的接口可以参考我的
[完整代码](https://github.com/anqurvanillapy/cppl/blob/master/mem/purity1z.cc).

### Nailed it!  达到预期效果!

不过这个东西能够用来做什么呢?  我理想中的 *use case* 就是将其封装在一个静态类中,
关于 STM 的操作必须围绕它来执行, 相当于论文那样分割了 有/无 副作用的两个世界,
如果能最后完成 STM 的算法和抽象, 就可以大胆尝试去优化之前的 lock-free bounded
MPMC queue 的代码风格了 (当然还得考察一下 `<atomic>` 各种调用的 purity,
不然就白折腾那么多东西了).

另外, 还是之前的那句话, 这些代码能提供多强的 purity, 我并没能进行更深层次的分析,
可以说是一个并不严谨的 *proof-of-concept* 吧, 有待别人或未来的自己一一击破.

### 远观其他系统编程语言的 purity

关于其他的一些现代系统编程语言, 如 D, Rust 等, 它们也有各自的 purity 检查,
但据了解 Rust 已经移除了 `pure` 关键字, 并且没有接受相关的 RFC (参考这个
[讨论](https://github.com/rust-lang/rfcs/issues/1631)), 而 D 语言中提供了
*weakly pure* 和 *strongly pure* 等几种概念, 但是也同样有其不完整性.  为此,
这种足够一个语言社区讨论十年时间的问题, 还得慢慢花时间从代码碎片玩起才了解啦,
先留下坑再说.

最后, 整个实践加总结花了一个星期, STM 终于可以继续研究下去了, nice.
