import { useEffect, useRef, useState } from "react";
import { GAME_NAME } from "../brand";
import { formatDistance, stopReached } from "../game/journey";
import { formatNumber } from "../game/numbers";
import type { Streak } from "../game/progress";
import { maxTotalPoints } from "../game/scoring";
import type { StageResult } from "../game/state";
import type { LoadedQuestion } from "../questions/source";
import { launchNumberAt } from "../questions/schedule";
import { hrefFor } from "../route";

type Props = {
  launchNumber: string;
  questions: LoadedQuestion[];
  stageResults: StageResult[];
  /** Today's streak; null for a replay, which doesn't count toward it. */
  streak: Streak | null;
  /** Whether the camera has pulled back over the whole flight; the report waits for it. */
  hasPulledBack: boolean;
  onRestart: () => void;
};

/** The flight report: where the rocket got to, then, once the camera has pulled back over the route, the stage-by-stage tally and the share text. */
export function LaunchReport({
  launchNumber,
  questions,
  stageResults,
  streak,
  hasPulledBack,
  onRestart,
}: Props) {
  const totalPoints = stageResults.reduce(
    (sum, result) => sum + result.points,
    0,
  );
  const maxPoints = maxTotalPoints(questions.length);
  const destination = stopReached(totalPoints, maxPoints);
  const emojiGrid = stageResults.map((result) => result.emoji).join("");
  const shareText = `🚀 ${GAME_NAME} #${launchNumber} ${emojiGrid}\nReached ${destination.name} · ${formatNumber(totalPoints)} / ${formatNumber(maxPoints)} fuel`;

  const [copyStatus, setCopyStatus] = useState("");
  const shareRef = useRef<HTMLPreElement>(null);
  const destinationRef = useRef<HTMLHeadingElement>(null);

  // The button that led here is gone, so focus moves to where the rocket got to rather than dropping to the page.
  useEffect(() => destinationRef.current?.focus(), []);

  const copyShareText = () => {
    navigator.clipboard
      .writeText(shareText)
      .then(() => setCopyStatus("Copied."))
      .catch(() => {
        const range = document.createRange();
        range.selectNodeContents(shareRef.current!);
        const selection = getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        setCopyStatus("Selected. Press Ctrl/Cmd+C to copy.");
      });
  };

  return (
    <div className="launch">
      <div className="launch-panels">
        <div className="destination">
          <h1 className="dest" ref={destinationRef} tabIndex={-1}>
            Reached {destination.name}
          </h1>
          <p className="dest-sub">
            {destination.distanceKm > 0
              ? `${formatDistance(destination.distanceKm)} from Earth on ${formatNumber(totalPoints)} fuel.`
              : `${formatNumber(totalPoints)} fuel wasn’t enough to leave the pad.`}
          </p>
        </div>
        {hasPulledBack && (
          <section className="card report">
            {streak ? (
              <p className="streak">
                Streak <b>{streak.current}</b> · Best <b>{streak.best}</b> ·
                Launches flown <b>{streak.played}</b>
              </p>
            ) : (
              <p className="streak">
                A replay from the archive: it doesn’t count toward your streak.{" "}
                <a href={hrefFor.archive()}>Back to the archive</a>
              </p>
            )}
            <ol className="summary">
              {stageResults.map((result, index) => (
                <li key={index}>
                  <span aria-hidden="true">{result.emoji}</span>
                  <span>{questions[index].prompt}</span>
                  <span className="pt">+{formatNumber(result.points)}</span>
                </li>
              ))}
            </ol>
            <div className="share-box">
              <pre className="share" ref={shareRef}>
                {shareText}
              </pre>
              <div className="row">
                <button className="fire" type="button" onClick={copyShareText}>
                  Copy result
                </button>
                <button className="ghost" type="button" onClick={onRestart}>
                  Fly it again
                </button>
                <span className="note" role="status">
                  {copyStatus}
                </span>
              </div>
            </div>
            <p className="note">
              🎯 docked · 🟢 moonshot · 🟡 orbit · 🟠 suborbital · 🔴 scrubbed.
              A new launch arrives at midnight Eastern.
              {streak && launchNumberAt(new Date()) >= 2 ? (
                <>
                  {" "}
                  Missed one? <a href={hrefFor.archive()}>Fly past launches</a>.
                </>
              ) : null}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
