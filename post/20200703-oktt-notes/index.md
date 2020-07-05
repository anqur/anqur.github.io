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
  \qquad
  \Gamma, x : A \vdash B(x) \  type
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
{\Gamma \vdash p.1 : A}
\\
~
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad
  \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash p : \Sigma_{x : A} B(x)
}
{\Gamma \vdash p.2 : B(x)}
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
  \qquad
  \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash a : A
  \qquad
  \Gamma \vdash b(a) : B(a)
  \qquad
  \Gamma \vdash p_{(a, b(a))} : \Sigma_{x : A} B(x)
}
{\Gamma \vdash p.1 \equiv a : A}
\\
~
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad
  \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash a : A
  \qquad
  \Gamma \vdash b(a) : B(a)
  \qquad
  \Gamma \vdash p_{(a, b(a))} : \Sigma_{x : A} B(x)
}
{\Gamma \vdash p.2 \equiv b(a) : B(a)}
\\
~
\\
\mathrm{\tiny DEPENDENT\ COPRODUCT\ UNIQUENESS}
\\
\frac
{
  \Gamma \ ctx
  \qquad
  \Gamma \vdash A \ type
  \qquad
  \Gamma, x : A \vdash B(x) \  type
  \qquad
  \Gamma \vdash p : \Sigma_{x : A} B(x)
}
{\Gamma \vdash p \equiv (p.1, p.2) : \Sigma_{x : A} B(x)}
$$
