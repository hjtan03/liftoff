const NUMBER = /^\d*\.?\d+/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;

/**
 * Evaluates arithmetic by recursive descent: + − × ÷ ^ and parentheses over
 * decimal literals and the named variables in the record. ASCII operators,
 * spaces, and thousands separators are accepted. Exponent is right
 * associative; a leading minus negates. Throws, naming the position or the
 * variable, on malformed input, a variable missing from the record, or a
 * result that is not finite. Never uses eval.
 */
export function evaluateExpression(
  source: string,
  variables: Record<string, number>,
): number {
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
    const match = NUMBER.exec(text.slice(position));
    if (!match) throw cannotEvaluate();
    position += match[0].length;
    return parseFloat(match[0]);
  };

  const readVariable = (): number => {
    const match = IDENTIFIER.exec(text.slice(position));
    if (!match) throw cannotEvaluate();
    const name = match[0];
    if (!(name in variables))
      throw new Error(
        `cannot evaluate "${source}": "${name}" is not a known variable`,
      );
    position += name.length;
    return variables[name];
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
    if (IDENTIFIER.test(text.slice(position))) return readVariable();
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
