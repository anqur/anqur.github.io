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
$$
