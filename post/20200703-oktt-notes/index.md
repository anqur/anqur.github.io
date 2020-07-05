# Notes about Notes: OKTT

$$
\mathrm{\tiny DEPENDENT\ COPRODUCT\ FORMATION}
\\
\frac
{\Gamma \ ctx \qquad \Gamma \vdash A \ type \qquad \Gamma, x : A \vdash B(x) \  type}
{\Gamma \vdash \Sigma_{x : A} B(x) \ Type}
\\
~
\\
\mathrm{\tiny DEPENDENT\ COPRODUCT\ INTRODUCTION}
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma, x : A \vdash b(x) : B(x)
}
{\Gamma \vdash (x, b(x)) : \Sigma_{x : A} B(x)}
\\
~
\\
\mathrm{\tiny DEPENDENT\ COPRODUCT\ ELIMINATION}
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash p : \Sigma_{x : A} B(x)
}
{\Gamma \vdash fst_{(x : A) * B(x)}(p) : A}
\\
~
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash p : \Sigma_{x : A} B(x)
}
{\Gamma \vdash snd_{(x : A) * B(x)}(p) : B(x)}
\\
~
\\
\mathrm{\tiny DEPENDENT\ COPRODUCT\ COMPUTATION}
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash a : A
  \qquad
  \Gamma \vdash b(a) : B(a)
  \qquad
  \Gamma \vdash (a, b(a)) : \Sigma_{x : A} B(x)
}
{\Gamma \vdash fst_{(x : A) * B(x)}(p) \equiv a : A}
\\
~
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash a : A
  \qquad
  \Gamma \vdash b(a) : B(a)
  \qquad
  \Gamma \vdash (a, b(a)) : \Sigma_{x : A} B(x)
}
{\Gamma \vdash snd_{(x : A) * B(x)}(p) \equiv b(a) : B(a)}
$$
