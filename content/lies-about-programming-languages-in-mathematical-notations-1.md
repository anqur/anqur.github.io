# 数学符号下的编程谎言 (1) 数据编码

## 前言

这是关于 *type theory* (*类型论*) 系列博文的第一篇, 文章除了包含个人的学习总结,
最主要的目的在于不使用任何编程语言, 加之严格限制相关编程语言特性的提及之下,
使用数学符号为读者构建一个 *functional programming language* (*函数式编程语言*)
的认识.

但是, 我的言语将 **无法保证百分百严谨**, 原因是这样, 大部分人对编程语言 (尤其是
*imperative*/*命令式* 语言) 是有一定认识的, 这足够让人产生对 FP 的感性认识,
而当这些感性认识受到学习者自主的实践后 (交流, 总结, 应用等等), 会自然地去搜索
*严谨的定义/性质/公理/定理*, 以确保自己的认识与它们高度吻合.  而能达到这一步的,
显然 "寻找真理的路上行人寥寥", 而能将抽象的认识扩展到与理论高度吻合状态的人,
已经是学术内的优秀人士了吧.  很显然那份严谨于此处是不必要的, 更何况水平也有限呢.
*;P*

## 解读标题

这个系列的标题有两层含义, 一层为 *数学*, 另一层为 *编程谎言*.

在上高中甚至是大学之前, 我们对数学的认识总是对客观事物有着具象的反映, 如对自然数
2, 虽然在思想中能做到 *parametric* (*参数化的*), 即在大脑中我们仿佛有着一个变量,
它可以替换成 *手指*, *苹果*, *人*...  种种事物 (两根手指, 两个苹果, 两个人...),
虽然我们貌似知道实数是什么, 但是仔细一想, 好像总觉得实数只是数轴上的一个点.
而到了 高中/大学, 我们开始接触 *set theory* (*集合论*), 接触各种生涩的定义,
却不知这些定义存在的意义.  而 *数学* 在这一层的含义, 我想说每个人都经历着这个过渡,
它也需要和你一起成长, 它并不是一种负担, 它反映出人的智慧的精妙.

*编程谎言* 是对 *编程语言* 的戏称, 是对计算机科学家 Neelakantan Krishnaswami
的致敬.  他在教书的过程中, 认为传授知识是一种 "说谎" 的过程, 这么说是这是因为,
等到学生对所学知识感到满意时, 总能找到一种方法让学生意识到他们再一次被欺骗了 --
知识总是会更新的.  就像臭名昭著的 *"所有的自然数之和为 $-\frac{1}{12}$"* 一样,
当论域不同, 我们再一次受到真理的欺骗.

而接下来, 我们就用看似生涩却熟悉的符号去构造一些谎言吧!

## $\lambda$-算子

早在上世纪 30 年代, 理论上早已出现了许多种不能跑在当下计算机中的 "编程语言",
甚至编程语言这个概念还尚未成熟, 当时人们主要研究 *formal system* (*形式系统*)
这一领域.  而这其中最为突出的成果为图灵的导师 Alonzo Church 的 $\lambda$-算子,
它是 FP 中非常重要的理论基石, 之后的文章也都全部围绕这一系统进行讨论.

在讨论 $\lambda$ 表达式之前, 我们需要一个 *context* (*上下文*),
它类似于我们所说的集合论中的 *universe* 集合 (*全集*) $U$,
它保证了我们的论域中拥有独一无二的元素, 写作 $\Gamma$.  $\Gamma$ 可以是一个空集
$\varnothing$, 也可以是引入了某元素后的集合, 以此类推.  类比一般的高级编程语言,
它就像符号表, 像一个装有独特变量的相关信息的 *哈希表*, 甚至也可以是放有变量名的
(数据结构里的) *集合*, 当然这些只是比喻.

我们定义一个 $\lambda$ 函数, 在 $\Gamma$ 下引入, 形为

$$\Gamma \vdash \lambda x . x$$

它类似数学中常用的函数 $f(x) = x$, 但这种表示引入了函数名称 $f$, 而 $\lambda$
函数是 *匿名* 的, 两者显然并不等同.  这种最基本的 *输入即输出* 的函数, 被称作
*identity function*.

和数学中常用的函数表示更加不同的是, 一个 $\lambda$ 函数可以返回另一个 $\lambda$
函数, 而且对上一个函数的参数是可见的, 即以下函数表示是合法的

$$\lambda x . \lambda y . x$$

简记为

$$\lambda x y . x$$

这一种特性叫做 *lexical scoping*.  有了这一种特性, 我们便可以做到多参数输入,
单结果输出了.  那具体是怎么做的呢?  首先我们先看一个简单的场景

$$\Gamma \vdash (\lambda x . x)  (\lambda y . y)$$

这句话的意思是, 给定一个 context 叫 $\Gamma$, 我们将两个 $\lambda$ 函数添加到
$\Gamma$ 之中.  接着我们用第一个函数的参数 $x$ 代替第二个函数的整体,
按照第一个函数的 "执行规则", 返回一个新的 *term* (*项*), 即

$$(\lambda x . x)  (\lambda y . y) = _\beta \lambda y . y$$

这一句话的 "执行结果", 即第二个函数本身.  前面将函数加入到 context 中的过程,
我们简称 *eval* (即 *evaluate*), 而实际执行这些函数的过程, 简称 *apply*,
而之前所提到的 "执行规则", 称作 *$\beta$-reduction*, 它属于一种 *term rewriting
rules* (*项的重写规则*).  可见, 在 $\lambda$-算子 这个系统中, 最基本的操作即
eval/apply 两个过程的循环.

至于刚刚提到的 *多参数输入, 单结果输出*, 考虑以下的例子


$$\Gamma \vdash (\lambda xy.x)  (\lambda a.a) (\lambda b.b)$$

其 apply 的过程即

$$
(\lambda xy.x)  (\lambda a.a) (\lambda b.b)
\equiv (\lambda x.\lambda y.x)  (\lambda a.a) (\lambda b.b) \\\\
= _\beta (\lambda y.(\lambda a.a)) (\lambda b.b) \\\\
= _\beta \lambda a.a
$$

这么一个过程.  要注意的是, 在习惯中, 项的 apply 是 **left recursive**
(**左递归**) 的, 即 $a b c$ 是 $((a b) c)$ 的习惯表达, **而不是** 右递归的
$(a (b c))$.

有 $\beta$-reduction 的规则, 是否还存在 *$\alpha$-X* 这样的规则呢?  这里补充下,
这套系统中还存在有 *$\alpha$-conversion* 的规则, 在形如

$$\Gamma \vdash (\lambda x . x)  (\lambda x . x)$$

的情况下, 这两个项在 $\Gamma$ 中是独一无二的, 但是为了区分二者, 我们可以用如 $y$
等其他符号替代, 这一种 *conversion* (*转换*) 即称为 $\alpha$-conversion,
转换的过程为

$$
(\lambda x . x)  (\lambda x . x) \\\\
= _\alpha (\lambda x . x)  (\lambda y . y)
$$

## 数据编码

有了 $\lambda$-算子 后, 一个近乎完整的编程语言就可以定义了!  要定义一门编程语言,
首先我们要对数据进行编码.

### 自然数 $\mathbb{N}$

在高中, 我们学习到在 set theory 的论域下, 任何一个自然数 $n \in \mathbb{N}$,
都是由同一套 *inductive* (*归纳的*) 方法所定义的, 即一个自然数

1. 要么是包含一个空集的集合, 即 $\\{\varnothing\\}$
2. 要么是与包含一个空集的集合的并集, 即 $\mathbb{N} \cup \\{\varnothing\\}$

则在此定义下, 自然数 $3$ 表示为

$$\\{ \varnothing, \\{ \varnothing, \\{ \varnothing, \\{ \varnothing \\}\\}\\}\\}$$

在 $\lambda$-算子 中, 我们定义自然数的方式也是类似的, 其中的思想不变.  自然数
$\mathbb{N}$ 在 1889 年才被 Giuseppe Peano 所正式定义, 简单地说即 "自然数是 0
和它的 *successor* (*后继*) 所归纳构成的", 这是 *Peano axioms* (*皮亚诺公理*)
中最为重要的内容, 例如, 自然数 $3$ 可归纳表示为  "$0$ 的后继的后继的后继", 如用
$\lambda$ 函数表示, 设后继操作 $succ$ 表示为 $f$, 自然数 $0$ 表示为 $x$, 即

$$\lambda f x . f (f (f x))$$

这一种数据 *encoding* (*编码*) 方法定义出来的数字, 又称作 *Church numerals*
(没错, 是 Alonzo Church 的 Church).  在此基础上, 我们便可以定义该数据类型上的
*operations* 了, 如 *addition* (*加法*)

$$add \equiv \lambda m n f x . m f (n f x)$$

如 $1 + 1$ 的计算过程

$$
(\lambda m n f x . m f (n f x)) (\lambda s z . s z) (\lambda s' z' . s' z') \\\\
= _\beta (\lambda n f x . (\lambda s z . s z) f (n f x)) (\lambda s' z' . s' z') \\\\
= _\beta \lambda f x . (\lambda s z . s z) f ((\lambda s' z' . s' z') f x) \\\\
= _\beta \lambda f x . (\lambda s z . s z) f (f x) \\\\
= _\beta \lambda f x . f (f x) \equiv 2
$$

也许你仍觉得加法的定义比较晦涩, 那么大可这么理解, 加法是将 $x$ 进行 $n$ 次 $f$
执行, 再将结果进行 $m$ 次 $f$ 执行的一个过程.  那么 $x$ 总共就被 $f$ 执行了
$m + n$ 次, 而 $m$ 与 $n$ 恰好就是加法定义中的形式参数.

有了加法, 自然就有了 *multiplication* (*乘法*)

$$mul \equiv \lambda m n f x . m (n f) x$$

注意到 $m$ 将 $(n f)$ 展开了 $m$ 次, 每一个被展开的项中 $n$ 再将 $f$ 展开了 $n$
次, 这就实现了 $f$ 的 $m \times n$ 次展开.  其他的操作, 如后继操作 $succ$ (即
$1 + n$), 前驱操作 $pred$ (这一操作的定义比较复杂 [†][1]), 减法操作
$monus$ (由于没有负数的概念, $0 - 1 \equiv 0$ 是成立的, 因此此操作也并不叫
$minus$) 都可以相继定义.

### 布尔代数 $boolean$

除了自然数, 我们还可以定义 *boolean algebra* (布尔代数), 如 $true$ 和 $false$
可定义为

$$
true \equiv \lambda x y . x \\\\
false \equiv \lambda x y . y
$$

为什么返回第一个参数的函数要被定义为 *真* 呢?  这其实来自于我们天然的说话习惯,
即 *if $p$ then $x$ else $y$* (*如果 $p$ 那么 $x$ 否则 $y$*), 假设 $p$ 在此成立
(为 *真*), 那么 $x$ "这句话" 是肯定的, 否则 $y$ 是肯定的.  顺便说, 刚刚提到的
"这句话" 的说法, 在数学逻辑中称为 *proposition* (*命题*).  这种说话方式的存在,
要求了 $true$ 函数保证 $x$ 的返回, $false$ 保证 $y$ 的返回, 便自然如此定义了.

刚提到的语言习惯, 我们可以定义成布尔代数的一种 *selector* (*选择器*), 即

$$
if-then-else \equiv \lambda p x y . p x y \equiv id(p, x, y)
$$

没错, 它只是 $p, x, y$ 的 identity function.  例如对一次执行过程进行分支选择,
当判断条件为 $true$ 时即有

$$
if\ true\ then\ x\ else\ y \\\\
\equiv (\lambda p x y . p x y)\ true\ x\ y \\\\
= _\beta x
$$

有了 $if-then-else$ 之后, $and$/$or$/$not$ 这些 operations 的定义也不难了

$$
and \equiv \lambda p q . if\ p\ then\ q\ else\ false \\\\
or \equiv \lambda p q . if\ p\ then\ true\ else\ q \\\\
not \equiv \lambda p a b . p b a
$$

### 整数 $\mathbb{Z}$

联系上文, 有了无符号的自然数, 如何定义有符号的整数呢?  这里需要一些先验的知识,
当时将这个问题抛给自己的时候并没能想出来...  就是因为整数的定义比较跳跃,
就像在证明一个定理之前, 总是或多或少会有一些 *lemma* (*引理*).

### 有序对 $pair$

没错, *(ordered) pair* (*有序对*) 就是上一个问题的 "引理", 它形如 $(1, 2)$,
像是一个只能存放两个元素的 *list* (*列表*), 而且元素间存在顺序关系.  一个有序对
$pair$ 的 *constructor* (*构造器*) 长这样

$$pair\ x\ y \equiv \lambda x y f . f x y$$

即它将两个元素 $x$ 和 $y$ 封装在一个形如 $\lambda f . f x y$ 的函数中,
供用户传入这个有序对的 operations.  它的两个基本 operations 为

$$
fst \equiv true \\\\
snd \equiv false
$$

$fst$ (*first*) 即取出第一个元素, $snd$ (*second*) 取出第二个.

### 列表 $list$

有了有序对后, 就可以定义列表 $list$ 了, 这也是为什么许多 Lisp 方言中的 list
本身也是一个有序对的原因: 归纳定义数据类型带来的极大便捷性.  我们定义 $list$
的节点是一个有序对, 并有相应的 operations 来支持列表的基本操作

$$
nil \equiv false \\\\
cons \equiv pair \\\\
head \equiv fst
$$

如一个列表 $(1,\ 2,\ 3)$ 可以这样构造

$$
cons\ 1\ (cons\ 2\ (cons\ 3\ nil))
$$

实质上就是这样一个有序对

$$
(1,\ (2,\ (3,\ nil)))
$$

不过, $list$ 不只有这一种定义的方法, 这里为了简化 $list$ 的概念, 使用了一个
$pair$ 作为节点的列表的定义.

### 整数 $\mathbb{Z}$, again

截止到这, 简单数据类型的编码在思想上应该跨度不大, 难度适中, 而重新回顾一下整数,
我们到底应该如何定义它呢?  答案就是整数 $\mathbb{Z}$ 同样也是一个 $pair$,
它的第一, 二个元素的类型都是自然数 $\mathbb{N}$, 如 $(a, b)$ 就代表着整数
$a - b$, $(1, 2)$ 就是整数 $-1$, $(6, 7)$ 也同样是 $-1$, 它们的和就是俩元素之和
$(1 + 6, 2 + 7) = (7, 9) = -2$, 如此神奇, 而减法也就是加上被减数的负数,
所以便有如下 operations 定义了

$$
negZ \equiv \lambda n . pair\ (snd\ n) (fst\ n) \\\\
addZ \equiv \lambda m n . pair\ (add\ (fst\ m) (fst\ n)) (add\ (snd\ m) (snd\ n)) \\\\
subZ \equiv \lambda m n . addZ\ m (negZ\ n)
$$

## 更多

本文章主要围绕的领域除了 $\lambda$-算子, 后面编码部分其实称作 Church encoding
(邱奇编码), 主要的贡献者都是数学家 Alonzo Church.  但是在编码过程中, 我们对
*类型* 这一概念还停留在 *convention* (*思维惯例*) 之上, 并没有给出严谨定义,
这样我们就不能对运算等 operation 和不同数值之间进行 *type checking* (*类型检查*)
这类规约了 (比如用布尔值进行整数运算等等, 结果无法预支甚至错误), 下一篇将会讲
*data type* 有关的知识.

- 延伸阅读
    + [Foundations of Functional Programming Languages (Andrés Sicard-Ramírez) [pdf]](http://www1.eafit.edu.co/asr/courses/foundations-of-functional-programming-languages/ffpl-slides.pdf)
    + [Church encoding](https://en.wikipedia.org/wiki/Church_encoding)
    + [ISWIM](https://en.wikipedia.org/wiki/ISWIM), $\lambda$-算子 作为编程语言

[1]: https://en.wikipedia.org/wiki/Church_encoding#Table_of_functions_on_Church_numerals
