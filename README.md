# Liftoff

A daily estimation game: five questions, one rocket.

## About

Every question is answered by reasoning from well-known, sourced constants, not trivia. The player works out a number, picks a confidence band, and fires a rocket stage; after five stages the rocket launches, and its altitude is the score. Liftoff is a Vite + React + TypeScript single-page app with no backend. Where it is going is in [docs/roadmap.md](docs/roadmap.md).

## Getting started

Needs Node 24 or newer.

```bash
npm install
npm run dev
```

Vite serves the game at `http://localhost:5173/liftoff/`. The `/liftoff/` path matches where GitHub Pages hosts it.

## Development

```bash
npm run lint          # ESLint
npm run format:check  # Prettier; `npm run format` rewrites
npm test              # Vitest: the game logic
npm run build         # type-check with tsc, then bundle to dist/
npm run test:e2e      # Playwright: plays the built game in Chromium (build first)
```

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
docs/                      roadmap, how questions work, archive
.github/workflows/ci.yml   checks on every PR, Pages deploy from main
```

Unit tests sit beside the module they test, as `*.test.ts`.

## Deployment

A push to `main` builds the site and publishes `dist/` to GitHub Pages from `.github/workflows/ci.yml`. The repository's Pages source has to be **GitHub Actions** (Settings → Pages → Build and deployment → Source).

For Cloudflare Pages instead: connect the repo, build command `npm run build`, output directory `dist`. For a custom domain on either host, set `base` in `vite.config.ts` to `/` (GitHub Pages also needs a `CNAME` file containing the domain).

## Contributing

Branch from `main` and open a pull request. CI runs the formatter, the linter, the unit tests, the build, and the end-to-end play-through, and all of them have to pass. A new question follows [docs/questions.md](docs/questions.md).
