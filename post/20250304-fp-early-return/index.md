# Early Return in Functional Programming

## Haskell is weak

Control flow is usually achieved using the notorious *monads* in functional programming. I don't hate monads, I don't
like them either. But I strongly hate the built-in monads in Haskell, for the following reasons:

1. Haskell's `do` notation is weak
2. Haskell's *"purity"* implies effects of `div` (divergence) and `exn` (exception), and the latter is based on a
   full-blown continuation library for tracing and debugging
3. Haskell's higher-ranked type is weak

If one has to do an *early return*, there are just a few options, like `throw`-ing exceptions (why bother?). And other
rescues would be like bringing in the *monad transformer* library `mtl`.

```hs
import Control.Monad (when)
import Control.Monad.Except
import Control.Monad.IO.Class (liftIO)

data AppError = EarlyReturn deriving (Show)
type App = ExceptT AppError IO

app :: App Int
app = do
    a <- liftIO $ return 42
    when (a > 0) $ throwError EarlyReturn -- here's the early return
    b <- liftIO $ return 10
    return $ a + b

main :: IO ()
main = do
    result <- runExceptT app
    case result of
        Left EarlyReturn -> putStrLn "Early return"
        Right val -> print val
```

Monad transformer is so trivial in a dependently-typed programming language, or, in such a language, one will not notice
there would be such concept at all. Would someone realize it's a monad transformer when seeing [`ForIn`] in Lean 4?

It's just not the case in Haskell.

[`ForIn`]: https://leanprover-community.github.io/mathlib4_docs/Init/Core.html#ForIn

## Lean 4

There is "local imperativity" in Lean 4, which is elaborated in their ["`do` unchained"] paper. Look at this example:

```lean
def foo [Monad m]: m Bool := do
  let mut a := 1
  for i in List.range 10 do
    if i = 3 then return true
    a := a + 1
  return false
```

Use the `#print foo` command to print the desugared definition. My version of Lean seems to have some issues upon
pretty-printing desugared stuff, but the output is rectified like the following, with using correct syntax and adding
some necessary type annotations:

```lean
def foo.{u_1} : {m : Type → Type u_1} → [inst : Monad m] → m Bool :=
fun {m} [Monad m] =>
  let a := 1;
  let col := List.range 10;
  do
  let r: Option Bool × Nat ←
      forIn col ⟨none, a⟩ fun i r =>
        let r := r.snd;
        let a := r;
        let __do_jp := fun a y =>
          let a := a + 1;
          do
          pure PUnit.unit
          pure (ForInStep.yield ⟨none, a⟩);
        if i = 3 then pure (ForInStep.done ⟨some true, a⟩)
        else do
          let y ← pure PUnit.unit
          __do_jp a y
  let a : Nat := r.snd
  let __do_jp : PUnit → m Bool := fun y => pure false
  match r.fst with
    | none => do
      let y ← pure PUnit.unit
      __do_jp y
    | some a => pure a
```

Notice that there is no actual mutable locals at all. And it's stunning an `#eval foo` could also run without giving an
actual monad instance.

You may find that the generated code is exactly the same to that with Rust's [`std::ops::Controlflow`] approach:

* At the final exit, is our loop short-circuited? Nope, the loop exits normally, we could return normally too (the
  `false` case)
* Oh yes, the loop exits early, take the (*residual*, in Rust's flavor) value out, and we return it abnormally (the
  `true` case)

["`do` unchained"]: https://lean-lang.org/papers/do.pdf

[`std::ops::Controlflow`]: https://doc.rust-lang.org/beta/std/ops/enum.ControlFlow.html

## Koka

It's much crazier in Koka, since there's algebraic effects and handlers, it's totally unnecessary to have `do`-notation,
and even all the control flow utilities in Koka are based on the *trailing closures* syntactic sugar:

```kk
effect exn_return<a>
  ctl exn_return(): a

fun main()
  with handler
    ctl exn_return() ()
  for(10) fn(i)
    if i == 3 then
      println("hi")
      exn_return()
    println(i)
```

Note that the `for` function receives a closure as its final argument, and one could use an indented block to ease the
pain of parentheses.

Early return in Koka is like throwing exceptions, but a delimited continuation library is not needed at all. Every
computation is naturally wired during the compilation using type-directed CPS and monadic translation (okay, monad
again).

## New ideas? Nope.

Initially I was thinking about writing a small C subset called `MonadC`, to demonstrate that one could have normal
imperative programming but everything would be translated into "ambient monads", which means, we could have monads
built-in in our syntax (e.g. the abstract syntax or even lower), and typechecking and code generation to LLVM IR would
be fairly easy. And there's also a chance to see if LLVM could be able to aggressively optimize it to reach one written
in standard C.

But I kinda think a pass of monadic translation is entirely unnecessary now. And it should take many days on it. Forget
about it.

One just needs to design a language where the control flow could be trivial for the translation into monads, for
reasoning purposes.
