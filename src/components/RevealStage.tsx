import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import { formatNumber } from "../game/numbers";
import { canonicalFactorValues, type Question } from "../game/questions";
import {
  BAND_KEYS,
  CONFIDENCE_BANDS,
  EXACT_ANSWER_BONUS_POINTS,
  MAX_POINTS_PER_STAGE,
} from "../game/scoring";
import type { StageResult } from "../game/state";
import { RangeAxis } from "./RangeAxis";

const FILL_MS = 1300;
const LIT_PAUSE_MS = 250;
const SPUTTER_MS = 550;
const DRAIN_MS = 750;
const DRAINED_PAUSE_MS = 150;
/** How far a misfire fills before it sputters out. */
const MISFIRE_SPUTTER_PERCENT = 26;
/** An assumed constant within this fraction of the real one reads as spot on. */
const SPOT_ON_TOLERANCE = 0.02;

const FUEL_TICKS = [
  ...[...BAND_KEYS].reverse().map((bandKey) => ({
    key: bandKey as string,
    points: CONFIDENCE_BANDS[bandKey].points,
    label: bandKey === "lock" ? "Locked" : CONFIDENCE_BANDS[bandKey].name,
  })),
  { key: "exact", points: MAX_POINTS_PER_STAGE, label: "Exact" },
];

/** Where the tank is in its reveal: a hit fills then lights; a misfire sputters up then drains. */
type TankAnimation =
  | { phase: "filling"; progress: number }
  | { phase: "lit" }
  | { phase: "sputtering"; progress: number }
  | { phase: "draining"; progress: number };

/** A tank that is not animating, or must not animate, starts settled: lit for a hit, drained for a misfire. */
function startingTankAnimation(
  hit: boolean,
  isAnimating: boolean,
): TankAnimation {
  if (!isAnimating || prefersReducedMotion()) {
    return hit ? { phase: "lit" } : { phase: "draining", progress: 1 };
  }
  return hit
    ? { phase: "filling", progress: 0 }
    : { phase: "sputtering", progress: 0 };
}

type Props = {
  question: Question;
  result: StageResult;
  isLastStage: boolean;
  isAnimating: boolean;
  onAnimationFinished: () => void;
  onNext: () => void;
};

export function RevealStage({
  question,
  result,
  isLastStage,
  isAnimating,
  onAnimationFinished,
  onNext,
}: Props) {
  const band = CONFIDENCE_BANDS[result.band];
  const fullFillPercent = (result.points / MAX_POINTS_PER_STAGE) * 100;
  const [tank, setTank] = useState<TankAnimation>(() =>
    startingTankAnimation(result.hit, isAnimating),
  );
  const verdictRef = useRef<HTMLHeadingElement>(null);
  const finishAnimation = useEffectEvent(() => onAnimationFinished());

  useEffect(() => {
    verdictRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    if (prefersReducedMotion()) {
      finishAnimation();
      return;
    }
    let cancelTween = () => {};
    let pauseHandle = 0;
    if (result.hit) {
      cancelTween = tween(
        FILL_MS,
        (progress) => setTank({ phase: "filling", progress }),
        () => {
          setTank({ phase: "lit" });
          pauseHandle = window.setTimeout(finishAnimation, LIT_PAUSE_MS);
        },
      );
    } else {
      cancelTween = tween(
        SPUTTER_MS,
        (progress) => setTank({ phase: "sputtering", progress }),
        () => {
          cancelTween = tween(
            DRAIN_MS,
            (progress) => setTank({ phase: "draining", progress }),
            () => {
              pauseHandle = window.setTimeout(
                finishAnimation,
                DRAINED_PAUSE_MS,
              );
            },
          );
        },
      );
    }
    return () => {
      cancelTween();
      clearTimeout(pauseHandle);
    };
  }, [isAnimating, result.hit]);

  const fillPercent =
    tank.phase === "filling"
      ? fullFillPercent * easeOutCubic(tank.progress)
      : tank.phase === "lit"
        ? fullFillPercent
        : tank.phase === "sputtering"
          ? MISFIRE_SPUTTER_PERCENT * easeOutCubic(tank.progress)
          : MISFIRE_SPUTTER_PERCENT * (1 - tank.progress);
  const shownPoints =
    tank.phase === "filling"
      ? result.points * easeOutCubic(tank.progress)
      : tank.phase === "lit"
        ? result.points
        : 0;
  const tankClassName = [
    "tankwrap",
    result.hit ? "" : "bad",
    tank.phase === "lit" ? "lit" : "",
    tank.phase === "draining" ? "shake smoking" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const verdict = result.exact
    ? "Dead on."
    : result.hit
      ? "Stage fired."
      : "Misfire.";
  const assumedFactors = question.factors.filter(
    (factor) => result.assumedFactorValues[factor.key],
  );

  return (
    <div className="card">
      <div className="rv-top">
        <div className={tankClassName} aria-hidden="true">
          <div className="tank-cap"></div>
          <div className="tank-mid">
            <div className="tank-body">
              <div className="fuel" style={{ height: `${fillPercent}%` }}>
                <b></b>
                <b></b>
                <b></b>
              </div>
              <div className="tank-read num">{Math.round(fillPercent)}%</div>
            </div>
            <div className="ticks">
              {FUEL_TICKS.map((tick) => {
                const isMine = result.exact
                  ? tick.key === "exact"
                  : tick.key === result.band;
                return (
                  <div
                    key={tick.key}
                    className={`tk${isMine ? " me" : ""}`}
                    style={{
                      bottom: `${(tick.points / MAX_POINTS_PER_STAGE) * 100}%`,
                    }}
                  >
                    <span>{tick.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="tank-noz"></div>
          <div className="tflame"></div>
          <div className="smoke">
            <i></i>
            <i></i>
            <i></i>
          </div>
        </div>
        <div className="rv-main">
          <h2
            className={`verdict ${result.hit ? "ok" : "bad"}`}
            ref={verdictRef}
            tabIndex={-1}
          >
            {verdict}
          </h2>
          <div className="stats">
            <div>
              <p className="label">Your range</p>
              <div className="v">
                {formatNumber(result.lowBound, 0)}–
                {formatNumber(result.highBound, 0)}
              </div>
            </div>
            <div>
              <p className="label">Answer</p>
              <div className="v">{formatNumber(question.answer, 0)}</div>
            </div>
            <div>
              <p className="label">Fuel</p>
              <div className={`v ${result.points ? "pts" : "zero"}`}>
                +{formatNumber(Math.round(shownPoints))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <RangeAxis result={result} answer={question.answer} />
      <p className="crowd">
        You played <b>{band.name}</b> ({band.rule})
        {result.exact
          ? `, and hit it exactly for a +${EXACT_ANSWER_BONUS_POINTS} bonus`
          : ""}
        . Simulated crowd: <b>{question.simulatedCrowdLockedInHitPercent}%</b>{" "}
        locked in and hit this one.
      </p>
      <div className="work">
        <h3>Debrief</h3>
        {assumedFactors.length > 0 && (
          <div className="diff">
            {assumedFactors.map((factor, index) => {
              const assumed = result.assumedFactorValues[factor.key];
              const relativeError = assumed / factor.value - 1;
              const isSpotOn = Math.abs(relativeError) < SPOT_ON_TOLERANCE;
              const errorPercent = Math.abs(relativeError * 100);
              const verdictText = isSpotOn
                ? "spot on"
                : `${errorPercent < 1 ? "<1" : formatNumber(errorPercent, 0)}% ${relativeError > 0 ? "high" : "low"}`;
              return (
                <Fragment key={factor.key}>
                  {index > 0 && <br />}
                  {factor.label}: you used{" "}
                  <span className="num">
                    {formatNumber(assumed)} {factor.unit}
                  </span>{" "}
                  → <b className={isSpotOn ? "on" : "off"}>{verdictText}</b>
                </Fragment>
              );
            })}
          </div>
        )}
        <ul className="facts">
          {question.factors.map((factor) => (
            <li key={factor.key}>
              <span>
                {factor.label}:{" "}
                <span className="num">
                  {formatNumber(factor.value, 3)} {factor.unit}
                </span>
              </span>
              <span className="src">{factor.source}</span>
            </li>
          ))}
        </ul>
        <div className="wline num">
          {question.workedSolution(canonicalFactorValues(question))}
        </div>
        <p className="round-note">
          {question.roundingNote} →{" "}
          <b>
            {formatNumber(question.answer, 0)} {question.unit}
          </b>
        </p>
      </div>
      <button className="next" type="button" onClick={onNext}>
        {isLastStage ? "Launch the rocket" : "Next stage"}
      </button>
    </div>
  );
}
