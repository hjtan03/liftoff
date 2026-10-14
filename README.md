# Liftoff

A daily estimation game. Five math questions a day, one rocket.

Every question can be worked out from well-known constants (a marathon is 42.195 km, a credit card is 0.76 mm thick), so it rewards reasoning, not trivia. For each question you:

1. Work out an answer (a pop-up calculator is built in).
2. Pick a confidence level: **Locked in** (±5%), **Solid** (±20%) or **Rough** (within 2×).
3. Fire the stage. If the answer lands inside your range, that rocket stage fills with fuel; if not, it misfires.

After five stages the rocket launches, and its altitude is your score. The share string looks like this:

```
🚀 Liftoff #001 🎯🔴🟢🟡🟠
Reached: Kármán line (104 km)
```

## Run it

Needs Node 24 or newer.

```bash
npm install
npm run dev
```

Vite serves the game at `http://localhost:5173/liftoff/`. The `/liftoff/` path matches where GitHub Pages hosts it.

## Check it

```bash
npm run lint          # ESLint
npm run format:check  # Prettier; `npm run format` rewrites
npm test              # Vitest: the game logic
npm run build         # type-check with tsc, then bundle to dist/
npm run test:e2e      # Playwright: plays the built game in Chromium (build first)
```

CI runs every one of these on each pull request.

## Deploy

A push to `main` builds the site and publishes `dist/` to GitHub Pages from `.github/workflows/ci.yml`. The repository's Pages source has to be **GitHub Actions** (Settings → Pages → Build and deployment → Source).

For Cloudflare Pages instead: connect the repo, build command `npm run build`, output directory `dist`. For a custom domain on either host, set `base` in `vite.config.ts` to `/` (GitHub Pages also needs a `CNAME` file containing the domain).

## Layout

```
index.html                 page shell: metadata and fonts
src/main.tsx               mounts the app
src/App.tsx                the game phases and the calculator toggle
src/app.css                the stylesheet
src/animation.ts           frame tween and reduced-motion check
src/game/                  the rules: questions, scoring, altitude, state
src/calculator/            the pop-up calculator and its expression parser
src/components/            one component per screen piece
e2e/                       Playwright play-through
docs/                      roadmap and archive
.github/workflows/ci.yml   checks on every PR, Pages deploy from main
```

Unit tests sit beside the module they test, as `*.test.ts`.

## How questions work

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

## Status

A working single-day prototype. Crowd stats are simulated.

## Roadmap

Where Liftoff is going is in [docs/roadmap.md](docs/roadmap.md): outcomes, not plans, with nothing set in stone. The roadmap as Justin first wrote it is in [docs/archive/](docs/archive/).
