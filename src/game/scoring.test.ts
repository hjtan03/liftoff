import { describe, expect, it } from "vitest";
import {
  describeMiss,
  EXACT_ANSWER_BONUS_POINTS,
  MAX_POINTS_PER_STAGE,
  maxTotalPoints,
  scoreGuess,
} from "./scoring";

describe("fuel", () => {
  it("is worth at most 1000 for closeness plus the 250 exact bonus, times the stages", () => {
    expect(EXACT_ANSWER_BONUS_POINTS).toBe(250);
    expect(MAX_POINTS_PER_STAGE).toBe(1250);
    expect(maxTotalPoints(5)).toBe(6250);
  });

  it.each([
    [110, 853],
    [150, 509],
    [200, 315],
    [300, 160],
    [1000, 22],
  ])("falls off smoothly: a guess of %i for 100 earns %i", (guess, points) => {
    expect(scoreGuess({ answer: 100, guess }).points).toBe(points);
  });

  it("treats too high and too low by the same factor alike", () => {
    expect(scoreGuess({ answer: 100, guess: 50 }).points).toBe(
      scoreGuess({ answer: 100, guess: 200 }).points,
    );
  });

  it("gives something for even a wild guess", () => {
    expect(scoreGuess({ answer: 100, guess: 2000 }).points).toBeGreaterThan(0);
  });

  it("adds the exact bonus when the guess rounds to the answer", () => {
    const result = scoreGuess({ answer: 506, guess: 506.4 });
    expect(result.exact).toBe(true);
    expect(result.points).toBe(1250);
    expect(result.emoji).toBe("🎯");
  });
});

describe("tiers", () => {
  it.each([
    [506, "docked", "🎯"],
    [92, "moonshot", "🟢"],
    [109, "moonshot", "🟢"],
    [55, "orbit", "🟡"],
    [149, "orbit", "🟡"],
    [40, "suborbital", "🟠"],
    [290, "suborbital", "🟠"],
    [30, "scrubbed", "🔴"],
    [400, "scrubbed", "🔴"],
  ])("a guess of %i for 100 is %s", (guess, tier, emoji) => {
    const answer = guess === 506 ? 506 : 100;
    const result = scoreGuess({ answer, guess });
    expect(result.tier).toBe(tier);
    expect(result.emoji).toBe(emoji);
    expect(result.hit).toBe(tier !== "scrubbed");
  });
});

describe("describeMiss", () => {
  it.each([
    [100, "right on"],
    [88, "12% low"],
    [135, "35% high"],
    [240, "2.4× too high"],
    [25, "4.0× too low"],
  ])("a guess of %i for 100 reads %s", (guess, text) => {
    expect(describeMiss(scoreGuess({ answer: 100, guess }))).toBe(text);
  });
});
