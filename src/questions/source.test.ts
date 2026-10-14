import { describe, expect, it } from "vitest";
import firstPublishedSet from "../../public/questions/001.json";
import type { Question, QuestionSet } from "./schema";
import { computeAnswer, withComputedAnswers, workedSolution } from "./source";

const SHEETS_ON_A_FIELD: Question = {
  id: "sheets-on-a-field",
  category: "Sport",
  prompt: "How many sheets cover the field?",
  unit: "sheets",
  rounding: "ceil",
  roundingNote: "Round up.",
  factors: [
    {
      key: "yd",
      label: "Field length",
      unit: "yd",
      value: 100,
      source: "NFL rulebook",
    },
    {
      key: "in",
      label: "Sheet length",
      unit: "in",
      value: 11,
      source: "ANSI Letter",
    },
  ],
  formula: "yd * 36 / in",
};

describe("computeAnswer", () => {
  it("applies the question's rounding rule to the formula over the canonical values", () => {
    expect(computeAnswer(SHEETS_ON_A_FIELD)).toBe(328);
    expect(computeAnswer({ ...SHEETS_ON_A_FIELD, rounding: "floor" })).toBe(
      327,
    );
    expect(computeAnswer({ ...SHEETS_ON_A_FIELD, rounding: "round" })).toBe(
      327,
    );
  });
  it("absorbs floating-point noise before rounding", () => {
    const threeThirds: Question = {
      ...SHEETS_ON_A_FIELD,
      rounding: "floor",
      factors: [
        { key: "n", label: "Count", unit: "", value: 0.1, source: "test" },
      ],
      formula: "(n + n + n) * 10",
    };
    expect(computeAnswer(threeThirds)).toBe(3);
  });
});

describe("workedSolution", () => {
  it("substitutes the factor values into the formula and shows the unrounded result", () => {
    expect(workedSolution(SHEETS_ON_A_FIELD)).toBe("100 × 36 ÷ 11 = 327.27");
  });
  it("groups thousands in both the values and the result", () => {
    const lightLaps: Question = {
      ...SHEETS_ON_A_FIELD,
      factors: [
        {
          key: "c",
          label: "Speed of light",
          unit: "km/s",
          value: 299792.458,
          source: "SI",
        },
        {
          key: "eq",
          label: "Equator",
          unit: "km",
          value: 40075,
          source: "WGS 84",
        },
      ],
      formula: "c * 60 / eq",
    };
    expect(workedSolution(lightLaps)).toBe(
      "299,792.458 × 60 ÷ 40,075 = 448.85",
    );
  });
});

describe("the first published set", () => {
  it("computes the five answers the play-through types", () => {
    const loaded = withComputedAnswers(firstPublishedSet as QuestionSet);
    expect(loaded.id).toBe("001");
    expect(loaded.questions.map((question) => question.answer)).toEqual([
      506, 328, 2343, 4011, 448,
    ]);
  });
});
