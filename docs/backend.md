# Liftoff backend: handoff

## The game

Liftoff is a daily estimation game. Every day every player gets the same 5 math questions, and each question is one stage of a rocket. Every question can be worked out from well-known constants, such as a marathon being 42.195 km or a credit card being 0.76 mm thick. Players guess a number and pick a confidence band. If the answer lands inside the band, the stage fills with fuel. Total fuel decides how high the rocket flies.

The game is a Vite + React + TypeScript app (see README). Questions are JSON documents defined in `docs/questions.md` and `src/questions/schema.ts`; today the client fetches `public/questions/001.json` and computes answers itself.

**Your job:** build the backend that turns this into a real daily game. That means serving the day's questions, scoring guesses on the server, recording crowd stats and tracking streaks. Justin owns the frontend and will wire it to the API defined below.

## What exists today

| Piece                                                          | State                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Game UI (stages, calculator, fuel tanks, launch, share string) | Done, React components in `src/components/`                                         |
| Questions                                                      | One static set, `public/questions/001.json`, validated by `src/questions/schema.ts` |
| Scoring                                                        | Client-side, `src/game/scoring.ts`, rules below                                     |
| Crowd stats                                                    | Simulated, `src/game/crowd.ts`                                                      |
| Persistence and streaks                                        | None                                                                                |
| Question pipeline                                              | Designed, not built (see Phase 3)                                                   |

## Recommended stack

**Cloudflare Workers + D1 (SQLite).**

- The site is on GitHub Pages today. If we move it to Cloudflare Pages, the API lives at the same origin, `/api/*`, with no CORS setup; otherwise the Worker needs CORS for the Pages origin.
- The free tier covers this game until it has real traffic.
- D1 is SQLite, so the schema below runs locally without changes using `wrangler dev`.

Alternative: Node/Express + Postgres on Railway or Fly, or Supabase. That's fine if you strongly prefer it. Keep the API contract identical so the frontend doesn't care which you pick.

Language: TypeScript.

## Core rules (the server is the source of truth)

### 1. Answers are computed, never typed

Each question stores its constants and a formula, and the answer is derived from them:

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

- This is exactly the format in `docs/questions.md`. Reuse `src/questions/schema.ts` (Zod) to validate on the server.
- `answer = rounding(evaluate(formula, factors))`, the same as `computeAnswer` in `src/questions/source.ts`.
- `rounding` is one of `floor`, `ceil` or `round`.
- Evaluate the result with `toFixed(6)` before rounding to avoid float noise. For example, `187.49999999` must not floor to 187 when the true value is 187.5.
- Evaluate formulas with `evaluateExpression` in `src/expression/evaluate.ts` (safe recursive descent, never `eval`). Share it between the game and the Worker rather than copying it.
- The workings line comes from `workedSolution` in `src/questions/source.ts`.

### 2. Scoring

The player submits `guess` (a positive number) and `conf`. The range is computed around the **guess**:

| conf    | Name      | Range                           | Points if `lo ≤ answer ≤ hi` |
| ------- | --------- | ------------------------------- | ---------------------------- |
| `lock`  | Locked in | `guess × 0.95` – `guess × 1.05` | 1000                         |
| `solid` | Solid     | `guess × 0.8` – `guess × 1.2`   | 500                          |
| `rough` | Rough     | `guess / 2` – `guess × 2`       | 200                          |

- **Exact bonus:** +250 if `Math.round(guess) === answer` and the stage hit.
- A miss scores 0.
- Max per stage is 1250, and max per day is 6250.
- Bounds are inclusive.
- Altitude, the destination and the share string stay client-side. They're presentation, not scoring.

### 3. Answers never reach the client early

`GET /api/daily` must **not** include `answer`, `factors[].value` or `formula`. Those only come back in the response to that stage's submitted guess. (Wordle shipped its whole answer list in the JS bundle. Don't repeat that.)

This differs from today's static `001.json`, where the client gets values and formula and scores itself. That is fine while there is no backend. Once the Worker exists, the question document splits into public fields (served by `/api/daily`) and reveal fields (returned by `/api/guess`), and scoring moves to the server.

### 4. One submission per player per stage per day

This is enforced in the database with a unique constraint, not only in the client.

### 5. Which day is "today"

The puzzle number is the number of days since launch, using the **player's local date**, the same way Wordle does it. The client sends `date=YYYY-MM-DD`. The server accepts the date only if it's within ±1 day of the server's UTC date, which covers every timezone and blocks people from playing ahead.

`puzzleNumber = daysBetween(LAUNCH_DATE, date) + 1`.

## API contract

All bodies are JSON. The player is identified by an anonymous `playerId`, a UUID the client generates once and keeps in localStorage, sent as the `X-Player-Id` header. There are no accounts in v1.

### `GET /api/daily?date=2026-10-20`

```json
{
  "puzzle": "007",
  "date": "2026-10-20",
  "stages": [
    {
      "stage": 1,
      "id": "marathon-walk",
      "category": "Everyday",
      "prompt": "Walking at a steady 5 km/h, how many minutes does it take to finish a marathon?",
      "unit": "min",
      "roundingNote": "Rounded to the nearest minute.",
      "factorLabels": [
        { "key": "d", "label": "Marathon distance", "unit": "km" }
      ]
    }
  ],
  "progress": [
    {
      "stage": 1,
      "guess": 506,
      "conf": "lock",
      "result": { "...": "same shape as POST response" }
    }
  ]
}
```

- `factorLabels` has **no values**. The client uses it for the "what numbers did you assume?" step, which happens after the guess is locked.
- `progress` holds this player's already-submitted stages for the day, so a refresh resumes the run.
- 404 if no puzzle is scheduled for that date.

### `POST /api/guess`

Request:

```json
{
  "date": "2026-10-20",
  "stage": 1,
  "guess": 506,
  "conf": "lock",
  "assumptions": { "d": 42.2 }
}
```

`assumptions` is optional. It's the player's own constants, used for the per-factor debrief and for analytics.

Response:

```json
{
  "stage": 1,
  "answer": 506,
  "lo": 480.7,
  "hi": 531.3,
  "hit": true,
  "exact": true,
  "points": 1250,
  "factors": [
    {
      "key": "d",
      "label": "Marathon distance",
      "unit": "km",
      "value": 42.195,
      "source": "World Athletics standard"
    }
  ],
  "workings": "42.195 ÷ 5 × 60 = 506.34",
  "crowd": {
    "players": 1342,
    "hitRate": { "lock": 0.34, "solid": 0.61, "rough": 0.88 },
    "lockHitShare": 0.21,
    "percentile": 0.93
  }
}
```

- **Errors:** 409 if the stage has already been submitted (return the stored result in the body so the client can recover); 400 for a bad `conf`, a non-positive or non-finite guess, or `stage` outside 1–5; 403 for a date outside the ±1 window.
- Stages may be submitted out of order in v1. Don't enforce sequence.
- `crowd` is computed **including** this guess.
- **Field definitions:**
  - `lockHitShare`: the share of all players on this stage who chose `lock` and hit. This is the "only 9% locked in and hit this one" line.
  - `percentile`: the share of players whose `|log(guess / answer)|` is worse than this player's.

### `GET /api/me`

```json
{
  "currentStreak": 4,
  "maxStreak": 9,
  "played": 23,
  "history": [{ "puzzle": "007", "points": 4100 }]
}
```

A streak counts consecutive puzzle numbers in which the player submitted all 5 stages.

## Data model (D1 / SQLite)

```sql
CREATE TABLE questions (
  id          TEXT PRIMARY KEY,
  prompt      TEXT NOT NULL,
  category    TEXT NOT NULL,
  unit        TEXT NOT NULL,
  rounding    TEXT NOT NULL CHECK (rounding IN ('floor','ceil','round')),
  rounding_note TEXT NOT NULL,
  factors_json TEXT NOT NULL,          -- [{key,label,unit,value,source}]
  formula     TEXT NOT NULL,
  answer      INTEGER NOT NULL,        -- computed at insert, never hand-entered
  signature   TEXT NOT NULL UNIQUE,    -- dedup key, see Phase 3
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE schedule (
  date        TEXT NOT NULL,           -- YYYY-MM-DD
  stage       INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  question_id TEXT NOT NULL REFERENCES questions(id),
  PRIMARY KEY (date, stage)
);

CREATE TABLE guesses (
  player_id   TEXT NOT NULL,
  date        TEXT NOT NULL,
  stage       INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  guess       REAL NOT NULL,
  conf        TEXT NOT NULL CHECK (conf IN ('lock','solid','rough')),
  hit         INTEGER NOT NULL,
  exact       INTEGER NOT NULL,
  points      INTEGER NOT NULL,
  log_err     REAL NOT NULL,           -- abs(ln(guess/answer)), for percentile
  assumptions_json TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (player_id, date, stage)
);
CREATE INDEX guesses_by_stage ON guesses (date, stage);

CREATE TABLE players (
  player_id   TEXT PRIMARY KEY,
  first_seen  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Crowd stats come from aggregate queries over `guesses` for `(date, stage)`. That's fine for a long time. If it ever gets slow, keep a `stage_stats` row per stage and update it on every insert.

## Phases

### Phase 1: daily API (start here)

- [ ] Worker project with a D1 binding, plus `schema.sql` migrations
- [ ] Share `src/expression/evaluate.ts` and `src/questions/schema.ts` with the Worker. Check the seeded set still computes **506, 328, 2343, 4011, 448**
- [ ] Seed script that loads question-set JSON (validated with the schema), **computes `answer` itself**, and schedules it by date
- [ ] `GET /api/daily`, `POST /api/guess` and `GET /api/me` per the contract above
- [ ] Tests for scoring edge cases: bound inclusivity, the exact bonus, a miss, duplicate submission (409), and a date outside the window (403)
- [ ] Deploy, and point `QUESTION_SET_URL` in `src/App.tsx` at the API
- [ ] Split the question document into public and reveal fields (see rule 3); move scoring calls to `/api/guess`

**Done when:** a seeded week of questions can be played end to end through the API, and a second player's guesses change the first player's crowd stats.

### Phase 2: hardening

- [ ] Rate limit `POST /api/guess` per player ID and per IP
- [ ] Reject absurd guesses, for example values above 1e15, to keep the stats clean
- [ ] Simple admin route, or wrangler script, to view tomorrow's schedule and swap a question

### Phase 3: question pipeline (owner TBD, likely shared)

1. A `constants.json` table of about 300–500 entries. Each has `key`, `value`, `unit`, `source` and `commonness` (1–5).
2. A `prompts.txt` file of candidate questions, both hand-written and AI-suggested.
3. A script that sends each chosen prompt to an LLM. The LLM returns `{ prompt, factors: [constant keys], formula, round }` and **never a number**.
4. Validation:
   - Reject unknown constant keys.
   - Compute the answer in code, using a units library if needed.
   - Reject answers that come out non-finite or below 1.
5. Dedup. The signature is `sha1(sorted factor keys + normalized formula)`, so the same question in different wording collides. Then run an embedding-similarity check against past prompts.
6. Output `weeks/2026-10-19.json` holding 35 questions (7 days × 5 stages) in a fixed order, then seed it into D1.

## Decisions already made

- No accounts in v1, only anonymous player IDs.
- The same 5 questions for everyone, every day.
- Wordle-style rollover on the player's local date.
- Scoring numbers as listed above. Tuning them is a product call, so change them only after talking with Justin.

## Open questions to discuss

- Rarity bonus: extra points when few players locked in and hit, for example `lockHitShare < 10%`. This needs enough players to mean anything, so maybe only after N players.
- Is the per-constant "assumptions" step part of scoring (a bonus per constant within 5%) or debrief only?
- Archive mode: can players replay past days? This affects whether `/api/daily` accepts old dates.
- When to add accounts, for cross-device streaks.
