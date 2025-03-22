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

Doing:

* Better way to initialize things at runtime using oneliners.
