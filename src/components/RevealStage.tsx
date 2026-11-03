import { useEffect, useEffectEvent, useRef } from "react";
import type { CrowdState } from "../api/client";
import { formatNumber } from "../game/numbers";
import {
  describeMiss,
  EXACT_ANSWER_BONUS_POINTS,
  type Tier,
  TIERS,
} from "../game/scoring";
import type { StageResult } from "../game/state";
import { type LoadedQuestion, workedSolution } from "../questions/source";
import { sfx } from "../sound";
import { RangeAxis } from "./RangeAxis";

/** The headline for each tier. */
const VERDICTS: Record<Tier, string> = {
  docked: "Docked.",
  moonshot: "Moonshot!",
  orbit: "In orbit.",
  suborbital: "Suborbital.",
  scrubbed: "Scrubbed.",
};

type Props = {
  question: LoadedQuestion;
  stageNumber: number;
  result: StageResult;
  crowd: CrowdState;
  isReplay: boolean;
  isLastStage: boolean;
  /** The stage is still burning in the scene behind; the result waits for it. */
  isAnimating: boolean;
  onNext: () => void;
};

/**
 * The reveal: while the stage burns the scene has the screen to itself;
 * then the result comes up over the sky with a chime, or a deflating wah
 * for a scrub, and the debrief, and the way on waits in the band below.
 */
export function RevealStage({
  question,
  stageNumber,
  result,
  crowd,
  isReplay,
  isLastStage,
  isAnimating,
  onNext,
}: Props) {
  const tier = TIERS[result.tier];
  const verdictRef = useRef<HTMLHeadingElement>(null);
  // Only a burn the player just set off ends in a sound; a reveal restored from a refresh comes up quietly.
  const wasAnimatingRef = useRef(isAnimating);

  useEffect(() => {
    if (isAnimating) return;
    verdictRef.current?.focus();
    if (!wasAnimatingRef.current) return;
    wasAnimatingRef.current = false;
    if (result.hit) sfx.stageFired(soundLevel(result));
    else sfx.misfire();
  }, [isAnimating, result]);

  const goOn = () => {
    sfx.next();
    onNext();
  };
  const goOnFromKey = useEffectEvent(goOn);

  // Enter moves on once the result is up, wherever focus is, except where
  // Enter already does something: a button or link (which would go on twice)
  // or a text field. A held key's repeats are ignored, so the Enter that
  // fired the stage can't skip its result.
  useEffect(() => {
    if (isAnimating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select")) return;
      event.preventDefault();
      goOnFromKey();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isAnimating]);

  const verdict = VERDICTS[result.tier];
  const notes = result.notes.trim();

  return (
    <>
      <div className="sky-area">
        {!isAnimating && (
          <div className="overlay-area top">
            <section className="card result">
              <h1 className="result-question">
                <span className="stage-tag">Stage {stageNumber}</span>{" "}
                {question.prompt}
              </h1>
              <div className="rv-main">
                <h2
                  className={`verdict ${result.tier}`}
                  ref={verdictRef}
                  tabIndex={-1}
                >
                  {verdict}
                </h2>
                <div className="stats">
                  <div>
                    <p className="label">Your guess</p>
                    <div className="v">{formatNumber(result.guess)}</div>
                  </div>
                  <div>
                    <p className="label">Answer</p>
                    <div className="v">{formatNumber(question.answer, 0)}</div>
                  </div>
                  <div>
                    <p className="label">Fuel</p>
                    <div className={`v ${result.points ? "pts" : "zero"}`}>
                      +{formatNumber(result.points)}
                    </div>
                  </div>
                </div>
              </div>
              <RangeAxis result={result} answer={question.answer} />
              <p className="crowd">
                {result.exact ? (
                  <>
                    Right on: <b>{tier.name}</b>, with the +
                    {EXACT_ANSWER_BONUS_POINTS} exact bonus.
                  </>
                ) : (
                  <>
                    You were <b>{describeMiss(result)}</b>: {tier.name} (
                    {tier.rule}).
                  </>
                )}
                <CrowdLine crowd={crowd} isReplay={isReplay} />
              </p>
              <div className="work">
                <h3>Debrief</h3>
                {notes && (
                  <div className="notes">
                    <p className="label">Your scratch pad</p>
                    <p className="notes-text">{notes}</p>
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
            </section>
          </div>
        )}
      </div>
      <div className="ground">
        {!isAnimating && (
          <div className="dock">
            <div className="answer-bar center">
              <button
                className="next"
                type="button"
                aria-keyshortcuts="Enter"
                onClick={goOn}
              >
                {isLastStage ? "Flight report" : "Next stage"}
              </button>
              <span className="key-hint" aria-hidden="true">
                or press Enter
              </span>
            </div>
          </div>
        )}
      </div>
    </>
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
  const { players, closeShare, percentile } = crowd.crowd;
  if (isReplay && players === 0) return null;
  if (players <= 1 && !isReplay)
    return <> You’re the first to fly this stage today.</>;
  return (
    <>
      {" "}
      {isReplay ? "On launch day, " : ""}
      {/* closeShare is missing from a server still on the old crowd stats; the line then just counts players. */}
      {typeof closeShare === "number" ? (
        <>
          <b>{formatShare(closeShare)}</b> of {formatNumber(players)}{" "}
          {players === 1 ? "player" : "players"} got within 10%
        </>
      ) : (
        <>
          {formatNumber(players)} {players === 1 ? "player" : "players"} flew
          this stage
        </>
      )}
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

/** How big the result's chime is: one note for suborbital up to a fanfare for docked. */
function soundLevel(result: StageResult): 1 | 2 | 3 | 4 {
  if (result.tier === "docked") return 4;
  if (result.tier === "moonshot") return 3;
  if (result.tier === "orbit") return 2;
  return 1;
}
