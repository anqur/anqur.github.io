# `maybe<T>` 与调用规范

之前基友和我聊到 V8 的一些源码的东西, 他和我提到 V8 的代码库中大量的使用到了
`v8::Maybe<T>` 这一数据结构, 我便花了点时间走马观花地研究了一番.

谈论 Maybe 结构不得不从 Haskell 说起, `v8::Maybe<T>` 的结构也提到了其直接来源是
Haskell 中的
[`Data.Maybe`](https://hackage.haskell.org/package/base-4.10.1.0/docs/Data-Maybe.html).
Maybe 是一种带有选项性质的 monad, 当某变量或函数接收到了 Maybe 类型的值时,
它可能携带了某种其他类型 (如 `Int`) 的值, 也可能是所谓的 nil 值.  将此翻译成
Haskell 的语言的话, 如果携带具体的值 `a`, 那么将表示成 `Just a`, 如果为空,
那么将表示成 `Nothing`.

```haskell
returnSomething :: a -> Maybe a
returnSomething x = Just x
-- 或 returnSomething = Just

returnNothing :: a -> Maybe a
returnNothing x = Nothing
```

这样的结构有什么样的用处呢?  它主要围绕的是 *safety* 这一方面.  比如,
如果函数接收的用户输入有可能导致系统的异常抛出, 那么可以在其上层用 `Nothing`
隔绝好边界条件, 用 `Just` 返回执行结果, 假设我们要隔绝 *divide by zero*
这样的异常流程:

```haskell
safeDiv :: (Ord a, Floating a) => a -> a -> Maybe a
safeDiv a b
    | b == 0    = Nothing
    | otherwise = Just (a / b)
```

这样一来, 我们就不需要理解系统抛出的异常, 比如像 Haskell 那样去处理 `Infinity`
和 `-Infinity` 这些我们并不需要考虑的边界了.

> * 可事实上, 并没有那么多上班能写 Haskell 的梦想中的工作的 :)
> * 即使有, 工作量都集中在代码维护上了吧...

接下来要做的, 就是将这样一种机制搬到 C++ 上去.  我们并不需要去生搬硬套 monad
的概念到 C++ 中去, 只要实现其相应的行为接口, 使用泛型来覆盖大部分类型的操作,
维护相应的内部状态即可 (有趣的是, 维基百科中 monad 的词条第一个例子就是 Maybe).
相对完整的实现可以阅读这个 [仓库](https://github.com/anqurvanillapy/maybe)
的代码, 但是这里要讨论一些实现方面的细节:

`from_maybe` 接口用于接收一个类型为 T 的值 `v`, 如果此 Maybe 对象内部为
`Nothing` 则返回 `v`, 相当于默认值, 否则返回内部对象的值.

```cpp
template <typename T>
inline T
maybe<T>::from_maybe(const T& v) const
{
    return has_value_ ? value_ : v;
}
```

`from_just` 接口在内部为 `Nothing` 时要注意抛出异常.  值得一提的是, 在 V8
源码的声明中这种情况被标注为 *unlikely*, 说明这种情况一般是致命 (fatal) 的,
需要编程人员避免.  所以在此我也考虑直接抛出 `std::runtime_error`.

```cpp
template <typename T>
inline T
maybe<T>::from_just() const
{
    if (!is_just()) throw std::runtime_error("from_just: nothing");
    return value_;
}
```

`operator==` 的操作符重载实现比较巧妙, 可以耐心读一读, 当然我直接抄的 V8 了...
`operator!=` 则是前者的取反情况.

```cpp
template <typename T>
inline bool
maybe<T>::operator==(const maybe& other) const
{
    return (is_just() == other.is_just())
        && (!is_just() || from_just() == other.from_just());
}

template <typename T>
inline bool
maybe<T>::operator!=(const maybe& other) const
{
    return !operator==(other);
}
```

最后, 根据现实的使用场景, 应将 `maybe<T>` 的 ctors 默认设置为私有, 由友元类型
`just<T>` 和 `nothing<T>` 来构造.

```cpp
template <typename T>
maybe<T>
nothing()
{
    return maybe<T>();
}

template <typename T>
maybe<T>
just(const T& v)
{
    return maybe<T>(v);
}
```

讲到这里, 我们不妨思考一下为什么这样的数据类型成为了 V8 中的主流, 或者换个角度,
甚至在 Rust 语言中, 类似 Maybe 的 `std::option::Option` 类型的模式匹配以及其
`expect`, `unwrap` 的使用已经成为公认的最佳实践?

## 调用规范

我们可以从一些历史来追溯有关函数调用规范的探讨.

### 1. GNU/Linux syscall

在 GNU/Linux 操作系统中的系统调用中, 我们遵循着成功返回 0 或具体数值,
返回负值则代表出错的规范, 出错时 OS 设置好了相对应的 `errno` 可供 `perror`
等接口使用.  这也是为什么 `getchar` 的返回值类型是 `int` 的原因.

```c
#include <stdio.h>
#include <fcntl.h>

int
main()
{
    // 假设 foo.txt 不存在.
    int fd = open("foo.txt", O_RDONLY);
    if (fd < 0) {
        perror("open error");
        // Output:
        // open error: No such file or directory
    }

    return 0;
}
```

### 2. C/C++ 应用中返回数值或指针的场景

很多 C/C++ 的大项目遵循的是返回 0 和非 0 值来分别表示成功和异常, 用 `!`
操作符来判断函数返回值的情况.  在我接触到的大项目中, 还有 *单入口, 单出口*
这样的一些规范, 防止代码中多个 `return` 造成阅读上的障碍, 专注于返回值的设置,
如果需要跳出函数, 则使用 `goto` 调到函数的末尾的 `return` 即可.

```c
int
foo()
{
    return 0; // oops something bad :(
}

int
bar()
{
    int ok = foo();
    int ret;

    // ! 操作符派上用场.
    if (!ok) {
        ret = 0; // bad :(
        goto exit;
    }
    ret = 1; // good :)

    // 单入口单出口的设计.
exit:
    return ret;
}
```

`!` 操作符同样可以操作 `NULL` 空指针的情况, 配合 值传递/引用传递,
这一种规范几乎在 C/C++ 项目中处于统治地位.  值得一提的是, C++
中的引用总是取到一个在内存中实际存在的区域, 所以本质上引用是不存在 nil
值这样的概念的, 当然了, `std::shared_ptr<T>` 便是个奇葩的存在.

### 3. C++ 应用中抛出异常的场景

这个其实也不用多说, 熟悉 Python/Java/... 的应该都能理解, 但是抛出异常在 C++
中可不是什么好事, 它把抛出异常的位置到捕捉异常的位置的中间过程给忽略了,
而且如果选择不忽略, 容易被大量的 `try`/`catch` 代码块影响源码的结构.  更糟的是,
stacktrace 什么的在一些主流的标准 C++ 运行时中被直接清理掉了, 在
production/release 那样的情况下难以追踪源码位置.  除此之外, 如果使用 C++11,
还需要注意配合 `[[noreturn]]` (一种 attribute specifier) 和 `noexcept`
(一种操作符) 这样的手段控制编译器的优化过程.

大项目中使用异常抛出的情况不多见, 我个人喜欢用它标记一些致命错误, 或者看作是
Go 中的 `panic` 来使用, 当然 `std::terminate` 带来的 `std::abort` (其实就是 C
标准库中的 `abort`) 会直接宕掉进程, 并且专用于异常流程, 和 `exit` 的流程不同.

### 4. Go 中的 `error` 类型

Go 中除了 goroutine 的  `panic` 及其 `recover` 的捕获, 最经典的当然是 `error`
类型的使用了.

```go
package main

import "errors"

func Foo() error {
    return errors.New("oops")
}

func main() {
    if err := Foo(); err != nil {
        panic(err)
    }
}
```

很容易理解没错, 但是这个 `error` 类型的用法难道不像 Maybe 吗?  试问下自己,
它是为什么可以和所谓 `nil` 进行比较判断的呢?  难道它是一个指针吗?  其实并不然,
查阅文档就能发现其实 `error` 的本质是一个 `interface`, 而此类型在 Go 中是允许
nil 值的, 所以和指针等概念并没有本质联系.

### 5. Python/Lua 等脚本语言的效仿

Python 和 Lua 或其他的脚本语言虽然各有各的错误处理方法, 但是因为弱类型的特性,
完全可以模仿 Go 的风格去做调用规范, 比如以下 Lua 代码:

```lua
local function foo()
  -- 第一个为数据, 第二个为错误信息.
  return 42, nil
end

local function bar()
  -- 忽略返回值, 返回一个错误.
  local _, _ = foo()
  return nil, "oops"
end

-- 类似 Go 的风格.
local val, err = bar()
if val == nil then
  error(err)
end
```

当然, 看着像是像, 但是和 `error` 包裹错误信息字符串, 本身可表示 nil
值的特性是完全不同的, 这样的做法把已经把两者撕裂了.

### 6. Rust 的 `std::option::Option`

Rust 的这一种数据类型其实就是给 `maybe<T>` 中的 `T` 赋予了模式匹配的自由.

```rust
fn foo(v: Option<i32>) {
    match v {
        // 类似 Just 42, 只要 42 的情况.
        Some(42) => println!("ok luvin it"),
        // 其他 i32 值的情况.
        Some(_) => println!("ok tho"),
        // 类似 Nothing.
        None => eprintln!("oops")
    }
}

fn main() {
    foo(None);
}
```

`unwrap` 和 `expect` 也非常常用, 两者的用方法都是在 `Option` 变量为 *非 `None`*
的情况下将其从 `Some(v)` 中取出, 如果是 `None` 则会 panic.

```rust
fn main() {
    let x: Option<i32> = None;
    x.unwrap();         // panics, 但是没有自定义的错误信息
    x.expect("oops");   // panics, 自定义的错误信息为 "oops"
}
```

### 结论

Maybe 即可以简单地为程序提供安全的错误处理, 又能类似 Go 语言那样封装一个 `error`
类型来处理错误, 当然在 C++ 里可能得配合 `std::tuple` 和其参数 打包/解包 的使用,
总之有很多种用处.  而在年龄稍老的动态语言里, 以及 Go, Rust 这样的年轻语言里,
我们都能看到类似 Maybe 的错误处理方法, 从使用和可读性上都有一定的优势, 虽然没有
`int` 返回那样的高效 (相当于会有许多碎片化的结构体在 caller/callee 中传递),
但是如果有高效的 runtime 支持, 以及在注重 scalability 的大项目中严格规范,
我想是能在 C++ 中获得良好的系统内外的回报的.

> 说了那么多还是觉得 Rust 里头用的实在太爽 :)
