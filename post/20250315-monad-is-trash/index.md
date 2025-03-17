# Monad is trash

This post is about some of my new ideas on programming language design, although the title sounds quite off.

But, monad is just trash.

## Monad in Haskell is trash

Monad is used mostly for these purposes:

* Imperative paradigm with limited support of control flow.
* Side effect tracking, e.g. `IO a` which tracks I/O operations.

And the drawbacks are bizarre:

* When it comes to control flow, for example, one has to achieve [early return] via throwing exceptions and setting up
  handlers.
* The `IO a` effect is the "worst" effect, as mentioned in the [Koka book], for covering up all the important
  sub-effects that users might need for fine-grained control:
    * Exceptions
    * Divergence (a function might not terminate)
    * Non-determinism (e.g. generating random numbers)
    * Console
    * Networking
    * Filesystem
    * UI (graphics system)
    * Heap allocation/read/write

Why would Haskell put these altogether? Because making effects extensible is not trivial at all. `IO a` is just a plain
data type, imagine one prints some text to the console and writes some bytes to a file, what return type would be
suitable for the program entrypoint `main`?

Instead of calling it `IO a`, there are essentially two worlds in Haskell: the *impure* (effect-ful) and the *pure*
(effect-free). And as we know, getting back to the pure is *unsafe* (`unsafePerformIO`).

One still has the choice to use third-party libraries for extensible effects. Just see how many there are:

* [`fused-effects`](https://hackage.haskell.org/package/fused-effects)
* [`freer-simple`](https://hackage.haskell.org/package/freer-simple)
* [`effectful`](https://hackage.haskell.org/package/effectful)
* [`extensible-effects`](https://hackage.haskell.org/package/extensible-effects)
* [`polysemy`](https://hackage.haskell.org/package/polysemy)

I'm not intrigued to know about their differences. See those language extensions, they might look terrifying for you,
but I'm not scared. This is how it would look without good *compile-time evaluation* and *static reflection* support (if
these two features remind you of C++, you got the joke). Check out Lean 4 and Scala 3, see how they trivialize the
problems.

Koka trivializes extensible effects with [scoped labels] (i.e. effects could be duplicate). Note that it's nothing
related to the fancy "algebraic effect" feature, it's only about (type system for) "effect types". So unsurprisingly,
it's not new: Koka nailed it in 2014, more than a decade ago.

If you're still not convinced, let me show you these banger lines from [Safer exceptions in Scala]:

> Dealing with one monad at a time is straightforward but dealing with several monads together is much less pleasant
> since monads do not compose well. A great number of techniques have been proposed, implemented, and promoted to deal
> with this, from monad transformers, to free monads, to tagless final. None of these techniques is universally liked,
> however; each introduces a complicated DSL with runtime overhead that is both hard to understand for non-experts and
> hard to debug. In the end, many developers prefer to work instead in a single “super-monad” like ZIO that has error
> propagation built-in alongside other aspects. This one-size-fits-all approach can work nicely for frameworks that
> offer a fixed set of capabilities, but its fixed overhead and lack of flexibility make it unsuitable as the only
> provided solution for a general purpose programming language.

Okay, now, get ready for time to cook Koka...

[early return]: ../20250304-fp-early-return

[Koka book]: https://koka-lang.github.io/koka/doc/book.html#sec-effect-types

[scoped labels]: https://arxiv.org/pdf/1406.2061

[Safer exceptions in Scala]: https://dl.acm.org/doi/10.1145/3486610.3486893

## Effect is far from enough

There are still further issues despite an effect is "monadic" or "algebraic", the most important one is called
**coeffect**.

It sounds like some annoying category theorists speaking in tongues. But for most of the time it's just about a simple
concept, *"resource"*:

```c
void *p = malloc(sizeof(int));
```

In the above example, one typically *expects*:

* Only `p` points to the resource (*memory*),
* To close (reclaim) the resource wisely, or,
* To transfer the resource, and the transferee should take further care of it.

Here, the `p` is a coeffect, a handle, a descriptor, a resource, and any similar names you would drop.

Usually, people use the *state monad* `ST s a` to simulate this situation:

```hs
import Control.Monad.ST
import Data.STRef

app :: ST s Int
app = do
  ref <- newSTRef 0
  modifySTRef ref (+1)
  readSTRef ref

main :: IO ()
main = print $ runST app
```

If you're confused with the type parameter `s`, the type of variable `ref` is `STRef s Int`. If one attempts to return
`ref` for leaking the resource, this `s` from `ref` would not be able to reference that from `app` itself, since `runST`
has a pretty special type:

```hs
runST :: (forall s. ST s a) -> a
--               ^             ^
--               |             |
--               |             +--- Impossible to reference that inner `s`.
--               |
--               +--- `s` is only available inside `app`.
```

So `s` is a hack, and poor Haskell has to enable the `RankNTypes` language extension for this.

What's worse? Everyone is using this trick:

* Koka would [try to eliminate] the internal `st<h>` effect by running `runST` on the function. If the resource is
  leaked, the compiler is able to leave that specific effect, and does better than Haskell.
* Rust's lifetime parameter is the same thing, and Clippy (Rust linter) will tell you if one could elide a fully generic
  lifetime parameter by, yup, running `runST`.

What's even worse? People really want to track other kinds of resources, e.g. files, sockets, threads, locks... It's
stupid to have all of them built-in, but Koka has no better ideas yet.

And so far, you might already notice a terrible truth:

> Koka marks the effect `alloc<h>`, if one leaks the allocated memory to its caller.

Which means, **a coeffect system is often coupled with the effect system**, they need to work well together, not just in
isolation.

You would see people keep talking about the fancy algebraic effects, or the classic linear/affine logic (for coeffects).
But the truth is, we need to take both.

[try to eliminate]: https://koka-lang.github.io/koka/doc/book.html#sec-runst

## Open problem

Now we've understood the background of this open problem. There are already many attempts from the greats:

* [Combining Effects and Coeffects via Grading (ICFP '16)](https://cs-people.bu.edu/gaboardi/publication/GaboardiEtAlIicfp16.pdf)
* [The Syntax and Semantics of Quantitative Type Theory (LICS '18)](https://bentnib.org/quantitative-type-theory.html)
    * This paper is just about coeffects, but we have an implementation to play around: Idris 2!
    * [A Crash Course in Idris 2] shows examples of monadic effects and its quantitative type feature together.
* [Effects and Coeffects in Call-by-Push-Value (OOPSLA '24)](https://dl.acm.org/doi/pdf/10.1145/3689750)

I haven't dived deep enough into these works. Not to mention in that *ICFP '16 paper* above, there are **16 additional
laws** beyond the basic typing rules for the *effect-over-coeffect* and *coeffect-over-effect* setups. It's hard to
convince myself such system is practical enough for the end users.

[A Crash Course in Idris 2]: https://idris2.readthedocs.io/en/latest/tutorial/multiplicities.html#resource-protocols

## My attempts

I'm not a professional for making and proving novelty. I just try collecting these existing ideas.

### Modality

First off, what to be attached with the information of a coeffect (e.g. how many times a variable should be used
exactly, or at most)? The options are two: Adding new types or adding to existing constructs (e.g. bindings and
functions).

Most systems decided to attach coeffects with a dedicated new set of types:

* `std::unique_ptr<T>` in C++, a unique pointer should be used exactly once (move semantics), and one could achieve this
  in a custom type with its copy constructor and copy assignment operator all deleted. And then people shoot their feet
  using `use-after-move` for fun.
* `Box<T>` type and `Copy` trait in Rust, much saner.
* That ICFP '16 paper, and many linear/affine logic papers, mostly you could see `box T`/`unbox T` type operators, and
  some even used `🔒 T`/`🔓 T` to [look cool].

It's just straightforward to use a type former for constructing a coeffect, and a type eliminator for destructing it.
People are so used to it. The drawbacks are not apparent, until you relate to monads:

* It's hard to compose or extend such constructs:
    * You've seen the types `Box<T>`, `&T` and `&mut T` in Rust coming out of nowhere. You've seen implicit rules like
      `&Box<T>` would be seamlessly used as `&T`, but when it fails to work, one writes `a.as_ref()` instead of `&a`.
    * You don't see any resources like files are able to track using exactly the approach for types like `&T`. The
      manual tells you to use RAII and the `Drop` trait.
* More and more primitive types are added to the compiler, more rules are added for them being poorly composable and
  extendable.
    * You might feel weird about why even the `Box<T>` type comes from the void, isn't there just [source code for it]?
      Then read more carefully and you would find the comment above it:

> The declaration of the `Box` struct must be kept in sync with the compiler or ICEs will happen.

So the alternative approach looks quite intriguing: **Adding (co)effects to existing types**. That's how modality works
in Koka and Idris 2.

* Koka adds effect types on function types and (so naturally) the function definitions.
* Idris 2 adds coeffects on function parameters only.

So it might be interesting if we can specify effects and coeffects in:

* Function parameters
* Variable declarators (a.k.a. bindings), not just parameters
* Function types

We will give code examples to show how. Here comes the next question.

[look cool]: https://www.jonmsterling.com/gratzer-sterling-birkedal-2019.xml

[source code for it]: https://doc.rust-lang.org/std/boxed/struct.Box.html

### Handling coeffects

How to define a function that closes/reclaims a resource? Of course, we should not use the `s`/`runST` trick again.

My initial thought tells me one could also specify this behavior *using parameters and variable declarators*. But the
biggest concern might be, if there is a variable with unlimited usage (e.g. of a primitive arithmetic type), every use
of it might not be considered as some resource reclamation. Or simply it's just not a resource, since it won't be
running out.

By far, we should end up with something like Koka and Idris 2 altogether.

### Wrapping up

> 💡 Below are the personal ideas. Feel free to judge.

Let's write some code in a new language toy like C. We declare the prototypes of `malloc` and `free`, as the
lowest-level memory management primitives (although `aligned_alloc` should be better):

```c
void *malloc(size_t sz);
void free(void *p);
```

We define a new effect for memory allocation:

```cpp
[[effect]]
typedef Alloc(typename T);
```

We write their overloaded functions for convenience. But we enforce that overloaded definitions should be always inline
and fully evaluated at compile-time. They won't really reside in any translation units.

```cpp
[[overload, Alloc(T)]]
//          ^~~~~~~^ effect of this function.
T *
malloc(typename T)
{
    void *p [[move(Alloc(T))]] = malloc(sizeof(T));
//            ^~~~~~~~~~~~~^ coeffect attached to the declarator:
//                           `p` is used exactly once.
    return p;
}
```

And the overloaded `free` to reclaim the memory:

```cpp
[[overload]]
void
free(typename T, T *p [[move(Alloc(T))]])
//                      ^~~~~~~~~~~~~^
//                      "closes" the coeffect.
{
    free(p);
}
```

Now, some interesting examples that would be rejected by the typechecker:

```cpp
void f0() {
    int *p = malloc(); // type parameter `T` is inferred.

    // ❌ error: variable `p` must be used or returned.
}

void f1() {
    int *p = malloc();
    free(p); // type parameter `T` is inferred.

    free(p); // ❌ error: variable `p` is already moved.
}

void f2() {
    int *p = malloc();
    if (true) {
        free(p);
        return;
    }

    // ❌ error: variable `p` must be used in all branches.
}

int * // ❌ error: function `f3` must be annotated with effect `Alloc(int)`.
f3()
{
    return malloc();
}
```

## More thoughts?

We're still pretty far from changing the game, obviously. Some problems that are still very challenging:

* Flexible pointer types. Pointers could be:
    * Of weird semantics with the `void *`.
    * Immutable and mutable references (or views) of some existing pointers. There are related
      [practices in ATS using view types] for accesses.
    * Restrict (for aliasing), just like `Box<T>` and `std::unique_ptr<T>`.
    * In, out, inout parameters.
    * Used for pointer arithmetic.
* Fully/partially initialized and uninitialized memory.
* For the problems above, their interactions with struct fields.

And finally, I should get back for the journey...

[practices in ATS using view types]: https://ats-lang.sourceforge.net/DOCUMENT/INT2PROGINATS/HTML/HTMLTOC/c3321.html#views_for_pointers
