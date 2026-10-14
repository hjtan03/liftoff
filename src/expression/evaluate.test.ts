import { describe, expect, it } from "vitest";
import { evaluateExpression } from "./evaluate";

const NO_VARIABLES = {};

describe("evaluateExpression", () => {
  it("applies multiplication before addition", () => {
    expect(evaluateExpression("2+3×4", NO_VARIABLES)).toBe(14);
  });
  it("applies parentheses first", () => {
    expect(evaluateExpression("(2+3)×4", NO_VARIABLES)).toBe(20);
  });
  it("divides to a decimal", () => {
    expect(evaluateExpression("10÷4", NO_VARIABLES)).toBe(2.5);
  });
  it("treats exponent as right associative", () => {
    expect(evaluateExpression("2^3^2", NO_VARIABLES)).toBe(512);
  });
  it("accepts a unary minus at the start and after an operator", () => {
    expect(evaluateExpression("−3+5", NO_VARIABLES)).toBe(2);
    expect(evaluateExpression("5×−3", NO_VARIABLES)).toBe(-15);
  });
  it("ignores spaces and thousands separators", () => {
    expect(evaluateExpression("2 + 2", NO_VARIABLES)).toBe(4);
    expect(evaluateExpression("1,000+1", NO_VARIABLES)).toBe(1001);
  });
  it("accepts ASCII operators as well as the keypad glyphs", () => {
    expect(evaluateExpression("2*3/4", NO_VARIABLES)).toBe(1.5);
  });
  it("reads a variable's value from the record", () => {
    expect(
      evaluateExpression("ft * 304.8 / mm", { ft: 10, mm: 0.76 }),
    ).toBeCloseTo(4010.526, 3);
  });
  it("allows underscores and digits inside a variable name", () => {
    expect(evaluateExpression("lane_m2 * 2", { lane_m2: 50 })).toBe(100);
  });
  it("names an unknown variable in the error", () => {
    expect(() => evaluateExpression("ft * mm", { ft: 10 })).toThrow(/"mm"/);
  });
  it("refuses a variable glued to a number without an operator", () => {
    expect(() => evaluateExpression("2mm", { mm: 3 })).toThrow();
  });
  it("throws on a dangling operator, unbalanced parentheses, empty input, or a stray character", () => {
    expect(() => evaluateExpression("2+", NO_VARIABLES)).toThrow();
    expect(() => evaluateExpression("2)(", NO_VARIABLES)).toThrow();
    expect(() => evaluateExpression("", NO_VARIABLES)).toThrow();
    expect(() => evaluateExpression("2 $ 3", NO_VARIABLES)).toThrow();
  });
  it("throws when the result is not finite", () => {
    expect(() => evaluateExpression("1÷0", NO_VARIABLES)).toThrow();
  });
});
