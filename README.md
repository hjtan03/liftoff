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

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root.
**Cloudflare Pages:** connect this repo, no build command, output directory `/`.

For a custom domain, add it in the host's settings (GitHub Pages also needs a `CNAME` file containing the domain).

## How questions work

Answers are never typed in by hand. Each question stores its constants and a formula, and the answer is computed from them:

```js
{
  prompt: "How many credit cards would you stack to reach the rim of a regulation basketball hoop?",
  round: "ceil",
  factors: [
    { k: "ft", label: "Rim height", unit: "ft", value: 10, src: "NBA / FIBA regulation" },
    { k: "mm", label: "Credit card thickness", unit: "mm", value: 0.76, src: "ISO/IEC 7810 ID-1" }
  ],
  calc: f => f.ft * 304.8 / f.mm
}
```

Rule for every question: each input is either a canonical, sourced constant or stated in the prompt. No pure-trivia numbers.

## Status

This is a working single-day prototype. Crowd stats are simulated.

## Roadmap

- [ ] **Question pipeline.** `prompts.txt` → LLM proposes inputs + formula → code computes the answer from a curated constants table → weekly JSON file.
- [ ] **Constants table.** 300–500 sourced constants with units and a "how well known" score.
- [ ] **Duplicate check.** Structural signature (constants + formula) plus embedding similarity against past questions.
- [ ] **Daily rotation.** Serve each day's 5 questions by date from the weekly JSON.
- [ ] **Persistence.** Save progress and streaks in localStorage.
- [ ] **Crowd stats.** Small backend to record guesses; show "only 9% locked in and hit this one" and a rarity bonus.
- [ ] **Launch polish.** Rocket burns each stage's fuel in sequence on the way up.
- [ ] **Name + domain.**
