# Koka 代数副作用入门

从 2014 年开始，有关于 Koka 的论文可以大致分为三类：

1. 讲述代数副作用（algebraic effect）的类型系统，尤其是 Koka 的 [第一篇论文]
2. 函数式编程语言的内存管理，在 GC 和 RC 之间发明了 Perceus
3. 代数副作用 runtime，要足够小到能编译成高效的 C 语言，否则 runtime 很重会增加负担

想要入门代数副作用，实际上只需要关心它的类型系统即可，其他的知识只在“如何实现代数副作用”有用。

[第一篇论文]: https://www.microsoft.com/en-us/research/publication/koka-programming-with-row-polymorphic-effect-types-2/

## 例子：副作用声明

我们使用类似 TypeScript 的语法来讲解代数副作用的例子，用 Agda 的语法来解释相关代码的类型。

假设我们有一个副作用叫做 `Rand`，表示“random”，获取随机数据，我们用 interface 来代替副作用的声明，这样有一点语法高亮能用：

```ts
interface Rand {
    rand(): number;
}
```

我们在任意表达式里面去用这个副作用：

```ts
function main(): /* Rand */ number {
    const a = 1 + rand();
    return a
}
```

这里的 `/* Rand */` 意思是函数 `main` 携带有 `Rand` 副作用，因为我们没有用任何 effect handler
去处理。

## 例子：副作用处理之 resume 一次（one-shot）

假设我们真要在 `main` 内部处理这个副作用，我们复用 try-catch 的语法，则长这样：

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand() {
            resume(42)
        }
    };
}
```

<!-- @formatter:on -->

这里需要注意一下 try-catch 是一个表达式，而不是执行语句（statement）。

`main` 的执行结果就是：

```js
main()
//=> 43
```

在这里我们的 effect handler 中的 `resume` 只执行了一次，如果一门语言只支持恢复一次，那它就叫做 one-shot 副作用系统。

### 相关表达式的类型

在这里我们要探究许多表达式的类型，因为他们可能会反直觉，或第一次见会很诡异。

我们知道 `rand` 这个 effect method 的类型是：

```agda
rand : () → ⟨Rand⟩ number
```

即，它不接收任何参数，并返回 `number` 类型，副作用是 `Rand`。

但是这个副作用对应的 handler，即下面这个表达式的类型（设名字为 `h0`），是不同的：

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand() {
//      ^~~~~~~~
            resume(42)
// ~~~~~~~~~~~~~~~~~~~
        }
// ~~~~~^
    };
}
```

<!-- @formatter:on -->

其类型为：

```agda
h0 : (resume: (result: number) → number) → number
--                     ^~~~~^    ^~~~~^    ^~~~~^
--                       |         |         |
--                      /          |        / 
-- 入参是 number 类型，这是由         +--------
-- `rand()` 这个表达式的类型决定的。   |
--                                 |
--                                /
-- resume 的返回值类型，和整个 handler 的返回值类型，
-- 其实就是整个 try-block 的类型，保持一致。
```

可以发现，Koka 它其实掩盖了 `resume` 这个参数，那么我们把它补全得更加地清晰：

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand(resume: (result: number) => number): number {
            return resume(42);
        }
    };
}
```

<!-- @formatter:on -->

甚至，如果你觉得 `resume` 不好听，JavaScript 的 Promise 里的 `resolve` 更好理解，那么同样能改成：

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand(resolve: (result: number) => number): number {
            return resolve(42);
        }
    };
}
```

<!-- @formatter:on -->

所以 `resolve` 在这里的意思大概就是：

> 我给 `rand()` 提供一个 `42` 这个数值，让接下来的计算步骤用它跑一次。

那如果跑多次，又会发生什么呢？

## 例子：副作用处理之 resume 多次（multi-shot）

多次继续（multi-shot）的结果也有些难理解，例如以下代码：

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand(resume: (result: number) => number): number {
            resume(42);
            return resume(69);
        }
    };
}
```

<!-- @formatter:on -->

`main` 的执行结果将会是：

```js
main()
//=> 70
```

虽然第一次执行的结果是 `43`，第二次是 `70`，但是只有第二次的结果被“观察”到了，这是因为第一次 `resume(42)`
返回的值，我们明显把它给忽略掉了。

## 例子：副作用处理之 resume 多次（2）

我们甚至可以把 `resume` 的结果再 `resume` 一次，能够猜出来以下代码输出什么捏？

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand(resume: (result: number) => number): number {
            return resume(resume(42));
        }
    };
}
```

<!-- @formatter:on -->

答案就是：

```js
main()
//=> 44
```

意思大概就是，try-block 第一次执行的结果得到 `43`，我们把它作为 `rand()` 的结果再去执行一次 try-block，得到 `44`。

## 例子：副作用处理之不 resume

假设我们不执行 `resume`，那么很简单理解，整个 try-block 的返回值，可以由我们随意决定。

<!-- @formatter:off -->

```ts
function main(): number {
    return try {
        const a = 1 + rand();
        a
    } catch (Rand) {
        rand(resume: (result: number) => number): number {
            return 42;
        }
    };
}
```

<!-- @formatter:on -->

输出：

```js
main()
//=> 42
```

加法计算被我们给整体忽略掉了。

## 作业

下面的超复杂的代码，能想到它会输出什么捏？

<!-- @formatter:off -->

```ts
interface Ask2 {
    ask0(): number;
    ask1(): number;
}

function main(): number {
    return try {
        const a = 1 + ask0() + ask1();
        a
    } catch (Ask2) {
        ask0(resume: (result: number) => number): number {
            return resume(resume(42));
        }

        ask1(resume: (result: number) => number): number {
            return resume(2);
        }
    };
}
```

<!-- @formatter:on -->

## 完整 Koka 可运行代码

直接使用 `brew install koka` 下载 Koka 编译器，`koka main.kk` 编译代码，执行输出的程序即可：

```kk
effect random
  ctl rand(): int

fun oneShot(): int
  with handler
    ctl rand() resume(42)
  1 + rand()

fun multiShot(): int
  with handler
    ctl rand()
      resume(42)
      resume(69)
  1 + rand()

fun nestedResume(): int
  with handler
    ctl rand() resume(resume(42))
  1 + rand()

fun noResume(): int
  with handler
    ctl rand() 42
  1 + rand()

effect ask2
  ctl ask0(): int
  ctl ask1(): int

fun homework(): int
  with handler
    ctl ask0() resume(resume(42))
    ctl ask1() resume(2)
  1 + ask0() + ask1()

fun main()
  println(oneShot())
  println(multiShot())
  println(nestedResume())
  println(noResume())
  println(homework())
```
