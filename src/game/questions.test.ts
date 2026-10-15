import { describe, expect, it } from "vitest";
import { canonicalFactorValues, QUESTIONS } from "./questions";

describe("QUESTIONS", () => {
  it("holds five stages", () => {
    expect(QUESTIONS).toHaveLength(5);
  });
  it("computes every answer from its factors and rounding rule", () => {
    const answers = QUESTIONS.map((question) => question.answer);
    expect(answers).toEqual([
      506, // 42.195 km / 5 km/h * 60 = 506.34, rounded
      328, // 100 yd * 36 in / 11 in = 327.27, rounded up
      2343, // 100,000 mm / 42.67 mm = 2343.56, rounded down
      4011, // 10 ft * 304.8 mm / 0.76 mm = 4010.53, rounded up
      448, // 299,792.458 km/s * 60 s / 40,075 km = 448.85, rounded down
    ]);
  });
  it("sources every factor", () => {
    for (const question of QUESTIONS) {
      for (const factor of question.factors) {
        expect(factor.source).not.toBe("");
      }
    }
  });
  it("shows the unrounded result in the worked solution", () => {
    const marathon = QUESTIONS[0];
    expect(marathon.workedSolution(canonicalFactorValues(marathon))).toContain(
      "506.34",
    );
  });
  it("maps each factor key to its canonical value", () => {
    expect(canonicalFactorValues(QUESTIONS[0])).toEqual({ d: 42.195 });
  });
});
