# 2024 New Year Resolutions

* 2024-01-07
* 🧸

啊, 2024 年这都过了一个星期了, 才来写一点 2023 年的小总结和新年小愿望. 起因是好友 @[rujialiu] 问我有没有什么 RowScript
的资料可以看看, 我想了想干脆写一篇年度总结来向他和自己解答各种各样的问题吧! (

哦对, 这些总结和愿望完全是和编程语言学习有关的捏. 文章叙述的顺序会以具体的理论层次结合我个人时间经历铺展开来.

[rujialiu]: https://github.com/rujialiu

## RowScript 语言

[RowScript] 是我从 22 年 11 月开始, 总共开发了大概半年时间的一门编程语言, 23 年 5 月开放了仓库并发布 `v1.0.0-alpha.1`
版本.

[RowScript]: https://github.com/rowscript/rowscript

### 心路历程: 名字和最初想法的由来

这门语言一开始的想法能追溯到 19 年, 当时 玩火 (@[niltok]) 在魔女群 [^1] 里提到, JavaScript 的 prototype-based OOP
设计是否可以用 row polymorphism 来重新思考呢? 我觉得玩火的想法非常的有意思, 所以征求了他的同意之后, 创建了 RowScript
的仓库, 并开始搜刮各种论文去寻找 row polymorphism 的想法.

在一顿搜刮之后, row polymorphism 理论决定参考的论文是:

> Abstracting Extensible Data Types, *J. Garrett Morris, James McKinna* (POPL 2019)

这篇文章主要是介绍了一种 **concatenation-based** 风格的 row polymorphism 设计, 相对于经典的 extension-based 风格,
我发现前者更要好玩, 比如说, 前者可以用 row 组成 record 和 enum 两种类型, 而经典理论一般只讨论 record 的情况, 这让我设计
enum 类型提供了直接的理论基础 —— 不用自己想了, 直接抄!

这篇论文涉及到的理论后面我会慢慢展开解释.

[niltok]: https://github.com/niltok

[^1]: 因为是玩火写的教程 *十分钟魔法练习* 的群, 所以是魔女群 (

### 心路历程: 语言的大基础

上面这篇论文的语言基础是个 system F 的方言, 所以它很适合熟悉 ML 家族语言的宝宝, 但是我不是). 在 22 年的上半年,
我还在挣扎于阅读答辩一般的 [TinyIdris] 项目的 Idris 2 代码 [^2], 后来 千里冰封 (@[ice1000]) 拯救我于水火之中,
让我学习了两个项目:

* [ice1000/guest0x0], 以群友 游客账户0x0 (@[Guest0x0]) 名字命名的基于 cubical type theory 的 PoC 实现
* [ice1000/anqur], 以我的名字命名的 dependently-typed 教学语言

这两个项目都仅仅用了 700 行左右的 Java 代码就实现了最基础 DTLC (dependently-typed lambda calculus) 的 elaborator
(简单理解就是类型检查器), 使用的是 NbE (normalization by evaluation) 的风格. NbE, 顾名思义, 我们将一连串的表达式
*规范化* (normalize) 到无法继续下去的形式 (范式, normal form), 其中规范化的手段称作 evaluation (求值). 它和
**reduction** (规约) 不同的地方在于, 简单理解, 就是 reduce 发生在类型检查完毕之后, 基于一定的 operational semantics
(操作语义, 或又叫 term rewriting rules, 项的重写规则) 去对表达式进行所谓 "计算", 这一切都发生在 runtime; 而
**evaluation** 只发生在编译期间, 可以简单理解为 compile-time computation.

| 计算的概念      | 计算发生在 |
|------------|-------|
| evaluation | 编译时   |
| reduction  | 运行时   |

也就是说, 一门 dependently-typed 编程语言是可以没有任何 runtime 的意义的, 当类型检查完毕, 所有的一切都确定下来了.
那我们自然就有一个疑问:

> 真实的世界里那些有意义的 IO 都去哪了呢?

实际上, 我们把这些 IO 当作是程序的 "副作用" (side effect), 通过 FFI (foreign function interface) 的方式在类型检查完毕之后的代码去实际运行.

举个实际的例子:

```js
const foo = () => 42
const bar = () => foo()
const main = () => println(bar())
```

这三个函数, 在 DTLC 理论下进行编译期 evaluation 之后, 得到的是这个产物:

```js
const foo = () => 42
const bar = () => 42 // 可以认为就是发生了 "内联 (inlining)"
const main = () => println(42) // 递归内联直到没法进行下去, 比如遇到了一个 FFI 调用
```

编译器生成了目标代码之后, 比如 JavaScript, 汇编, 等等, 实际的执行才会去跑 `println(42)` 的逻辑.

然后, 我们就可以做一个爆论了:

| 类型理论  | 编译期行为                                |
|-------|--------------------------------------|
| 依赖类型  | 默认内联所有的定义                            |
| 非依赖类型 | 默认不内联定义, 类型检查完毕后等到 runtime 进行 reduce |

市面上有非常多使用非依赖类型理论的编程语言, 但它们可以通过手动标记 `inline` 或者计算 cost model 的方式自动内联,
这点来说大家应该都相当的熟悉, 比如 Go 语言默认的函数内联, 以及 C/C++ 编译器开启 `-O2` 优化, 以及 Rust 开启 `--release`
模式, 大家都在享受自动的内联优化.

而在依赖类型理论里面, 则非常的反直觉, 即为了优化最终的 program size 和其他复杂的目的 (比如优化报错信息, 掩盖实现细节等),
你可能要去做 `noinline`, 即取消某些定义的内联, 有一篇相关的论文:

> Controlling unfolding in type theory, *Daniel Gratzer, Jonathan Sterling, Carlo Angiuli, Thierry Coquand, Lars
> Birkedal* (2022)

之后我也打算参考这篇纸, 把 controlling unfolding 特性做进语言中.

[TinyIdris]: https://github.com/edwinb/SPLV20

[ice1000]: https://github.com/ice1000

[ice1000/guest0x0]: https://github.com/ice1000/guest0x0

[Guest0x0]: https://github.com/guest0x0

[ice1000/anqur]: https://github.com/ice1000/anqur

[^2]: 这是因为 TinyIdris 是个 well-typed interpreter, 大量运用了定理证明的东西, 以及噩梦一般的 implicit arguments,
基本只有写代码的人才知道当时自己的思路是什么... 而且 Idris 的插件生态很烂, 用起来很让人崩溃

### 内联与依赖类型

这时候你会想, 为什么要默认内联所有定义呢? 这又和依赖类型有什么关系?

依赖类型, 更准确的说法是 "依值类型 (types that depend on values)", 也就是说一个类型是可以依赖一个任意的值的, 包括这个值的表达式,
所以这就天然地要求类型检查器在检查的过程中就要把类型所依赖的值计算出来, 否则后续无法判断两个类型是否相等.

为什么要判断类型相等呢? 理由也很简单, 我们知道类型检查 (typechecking) 的子过程有两种:

* 直接检查 (check): 手头的信息足够充分时则适合直接检查, 比如有了函数的类型, 检查函数表达式是否符合, 这种情况一般使用直接检查,
  因为你只需要判断函数表达式的参数类型 (parameter type) 和返回类型 (return type) 是否与期盼的一致即可
* 类型推导 (infer): 从值的表达式推导出类型来, 如 `42` 直接推导出 `number` 类型, 然后将推导出来的类型 (inferred type)
  和期盼的类型 (expected type) 判断一致即可; infer 适合于值表达式非常的简单或显而易见的场景, 比如简单的数字, 布尔值,
  字符串等等

你看, 无论是那种过程, 你都需要判断两个类型是否相等. 两个类型相等的判断又叫做 conversion check (可转换检查) 或者是
unification (归一化).

接下来我们就可以探讨依赖类型具体是什么, 以及为什么它十分适合用来做一门语言的原型.

### 依赖类型的 "四大法宝"

研究类型系统, 无非就是学习他们的 "四大法宝":

* Type formation rule, 类型是怎么来的, 也就是类型的构造器 (type constructor)
* Term introduction rule, 某个类型的值是怎么来的, 也就是值的构造器 (value constructor)
* Term elimination rule, 值是怎么消去的, 类似值的 "计算" 规则, 如何将这个类型的值计算得到另一个类型的值
* Computation rule (也叫 eta rule, eta equality), 这里的 computation 非常有迷惑性, 这一规则的用途其实就是上面所说的
  unification, 即判断两个类型和值是否相等的规则

这 "四大法宝" 也是有名字的, 其实就是人们常提到的自然演绎 (natural deduction).

我们举一个最简单的例子来用用, 32-位整型类型的自然演绎:

* Type former: 当写出 `i32` 时便构造出了 32-位整型类型
* Term intro: 大家都很熟悉的, 通过 two's complement 方式编码的任意 32-位整型数字, 比如 `42`
* Term elim: 定义 `>` 号, 比较两个 `i32` 类型的值, 返回 `bool` 类型的值
* Eta rule: 即判断两个 `i32` 值的等价, 只要按比特位逐个比较即可

接下来, 我们来讨论依赖类型. 一个最简单的 DTLC (依赖类型 lambda 算子) 的语法是这样的 (文法有递归, 可不管, 理解就行):

```plaintext
expr : type                 -- 宇宙 (universe)
     | (x : expr) → expr    -- 函数类型, 也叫 Pi 类型
     | λ (x : expr) . expr  -- 函数表达式
     | expr expr            -- 函数调用
     ;
```

举个例子, 以下都是合法的 DTLC 的表达式:

* `type`, 构造一个类型宇宙
* `(x : type) → type`, 构造一个
* `(x : type) → (y : type) → type`
* `λ (x : type) . ((y : type) → type)`, 这个很神奇, 即一个函数能返回一个函数类型
* `(λ (x : type) . type) type`

### 目前支持的功能

## 研究 effect system

## 研究 JIT

## 研究围绕 C 生态的系统编程语言

## 想做点内容导向的东东
