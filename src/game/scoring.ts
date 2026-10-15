import { QUESTIONS } from "./questions";

export type BandKey = "lock" | "solid" | "rough";

export type ConfidenceBand = {
  name: string;
  rule: string;
  points: number;
  lowBound: (guess: number) => number;
  highBound: (guess: number) => number;
};

export const CONFIDENCE_BANDS: Record<BandKey, ConfidenceBand> = {
  lock: {
    name: "Locked in",
    rule: "±5%",
    points: 1000,
    lowBound: (guess) => guess * 0.95,
    highBound: (guess) => guess * 1.05,
  },
  solid: {
    name: "Solid",
    rule: "±20%",
    points: 500,
    lowBound: (guess) => guess * 0.8,
    highBound: (guess) => guess * 1.2,
  },
  rough: {
    name: "Rough",
    rule: "within 2×",
    points: 200,
    lowBound: (guess) => guess / 2,
    highBound: (guess) => guess * 2,
  },
};

/** Display order, tightest band first. */
export const BAND_KEYS: readonly BandKey[] = ["lock", "solid", "rough"];

export const EXACT_ANSWER_BONUS_POINTS = 250;
export const MAX_POINTS_PER_STAGE =
  CONFIDENCE_BANDS.lock.points + EXACT_ANSWER_BONUS_POINTS;
export const MAX_TOTAL_POINTS = QUESTIONS.length * MAX_POINTS_PER_STAGE;

const HIT_EMOJI: Record<BandKey, string> = {
  lock: "🟢",
  solid: "🟡",
  rough: "🟠",
};
export const EXACT_EMOJI = "🎯";
export const MISFIRE_EMOJI = "🔴";

export type ScoredGuess = {
  guess: number;
  band: BandKey;
  lowBound: number;
  highBound: number;
  hit: boolean;
  exact: boolean;
  points: number;
  emoji: string;
};

/** A hit is the answer inside the band's range, edges included; exact is the guess rounding to the answer. */
export function scoreGuess(input: {
  answer: number;
  guess: number;
  band: BandKey;
}): ScoredGuess {
  const { answer, guess, band } = input;
  const bandRules = CONFIDENCE_BANDS[band];
  const lowBound = bandRules.lowBound(guess);
  const highBound = bandRules.highBound(guess);
  const hit = answer >= lowBound && answer <= highBound;
  const exact = Math.round(guess) === answer;
  const points = hit
    ? bandRules.points + (exact ? EXACT_ANSWER_BONUS_POINTS : 0)
    : 0;
  const emoji = !hit ? MISFIRE_EMOJI : exact ? EXACT_EMOJI : HIT_EMOJI[band];
  return { guess, band, lowBound, highBound, hit, exact, points, emoji };
}
