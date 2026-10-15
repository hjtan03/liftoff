import { describe, expect, it } from "vitest";
import { QuestionSetSchema } from "./schema";

const RIM_HEIGHT = {
  key: "ft",
  label: "Rim height",
  unit: "ft",
  value: 10,
  source: "NBA / FIBA regulation",
};

function setWithFormula(formula: string): unknown {
  return {
    id: "test",
    questions: [
      {
        id: "cards-to-the-rim",
        category: "Everyday",
        prompt: "How many cards reach the rim?",
        unit: "cards",
        rounding: "ceil",
        roundingNote: "Round up.",
        factors: [RIM_HEIGHT],
        formula,
      },
    ],
  };
}

describe("QuestionSetSchema", () => {
  it("accepts a formula over the question's factor keys", () => {
    expect(
      QuestionSetSchema.safeParse(setWithFormula("ft * 304.8")).success,
    ).toBe(true);
  });
  it("refuses a formula naming something that is not a factor, at the formula's path", () => {
    const result = QuestionSetSchema.safeParse(
      setWithFormula("ft * 304.8 / mm"),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["questions", 0, "formula"]);
    expect(result.error.issues[0].message).toMatch(/"mm"/);
  });
  it("refuses a formula that does not parse", () => {
    expect(QuestionSetSchema.safeParse(setWithFormula("ft *")).success).toBe(
      false,
    );
  });
});
