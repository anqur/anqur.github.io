# C as an IR

You ever think about C could be a good IR? It's cool to generate C code from a higher-level language? C could be a
feasible backend?

Yes! But...

## Strict aliasing

This tiny little rule could shatter your illusions, and it's called "strict aliasing". Briefly speaking, every raw
pointer `T*` you see in C is actually `std::unique_ptr<T>` in C++, or `Box<T>` in Rust. It's not about the move
semantics at all, it's about a scary assumption:

> Every raw pointer `T*` uniquely points to some memory location, and it can't be shared by other pointers.

So according to C standard, copying a `T*` pointer then casting it to `unsigned char*` for reads/writes with simple
pointer arithmetic, unfortunately, is an *undefined behavior*.

You might wonder you haven't seen any fire by doing this throughout your 3-decade C/C++ career, that's because those
major C compilers know people would do this on a day-to-day basis, so they simply turn off the strict aliasing for types
like `char` and `unsigned char`.

If you can't imagine how scary it is, see this example:

```c
#include <stdio.h>

// Export this function to avoid inlining and warnings.
int foo(float *f, int *i);

int foo(float *f, int *i) {
    *i = 1;
    *f = 0.f;
    return *i;
}

int main() {
    int x = 0;
    printf("%d\n", x); // should print 0
    x = foo((float *)(&x), &x); // "aliasing" happens here
    printf("%d\n", x); // should print 0 too
}
```

Turn on optimization and some warnings:

```bash
# GCC
-O2 -std=c23 -Wall -Wextra -Wpedantic -Werror
# Clang
-O2 -std=c23 -Weverything -Wno-pre-c23-compat -Werror
```

Notice that ` -fstrict-aliasing` is enabled by default. And then, the output:

```plaintext
0
1
```

Yup, the optimizer thinks `i` would not point to the location of `*f`, so the return statement `return *i` is optimized
to simply `return 1`.

## "It should be opt-in!"

People would love C again if non-strict aliasing is ambient, and they could *opt in* strict aliasing when necessary.

Furthermore, if one really uses C as an IR, it might not be acceptable to tune the compiler flags for the users, they
should prefer messing around the flags for the generated C code themselves. So? Forget about `-fno-strict-aliasing`, one
probably can't do this during code generation.

The rescue is `[[gnu::may_alias]]`:

```c
[[gnu::may_alias]] typedef float may_alias_float_t;
[[gnu::may_alias]] typedef int may_alias_int_t;

int foo(may_alias_float_t *f, may_alias_int_t *i) {
    *i = 1;
    *f = 0.f;
    return *i;
}
```

I tested this on latest GCC/Clang. Worked like a charm. Use the original type to bring back strict aliasing again, or
use `restrict` to be more aggressive:

```c
[[gnu::may_alias]] typedef float may_alias_float_t;
[[gnu::may_alias]] typedef int may_alias_int_t;

int foo(may_alias_float_t *restrict f, may_alias_int_t *restrict i) {
    *i = 1;
    *f = 0.f;
    return *i;
}
```

This worked on latest GCC/Clang too.

See [Clang User Manual] for further information on this topic.

[Clang User Manual]: https://clang.llvm.org/docs/UsersManual.html#strict-aliasing

## Debugging

Last but not least, generated C code could only guarantee line-level "debugging" ability using `#line`. And I don't
think it's a thing since one is not able to use a debugger at all: Debugging experience is suddenly none.

The first idea came to my mind was to provide a tool to modify an existing program's debugging symbols, it won't be that
hard with [a DWARF parser], but it doesn't sound quite trivial. Let's wait for some further exploration.

[a DWARF parser]: https://github.com/gimli-rs/gimli
