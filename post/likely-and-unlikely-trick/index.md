# likely 与 unlikely 技巧

在阅读很多大型项目的代码的时候, 很容易看到 `likely`/`unlikely` 这样的 macro,
比如在 V8 中对于这两个 macro 的定义是这样的:

```cpp
// A macro to provide the compiler with branch prediction information.
#if V8_HAS_BUILTIN_EXPECT
# define V8_UNLIKELY(condition) (__builtin_expect(!!(condition), 0))
# define V8_LIKELY(condition) (__builtin_expect(!!(condition), 1))
#else
# define V8_UNLIKELY(condition) (condition)
# define V8_LIKELY(condition) (condition)
#endif
```

又如在 ZeroMQ 的核心库 libzmq 中是这样定义的:

```cpp
#if defined __GNUC__
#define likely(x) __builtin_expect ((x), 1)
#define unlikely(x) __builtin_expect ((x), 0)
#else
#define likely(x) (x)
#define unlikely(x) (x)
#endif
```

Linux 内核代码中也有, 在这里不再列出.  两者结合阅读给我们提供了这样的一些信息:

* 这个 macro 提供了和 branch prediction 有关的功能
* `__GNUC__` 说明这个功能专属于 GCC
* 核心关键字是 `__builtin_expect` 这个编译期调用

使用场景如何呢?  让我们来看看 ZeroMQ 中创建 socket 的逻辑:

```cpp
zmq::socket_base_t *zmq::ctx_t::create_socket (int type_)
{
    scoped_lock_t locker (slot_sync);

    if (unlikely (starting)) {
        if (!start ())
            return NULL;
    }

    // 省略以下具体创建 socket 的操作...
}
```

在 ZeroMQ 中, *ctx* (即 *context*) 意味着它是一个管理 I/O 或 socket 的 *线程*
(有别于 OS 和用户态中的 *线程*, 具体概念及职责参见
[ZeroMQ 白皮书](http://zeromq.org/whitepapers:architecture)),
是一个初始化比较耗时的结构, 这段代码的逻辑比较直接, 结合 `unlikely` 关键字,
可以猜测这样一个角度:

> 在用户创建 socket 的情况下, 第一次可能需要开启相应的 ctx, 但是之后的创建
socket 行为下 ctx 不可能没有启动.

所以不得不说, 这是一个显著提高可读性的一种批注 (annotation),
但它仅仅只是个批注吗?  当然不是, 不妨写代码测试一下 `__builtin_expect` 的效用:

```c
#include <stdio.h>
#include <stdlib.h>

// 防止警告未使用变量.
#define UNUSED(x)       ((void)x)

// 标记不期盼发生的分支.
#define UNLIKELY(cond)  (__builtin_expect(!!(cond), 0))

// 防止过程 inline 以增加汇编代码可读性.
#define NOINLINE        __attribute__((noinline))

static int NOINLINE
foo()
{
    return 42;
}

static int NOINLINE
bar()
{
    return 69;
}

int
main(int argc, const char* argv[])
{
    UNUSED(argc);

    // 使用 argv 防止编译器过度优化.
    int a = atoi(argv[1]);
    int b = atoi(argv[2]);
    int c;

    // 参数 a != b 的情况不大可能发生, 理想情况下优先执行 bar() 分支.
    c = UNLIKELY(a != b) ? foo() : bar();
    printf("%d\n", c);

    return 0;
}
```

程序的输出结果就不多说了, 重点应该查看输出的汇编指令长什么样, 使用以下命令:

```bash
$ gcc unlikely.c -S -O3; cat unlikely.s
```

抽取重要的部分来看, 汇编代码大概长这样:

```asm
    // a 和 b 相减的值和 0 比较, 不相等则跳到 .L8 执行 foo.
    movl $0, %eax
    jne .L8
    // a 和 b 的值相等则执行 bar.
    call    bar
.L6:
    // 指定寄存器取得返回值赋给 c, printf 输出.
    call    __printf_chk@PLT
    // 恢复调用栈并退出进程.
    ret
.L8:
    call    foo
    jmp .L6
```

将 `UNLIKELY` macro 删除再输出汇编指令, 即:

```c
// c = UNLIKELY(a != b) ? foo() : bar();
c = a != b ? foo() : bar();
```

将会变成:

```asm
    // a 和 b 相减的值和 0 比较, 相等则跳到 .L5 执行 bar.
    movl $0, %eax
    je .L5
    // a 和 b 的值不相等则执行 foo.
    call    foo
.L6:
    // 指定寄存器取得返回值赋给 c, printf 输出.
    call    __printf_chk@PLT
    // 恢复调用栈并退出进程.
    ret
.L5:
    call    bar
    jmp .L6
```

不难看出, 有了 `UNLIKELY` 标记的分支被提到了前面, 原因就在于 branch prediction.
CPU pipeline 在准备要执行 `jne .L8` 的逻辑的时候 (执行相关微程序), 已经 fetch
到了 `call bar` 等未来可能会执行的语句, 所以在这个情况下不会让 CPU pipeline
舍弃掉已经取得的分支代码.  `__builtin_expect` 的功能也便不言而喻了:

* 提高代码的可读性, 对程序逻辑提供有益的标注
* 给 CPU 的 branch prediction 提供良好的信息

为什么能提高代码的可读性呢?  想象一下这样的代码:

```c
if (started) {
    do_something();
} else {
    start();
}
```

这样如果 `do_something()` 部分的逻辑过长, 多一个缩进层次会影响代码的阅读.
所以一般而言可以提前检查不大可能发生的边界条件:

```c
if (!started) {
    start();
    return;
}

do_something();
```

在此基础上, 添加 `unlikely` 还能降低 CPU 在分支判断上的损耗.  至此也可以了解到,
branch predictor 不仅有对分支的使用进行概率统计并作出判断这种高级的功能, CPU
pipeline 对代码的 prefetch 也对 branch prediction 做出了贡献.

## 其他注意事项

对于 分支/代码逻辑 带来的性能瓶颈而言, 最好的办法当然是检查 code coverage 了,
官方文档在介绍 `__builtin_expect` 时也推荐使用 `-fprofile-arcs -ftest-coverage`
的 flag 配合 `gcov` 工具产生分析报告, 因为程序员对自己在逻辑分支的设计上,
一般很难拿捏准确.

其次, 在 C++11 及以上标准中, 要考虑到用户对类的 `operator bool` 的重载, 最好使用
`__builtin_expect(static_cast<bool>(cond), 0)` 这样的方式进行类型转换,
以准确地调用到用户自定义的真值判断逻辑.

最后吐槽一句, 编译器是真的很聪明的, 写一个优化后还能看得懂汇编的例子着实不容易
:(.
