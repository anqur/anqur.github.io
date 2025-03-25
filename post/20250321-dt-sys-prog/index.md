# Systems programming in dependent types

Done:

* Coeffects over effects.
* Pointer read/write intrinsics (type of pointers, memory locations, and memory layout proofs).
* Invalidate on-stack locations.
* How to deal with `char const*`.
* How to implement RAII (`defer` is bad): `defer` as the affine logic. `Defer` trait. The `defer` logic would be run at
  the block end, so we don't consider the `guard` keyword in the related C proposal.
* `auto f() -> T` should be everywhere: Good for long return types.
* How to deal with `char[]` (`char` slice, ~~flexible array member, and VLA~~): VLA should be dropped, and FAM should be
  implemented using static reflection.
* Dynamic memory safety, hardened runtime, and Clang's bounds checking.
* How to deal with `void` and `void*`: `void*` is just an unknown memory layout, it should be easy to tag via a generic
  `l: Addr` location.
* Initializer, constructor, `Default` trait? We allow custom empty initialization at the definition of a struct (just
  like C++), but the parameters would be annotated with quantity `0`, which means they need to be calculated in the
  compile-time, which rejects runtime logic.
* How to deal with many POSIX standard definitions? E.g. `sockaddr_in` (struct type) and `AF_INET` enumeration value: We
  could define them manually at first, maybe later we could have some libclang-based code generation.
    * Types like `pthread_mutex_t` are way more complicated.
* Flat-level method definitions: `namespace Data {}` for `impl Data {}`-like constructs.
* Unify following snippets:

```c
Mutex mu = {}; // empty initialization
mu.init() return; // must-use custom initialization
                  // custom initialization error handling
mu.destroy(); // must-use custom finalization
```

vs

```c
Mutex *mu = malloc() return; // custom OOM handling
memset(mu, 0); // empty initialization
mu.init() return; // must-use custom initialization
                  // custom initialization error handling
mu.destroy(); // must-use custom finalization
free(mu); // memory reclamation
```

Answer:

```c
Mutex mu = () else trap;
mu->lock();
mu->unlock();
mu->destroy();
```

vs

```c
// p is the returned ponter, ret is the result from convetional initializer.
Mutex *mu = malloc() else (p, ret) { ... };
mu->lock();
mu->unlock();
mu->destroy();
```

`trap` is:

```c
void trap() {
    char const* traces[10];
    backtrace_symbols_fd(traces, 10, stderr);
    raise(SIGTRAP); // so if a debugger is attached, we could stop here.
}
```

* Must-use initializer:
    * Call-by-reference, unified `.`: ~~We don't do this, because C users would be confused with a gone `->` syntax, and
      once `->` is preserved, `a.f(1, 2)` and `a->f(1, 2)` would be both valid and confusing due to call-by-reference.~~
        * We have to do call-by-reference on the so-called "conventional initializer", and `->` must be used, `.` is not
          allowed for call-by-reference.
    * How to be must-use?
* It's hard to unify `mu->destroy` and `free`: The former could contain the latter.

Not planned:

* ~~Better way to initialize things at runtime using oneliners.~~ No such situations needed.
* ~~Dart style syntax `..`, or Kotlin `with`, or Java's builder pattern.~~ RVO is not good for everywhere.

Doing:
