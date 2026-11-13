/**
 * How a guess is scored: by how close it lands, with no bet to place first.
 * Fuel falls off smoothly with the log of the miss, so 2× too high and 2×
 * too low earn the same, every guess earns something, and an exact answer
 * earns a bonus on top. The tier only names how close it was, for the
 * verdict and the share grid.
 */

export type Tier = "docked" | "moonshot" | "orbit" | "suborbital" | "scrubbed";

export type TierInfo = {
  name: string;
  /** How close the tier is, in words, for the legend and the verdict. */
  rule: string;
  emoji: string;
};

export const TIERS: Record<Tier, TierInfo> = {
  docked: { name: "Docked", rule: "exact", emoji: "🎯" },
  moonshot: { name: "Moonshot", rule: "within 10%", emoji: "🟢" },
  orbit: { name: "Orbit", rule: "within 50%", emoji: "🟡" },
  suborbital: { name: "Suborbital", rule: "within 3×", emoji: "🟠" },
  scrubbed: { name: "Scrubbed", rule: "more than 3× off", emoji: "🔴" },
};

/** Fuel for a guess that is right but not exact, before the falloff. */
const CLOSENESS_POINTS = 1000;
export const EXACT_ANSWER_BONUS_POINTS = 250;
export const MAX_POINTS_PER_STAGE =
  CLOSENESS_POINTS + EXACT_ANSWER_BONUS_POINTS;
/**
 * How fast fuel falls off with the miss: points = 1000 × e^(−|ln(guess ÷ answer)| ÷ 0.6).
 * 10% off keeps about 850, 50% about 500, 2× about 300, 3× about 160, 10× about 20.
 * An exact answer earns the whole stage: 1000 plus the 250 bonus.
 */
const FALLOFF = 0.6;
const MOONSHOT_SHARE = 0.1;
const ORBIT_SHARE = 0.5;
const SUBORBITAL_RATIO = 3;

export function maxTotalPoints(questionCount: number): number {
  return questionCount * MAX_POINTS_PER_STAGE;
}

export type ScoredGuess = {
  guess: number;
  tier: Tier;
  /** Anything closer than scrubbed: the stage fires. */
  hit: boolean;
  exact: boolean;
  points: number;
  emoji: string;
  /** How far off, as a share of the answer: 0.12 for 12% high or 12% low. */
  shareOff: number;
  /** The larger of guess ÷ answer and answer ÷ guess: 1 when right on. */
  ratio: number;
  isHigh: boolean;
};

/** Exact is the guess rounding to the answer. */
export function scoreGuess(input: {
  answer: number;
  guess: number;
}): ScoredGuess {
  const { answer, guess } = input;
  const exact = Math.round(guess) === answer;
  const logMiss = Math.abs(Math.log(guess / answer));
  const ratio = Math.exp(logMiss);
  const shareOff = Math.abs(guess - answer) / answer;
  const tier: Tier = exact
    ? "docked"
    : shareOff <= MOONSHOT_SHARE
      ? "moonshot"
      : shareOff <= ORBIT_SHARE
        ? "orbit"
        : ratio <= SUBORBITAL_RATIO
          ? "suborbital"
          : "scrubbed";
  // Exact counts as right on, so it always earns the whole stage.
  const points = exact
    ? MAX_POINTS_PER_STAGE
    : Math.round(CLOSENESS_POINTS * Math.exp(-logMiss / FALLOFF));
  return {
    guess,
    tier,
    hit: tier !== "scrubbed",
    exact,
    points,
    emoji: TIERS[tier].emoji,
    shareOff,
    ratio,
    isHigh: guess > answer,
  };
}

/** "12% low", "35% high", "2.4× too high", "right on". */
export function describeMiss(result: ScoredGuess): string {
  if (result.exact || result.shareOff < 0.005) return "right on";
  const direction = result.isHigh ? "high" : "low";
  if (result.ratio < 2)
    return `${Math.max(1, Math.round(result.shareOff * 100))}% ${direction}`;
  return `${result.ratio.toFixed(1)}× too ${direction}`;
}
