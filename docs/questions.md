# How questions work

A question set is a JSON document the game fetches. The contract between whoever writes a document and the game is the schema in `src/questions/schema.ts`; the game imports only its types and trusts what it is served. Published sets live under `public/questions/`, one file per set, named by the set's id. A test checks every published file against the schema, so a document that breaks the contract fails CI before it ships.

Answers are never written down. Each question stores sourced factors and a formula over their keys, and the game computes the answer:

```json
{
  "id": "credit-cards-to-the-rim",
  "category": "Everyday",
  "prompt": "How many credit cards would you stack to reach the rim of a regulation basketball hoop?",
  "unit": "cards",
  "rounding": "ceil",
  "roundingNote": "You need to reach the rim (round up).",
  "factors": [
    {
      "key": "ft",
      "label": "Rim height",
      "unit": "ft",
      "value": 10,
      "source": "NBA / FIBA regulation"
    },
    {
      "key": "mm",
      "label": "Credit card thickness",
      "unit": "mm",
      "value": 0.76,
      "source": "ISO/IEC 7810 ID-1"
    }
  ],
  "formula": "ft * 304.8 / mm"
}
```

The formula is arithmetic over the factor keys and numbers: `+`, `-`, `*`, `/`, `^`, and parentheses. `rounding` is one of `round`, `ceil`, or `floor`, applied after the formula. The debrief shows the formula with the values filled in, so the player reads `10 × 304.8 ÷ 0.76 = 4,010.53`.

A set is an id and its questions. The id is the launch number the player sees:

```json
{ "id": "001", "questions": [] }
```

Rule for every question: each input is either a canonical, sourced constant or stated in the prompt. No pure-trivia numbers.
