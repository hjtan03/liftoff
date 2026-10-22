# Backend

How Liftoff's server side works: what it does, what it deliberately does not do, and the contract between the game and the API.

## The model: answers live on the client

Liftoff follows the Wordle model. The game fetches each launch's question set as a static file, computes every answer in the browser, and scores guesses itself. Anyone who opens devtools can see today's answers, and anyone who changes the number in the URL can see a future set. That is accepted: cheating only spoils the game for the cheater, and it keeps the game fast and playable offline.

What this rules out for now: trustworthy leaderboards, and any reward that a fake result could farm. If we want those later, the server would have to hold the factor values and formula and reveal them only after a guess, which changes the question format.

## What the server does

The server exists for one thing a static site cannot do: **the crowd**. It

1. records each player's guess for each stage,
2. recomputes hit, exact and points from the question itself, so a faked client result cannot pollute the shared numbers, and
3. returns crowd stats for that stage.

Streaks and resume-on-refresh stay in the browser (localStorage) for now. Syncing them across devices is a later step.

## Architecture

| Piece     | Where                                                          |
| --------- | -------------------------------------------------------------- |
| Game      | Vercel, static build of the Vite app                           |
| API       | Vercel functions in `api/`, same origin as the game (`/api/*`) |
| Database  | Supabase Postgres: `players`, `guesses`, `crowd_stats()`       |
| Questions | `public/questions/NNN.json` in this repo, one file per launch  |
| Schema    | `supabase/migrations/`                                         |

Environment variables, set in Vercel for Production and Preview:

| Name                  | Value                                   |
| --------------------- | --------------------------------------- |
| `SUPABASE_URL`        | the Supabase project URL                |
| `SUPABASE_SECRET_KEY` | the Supabase secret key (`sb_secret_…`) |

Never prefix these with `VITE_`. Vite bundles every `VITE_*` variable into the JavaScript it ships to players.

## Launch numbers

A launch is one day's set of five questions.

- `launch = daysBetween(FIRST_LAUNCH_DATE, easternDate) + 1`, where `easternDate` is the calendar date in `America/New_York`. Every player rolls over to the next launch at the same moment, midnight Eastern (daylight saving included), and the API computes the same number as the game.
- `FIRST_LAUNCH_DATE`, `LAUNCH_TIME_ZONE` and `launchNumberAt` live in `src/questions/schedule.ts`; the API imports them rather than repeating the date. Launch #001 is **Saturday, October 24, 2026**. Changing the date now renumbers every puzzle players have played. Before that date the game shows a countdown; `?launch=N` in the address plays a set early, for testing previews.
- The game fetches `/questions/NNN.json`, where `NNN` is the zero-padded launch number. The set's `id` equals the file name, which a test already enforces.

## Scoring

The rules live in one place, `src/game/scoring.ts`, and both the game and the API import them. Summary, for reference:

| Band    | Range around the guess | Points if the answer is inside |
| ------- | ---------------------- | ------------------------------ |
| `lock`  | ±5%                    | 1000                           |
| `solid` | ±20%                   | 500                            |
| `rough` | within 2×              | 200                            |

Bounds are inclusive. An exact guess (`Math.round(guess) === answer`) on a hit adds 250. A miss scores 0. Answers come from the question's formula over its factors (`computeAnswer` in `src/questions/source.ts`).

## API

The player is anonymous: a UUID the client generates once, keeps in localStorage, and sends as the `X-Player-Id` header. There are no accounts.

### `POST /api/guess`

Records one stage and returns the crowd for it.

Request:

```json
{
  "launch": 1,
  "stage": 1,
  "guess": 506,
  "band": "lock",
  "assumptions": { "d": 42.2 }
}
```

`assumptions` is optional: the player's own factor values from the debrief step, kept for analytics.

The API:

1. validates the body: `launch` within ±1 of today's Eastern launch (a run started just before midnight, or a device clock running a little fast, still records; playing far ahead does not); `stage` 1–5; `band` one of `lock`, `solid`, `rough`; `guess` finite, above 0 and below 1e15;
2. loads `public/questions/NNN.json`, takes question `stage`, and computes the answer;
3. scores the guess with `scoreGuess` from `src/game/scoring.ts` and computes `log_error = |ln(guess / answer)|`;
4. upserts the player, inserts the guess, and calls `crowd_stats(launch, stage, log_error)`.

Response `200`:

```json
{
  "hit": true,
  "exact": true,
  "points": 1250,
  "crowd": {
    "players": 1342,
    "hitRate": { "lock": 0.34, "solid": 0.61, "rough": 0.88 },
    "lockHitShare": 0.21,
    "percentile": 0.93
  }
}
```

- `hitRate.<band>`: of the players who chose that band, the share who hit. `null` when nobody chose it.
- `lockHitShare`: of all players on this stage, the share who chose `lock` and hit. This is the "only 9% locked in and hit this one" line.
- `percentile`: the share of players whose guess was further off than this one.
- `crowd` includes this guess.

Errors: `400` for an invalid body or missing `X-Player-Id`; `403` for a launch outside the ±1 window; `404` when no set exists for the launch; `409` when this player already submitted this stage, with the stored result and current crowd in the body so the client can recover.

### `GET /api/crowd?launch=1`

Crowd stats for every stage of a launch, without a player's percentile. The client uses it to show crowd numbers when a player reloads after finishing.

```json
{
  "launch": 1,
  "stages": [
    {
      "stage": 1,
      "players": 1342,
      "hitRate": { "lock": 0.34, "solid": 0.61, "rough": 0.88 },
      "lockHitShare": 0.21
    }
  ]
}
```

## Database

The schema is `supabase/migrations/20261015000000_init.sql`:

- `players`: one row per anonymous player ID.
- `guesses`: one row per player per launch per stage, with the primary key `(player_id, launch, stage)` enforcing one submission. `hit`, `exact` and `points` are whatever the API computed.
- `crowd_stats(launch, stage, log_error)`: one aggregate query over `guesses`, returning the `crowd` object above.

Row Level Security is on with no policies, and the public roles have no grants on the tables or the function. Only the API, using the secret key, can read or write.

New schema changes are new files in `supabase/migrations/`, reviewed in a pull request and then run in the Supabase SQL Editor.

## Code layout

| Path                           | What it is                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `src/api/contract.ts`          | Request and response types. The game imports these when it calls the API.               |
| `src/api/handlers.ts`          | The API's rules as pure functions (validation, launch window, scoring), unit-tested.    |
| `api/guess.ts`, `api/crowd.ts` | The Vercel functions: thin adapters from a `Request` to the handlers.                   |
| `api/_lib/`                    | The Supabase store and the question-set loader. Files starting with `_` are not routes. |
| `vercel.json`                  | Bundles `public/questions/` with the functions so they can read the sets.               |

**Imports on the API's path need a `.js` extension.** Vercel runs the functions as plain Node ES modules, which do not resolve `./file` to `./file.ts`; an extensionless relative import works in Vite and in tests and then crashes in production. `api/tsconfig.json` type-checks everything reachable from `api/` with Node's rules, so `npm run build` fails on a missing extension before it can ship. Write `import { x } from "./file.js"` in any module the API imports.

Running the functions locally needs the Vercel CLI: `npx vercel link`, `npx vercel env pull`, then `npx vercel dev`. Otherwise test on the preview deployment Vercel builds for every pull request.

## Who builds what

- **Game side:** launch rotation, resume and local streaks, question checks. The game records each revealed stage through `src/api/client.ts` and shows the crowd it returns; `GET /api/crowd` is for restoring a finished run once resume exists.
- **Server side:** the Supabase project, the migrations, the `api/` functions and their handlers, and the Vercel configuration.

## Open questions

- A crowd bonus (extra points when few players locked in and hit) needs enough players to be fair, and with client-side scoring it only affects the player's own total. Decide when real numbers exist.
- Cross-device streaks need either accounts or a way to carry the player ID between devices.
- The final epoch date.
