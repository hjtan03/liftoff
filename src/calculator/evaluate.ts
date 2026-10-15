const NUMBER_WITH_SUFFIX = /^(\d*\.?\d+(?:e[+-]?\d+)?)([kmb])?/i;
const SUFFIX_MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/**
 * Evaluates keypad arithmetic by recursive descent: + − × ÷ ^ and
 * parentheses over decimals with optional exponent notation and k/m/b
 * suffixes. ASCII operators, spaces, and thousands separators are accepted.
 * Exponent is right associative; a leading minus negates. Throws on
 * malformed input or a result that is not finite. Never uses eval.
 */
export function evaluateExpression(source: string): number {
  const text = source
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, "");
  let position = 0;

  const cannotEvaluate = () =>
    new Error(`cannot evaluate "${source}" at character ${position + 1}`);

  const readNumber = (): number => {
    const match = NUMBER_WITH_SUFFIX.exec(text.slice(position));
    if (!match) throw cannotEvaluate();
    position += match[0].length;
    const [, digits, suffix] = match;
    const multiplier = suffix ? SUFFIX_MULTIPLIERS[suffix.toLowerCase()] : 1;
    return parseFloat(digits) * multiplier;
  };

  const readAtom = (): number => {
    if (text[position] === "(") {
      position += 1;
      const value = readSum();
      if (text[position] !== ")") throw cannotEvaluate();
      position += 1;
      return value;
    }
    if (text[position] === "-") {
      position += 1;
      return -readAtom();
    }
    return readNumber();
  };

  const readPower = (): number => {
    const base = readAtom();
    if (text[position] === "^") {
      position += 1;
      return Math.pow(base, readPower());
    }
    return base;
  };

  const readProduct = (): number => {
    let value = readPower();
    while (text[position] === "*" || text[position] === "/") {
      const operator = text[position];
      position += 1;
      const right = readPower();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const readSum = (): number => {
    let value = readProduct();
    while (text[position] === "+" || text[position] === "-") {
      const operator = text[position];
      position += 1;
      const right = readProduct();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const value = readSum();
  if (position !== text.length || !Number.isFinite(value))
    throw cannotEvaluate();
  return value;
}
