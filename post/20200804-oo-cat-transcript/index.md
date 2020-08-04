# Transcript: ∞-Category Theory for Undergraduates

> This is the transcript of the [slides] from Emily Riehl's talk *∞-Category
> Theory for Undergraduates* ([video]), which is absolutely a great introduction
> to modern type theory and mathematics.

[slides]: http://www.math.jhu.edu/~eriehl/berkeley-logic.pdf
[video]: http://www.math.jhu.edu/~eriehl/berkeley-logic.mp4


* Berkeley Logic Colloquium
* Emily Riehl
* 7 May 2020

Thesis: If future undergraduates' foundational understanding of mathematical
proof were based on Homotopy Type Theory (HoTT) then we could teach them
∞-category theory - much as we teach today's undergraduates abstract algebra.

1. ACT I: Undergraduate-level informal HoTT
1. ACT II: ∞-category theory

## ACT I: Undergraduate-level informal HoTT

*Dependant type theory* is a formal system of inference rules, that combine to
form derivations.  There are four kinds of "well-formed formulas" called
*judgements*, including:

* $\Gamma \vdash A \  type$ - "$A$ is a type"
* $\Gamma \vdash a : A$ - "$a$ is a term of type $A$"

Here $\Gamma$ is a *context* which declares the types of any variables that
appear. e.g

* $\Gamma, x : A \vdash B(x) \  type$ - "a *family of types* over $A$"
* $\Gamma, x : A \vdash b(x) : B(x)$ - "a *family of terms*"

(Imagine:

* $n : \mathbb{N} \vdash \mathbb{R}^n \  type$
* $n : \mathbb{N} \vdash \bar{0} : \mathbb{R}^n$

)

There are four kinds of *rules* (in place of axioms) that can be used in
derivations:

1. **Formation rules** form new types:
    * $^\times$*formation*: given types $A$ and $B$ there is a *product type*
    $A \times B$
    $$\frac{\Gamma \vdash A \  type \qquad \Gamma \vdash B \  type}{\Gamma \vdash A \times B \  type}$$
1. **Introduction rules** introduce new terms:
    * $^\times$*introduction*: given terms $a : A$ and $b : B$ there is a term
    $(a, b) : A \times B$
    $$\frac{\Gamma \vdash a : A \qquad \Gamma \vdash b : B}{\Gamma \vdash (a, b) : A \times B}$$
1. **Elimination rules** use the new terms:
    * $^\times$*elimination*: given a term $p : A \times B$ there are terms
    $pr_1(p) : A$ and $pr_2(p) : B$
