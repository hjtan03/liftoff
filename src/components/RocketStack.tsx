import { useEffect, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import { formatNumber } from "../game/numbers";
import { MAX_POINTS_PER_STAGE } from "../game/scoring";
import type { GamePhase, StageResult } from "../game/state";
import { COLORS } from "../pixel/sprites";

const TALLY_COUNT_UP_MS = 700;

/** The rocket in pixel units, drawn nose up: nose cone, then the stages from S5 down to S1, then the engine and fins. */
const BODY_LEFT = 3;
const BODY_WIDTH = 15;
const ROCKET_WIDTH = BODY_LEFT * 2 + BODY_WIDTH;
const NOSE_HEIGHT = 9;
const STAGE_HEIGHT = 12;
const ENGINE_HEIGHT = 6;
/** Room beside each stage for its label and emoji. */
const LABEL_ROOM = 15;
/** The fuel window in a stage: where it sits and how many rows of fuel it shows. */
const WINDOW = { x: 7, y: 2, width: 7, height: 7 };
const FUEL_ROWS = WINDOW.height - 2;

type Props = {
  stageCount: number;
  stageResults: StageResult[];
  stageIndex: number;
  phase: GamePhase;
  animatingStageIndex: number | null;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  className?: string;
};
type Label = { x: number; y: number; text: string; className: string };
type StageStatus = "fired" | "misfire" | "current" | "pending";

/** The rocket's rects and labels in its nose-up layout. */
function drawRocket(
  stages: {
    status: StageStatus;
    fillRows: number;
    emoji: string;
    pop: boolean;
  }[],
): { rects: Rect[]; labels: Label[]; height: number } {
  const rects: Rect[] = [];
  const labels: Label[] = [];
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    className?: string,
  ) => rects.push({ x, y, w, h, fill, className });
  const center = BODY_LEFT + BODY_WIDTH / 2;

  // Nose cone: stepped rows widening down to the body, a highlight on the left.
  const noseWidths = [1, 3, 5, 7, 9, 11, 13, 13, 15];
  noseWidths.forEach((width, row) => {
    const x = center - width / 2;
    rect(x - 1, row, width + 2, 1, COLORS.outline);
    if (width > 1) {
      rect(x, row, width, 1, COLORS.orange);
      rect(x + width - 2, row, 2, 1, COLORS.orangeDark);
    }
    if (row >= 3 && row <= 6) rect(x + 1, row, 1, 1, COLORS.gold);
  });

  // Stages, top (the last stage) to bottom (stage 1).
  const order = stages.map((_, index) => index).reverse();
  order.forEach((index, slot) => {
    const stage = stages[index];
    const top = NOSE_HEIGHT + slot * STAGE_HEIGHT;
    rect(BODY_LEFT - 1, top, BODY_WIDTH + 2, STAGE_HEIGHT, COLORS.outline);
    rect(BODY_LEFT, top, BODY_WIDTH, STAGE_HEIGHT - 1, COLORS.suit);
    rect(
      BODY_LEFT + BODY_WIDTH - 2,
      top,
      2,
      STAGE_HEIGHT - 1,
      COLORS.suitShade,
    );
    rect(BODY_LEFT, top + STAGE_HEIGHT - 2, BODY_WIDTH, 1, COLORS.orange);
    // The window, then the fuel in it, bottom up.
    const wx = WINDOW.x;
    const wy = top + WINDOW.y;
    rect(
      wx - 1,
      wy - 1,
      WINDOW.width + 2,
      WINDOW.height + 2,
      stage.status === "current" ? COLORS.gold : COLORS.outline,
      stage.status === "current" ? "seg-current" : undefined,
    );
    rect(wx, wy, WINDOW.width, WINDOW.height, "#251C57");
    if (stage.status === "misfire") {
      for (let row = 0; row < WINDOW.height; row += 2)
        rect(wx, wy + row, WINDOW.width, 1, "#5A2747");
    }
    if (stage.fillRows > 0) {
      const fuel = stage.status === "misfire" ? COLORS.blush : COLORS.fuel;
      const rows = Math.min(FUEL_ROWS, stage.fillRows);
      const fy = wy + 1 + FUEL_ROWS - rows;
      rect(
        wx + 1,
        fy,
        WINDOW.width - 2,
        rows,
        fuel,
        stage.pop ? "seg-pop" : undefined,
      );
      if (stage.status !== "misfire")
        rect(wx + 1, fy, WINDOW.width - 2, 1, COLORS.fuelLight);
    }
    rect(wx + 1, wy + 1, 1, WINDOW.height - 2, "rgba(255,255,255,0.16)");
    labels.push({
      x: ROCKET_WIDTH + 1,
      y: top + STAGE_HEIGHT / 2,
      text: `S${index + 1}`,
      className: `seg-label ${stage.status}`,
    });
    if (stage.emoji)
      labels.push({
        x: ROCKET_WIDTH + 8,
        y: top + STAGE_HEIGHT / 2,
        text: stage.emoji,
        className: `seg-emoji${stage.pop ? " seg-pop" : ""}`,
      });
  });

  // Engine bell and fins.
  const base = NOSE_HEIGHT + stages.length * STAGE_HEIGHT;
  rect(center - 4.5, base, 9, 2, COLORS.outline);
  rect(center - 3.5, base, 7, 1, COLORS.steelDark);
  rect(center - 5.5, base + 2, 11, 3, COLORS.outline);
  rect(center - 4.5, base + 2, 9, 2, COLORS.steel);
  rect(center + 2.5, base + 2, 2, 2, COLORS.steelDark);
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? 0 : BODY_LEFT + BODY_WIDTH;
    const finTop = base - 9;
    rect(x, finTop - 1, BODY_LEFT, 12, COLORS.outline);
    rect(side < 0 ? x + 1 : x, finTop, BODY_LEFT - 1, 10, COLORS.orange);
    rect(side < 0 ? x + 1 : x, finTop + 7, BODY_LEFT - 1, 3, COLORS.orangeDark);
  }
  return { rects, labels, height: base + ENGINE_HEIGHT };
}

export function RocketStack({
  stageCount,
  stageResults,
  stageIndex,
  phase,
  animatingStageIndex,
}: Props) {
  const visibleResult = (index: number): StageResult | undefined =>
    index === animatingStageIndex ? undefined : stageResults[index];
  const indexes = Array.from({ length: stageCount }, (_, index) => index);
  const bankedPoints = indexes.reduce(
    (sum, index) => sum + (visibleResult(index)?.points ?? 0),
    0,
  );
  const shownPoints = useTweenedNumber(bankedPoints, TALLY_COUNT_UP_MS);
  const justRevealedIndex =
    phase === "reveal" && animatingStageIndex === null ? stageIndex : null;

  const stages = indexes.map((index) => {
    const result = visibleResult(index);
    const status: StageStatus = result
      ? result.hit
        ? "fired"
        : "misfire"
      : index === stageIndex && phase !== "done"
        ? "current"
        : "pending";
    return {
      status,
      // A scrubbed stage keeps a sliver of red so it reads as a failed burn, not an empty tank.
      fillRows: result
        ? result.hit
          ? Math.max(
              1,
              Math.round((result.points / MAX_POINTS_PER_STAGE) * FUEL_ROWS),
            )
          : 1
        : 0,
      emoji: result?.emoji ?? "",
      pop: index === justRevealedIndex,
    };
  });
  const { rects, labels, height } = drawRocket(stages);
  const width = ROCKET_WIDTH + LABEL_ROOM;
  const description = stages
    .map(
      (stage, index) =>
        `Stage ${index + 1}: ${stage.status === "misfire" ? "scrubbed" : stage.status}`,
    )
    .join(", ");

  const rectElements = rects.map((r, index) => (
    <rect
      key={index}
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      fill={r.fill}
      className={r.className}
    />
  ));

  return (
    <aside className="stack-col" aria-label="Rocket stack">
      {/* Upright beside the question on wide screens. */}
      <svg
        className="rocket-stack upright"
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={description}
      >
        {rectElements}
        {labels.map((label, index) => (
          <text
            key={index}
            x={label.x}
            y={label.y}
            className={label.className}
            dominantBaseline="central"
          >
            {label.text}
          </text>
        ))}
      </svg>
      {/* Lying on its side, nose to the right, across the top of a phone screen. */}
      <svg
        className="rocket-stack sideways"
        viewBox={`0 0 ${height} ${ROCKET_WIDTH + 12}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <g transform={`translate(${height} 0) rotate(90)`}>{rectElements}</g>
        {labels.map((label, index) => (
          <text
            key={index}
            x={height - label.y}
            y={
              ROCKET_WIDTH + (label.className.startsWith("seg-emoji") ? 9 : 3.5)
            }
            className={label.className}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {label.text}
          </text>
        ))}
      </svg>
      <div className="tally">
        <p className="label">Thrust banked</p>
        <div className="v num">{formatNumber(shownPoints)}</div>
      </div>
    </aside>
  );
}

/** Counts from the value shown to the new target over durationMs; jumps when motion is reduced. */
function useTweenedNumber(target: number, durationMs: number): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    return tween(prefersReducedMotion() ? 0 : durationMs, (progress) => {
      const value = Math.round(from + (target - from) * easeOutCubic(progress));
      shownRef.current = value;
      setShown(value);
    });
  }, [target, durationMs]);
  return shown;
}
