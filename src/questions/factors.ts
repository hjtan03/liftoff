import type { Factor } from "./schema";

export type FactorValues = Record<string, number>;

/** The variable record a question's formula is evaluated over: each factor's key to its canonical value. */
export function canonicalFactorValues(
  factors: readonly Factor[],
): FactorValues {
  return Object.fromEntries(
    factors.map((factor) => [factor.key, factor.value]),
  );
}
