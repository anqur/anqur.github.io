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
* 什么是沿着 $f$ 的 pullback
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

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsMyxbMCwwLCJYIl0sWzEsMSwiWSJdLFsyLDAsIlgnIl0sWzAsMSwiZiJdLFsyLDEsImYnIiwyXV0=&embed" width="432" height="304" style="border-radius: 8px; border: none;"></iframe>

因为在拓扑学及集合论中, pullback 的概念总是和 fiber bundle (纤维丛) 与 cartesian product
(笛卡尔积) 等概念扯上关系, 我们又可以称 pullback 为 fiber product (纤维乘积).
在这里我们不会展开讨论. 但在以上场景当中, 我们总会有这样一种正方形交换图:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNCxbMCwxLCJYIl0sWzEsMiwiWSJdLFsyLDEsIlgnIl0sWzEsMCwiWCBcXHRpbWVzX1kgWCciXSxbMCwxLCJmIl0sWzIsMSwiZiciLDJdLFszLDAsInBfMSJdLFszLDIsInBfMiIsMl1d&embed" width="491" height="432" style="border-radius: 8px; border: none;"></iframe>

$p_1$/$p_2$ 的含义即 first/second projection (第一/第二的投射), 类似编程语言中的 pair
(二元组, 键值对, 有序对, ..., etc), 取它的 `p[0]` 和 `p[1]` 的操作.

### Property 1.2 (pullback-universal)

Pullback 具有以下 universal property (泛性质): 如果有一个对象 $W$, 它到 $X$ 和 $X'$
的态射经过相应到 $Y$ 的组合都相等, 则它有一个到 $X \times_Y X'$ 的 unique morphism
(特有态射) $m!$, 即以下交换图:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNSxbMSwxLCJYIFxcdGltZXNfWSBYJyJdLFszLDEsIlgnIl0sWzMsMywiWSJdLFsxLDMsIlgiXSxbMCwwLCJXIl0sWzAsMSwicF8yIiwyXSxbMSwyLCJmJyIsMl0sWzAsMywicF8xIl0sWzMsMiwiZiJdLFs0LDAsIm0hIiwxXSxbNCwzLCJwXzEnIiwyXSxbNCwxLCJwXzInIiwxXV0=&embed" width="619" height="560" style="border-radius: 8px; border: none;"></iframe>

### Definition 1.3 (pullback-along-$f$)

"沿着 $f$ 的 pullback" (pullback along $f$), 或者 "设一个范畴 $C$, 存在一个 $C$ 的态射
$f : X \to Y$, 有一个沿着 $f$ 的 pullback", 这样的说法顾名思义, 指的是这样一个交换图:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNCxbMCwwLCJYIFxcdGltZXNfWSBYJyJdLFswLDEsIlgiXSxbMSwwLCJYJyJdLFsxLDEsIlkiXSxbMCwxXSxbMCwyXSxbMiwzXSxbMSwzLCJmIl1d&embed" width="300" height="300" style="border-radius: 8px; border: none;"></iframe>

## Slice category

Slice category 又称 overcategory (顶部范畴), 非常形象, 它将某个对象从范畴中抽取出来,
将所有指向这个对象的态射当作新的对象, 放到新的范畴中, 也就是形容 "将处在 (over)
某对象顶部的态射都取出来" 这样一种动作. 我们来进一步看看这样一种定义.

### Definition 2.1 (slice-category)

设范畴 $C$ 和范畴内的一个对象 $X$, 一个在 $C$ 中关于 $X$ 的 slice category $C/X$ 包含:

* 它的对象 $f \in C$ 是 $C$ 中的态射, 并且满足 $cod(f) = X$ (即 $f$ 的 codomain/余域
  为 $X$)
* 它的态射 $g : X \to X' \in C$, 连接了 $f : X \to Y$ 和 $f' : X' \to Y$, 并有
  $f' \circ g = f$ 的关系

即以下的交换图中:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsMyxbMCwxLCJYIl0sWzEsMCwiWCciXSxbMSwxLCJZIl0sWzEsMiwiZiciXSxbMCwyLCJmIiwyXSxbMCwxLCJnIiwwLHsic3R5bGUiOnsiYm9keSI6eyJuYW1lIjoiZGFzaGVkIn19fV1d&embed" width="304" height="304" style="border-radius: 8px; border: none;"></iframe>

$f$ 和 $f'$ 是 $C/X$ 的对象, $g$ 是 $C/X$ 的一个态射.

## Base change

正如 [Definition 1.1 (pullback)](#definition-1.1-pullback) 里的正方形交换图所示,
$p_1$ 其实就是 $f$ 的一个 base change, 即 $f$ 的 base (基底) 本来是 $Y$, 我们把它改为
$X$, 也就是对应了态射 $p_1$. 我们继续来看定义.

### Definition 3.1 (base-change)

对于文章开头我们需要的证明的函子 $f^* : C/Y \to C/X$, 我们通过 $f^*$ 得到的态射,
就是某个对象 $f \in C/Y$ 对应的 base change.

没错, 我们终于回到了正题, 如何推导出 $f^*$ 呢?

## $f^*$

在讨论这个证明之前, 我们需要讨论一个概念, 什么是范畴的 equivalence (全等)?

### Intuition 4.1 (equivalence)

在这里我们不会给出准确的定义, 准确的定义要求 equivalence 是一个 pair, 它包含两个所讨论范畴的
section 和 retraction, 我们这里不深究每个概念.

这里需要一个直觉, 你可以简单理解为, 两个范畴 $C$ 和 $D$ 之间有相互的函子, 一个对象 $X \in C$
它能够通过相互间的函子映射到对面, 再映射回自己, 而其他对象如 $Y \in D$ 也应如此. 这时, 我们说
$C \equiv D$, 范畴 $C$ 和 $D$ 是 equivalent 的.

### Lemma 4.2 (cx-equiv-cyf)

证明 $f^*$ 之前, 我们需要证明一个引理:

$$
C/X \equiv (C/Y)_{/f}
$$

简单来说, 就是我们构造出 $(C/Y)_{/f}$ 这样的范畴, 它将范畴 $C/Y$ 中抽出对象 $f$, 再进行一次
slicing (切片) 的操作; 这样的范畴和 $C/X$ 是全等的.

你可能在想, $C/Y$ 中的对象都是态射, 那么 $(C/Y)_{/f}$ 中的对象就是指向 $f$ 的态射咯?
那岂不是态射的态射? 这样的东西长什么样子呢?

根据 [Definition 2.1 (slice-category)](#definition-2.1-slice-category), 不难发现,
$(C/Y)_{/f}$ 中的对象其实就是那个 $g$, 即:

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNCxbMCwyLCJYIl0sWzIsMCwiWCciXSxbMiwyLCJZIl0sWzQsMCwiWCcnIl0sWzAsMSwiZyIsMCx7InN0eWxlIjp7ImJvZHkiOnsibmFtZSI6ImRhc2hlZCJ9fX1dLFswLDIsImYiXSxbMywyXSxbMCwzLCJnJyIsMCx7InN0eWxlIjp7ImJvZHkiOnsibmFtZSI6ImRhc2hlZCJ9fX1dLFsxLDJdXQ==&embed" width="688" height="432" style="border-radius: 8px; border: none;"></iframe>

这里的 $g$ 和 $g'$ 都是 $(C/Y)_{/f}$ 的对象.

<iframe class="quiver-embed" src="https://q.uiver.app/?q=WzAsNixbMiwyLCJYIl0sWzQsMCwiWCciXSxbNCwyLCJZIl0sWzYsMCwiWCcnIl0sWzIsMCwiWCBcXHRpbWVzX1kgWCciXSxbMCwyLCJYIFxcdGltZXNfWSBYJyciXSxbMCwxLCJnIiwwLHsic3R5bGUiOnsiYm9keSI6eyJuYW1lIjoiZGFzaGVkIn19fV0sWzAsMiwiZiJdLFszLDJdLFswLDMsImcnIiwwLHsic3R5bGUiOnsiYm9keSI6eyJuYW1lIjoiZGFzaGVkIn19fV0sWzEsMl0sWzQsMV0sWzQsMF0sWzUsMF0sWzQsNSwiIiwxLHsic3R5bGUiOnsiYm9keSI6eyJuYW1lIjoiZGFzaGVkIn19fV0sWzEsMywiIiwxLHsic3R5bGUiOnsiYm9keSI6eyJuYW1lIjoiZGFzaGVkIn19fV1d&embed" width="600" height="400" style="border-radius: 8px; border: none;"></iframe>
