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
exactly, or at most)? The options are two: Types and bindings.

Most of the systems decided to attach coeffects with a specific set of types:

* `std::unique_ptr<T>` in C++, a unique pointer should be used exactly once (move semantics), and one could achieve this
  in a custom type with its copy constructor and copy assignment operator all deleted. And then people shoot their feet
  using `use-after-move` for fun.
* `Box<T>` type and `Copy` trait in Rust, much saner.
* That ICFP '16 paper, and many linear/affine logic papers, mostly you could see `box A`/`unbox A` type operators, and
  some even used `🔒 A`/`🔓 A` to [look cool].

[look cool]: https://www.jonmsterling.com/gratzer-sterling-birkedal-2019.xml
