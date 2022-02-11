# Base change, 如何推导 $f^*$

2022-02-11 | [Category theory](/#category-theory)

---

## 啥是 base change

Base change (变基) 是范畴论里很有趣的一个玩意儿, 顾名思义, 就是能够将基底变换的一种结构,
也许你现在听的还很懵圈, 但这篇文章的核心目的如下:

> 对于一个范畴 $C$, 有 $f : X \to Y$ 是 $C$ 中的态射, 如果有一个沿着 (along) 这个态射
> $f$ 的 pullback (拉回), 那么可以推导出 slice category (切片范畴) 上的函子 $f^*$:
>
> $$f^* : C/Y \to C/X$$

这篇文章的目的就是要证明这个定理, 搞清楚 $f^*$ 是如何推导出来的. 当然, 你现在一定更懵逼了.
要证明这个定理, 我们首先要理解以下几个概念及定义:

* 什么是 pullback
* 什么是沿着 `f` 的 pullback
* 什么是 slice category
* 什么是 base change

接着, 我们就能进一步给出证明了. 让我们沿着这几个问题出发.

## Pullback

Pullback 又称为 fiber product (纤维乘积), 它在直觉上像是一种表达 equation (等式) 的东东,
我们在后文会讨论到这一直觉. 但请注意, 在类型论中 equation, identity, equivalence,
equality 等概念皆有不同的含义, 其对应的 categorical semantics (范畴语义)
上表达了不同的数学对象, 这些含义粗略地统称 "sameness" (相等), 需要严格区分开来.

### Definition 1.1 (pullback)

Pullback 就是长得像以下交换图的一个 limit (极限):

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsMyxbMCwwLCJYIl0sWzEsMSwiWSJdLFsyLDAsIlgnIl0sWzAsMSwiZiJdLFsyLDEsImciLDJdXQ==&embed" width="300" height="300" style="border-radius: 8px; border: none;"></iframe>

因为在拓扑学及集合论中, pullback 的概念总是和 fiber bundle (纤维丛) 与 cartesian product
(笛卡尔积) 等概念扯上关系, 我们又可以称 pullback 为 fiber product (纤维乘积).
在这里我们不会展开讨论. 但在以上场景当中, 我们总会有这样一种正方形交换图:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNCxbMCwxLCJYIl0sWzEsMiwiWSJdLFsyLDEsIlgnIl0sWzEsMCwiWCBcXHRpbWVzX1kgWCciXSxbMCwxLCJmIl0sWzIsMSwiZyIsMl0sWzMsMCwicF8xIl0sWzMsMiwicF8yIiwyXV0=&embed" width="400" height="400" style="border-radius: 8px; border: none;"></iframe>

$p_1$/$p_2$ 的含义即 first/second projection (第一/第二的投射), 类似编程语言中的 pair
(二元组, 键值对, 有序对, ..., etc), 取它的 `p[0]` 和 `p[1]` 的操作.

### Property 1.1 (pullback-universal)

Pullback 具有以下 universal property (泛性质): 如果有一个对象 $W$, 它到 $X$ 和 $X'$
的态射经过相应到 $Y$ 的组合都相等, 则它有一个到 $X \times_Y X'$ 的 unique morphism
(特有态射) $m!$, 即以下交换图:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNSxbMSwxLCJYIFxcdGltZXNfWSBYJyJdLFszLDEsIlgnIl0sWzMsMywiWSJdLFsxLDMsIlgiXSxbMCwwLCJXIl0sWzAsMSwicF8yIiwyXSxbMSwyLCJnIiwyXSxbMCwzLCJwXzEiXSxbMywyLCJmIl0sWzQsMCwibSEiXSxbNCwzLCJwXzEnIiwyXSxbNCwxLCJwXzInIiwxXV0=&embed" width="400" height="400" style="border-radius: 8px; border: none;"></iframe>

### Definition 1.2 (pullback-along-$f$)

"沿着 $f$ 的 pullback" (pullback along $f$), 顾名思义.
