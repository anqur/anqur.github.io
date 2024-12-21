# JIT 学习笔记

现代动态语言 VM 的架构，通常由以下几个组件组成：

* Interpreter
* Baseline JIT compiler
* Optimizing JIT compiler

以 JavaScript 引擎为例：

![VM Architectures](https://sillycross.github.io/images/2023-05-12/vm-archs.png)

<small>
（图片来自：
<a href="https://sillycross.github.io/2023/05/12/2023-05-12/">Haoran Xu - Building a baseline JIT for Lua automatically</a>
）
</small>

然而，当我们搜索各种所谓“JIT 框架”时，得到的往往只是 JIT compiler 中 code generator、optimizer 等组件，例如：

* [LLVM](https://llvm.org)
* [libgccjit](https://gcc.gnu.org/wiki/JIT)
* [asmjit](https://asmjit.com/)
* [DynASM](https://luajit.org/dynasm.html)
* [Cranelift](https://cranelift.dev/)
* [MIR](https://github.com/vnmakarov/mir)
* [GNU lighting](https://www.gnu.org/software/lightning/)
* [GNU LibJIT](https://www.gnu.org/software/libjit/)
* ……，太多太多了

TODO
