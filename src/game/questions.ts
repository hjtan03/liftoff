import { formatNumber } from "./numbers";

export type Factor = {
  key: string;
  label: string;
  unit: string;
  value: number;
  source: string;
};

export type FactorValues = Record<string, number>;

export type RoundingRule = "round" | "ceil" | "floor";

type QuestionSpec = {
  category: string;
  unit: string;
  prompt: string;
  roundingNote: string;
  rounding: RoundingRule;
  factors: readonly Factor[];
  /** The formula over the factor values, before rounding. */
  compute: (values: FactorValues) => number;
  /** The same formula written out for the debrief. */
  workedSolution: (values: FactorValues) => string;
  /** Stand-in for the crowd stat until a backend records real guesses. */
  simulatedCrowdLockedInHitPercent: number;
};

export type Question = QuestionSpec & { answer: number };

/** Every input is a sourced constant or stated in the prompt; answers are computed, never typed. */
const QUESTION_SPECS: readonly QuestionSpec[] = [
  {
    category: "Everyday",
    unit: "min",
    prompt:
      "Walking at a steady 5 km/h, how many minutes does it take to finish a marathon?",
    roundingNote: "Rounded to the nearest minute.",
    rounding: "round",
    factors: [
      {
        key: "d",
        label: "Marathon distance",
        unit: "km",
        value: 42.195,
        source: "World Athletics standard",
      },
    ],
    compute: (f) => (f.d / 5) * 60,
    workedSolution: (f) =>
      `${formatNumber(f.d)} km ÷ 5 km/h = ${formatNumber(f.d / 5, 3)} h × 60 = ${formatNumber((f.d / 5) * 60, 2)} min`,
    simulatedCrowdLockedInHitPercent: 34,
  },
  {
    category: "Sport",
    unit: "sheets",
    prompt:
      "How many US Letter sheets, laid long edge to long edge, cover a football field from goal line to goal line?",
    roundingNote: "Partial sheet counts as a whole sheet (round up).",
    rounding: "ceil",
    factors: [
      {
        key: "yd",
        label: "Goal line to goal line",
        unit: "yd",
        value: 100,
        source: "NFL rulebook",
      },
      {
        key: "in",
        label: "Long edge of a Letter sheet",
        unit: "in",
        value: 11,
        source: "ANSI Letter, 8.5 × 11 in",
      },
    ],
    compute: (f) => (f.yd * 36) / f.in,
    workedSolution: (f) =>
      `${formatNumber(f.yd)} yd × 36 in/yd = ${formatNumber(f.yd * 36)} in ÷ ${formatNumber(f.in)} in = ${formatNumber((f.yd * 36) / f.in, 2)} sheets`,
    simulatedCrowdLockedInHitPercent: 22,
  },
  {
    category: "Sport",
    unit: "balls",
    prompt:
      "How many golf balls fit in a single touching line along a 100 m sprint lane?",
    roundingNote:
      "Complete balls only (round down). Use the minimum legal diameter.",
    rounding: "floor",
    factors: [
      {
        key: "mm",
        label: "Golf ball diameter",
        unit: "mm",
        value: 42.67,
        source: "R&A / USGA minimum, 1.68 in",
      },
    ],
    compute: (f) => 100000 / f.mm,
    workedSolution: (f) =>
      `100 m = 100,000 mm ÷ ${formatNumber(f.mm, 2)} mm = ${formatNumber(100000 / f.mm, 2)} balls`,
    simulatedCrowdLockedInHitPercent: 11,
  },
  {
    category: "Everyday",
    unit: "cards",
    prompt:
      "How many credit cards would you stack to reach the rim of a regulation basketball hoop?",
    roundingNote: "You need to reach the rim (round up).",
    rounding: "ceil",
    factors: [
      {
        key: "ft",
        label: "Rim height",
        unit: "ft",
        value: 10,
        source: "NBA / FIBA regulation",
      },
      {
        key: "mm",
        label: "Credit card thickness",
        unit: "mm",
        value: 0.76,
        source: "ISO/IEC 7810 ID-1",
      },
    ],
    compute: (f) => (f.ft * 304.8) / f.mm,
    workedSolution: (f) =>
      `${formatNumber(f.ft)} ft × 304.8 mm/ft = ${formatNumber(f.ft * 304.8, 1)} mm ÷ ${formatNumber(f.mm, 2)} mm = ${formatNumber((f.ft * 304.8) / f.mm, 2)} cards`,
    simulatedCrowdLockedInHitPercent: 8,
  },
  {
    category: "Science",
    unit: "laps",
    prompt:
      "How many complete laps of Earth’s equator could a beam of light make in one minute?",
    roundingNote: "Complete laps only (round down).",
    rounding: "floor",
    factors: [
      {
        key: "c",
        label: "Speed of light",
        unit: "km/s",
        value: 299792.458,
        source: "SI definition",
      },
      {
        key: "eq",
        label: "Equator circumference",
        unit: "km",
        value: 40075,
        source: "WGS 84",
      },
    ],
    compute: (f) => (f.c * 60) / f.eq,
    workedSolution: (f) =>
      `${formatNumber(f.c, 3)} km/s × 60 s = ${formatNumber(f.c * 60)} km ÷ ${formatNumber(f.eq)} km = ${formatNumber((f.c * 60) / f.eq, 2)} laps`,
    simulatedCrowdLockedInHitPercent: 4,
  },
];

const ROUNDING_FUNCTIONS: Record<RoundingRule, (value: number) => number> = {
  round: Math.round,
  ceil: Math.ceil,
  floor: Math.floor,
};

/** Six decimals absorb floating-point noise before the rounding rule applies. */
const UNROUNDED_RESULT_DECIMALS = 6;

export function canonicalFactorValues(question: QuestionSpec): FactorValues {
  return Object.fromEntries(
    question.factors.map((factor) => [factor.key, factor.value]),
  );
}

function withComputedAnswer(spec: QuestionSpec): Question {
  const unrounded = Number(
    spec
      .compute(canonicalFactorValues(spec))
      .toFixed(UNROUNDED_RESULT_DECIMALS),
  );
  return { ...spec, answer: ROUNDING_FUNCTIONS[spec.rounding](unrounded) };
}

export const QUESTIONS: readonly Question[] =
  QUESTION_SPECS.map(withComputedAnswer);
