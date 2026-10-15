/** Formats for display with en-US grouping; fraction digits default by magnitude. */
export function formatNumber(
  value: number,
  maximumFractionDigits?: number,
): string {
  const digits = maximumFractionDigits ?? defaultFractionDigits(value);
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function defaultFractionDigits(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude < 10) return 2;
  if (magnitude < 1000) return 1;
  return 0;
}

const POSITIVE_NUMBER_WITH_SUFFIX = /^(\d*\.?\d+)(k|m|b)?$/;
const SUFFIX_MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/**
 * Reads a positive number typed by the player: digits, an optional decimal
 * point, an optional k/m/b suffix. Separators and whitespace are ignored.
 * Returns NaN for anything else, including negatives and exponent notation.
 */
export function parseNumberInput(text: string): number {
  const compact = text
    .trim()
    .toLowerCase()
    .replace(/[,\s_]/g, "");
  const match = POSITIVE_NUMBER_WITH_SUFFIX.exec(compact);
  if (!match) return NaN;
  const [, digits, suffix] = match;
  const multiplier = suffix ? SUFFIX_MULTIPLIERS[suffix] : 1;
  return parseFloat(digits) * multiplier;
}
