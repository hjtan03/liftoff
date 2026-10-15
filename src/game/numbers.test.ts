import { describe, expect, it } from "vitest";
import { formatNumber, parseNumberInput } from "./numbers";

describe("formatNumber", () => {
  it("keeps two decimals below ten", () => {
    expect(formatNumber(3.14159)).toBe("3.14");
  });
  it("keeps one decimal below a thousand", () => {
    expect(formatNumber(506.34)).toBe("506.3");
  });
  it("keeps no decimals and groups thousands from a thousand up", () => {
    expect(formatNumber(4010.526)).toBe("4,011");
  });
  it("honours an explicit digit count", () => {
    expect(formatNumber(42.195, 3)).toBe("42.195");
    expect(formatNumber(506.34, 0)).toBe("506");
  });
});

describe("parseNumberInput", () => {
  it("reads a plain number", () => {
    expect(parseNumberInput("4200")).toBe(4200);
  });
  it("reads k, m, and b suffixes in either case", () => {
    expect(parseNumberInput("4.2k")).toBe(4200);
    expect(parseNumberInput("4.2K")).toBe(4200);
    expect(parseNumberInput("2m")).toBe(2_000_000);
    expect(parseNumberInput("3b")).toBe(3_000_000_000);
  });
  it("ignores thousands separators, underscores, and whitespace", () => {
    expect(parseNumberInput("1,000")).toBe(1000);
    expect(parseNumberInput("4_000")).toBe(4000);
    expect(parseNumberInput(" 12 ")).toBe(12);
  });
  it("reads a leading decimal point", () => {
    expect(parseNumberInput(".5")).toBe(0.5);
  });
  it("returns NaN for empty, negative, exponent, trailing-point, and non-numeric input", () => {
    expect(parseNumberInput("")).toBeNaN();
    expect(parseNumberInput("-5")).toBeNaN();
    expect(parseNumberInput("1e3")).toBeNaN();
    expect(parseNumberInput("5.")).toBeNaN();
    expect(parseNumberInput("abc")).toBeNaN();
  });
});
