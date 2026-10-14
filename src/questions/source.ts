import { evaluateExpression } from "../expression/evaluate";
import { formatNumber } from "../game/numbers";
import { canonicalFactorValues } from "./factors";
import type { Question, QuestionSet, RoundingRule } from "./schema";

export type LoadedQuestion = Question & { answer: number };
export type LoadedQuestionSet = { id: string; questions: LoadedQuestion[] };

const ROUNDING_FUNCTIONS: Record<RoundingRule, (value: number) => number> = {
  round: Math.round,
  ceil: Math.ceil,
  floor: Math.floor,
};

/** Six decimals absorb floating-point noise before the rounding rule applies. */
const UNROUNDED_RESULT_DECIMALS = 6;
const SHOWN_VALUE_DECIMALS = 3;
const SHOWN_RESULT_DECIMALS = 2;
const FORMULA_TOKEN = /[A-Za-z_][A-Za-z0-9_]*|\d*\.?\d+/g;
const FORMULA_OPERATOR = /[*/+-]/g;
const DISPLAY_OPERATORS: Record<string, string> = {
  "*": "×",
  "/": "÷",
  "+": "+",
  "-": "−",
};

/** The formula over the canonical factor values, before the rounding rule. */
export function unroundedResult(question: Question): number {
  const value = evaluateExpression(
    question.formula,
    canonicalFactorValues(question.factors),
  );
  return Number(value.toFixed(UNROUNDED_RESULT_DECIMALS));
}

export function computeAnswer(question: Question): number {
  return ROUNDING_FUNCTIONS[question.rounding](unroundedResult(question));
}

/** The formula with each factor's value substituted, in display glyphs, and the unrounded result. */
export function workedSolution(question: Question): string {
  const values = canonicalFactorValues(question.factors);
  const substituted = question.formula
    .replace(/\s+/g, "")
    .replace(FORMULA_TOKEN, (token) =>
      formatNumber(
        token in values ? values[token] : parseFloat(token),
        SHOWN_VALUE_DECIMALS,
      ),
    )
    .replace(
      FORMULA_OPERATOR,
      (operator) => ` ${DISPLAY_OPERATORS[operator]} `,
    );
  return `${substituted} = ${formatNumber(unroundedResult(question), SHOWN_RESULT_DECIMALS)}`;
}

export function withComputedAnswers(set: QuestionSet): LoadedQuestionSet {
  return {
    id: set.id,
    questions: set.questions.map((question) => ({
      ...question,
      answer: computeAnswer(question),
    })),
  };
}

/**
 * Fetches the question set at url and computes its answers. The document is
 * trusted as it arrives; its producer checked it against the schema. Throws
 * naming the url when the server does not return it.
 */
export async function fetchQuestionSet(
  url: string,
): Promise<LoadedQuestionSet> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`cannot load question set ${url}: HTTP ${response.status}`);
  const document = (await response.json()) as QuestionSet;
  return withComputedAnswers(document);
}
