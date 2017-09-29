# C 中的无限循环

使用 C 语言能够写出多少种无限循环呢?  这个问题可能是没有什么实际意义的,
你可以说不过是对地址跳转指令的一系列抽象而已.  然而这不妨我们对 C 标准库和 POSIX
标准函数做一些其他方面的理解和扩展.

让我们来数数有多少种实现无限循环的可能.

首先我们定义一个测试用的函数, 这个函数模拟一个半人半神的哲学家, 他只会思考,
并不会拿起筷子来吃东西.

```c
void
think()
{
    printf("thinking w/o eating...\n");
    sleep(1);
}
```

## `while (1) {}`

个人目测 C 程序员相对最熟悉的应该是 `while` 写出来的无限循环, 语义上也相对清晰.
不过如 ANSI C 的标准中并没有布尔类型的概念, 非零值代表着真值.  `while (true);`
属于 C++ 的世界.

```c
void
infini_while()
{
    while (1) think();
}
```

## `do {} while (1);`

有 `while` 自然就可以转换为 *do-while*, 当然语义不同, 编译出来的指令也不同,
可以猜想一下指令会是怎样然后 `-S` 验证一番.

```c
void
infini_do_while()
{
    do { think(); } while (1);
}
```

## `for (;;) {}`

使用 `for` 来实现无限循环只能证明一点, 那就是此人一定是个热衷 UNIX 的开发者...
值得一提的是, 它编译出来的指令和 `while (1);` 是一致的.

```c
void
infini_for()
{
    for (;;) think();
}
```

##　`goto`

关于 `goto` 程序员总是能引出无数的长篇大论, 然而我相信大多数人都能把它用得好
(除非想换份工作了).

```c
void
infini_label()
{
loop:
    think();
    goto loop;
}
```

## `setjmp.h`

使用 `setjmp`/`longjmp` 进行跳转并不仅仅涉及到最底层的一些跳转指令, `jmp_buf`
保存了执行 `setjmp` 时的 CPU 上下文和一些相关调用环境, 不过这个用法类似 C++
中的异常抛出, 不恰当的使用可能会导致内存泄露.

```c
void
infini_setjmp()
{
    static jmp_buf buf; // 用于保存上下文
    setjmp(buf);
    think();
    longjmp(buf, 0);    // 跳转, 转换上下文, 并且使 `setjmp' 返回 0
}
```

## `ucontext.h`

使用 `setcontext`/`getcontext` 类似使用 `setjmp`/`longjmp` 之流,
不过语义上更加注重上下文的设置和保存, `getcontext` 会保存 PC,
所以以下的代码中调用 `setcontext` 的时候会重新将 PC 设置到 `think` 调用之前.

```c
void
infini_ucontext()
{
    ucontext_t ctx;
    getcontext(&ctx);
    think();
    setcontext(&ctx);
}
```

其他的尝试未来也许会更新.  当然直接在 C 中插入 `__asm__`
来放入相关的指令代码是完全可行的, 目前不想这么折腾.
(除非未来我想做个跨平台的协程库? *:)*)
