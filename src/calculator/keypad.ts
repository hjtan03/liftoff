import { formatNumber } from "../game/numbers";
import { evaluateExpression } from "./evaluate";

export type CalculatorState =
  | { status: "editing"; expression: string }
  | { status: "result"; expression: string; evaluatedExpression: string }
  | { status: "error"; expression: string };

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  status: "editing",
  expression: "",
};

const MAX_EXPRESSION_LENGTH = 64;
const OPERATOR_KEYS = /^[+×÷−]$/;
const TRAILING_OPERATOR = /[+×÷−]$/;
const OPERATOR_PAST_FIRST_CHARACTER = /[+×÷−]/;
const NUMBER_BOUNDARY = /[+×÷−()]/;
const PREVIEW_DECIMALS = 6;

export function calculatorDisplayText(state: CalculatorState): string {
  return state.expression || "0";
}

export function calculatorHistoryText(state: CalculatorState): string {
  if (state.status === "result") return `${state.evaluatedExpression} =`;
  if (state.status === "error") return "Check the expression";
  if (!OPERATOR_PAST_FIRST_CHARACTER.test(state.expression.slice(1))) return "";
  try {
    return `= ${formatNumber(evaluateExpression(state.expression), PREVIEW_DECIMALS)}`;
  } catch {
    return "";
  }
}

/** Keys are the keypad glyphs: digits, ".", "(", ")", "+", "−", "×", "÷", "=", "⌫", "C". */
export function pressCalculatorKey(
  state: CalculatorState,
  key: string,
): CalculatorState {
  if (key === "C") return INITIAL_CALCULATOR_STATE;
  if (key === "⌫") {
    if (state.status === "result") return INITIAL_CALCULATOR_STATE;
    return { status: "editing", expression: state.expression.slice(0, -1) };
  }
  if (key === "=") return evaluate(state);
  const isOperator = OPERATOR_KEYS.test(key);
  let expression =
    state.status === "result" && !isOperator ? "" : state.expression;
  if (isOperator && TRAILING_OPERATOR.test(expression) && key !== "−") {
    expression = expression.slice(0, -1);
  }
  if (key === ".") {
    const currentNumber = expression.split(NUMBER_BOUNDARY).pop() ?? "";
    if (currentNumber.includes(".")) return { status: "editing", expression };
    if (!currentNumber) expression += "0";
  }
  if (expression.length < MAX_EXPRESSION_LENGTH) expression += key;
  return { status: "editing", expression };
}

function evaluate(state: CalculatorState): CalculatorState {
  try {
    const value = evaluateExpression(state.expression);
    const expression = String(Number(value.toPrecision(12)));
    return {
      status: "result",
      expression,
      evaluatedExpression: state.expression,
    };
  } catch {
    return { status: "error", expression: state.expression };
  }
}
