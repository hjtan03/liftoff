import { type CSSProperties, useEffect, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import { formatNumber } from "../game/numbers";
import { QUESTIONS } from "../game/questions";
import { MAX_POINTS_PER_STAGE } from "../game/scoring";
import type { GamePhase, StageResult } from "../game/state";

const TALLY_COUNT_UP_MS = 700;

type Props = {
  stageResults: StageResult[];
  stageIndex: number;
  phase: GamePhase;
  animatingStageIndex: number | null;
};

export function RocketStack({
  stageResults,
  stageIndex,
  phase,
  animatingStageIndex,
}: Props) {
  const visibleResult = (index: number): StageResult | undefined =>
    index === animatingStageIndex ? undefined : stageResults[index];
  const bankedPoints = QUESTIONS.reduce(
    (sum, _, index) => sum + (visibleResult(index)?.points ?? 0),
    0,
  );
  const shownPoints = useTweenedNumber(bankedPoints, TALLY_COUNT_UP_MS);
  const justRevealedIndex =
    phase === "reveal" && animatingStageIndex === null ? stageIndex : null;

  const segments = QUESTIONS.map((_, index) => {
    const result = visibleResult(index);
    const isCurrent = index === stageIndex && phase !== "done";
    const status = result
      ? result.hit
        ? "fired"
        : "misfire"
      : isCurrent
        ? "current"
        : "pending";
    const fillPercent = result
      ? (result.points / MAX_POINTS_PER_STAGE) * 100
      : 0;
    const className = `seg ${status}${index === justRevealedIndex ? " pop" : ""}`;
    return (
      <div
        key={index}
        className={className}
        style={{ "--f": `${fillPercent}%` } as CSSProperties}
        aria-label={`Stage ${index + 1}: ${status}`}
      >
        <div className="sf">
          <i></i>
        </div>
        <span className="lbl">S{index + 1}</span>
        <span className="e">{result?.emoji ?? ""}</span>
      </div>
    );
  });

  return (
    <aside className="stack-col" aria-label="Rocket stack">
      <div className="stack">
        <div className="nose"></div>
        {segments.reverse()}
        <div className="fins">
          <i></i>
          <i></i>
        </div>
      </div>
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
