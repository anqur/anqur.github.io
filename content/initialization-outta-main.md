# 初探进程的动态初始化

其实标题比较迷惑, 随笔而已.

关于 Linux 程序 (ELF 格式) 的静动态链接以及进程的装载, 自己接触的并不多.
最近看了 jemalloc 的
[论文](https://people.freebsd.org/~jasone/jemalloc/bsdcan2006/jemalloc.pdf),
在准备看一些实现的时候, 看到了 `__attribute__((constructor))` 和
`__attribute((destructor))` 这样的东西, 去查了下 GCC 的文档, 读起来是比较简单.

> The *constructor* attribute causes the function to be called automatically
before execution enters `main()`. Similarly, the *destructor* attribute causes
the function to be called automatically after `main()` has completed or `exit()`
has been called.

但是一往网上一查, 发现这样的特性如果考虑不当, 还是容易被编译器轻松地 *作弊*.
在 ELF 格式的可执行文件里, 管理非主函数初始化和反初始化逻辑的 section 有
`.init`, `.fini`, `.ctors`, `.dtors`, 前两个是有历史的东西,
后两个需要架构的支持, 但是现代计算机的架构应该是没有问题的, 而这不意味着 `.init`
和 `.fini` 是 deprecated 的, 他们执行的顺序是
`.init -> .ctors -> .main -> .dtors -> .fini`, 并且在编译前提供 `-init` 和
`-fini` 这样的 linker flags 即可, 但是组织代码的难度就有区别了,
前两个容易写成碎片化的 `.so` 对象, 而后俩则是在编译后维护了一张映射到函数的表,
由系统循环地执行, 我们可以执行一个测试测试代码看看.

```c
#include <stdio.h>

#define __section__(S) __attribute__ ((section(S)))

void
ctor()
{
    printf("before main\n");
}

void
dtor()
{
    printf("after main\n");
}

void (*pctor)() __section__(".ctors") = ctor;
void (*pdtor)() __section__(".dtors") = dtor;

int
main()
{
    printf("main\n");
    return 0;
}
```

编译时不需要其他的 flags.  从这里可以看到, 我只是把相应的函数的指针传递给了
`.ctors` 和 `.dtors` section.  程序运行情况想必都能预测.

有了这样的特性, 如果不是在 bare metal 那么硬核的场景下, 依赖 GCC
的扩展来写自己的共享库问题应该不大, 比如写一个管理内存的运行时,
可以用它方便地在 `.main` 之外做一些自定义工作, 尤其是内存管理机制的初始化.

在读源码时, 还看到了一个好玩的东西叫 `WINAPI`, 这个关键字确实在 Windows
编程太常见, 然而好玩的地方在它背后其实是 `__stdcall` 这个关键字, 一搜发现是
calling conventions 这样的领域, 还有一组专业名词叫 function prologue/epilogue,
其实就是一套定义函数 caller 和 callee 行为的一些规范, 比如哪些寄存器保存参数,
栈的内容怎么管理, 虽然栈管理的规范要丰富一些, 但是有些编译器优化会涉及到寄存器,
而且一般会很头疼, 比如看到云风老师在博客里描述的一个
[问题](https://blog.codingnow.com/2017/09/direct3d12_return_struct_calling_convention_bug.html),
就是结构体在返回给 caller 的时候被 GCC 优化, D3D 的接口在取返回的结构体地址时和
GCC 不统一, 直接把`this` 指针内容 (虚表) 写坏了.  我还留了个言问是不是 D3D
遵循了 `__vectorcall` 这样的规范, 然而自己没有精读过出错的代码,
怕是要被老师扁死.  不过如果真是这样的问题, GCC 自己有这样的关键字,
规避一下优化就好了.

写到这里, 才明白 *Linkers & Loaders* 这本书是时候找一找读一读了.
