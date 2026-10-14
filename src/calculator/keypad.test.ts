import { describe, expect, it } from "vitest";
import {
  calculatorDisplayText,
  calculatorHistoryText,
  INITIAL_CALCULATOR_STATE,
  pressCalculatorKey,
  type CalculatorState,
} from "./keypad";

function press(
  keys: string,
  from: CalculatorState = INITIAL_CALCULATOR_STATE,
): CalculatorState {
  return [...keys].reduce(pressCalculatorKey, from);
}

describe("pressCalculatorKey", () => {
  it("shows zero and an empty history before any key", () => {
    expect(calculatorDisplayText(INITIAL_CALCULATOR_STATE)).toBe("0");
    expect(calculatorHistoryText(INITIAL_CALCULATOR_STATE)).toBe("");
  });
  it("appends digits and operators", () => {
    expect(press("12+3").expression).toBe("12+3");
  });
  it("replaces a trailing operator instead of stacking two", () => {
    expect(press("2+×").expression).toBe("2×");
  });
  it("allows a minus after an operator for a negative operand", () => {
    expect(press("5×−3").expression).toBe("5×−3");
  });
  it("prefixes a bare decimal point with a zero and refuses a second point in one number", () => {
    expect(press(".5").expression).toBe("0.5");
    expect(press("5+.").expression).toBe("5+0.");
    expect(press("1.2.").expression).toBe("1.2");
  });
  it("previews the running result once an operator follows the first character", () => {
    expect(calculatorHistoryText(press("2+3"))).toBe("= 5");
    expect(calculatorHistoryText(press("2"))).toBe("");
    expect(calculatorHistoryText(press("−2"))).toBe("");
    expect(calculatorHistoryText(press("−2+3"))).toBe("= 1");
  });
  it("equals shows the result and keeps the evaluated expression in the history", () => {
    const result = press("2+3=");
    expect(result).toEqual({
      status: "result",
      expression: "5",
      evaluatedExpression: "2+3",
    });
    expect(calculatorDisplayText(result)).toBe("5");
    expect(calculatorHistoryText(result)).toBe("2+3 =");
  });
  it("equals on a broken expression keeps it and asks for a check", () => {
    const broken = press("2+=");
    expect(broken).toEqual({ status: "error", expression: "2+" });
    expect(calculatorHistoryText(broken)).toBe("Check the expression");
  });
  it("after a result a digit starts fresh and an operator continues from the result", () => {
    expect(press("7", press("2+3=")).expression).toBe("7");
    expect(press("×", press("2+3=")).expression).toBe("5×");
  });
  it("backspace clears a result and trims one character while editing", () => {
    expect(press("⌫", press("2+3=")).expression).toBe("");
    expect(press("12⌫").expression).toBe("1");
  });
  it("clear empties everything", () => {
    expect(press("2+3=C")).toEqual(INITIAL_CALCULATOR_STATE);
  });
  it("stops accepting keys at sixty-four characters", () => {
    const full = press("1".repeat(64));
    expect(press("2", full).expression).toBe(full.expression);
  });
});
