import { useEffect, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import { GAME_NAME } from "../brand";
import {
  formatDistance,
  routePosition,
  STOPS,
  stopReached,
} from "../game/journey";
import { formatNumber } from "../game/numbers";
import type { Streak } from "../game/progress";
import { maxTotalPoints } from "../game/scoring";
import type { StageResult } from "../game/state";
import { PixelSprite } from "../pixel/Sprite";
import { planet, PLANET_LOOKS, ROCKET, ROCKET_PALETTE } from "../pixel/sprites";
import type { LoadedQuestion } from "../questions/source";
import { sfx } from "../sound";

const CLIMB_MS = 4200;
/** Where the first and last stops sit on the track, as a share of its height. */
const TRACK_BOTTOM_PERCENT = 5;
const TRACK_TOP_PERCENT = 91;

type Props = {
  launchNumber: string;
  questions: LoadedQuestion[];
  stageResults: StageResult[];
  streak: Streak;
  onRestart: () => void;
};

const trackPercent = (position: number) =>
  TRACK_BOTTOM_PERCENT +
  (position / (STOPS.length - 1)) * (TRACK_TOP_PERCENT - TRACK_BOTTOM_PERCENT);

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** The flight report: the rocket's trip out through the solar system, the stage-by-stage tally, and the share text. */
export function LaunchReport({
  launchNumber,
  questions,
  stageResults,
  streak,
  onRestart,
}: Props) {
  const totalPoints = stageResults.reduce(
    (sum, result) => sum + result.points,
    0,
  );
  const maxPoints = maxTotalPoints(questions.length);
  const finalPosition = routePosition(totalPoints, maxPoints);
  const destination = stopReached(totalPoints, maxPoints);
  const emojiGrid = stageResults.map((result) => result.emoji).join("");
  const shareText = `🚀 ${GAME_NAME} #${launchNumber} ${emojiGrid}\nReached ${destination.name} · ${formatNumber(totalPoints)} / ${formatNumber(maxPoints)} fuel`;

  // With reduced motion the rocket is simply there, without the climb.
  const [climbProgress, setClimbProgress] = useState(() =>
    prefersReducedMotion() ? 1 : 0,
  );
  const [copyStatus, setCopyStatus] = useState("");
  const shareRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    sfx.launch();
    let stopsPassed = 0;
    return tween(CLIMB_MS, (progress) => {
      setClimbProgress(progress);
      const position = finalPosition * easeOutCubic(progress);
      while (stopsPassed < Math.floor(position + 1e-9)) {
        stopsPassed += 1;
        sfx.passStop(stopsPassed);
      }
    });
  }, [finalPosition]);

  const rocketPosition = finalPosition * easeOutCubic(climbProgress);
  const hasLanded = climbProgress >= 1;
  const passed = Math.floor(rocketPosition + 1e-9);

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
      <section className="report">
        <div className="destination" aria-live="polite">
          <h1 className="dest">
            {hasLanded
              ? `Reached ${destination.name}`
              : climbProgress === 0
                ? "Ignition…"
                : "Climbing…"}
          </h1>
          <p className="dest-sub">
            {hasLanded && destination.distanceKm > 0
              ? `${formatDistance(destination.distanceKm)} from Earth on ${formatNumber(totalPoints)} fuel.`
              : hasLanded
                ? `${formatNumber(totalPoints)} fuel wasn’t enough to leave the pad.`
                : " "}
          </p>
        </div>
        <p className="streak">
          Streak <b>{streak.current}</b> · Best <b>{streak.best}</b> · Launches
          flown <b>{streak.played}</b>
        </p>
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
          🎯 dead on · 🟢 locked in · 🟡 solid · 🟠 rough · 🔴 misfire. A new
          launch arrives at midnight Eastern.
        </p>
      </section>
      <div
        className="track"
        role="img"
        aria-label={`The rocket's route from the launch pad out to Neptune. It reached ${destination.name}.`}
      >
        <div className="track-line" />
        <div
          className="track-trail"
          style={{
            height: `${trackPercent(rocketPosition) - TRACK_BOTTOM_PERCENT}%`,
          }}
        />
        {STOPS.map((stop, index) => {
          const look = PLANET_LOOKS[stop.name];
          const art = look ? planet(look) : null;
          return (
            <div
              key={stop.name}
              className={`stop${index <= passed ? " passed" : ""}${index === passed && hasLanded ? " here" : ""}`}
              style={{ bottom: `${trackPercent(index)}%` }}
            >
              <span className="stop-art">
                {art ? (
                  <PixelSprite
                    grid={art.grid}
                    palette={art.palette}
                    pixelSize={4}
                  />
                ) : index === 0 ? (
                  <span className="pad" />
                ) : (
                  <span className="orbit-dot" />
                )}
              </span>
              <span className="stop-name">{capitalize(stop.name)}</span>
            </div>
          );
        })}
        <div
          className={`flyer${climbProgress > 0 && !hasLanded ? " burning" : ""}`}
          style={{ bottom: `${trackPercent(rocketPosition)}%` }}
        >
          <PixelSprite grid={ROCKET} palette={ROCKET_PALETTE} pixelSize={3} />
        </div>
      </div>
    </div>
  );
}
