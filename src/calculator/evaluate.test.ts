import { describe, expect, it } from "vitest";
import { evaluateExpression } from "./evaluate";

describe("evaluateExpression", () => {
  it("applies multiplication before addition", () => {
    expect(evaluateExpression("2+3×4")).toBe(14);
  });
  it("applies parentheses first", () => {
    expect(evaluateExpression("(2+3)×4")).toBe(20);
  });
  it("divides to a decimal", () => {
    expect(evaluateExpression("10÷4")).toBe(2.5);
  });
  it("treats exponent as right associative", () => {
    expect(evaluateExpression("2^3^2")).toBe(512);
  });
  it("accepts a unary minus at the start and after an operator", () => {
    expect(evaluateExpression("−3+5")).toBe(2);
    expect(evaluateExpression("5×−3")).toBe(-15);
  });
  it("reads k, m, and b suffixes and exponent notation", () => {
    expect(evaluateExpression("1.5k×2")).toBe(3000);
    expect(evaluateExpression("1e3+1")).toBe(1001);
  });
  it("ignores spaces and thousands separators", () => {
    expect(evaluateExpression("2 + 2")).toBe(4);
    expect(evaluateExpression("1,000+1")).toBe(1001);
  });
  it("accepts ASCII operators as well as the keypad glyphs", () => {
    expect(evaluateExpression("2*3/4")).toBe(1.5);
  });
  it("throws on a dangling operator, unbalanced parentheses, empty input, or letters", () => {
    expect(() => evaluateExpression("2+")).toThrow();
    expect(() => evaluateExpression("2)(")).toThrow();
    expect(() => evaluateExpression("")).toThrow();
    expect(() => evaluateExpression("abc")).toThrow();
  });
  it("throws when the result is not finite", () => {
    expect(() => evaluateExpression("1÷0")).toThrow();
  });
});
