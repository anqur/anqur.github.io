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

Pullback 又称为 fiber product (纤维乘积), 它在直觉上像是一种表达 equality (相等性)
的东东, 我们在后文会讨论到这一直觉. 但请注意, 在类型论中 identity, equivalence, equality
等概念皆有不同的含义, 其对应的 categorical semantics (范畴语义) 上表达了不同的数学对象,
这些含义粗略地统称 "sameness" (相等), 需要严格区分开来.

### Definition 1.1

Pullback 就是长得像以下交换图的一个 limit (极限):

