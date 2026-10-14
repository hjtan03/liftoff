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
- Vite `base` is `/liftoff/` because GitHub Pages serves the repository as
  a project site.

## What is simulated

Crowd stats are a placeholder in `src/game/crowd.ts` until the real crowd
exists. The question set URL in `src/App.tsx` names the one fixed day until
daily rotation exists.
