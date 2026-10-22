# Liftoff

A daily estimation game: five questions, each answered by reasoning from
sourced constants; a confidence band per answer; hits fuel a rocket whose
altitude is the score. A Vite + React + TypeScript single-page app with no
backend. Commands and layout are in README.md. Direction is in
docs/roadmap.md and how a question is defined in docs/questions.md;
documentation lands in docs/, and a superseded document goes to
docs/archive/.

## Conventions

- TypeScript strict. `tsc -b` runs inside `npm run build`, so a type error
  fails the build.
- The rules live in `src/game/` as pure functions with colocated unit
  tests. Components in `src/components/` render state and dispatch actions
  to the reducer in `src/game/state.ts`; they hold no rules of their own.
- Questions follow docs/questions.md: JSON documents under
  `public/questions/`, checked against `src/questions/schema.ts` by a test
  on the producer's side. The game fetches a set through
  `src/questions/source.ts`, trusts it, and computes every answer; an
  answer is never written down.
- Animations run through `src/animation.ts` on requestAnimationFrame and
  honour `prefers-reduced-motion`.
- One global stylesheet, `src/app.css`.
- ESLint (flat config with typescript-eslint, react-hooks, react-refresh)
  and Prettier with default settings are both gates.
- Playwright runs against the production build, so `npm run build` comes
  before `npm run test:e2e`.
- Vercel hosts the site from the domain root, so Vite `base` is `/`. Vercel
  builds every pull request as a preview and deploys `main` to production;
  CI only checks.

- The API lives in `api/` (Vercel functions) over pure handlers in
  `src/api/`; docs/backend.md has the contract. Every relative import
  reachable from `api/` names its `.js` file, because the functions run as
  plain Node ES modules; `api/tsconfig.json` enforces it in the build.

## Progress

The run in progress and the history of finished launches live in
localStorage (`src/game/progress.ts`, read and written through
`src/browserStorage.ts`, which never throws). A refresh resumes today's run;
a saved run from another launch or in an unknown shape is ignored. Streaks
count consecutive finished launches and survive until a whole launch is
missed.

## The crowd

Each revealed stage is posted to `/api/guess` through `src/api/client.ts`,
and the reveal shows the crowd the server returns. Every client call
degrades to "no crowd line" rather than an error, because the game scores
itself and must play without the server. `npm run dev` and the Playwright
preview do not run the API; the play-through stubs `/api/guess` where it
checks the crowd line.
