# Monash: 以 monadic 的姿势写 Shell

最近在学习 Perl 6, 很少见的语法奇葩学习曲线陡峭的语言...
不过写完这个项目后是喜欢得很了.  最近设计了一门玩具语言 *Monash*, 即 *monad* 和
*Shell* 的混成词 (portmanteau, 怎么中文翻译这么奇怪), 以下的几个例子先尝尝鲜:

```bash
# 直接以 one-liner 的方式执行.
$ ./monash "fortune >> echo 略 >>= cowsay"
Don't Worry, Be Happy.
		-- Meher Baba
 ____
< 略 >
 ----
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

还可以使用 lambda 表达式!

```bash
# 交换俩值.
$ ./monash "echo 1 2 >>= \x y -> y x"
2 1

# 做一些计算.
$ ./monash "echo 1 2 >>= \x y -> x + y"
3
```

```bash
# 如果代码写在文件里, 重定向一下即可.  嗯哼 `.mnsh' 扩展名应该还没人用.
$ ./monash < foo.mnsh
```

项目地址 [在这](https://github.com/anqurvanillapy/dimsumltd/tree/master/monash),
使用 Rakudo Perl 6 编写, 包括 `MAIN` 函数本身也不过 120 行代码, 没有三方依赖,
Perl 6 语言本身有很多很精彩的功能.

## 缘起

这篇 [博文](http://okmij.org/ftp/Computation/monadic-shell.html) 解释了 UNIX
shell 和 monadic I/O 的联系, 其实我本身对 Haskell 中的 `Monad` 就是一知半解,
只知道如何遵循所谓的 *Monad laws* 去定义一个能正常使用 `fail`, *then* 操作符
(`>>`) 和 *bind* 操作符 (`>>=`) 的结构, 范畴论的东西还没看 --
也就是基本会用的水平.

博文作者写到的一个引言非常有意思:

> Doug McIlroy, the inventor of pipes, is said to point out that both pipes and
> lazy lists behave exactly like coroutines.

除了被这种基于 stream 的编程风格和 UNIX pipes/`>>=` 两者的联系所吸引,
最重要的目的其实在于提高我对 DSL 设计和编写的理解, Perl 6
是近期发现并着手开始实践的工具.

## "HONESTLY, WE HACKED MOST OF IT TOGETHER WITH PERL."

文段的标题是 xkcd 一则 [漫画](https://xkcd.com/224/) 的引言, 这个世界曾经被 Perl
主宰过一段时间, 但是 Perl 6 发生了什么, 其实是一个悠远的历史话题.  自己直接跳过
Perl (一般指 Perl 5) 选择了 Perl 6, 除了在其中发现了很多涉及数据处理和编写 DSL
的强大工具, 还发现了语言本身许多实用的宝藏.

### `Grammar` FTW!

*Grammar* 直接就是我决定学习 Perl 6 的一大亮点, 通过编写正则表达式设定 `token`
和 `rule`, 并编写 `rule` 所对应的 `action`, 几十行代码就能轻松实现一个迷你的
REST 请求解析器, 官方 [教程](https://docs.perl6.org/language/grammar_tutorial)
就是以此为例子.

在我的项目中, Monash 语法的设计也十分的简单粗暴, 我甚至能在 `rule` 所对应的
`action` 中做表达式的 eval 而避免将工作留给 Shell (事实上我还是将工作留给了
Shell, 毕竟这样错误处理可以由 Shell 承担 ;P), *Grammar* 中所提供的 `make`/`made`
方法可以让用户自定义某个 `rule` 的输出结果并在其上层 `rule` 中捕获.

### 更人性化的进程 `ARGS` 数组

如果直接在 `MAIN` 函数中将参数数组元素取出并赋给变量, 会产生很多很方便的效果,
比如我在代码中使用了:

```perl
sub MAIN($src = (@*ARGS[0] // slurp)) {
    # ...
}
```

`slurp` 就是常说的接受 `stdin` 输入, 而如果给进程赋予大于 1 数量的参数, 比如
`$ ./foo 1 2`, 则会输出以下结果:

```bash
Usage:
  ./foo [<src>]
```

进程输出了 usage 信息, 并且返回符合标准的错误码!  这就不需要类似 Python 的
`argparse` 铺张过多 boilerplate 代码了.

### 更丰富的程序状态值

Perl 6 就像扩展了寄存器集合一样, 具有如 `$_`, `$/`, `$!` 等更高层抽象语义的变量,
虽然刚开始学习时对长篇大论的文档和各种奇怪的符号感到恶心...

比如 `$_` 被称为 *topic variable*, 很顺应自然语言的语义:

```perl
given $foo {
    # `$_' 在此指代 `$foo', 类似 Lisp 世界的 `(let ((foo 42)))'.
}
```

又比如 `$!` 用于表示捕获到的异常, `$/` 指上一次正则所捕获的值, 等等.

### 丰富的 FP 特性

你可能会遇到一种情景: 手头有两个数组 `foo` 和 `bar`, 要合成一个新的数组,
这个数组的偶数位元素来自 `foo`, 奇数位为 `bar`, `foo` 和 `bar` 元素个数相差不大.

这种情景可以如何解决呢?  在我的实际情况中, `foo` 会比 `bar` 多一个元素,
一开始的想法是用一个 `loop` 循环, 后来又考虑到了可以用一个 `Bool` 标志位,
搭配分支判断来逐步组成新的数组.  后来, 根据自己在 Clojure 和 Python 的经验,
我会用后者的 `zip()` 搭配前者的 `(flatten x)` 一句话搞定, 事实是 Perl 6
恰恰拥有这些接口.  在将 `@bar` 的尾部补齐一个 dummy 元素后,
一行代码就解决了这个问题:

```perl
flat(@foo Z @bar)
```

Perl 6 不仅有如 `grep`/`map`/`reduce`/`zip` 等实用的高阶函数, 它甚至赋予了这些
HOF 们十分另类的表现方式, 比如 `zip` 函数可换作 infix operator (中缀操作符) `Z`,
比如 `map` 可直接用 `>>` 代替 (甚至可以直接用 UTF-8 字符 `»`),
将数组元素全部转换成字符串类型可写作 `@foo>>.Str`, 简直有太多 mind-blowing
的写法.

### Junction

对于 *Junction* 这个东西我只算基础了解, 还没读完文档, 简单来说就像是集合论中的
*集合* 的概念, 如果是声明成 `1 | 2`, 则该集合中的元素 *至少有一个* 符合条件,
则全体符合条件, `1 & 2` 则需要全体符合条件, 比如以下代码:

```perl
my $i = 1 | 2;
if $i + 1 == 3 {
    say "yes";
}
```

`if` 判断是成功的 (好神奇!), 又比如我遇到的一个情景: 有一个字符数组 `@foo`,
其元素全是单个的英文字符, 现有一个字符数组 `@bar`, 其元素可能是符号或单个数字,
我需要找到 *是单个英文字符并且不存在 `@foo` 中的元素*, 或者换一句话说, `@foo`
是函数所声明的变量列表, `@bar` 为函数体, 怎么在 `@bar` 中找出未定义的变量名?
这时 *Junction* 也就派上用场了, 我的解法为:

```perl
@unbound-vars = @bar>>.grep: /<:L>/ & none(@foo);
```

语法是奇葩了点, 可一旦接受了这种设定...  可见 Perl 6 中高阶函数的应用十分灵活.

### And more...

好像自己打了一个好长的广告.  Perl 6 将会成为我设计实现 DSL 的首选工具,
上一次对语言设计这么激动还是因为 Scheme 中神奇的 `(read)`... 但是 Lisp 对
imperative 世界的表达能力实在有限, 当然工具的探索也不能停止.

Monash 的任何问题和 bug 欢迎提各种
[issues](https://github.com/anqurvanillapy/dimsumltd/issues) ;).
