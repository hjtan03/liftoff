# How questions work

Answers are never typed in by hand. Each question in `src/game/questions.ts` stores its factors and a formula, and the answer is computed from them:

```ts
{
  prompt: "How many credit cards would you stack to reach the rim of a regulation basketball hoop?",
  rounding: "ceil",
  factors: [
    { key: "ft", label: "Rim height", unit: "ft", value: 10, source: "NBA / FIBA regulation" },
    { key: "mm", label: "Credit card thickness", unit: "mm", value: 0.76, source: "ISO/IEC 7810 ID-1" },
  ],
  compute: (f) => (f.ft * 304.8) / f.mm,
}
```

Rule for every question: each input is either a canonical, sourced constant or stated in the prompt. No pure-trivia numbers.
