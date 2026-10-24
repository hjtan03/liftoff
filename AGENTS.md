# Liftoff

A daily estimation game: five questions, each answered by reasoning from
sourced constants; a confidence band per answer; hits fuel a rocket, and how
far into the solar system it flies is the score. A Vite + React + TypeScript
single-page app with a small crowd-stats API. Commands and layout are in README.md. Direction is in
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

## Look and sound

- The name lives in `src/brand.ts`; change it there, and in `index.html`'s
  title and meta tags.
- Pixel art is drawn in code: `src/pixel/sprites.ts` holds sprites as rows
  of palette characters and generates the spectators, planets and clouds;
  `src/pixel/Sprite.tsx` renders them as crisp SVG, and `src/pixel/sky.ts`
  paints the dithered sky onto a canvas. Sprite colors and the stylesheet
  tokens use the same values.
- One art pixel is a whole number of screen pixels: on the pad, the
  `--art-pixel-size` set in `src/app.css` (3 where the window is tall
  enough for the rocket to stand there whole, 2 on phones and shorter
  windows, 1 on the shortest), and in flight one fewer (down to 1), the
  camera pulling back a whole step as the rocket lifts off. Dithering stays crisp at both; never
  rest the scene at a fraction. The one exception is the camera pulling
  back over the whole route at the end of a launch, which no whole number
  fits; the sky canvas is repainted at that zoom rather than scaled.
- Two pixel faces: Jersey 15 for headings, numbers and buttons, DotGothic16
  for reading. Both have one weight, so nothing is set bold. Small labels
  are tracked capitals; panels are deep violet-navy with a thin light edge.
- Every screen sits in one full-window scene at dusk,
  `src/components/MissionScene.tsx`: the dithered sky painted by
  `src/pixel/sky.ts`, pink at the horizon through violet into starry space,
  with the life drifting over the pad (`src/components/Sky.tsx`); the
  launch pad (`src/components/PadScene.tsx`) inside its launch site
  (`src/components/LaunchSite.tsx`), standing on the soil under the band
  that holds the controls; the heads-up bar from
  `src/components/Shell.tsx` across the top, and the cards over the sky.
  Screens between launches show the rocket waiting on the pad.
- Sound is synthesized in `src/sound.ts` (Web Audio, no files), quiet, and
  only ever starts from a player's action. The switch in the heads-up bar
  mutes it and is remembered.
- The rocket stands fully built on the pad: a capsule and one stage per
  question, drawn finely enough in `src/pixel/rocket.ts` to hold up close,
  beside the service tower, with a crowd of small spectators behind a rope
  to the side that waits, cheers it off, or puts its hands on its head at a
  scrub. Every reveal burns the lowest
  stage, and the rocket flies on along one long route,
  `src/pixel/arc.ts`: straight up through the cloud bank, then a gravity
  turn to the right, the planets big beside it on the outside of the bend.
  Where it rests is `routePosition` of the fuel revealed so far, from
  `src/game/journey.ts`, on the same curve as the final score; only a
  perfect launch reaches Neptune. A hit's burn travels further the more
  fuel it carries, its plume bending with the arc, and the spent stage
  tumbles away at the end. The first burn off the pad is liftoff, with no
  countdown: a flash, a shaking camera, and a bank of smoke rolling out
  from the flame trench until it spans the screen, lit pink by the engine;
  the rocket climbs out of it, and the camera pulls back to flight scale as
  it does. A scrub coughs, lurches, and drops its stage scorched. Only
  then does the result come up. The camera rides with the rocket between
  questions, a ruler down the side shows how far along the route it is,
  and once the launch is over the camera pulls back over the whole route
  from the pad to where the rocket got to, and the report comes up over
  it. The rocket is derived from the run, never stored, so a refresh shows
  it where it was. Spectators come from `spectator(look, pose, frame)`.
  Reduced motion skips the burns and the pull-back.
- Bands show as Moonshot (±5%), Orbit (±20%) and Suborbital (2×), an exact
  hit as Docked and a miss as Scrubbed. The API keeps the keys `lock`,
  `solid` and `rough`; only the names in `src/game/scoring.ts` changed.

## Progress

The run in progress and the history of finished launches live in
localStorage (`src/game/progress.ts`, read and written through
`src/browserStorage.ts`, which never throws). A refresh resumes today's run;
a saved run from another launch or in an unknown shape is ignored. Streaks
count consecutive finished launches and survive until a whole launch is
missed.

The address picks the screen (`src/route.ts`): no query plays today's
launch; `?archive` lists past launches, opening on day 2; `?launch=N` replays
a past launch. A replay keeps its own run under `liftoff.archive.NNN`, never
touches today's run or the history, never posts guesses, and shows the
crowd from its launch day. Future launches stay shut unless the address adds
`&test` (or the first launch hasn't happened yet), for checking a set on a
preview.

## The crowd

Each revealed stage is posted to `/api/guess` through `src/api/client.ts`,
and the reveal shows the crowd the server returns. Every client call
degrades to "no crowd line" rather than an error, because the game scores
itself and must play without the server. `npm run dev` and the Playwright
preview do not run the API; the play-through stubs `/api/guess` where it
checks the crowd line.
