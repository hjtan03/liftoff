import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import type { CrowdState } from "../api/client";
import { formatNumber } from "../game/numbers";

import {
  BAND_KEYS,
  CONFIDENCE_BANDS,
  EXACT_ANSWER_BONUS_POINTS,
  MAX_POINTS_PER_STAGE,
} from "../game/scoring";
import type { StageResult } from "../game/state";
import { type LoadedQuestion, workedSolution } from "../questions/source";
import { sfx } from "../sound";
import type { Mood } from "../pixel/sprites";
import { type CrewStage, FuelScene } from "./FuelScene";
import { RangeAxis } from "./RangeAxis";

/** The crew runs the hose over and hooks it up before any fuel flows. */
const RUN_MS = 1000;
const HOOKUP_MS = 300;
const STEP_MS = 140;
const FILL_MS = 1300;
const LIT_PAUSE_MS = 250;
const SPUTTER_MS = 550;
const DRAIN_MS = 750;
const DRAINED_PAUSE_MS = 150;
/** Bubble sounds played over one fill. */
const FILL_BUBBLES = 8;
/** How far a misfire fills before it sputters out. */
const MISFIRE_SPUTTER_PERCENT = 26;
/** An assumed constant within this fraction of the real one reads as spot on. */
const SPOT_ON_TOLERANCE = 0.02;

const FUEL_TICKS = [
  ...[...BAND_KEYS].reverse().map((bandKey) => ({
    key: bandKey as string,
    points: CONFIDENCE_BANDS[bandKey].points,
    label: CONFIDENCE_BANDS[bandKey].name,
  })),
  { key: "exact", points: MAX_POINTS_PER_STAGE, label: "Docked" },
];

/** Where the reveal is: the crew runs the hose over and hooks it up, then a hit fills and lights, a scrub sputters and drains. */
type TankAnimation =
  | { phase: "running"; progress: number }
  | { phase: "hooking" }
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
  return { phase: "running", progress: 0 };
}

type Props = {
  question: LoadedQuestion;
  result: StageResult;
  crowd: CrowdState;
  isReplay: boolean;
  isLastStage: boolean;
  isAnimating: boolean;
  onAnimationFinished: () => void;
  onNext: () => void;
};

export function RevealStage({
  question,
  result,
  crowd,
  isReplay,
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
    let bubblesPlayed = 0;
    let stepsPlayed = 0;
    const bubbleAt = (progress: number, fillFraction: number) => {
      const due = Math.floor(progress * FILL_BUBBLES);
      if (due <= bubblesPlayed) return;
      bubblesPlayed = due;
      sfx.fuelBubble(fillFraction);
    };
    const pourFuel = () => {
      if (result.hit) {
        cancelTween = tween(
          FILL_MS,
          (progress) => {
            setTank({ phase: "filling", progress });
            bubbleAt(
              progress,
              (fullFillPercent / 100) * easeOutCubic(progress),
            );
          },
          () => {
            setTank({ phase: "lit" });
            sfx.stageFired(soundLevel(result));
            pauseHandle = window.setTimeout(finishAnimation, LIT_PAUSE_MS);
          },
        );
      } else {
        cancelTween = tween(
          SPUTTER_MS,
          (progress) => {
            setTank({ phase: "sputtering", progress });
            bubbleAt(progress, (MISFIRE_SPUTTER_PERCENT / 100) * progress);
          },
          () => {
            sfx.misfire();
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
    };
    cancelTween = tween(
      RUN_MS,
      (progress) => {
        setTank({ phase: "running", progress });
        const due = Math.floor((progress * RUN_MS) / STEP_MS);
        if (due > stepsPlayed) {
          stepsPlayed = due;
          sfx.step();
        }
      },
      () => {
        setTank({ phase: "hooking" });
        sfx.hookUp();
        pauseHandle = window.setTimeout(pourFuel, HOOKUP_MS);
      },
    );
    return () => {
      cancelTween();
      clearTimeout(pauseHandle);
    };
  }, [isAnimating, result, fullFillPercent]);

  const fillPercent =
    tank.phase === "running" || tank.phase === "hooking"
      ? 0
      : tank.phase === "filling"
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
  const isSettled = tank.phase === "lit" || tank.phase === "draining";
  const mood: Mood = isSettled ? resultMood(result) : "working";
  const crew: CrewStage =
    tank.phase === "running"
      ? { stage: "run", progress: tank.progress }
      : tank.phase === "hooking"
        ? { stage: "hookup" }
        : isSettled
          ? { stage: "settled" }
          : { stage: "flow" };

  const verdict = result.exact
    ? "Docked."
    : result.hit
      ? "Stage fired."
      : "Scrubbed.";
  const assumedFactors = question.factors.filter(
    (factor) => result.assumedFactorValues[factor.key],
  );

  return (
    <div className="card">
      <div className="rv-top">
        <FuelScene
          fillPercent={fillPercent}
          crew={crew}
          mood={mood}
          isSmoking={tank.phase === "draining"}
          isMisfire={!result.hit}
          readoutPercent={Math.round(fillPercent)}
          ticks={FUEL_TICKS.map((tick) => ({
            label: tick.label,
            points: tick.points,
            isMine: result.exact
              ? tick.key === "exact"
              : result.hit && tick.key === result.band,
          }))}
        />
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
        .<CrowdLine crowd={crowd} isReplay={isReplay} />
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
        <div className="wline num">{workedSolution(question)}</div>
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

const formatShare = (share: number) => `${Math.round(share * 100)}%`;

/** The crowd sentence after the band line; nothing at all when the server could not answer. */
function CrowdLine({
  crowd,
  isReplay,
}: {
  crowd: CrowdState;
  isReplay: boolean;
}) {
  if (crowd.status === "unavailable") return null;
  if (crowd.status === "loading") return <> Checking the crowd…</>;
  const { players, lockHitShare, percentile } = crowd.crowd;
  if (isReplay && players === 0) return null;
  if (players <= 1 && !isReplay)
    return <> You’re the first to fly this stage today.</>;
  return (
    <>
      {" "}
      {isReplay ? "On launch day, " : ""}
      <b>{formatShare(lockHitShare)}</b> of {formatNumber(players)}{" "}
      {players === 1 ? "player" : "players"} went Moonshot and hit this one
      {percentile === null ? (
        "."
      ) : (
        <>
          , and you were closer than <b>{formatShare(percentile)}</b> of them.
        </>
      )}
    </>
  );
}

/** The crew's reaction once the tank settles. */
function resultMood(result: StageResult): Mood {
  if (!result.hit) return "sad";
  if (result.exact) return "party";
  if (result.band === "lock") return "cheer";
  if (result.band === "solid") return "happy";
  return "meh";
}

/** How big the settling chime is: one note for rough up to a fanfare for dead on. */
function soundLevel(result: StageResult): 1 | 2 | 3 | 4 {
  if (result.exact) return 4;
  if (result.band === "lock") return 3;
  if (result.band === "solid") return 2;
  return 1;
}
