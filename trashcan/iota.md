# Iota

小计一个东西,  这个东西叫 Iota (希腊字母 &iota;, 这货居然还有 XML/HTML 实体名叫
`&iota;`).  本来应该很早记下这个东西的, 起源是下面这很小的 Go 代码:

```go
const (
    Foo = iota
    Bar
)
```

当时在老大的代码里看到的, 其实就类似于 C++ 里的 `enum` 的种种 (`enum` 啊, `class
enum` 啊, `typedef enum` 啥子的...):

```cpp
enum {
    FOO,
    BAR
};
```

而且维基一搜, 会发现这个 Iota 字母也很有根源, 远到 APL 语言的特性:

> In some programming languages (e.g., A+, APL, C++, Go) iota (either as a
> lowercase symbol &iota; or as a keyword `iota`) is used to represent and
> generate an array of consecutive integers.  For example, in APL
> <code>&iota;4</code> gives `1 2 3 4`
