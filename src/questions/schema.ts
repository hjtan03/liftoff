import { z } from "zod";
import { evaluateExpression } from "../expression/evaluate.js";
import { canonicalFactorValues } from "./factors.js";

/**
 * The contract between whoever produces a question set and the game. A
 * document never carries an answer: the game computes it from the formula
 * over the factors. The producer checks its documents against this schema;
 * the game trusts what it is served and imports only the types.
 */

export const RoundingRuleSchema = z.enum(["round", "ceil", "floor"]);

export const FactorSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  unit: z.string(),
  value: z.number(),
  source: z.string().min(1),
});

export const QuestionSchema = z
  .object({
    id: z.string().min(1),
    category: z.string().min(1),
    prompt: z.string().min(1),
    unit: z.string().min(1),
    rounding: RoundingRuleSchema,
    roundingNote: z.string().min(1),
    factors: z.array(FactorSchema).min(1),
    formula: z.string().min(1),
  })
  .superRefine((question, context) => {
    try {
      evaluateExpression(
        question.formula,
        canonicalFactorValues(question.factors),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.addIssue({ code: "custom", path: ["formula"], message });
    }
  });

export const QuestionSetSchema = z.object({
  id: z.string().min(1),
  questions: z.array(QuestionSchema).min(1),
});

export type RoundingRule = z.infer<typeof RoundingRuleSchema>;
export type Factor = z.infer<typeof FactorSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionSet = z.infer<typeof QuestionSetSchema>;
