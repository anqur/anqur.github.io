# 十万个为什么之解释器

在各种解析器框架（例如 bison/flex、[chumsky] 等）的文档中，我们总能看到如何用其编写解释器（interpreter）的例子，那么这些最简单的例子是怎么一步一步进化成所谓的高性能
VM（virtual machine）的呢？

本文通过各种提问和关键概念，将一个最简单的解释器一步步演化成高性能 VM 实现。本文的行文风格将高度抽象，不包含任何可执行的代码，仅包含每个阶段的思考过程。

[chumsky]: https://docs.rs/chumsky/0.12.0/chumsky/trait.Parser.html#example-1

## 语言定义

假设有一款类似 Julia 的玩具语言 **Toy**，大概长这个样子：

```julia
function fib(x::Int)::Int
    if x <= 0
        return 1
    else
        return fib(x - 1) + fib(x - 2)
    end
end
```

抽象语法树（AST）的结构定义为：

```ebnf
program = { function* };
function = { IDENT, param*, expr, block };
param = { IDENT, expr };
block = { expr* };
stmt = { if
       | return
       | expr
       };
if = { expr, block, block };
return = { expr? };
expr = { call
       | binary
       | type
       | IDENT
       | INTEGER
       };
type = { "Int" };
call = { expr, expr* };
binary = { expr, OP, expr };
```

由于仅支持 `Int` 这一个类型，所以 Toy 的语义值（semantic value）暂且只有 `int64` 的情况。即整个解释器的入口函数如下：

```rs
fn run(code: &Program) -> int64;
```

## 树遍历（tree walking）

最简单的解释器实现无非就是直接遍历这棵 AST，但由于我们的例子 `fib` 涉及到函数调用、局部变量、语句列表（statement list）、控制流（control flow，如 `if` 和 `return`）等特性，这里我们需要注意几个关键点。
