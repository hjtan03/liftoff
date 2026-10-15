import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_BANDS,
  EXACT_ANSWER_BONUS_POINTS,
  MAX_POINTS_PER_STAGE,
  MAX_TOTAL_POINTS,
  scoreGuess,
} from "./scoring";

describe("confidence bands", () => {
  it("locked in is plus or minus five percent for 1000 points", () => {
    expect(CONFIDENCE_BANDS.lock.points).toBe(1000);
    expect(CONFIDENCE_BANDS.lock.lowBound(100)).toBeCloseTo(95);
    expect(CONFIDENCE_BANDS.lock.highBound(100)).toBeCloseTo(105);
  });
  it("solid is plus or minus twenty percent for 500 points", () => {
    expect(CONFIDENCE_BANDS.solid.points).toBe(500);
    expect(CONFIDENCE_BANDS.solid.lowBound(100)).toBeCloseTo(80);
    expect(CONFIDENCE_BANDS.solid.highBound(100)).toBeCloseTo(120);
  });
  it("rough is within a factor of two for 200 points", () => {
    expect(CONFIDENCE_BANDS.rough.points).toBe(200);
    expect(CONFIDENCE_BANDS.rough.lowBound(100)).toBe(50);
    expect(CONFIDENCE_BANDS.rough.highBound(100)).toBe(200);
  });
  it("a stage is worth at most the locked-in points plus the exact bonus, five stages in all", () => {
    expect(EXACT_ANSWER_BONUS_POINTS).toBe(250);
    expect(MAX_POINTS_PER_STAGE).toBe(1250);
    expect(MAX_TOTAL_POINTS).toBe(6250);
  });
});

describe("scoreGuess", () => {
  it("fires the stage for the band's points when the answer lies inside the range", () => {
    const result = scoreGuess({ answer: 506, guess: 500, band: "lock" });
    expect(result.hit).toBe(true);
    expect(result.exact).toBe(false);
    expect(result.points).toBe(1000);
    expect(result.emoji).toBe("🟢");
    expect(result.lowBound).toBeCloseTo(475);
    expect(result.highBound).toBeCloseTo(525);
  });
  it("adds the exact bonus when the guess rounds to the answer", () => {
    const result = scoreGuess({ answer: 506, guess: 506.4, band: "lock" });
    expect(result.exact).toBe(true);
    expect(result.points).toBe(1250);
    expect(result.emoji).toBe("🎯");
  });
  it("misfires for zero points when the answer lies outside the range", () => {
    const result = scoreGuess({ answer: 506, guess: 600, band: "lock" });
    expect(result.hit).toBe(false);
    expect(result.points).toBe(0);
    expect(result.emoji).toBe("🔴");
  });
  it("colours a solid hit yellow and a rough hit orange", () => {
    expect(scoreGuess({ answer: 506, guess: 600, band: "solid" }).emoji).toBe(
      "🟡",
    );
    expect(scoreGuess({ answer: 506, guess: 900, band: "rough" }).emoji).toBe(
      "🟠",
    );
  });
  it("counts an answer sitting exactly on either edge of the range as a hit", () => {
    expect(scoreGuess({ answer: 100, guess: 50, band: "rough" }).hit).toBe(
      true,
    );
    expect(scoreGuess({ answer: 100, guess: 200, band: "rough" }).hit).toBe(
      true,
    );
  });
});
