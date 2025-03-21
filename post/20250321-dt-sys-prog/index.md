# Systems programming in dependent types

Done:

* Coeffects over effects.
* Pointer read/write intrinsics (type of pointers, memory locations, and memory layout proofs).
* Invalidate on-stack locations.
* How to deal with `char const*`.
* How to implement RAII (`defer` is bad): `defer` as the affine logic. `Defer` trait.
* `auto f() -> T` should be everywhere.

Doing:

* How to deal with `char[]` (`char` slice, flexible array member, ~~and VLA~~).
* How to deal with `void` and `void*`.
