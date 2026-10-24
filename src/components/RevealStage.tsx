import { Fragment, useEffect, useRef } from "react";
import type { CrowdState } from "../api/client";
import { formatNumber } from "../game/numbers";
import { CONFIDENCE_BANDS, EXACT_ANSWER_BONUS_POINTS } from "../game/scoring";
import type { StageResult } from "../game/state";
import { type LoadedQuestion, workedSolution } from "../questions/source";
import { sfx } from "../sound";
import { RangeAxis } from "./RangeAxis";

/** An assumed constant within this fraction of the real one reads as spot on. */
const SPOT_ON_TOLERANCE = 0.02;

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
  const band = CONFIDENCE_BANDS[result.band];
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

  const verdict = result.exact
    ? "Docked."
    : result.hit
      ? "Stage fired."
      : "Scrubbed.";
  const assumedFactors = question.factors.filter(
    (factor) => result.assumedFactorValues[factor.key],
  );

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
                      +{formatNumber(result.points)}
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
                      const isSpotOn =
                        Math.abs(relativeError) < SPOT_ON_TOLERANCE;
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
                          →{" "}
                          <b className={isSpotOn ? "on" : "off"}>
                            {verdictText}
                          </b>
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
                onClick={() => {
                  sfx.next();
                  onNext();
                }}
              >
                {isLastStage ? "Flight report" : "Next stage"}
              </button>
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

/** How big the result's chime is: one note for rough up to a fanfare for dead on. */
function soundLevel(result: StageResult): 1 | 2 | 3 | 4 {
  if (result.exact) return 4;
  if (result.band === "lock") return 3;
  if (result.band === "solid") return 2;
  return 1;
}
