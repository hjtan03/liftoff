# Liftoff

A daily estimation game: five questions, each answered by reasoning from
sourced constants; a confidence band per answer; hits fuel a rocket whose
altitude is the score. A Vite + React + TypeScript single-page app with no
backend. Commands and layout are in README.md. Direction is in
docs/roadmap.md; documentation lands in docs/, and a superseded document
goes to docs/archive/.

## Conventions

- TypeScript strict. `tsc -b` runs inside `npm run build`, so a type error
  fails the build.
- The rules live in `src/game/` as pure functions with colocated unit
  tests. Components in `src/components/` render state and dispatch actions
  to the reducer in `src/game/state.ts`; they hold no rules of their own.
- Questions are TypeScript objects in `src/game/questions.ts`. The answer
  is computed from the factors and the rounding rule, never written down.
  Every factor names its source.
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

Crowd stats (`simulatedCrowdLockedInHitPercent` on each question) and the
launch number (`src/game/launch.ts`) are placeholders until the roadmap's
backend and daily rotation exist.
