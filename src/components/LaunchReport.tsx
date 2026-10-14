import { useEffect, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import {
  altitudeForScore,
  altitudeTrackPercent,
  destinationForAltitude,
  formatAltitude,
  LAUNCH_PAD_ALTITUDE_KM,
  MILESTONES,
} from "../game/altitude";
import { formatNumber } from "../game/numbers";
import { maxTotalPoints } from "../game/scoring";
import type { StageResult } from "../game/state";
import type { LoadedQuestion } from "../questions/source";

const CLIMB_MS = 3600;
/** The rocket starts just above the ground strip. */
const ROCKET_REST_PERCENT = 2.5;

type Props = {
  launchNumber: string;
  questions: LoadedQuestion[];
  stageResults: StageResult[];
  onRestart: () => void;
};

export function LaunchReport({
  launchNumber,
  questions,
  stageResults,
  onRestart,
}: Props) {
  const totalPoints = stageResults.reduce(
    (sum, result) => sum + result.points,
    0,
  );
  const maxPoints = maxTotalPoints(questions.length);
  const peakAltitudeKm = altitudeForScore(totalPoints, maxPoints);
  const destination = destinationForAltitude(peakAltitudeKm);
  const emojiGrid = stageResults.map((result) => result.emoji).join("");
  const shareText = `🚀 Liftoff #${launchNumber} ${emojiGrid}\nReached: ${destination} (${formatAltitude(peakAltitudeKm)})\nThrust ${formatNumber(totalPoints)} / ${formatNumber(maxPoints)}`;

  const [climbProgress, setClimbProgress] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const shareRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    return tween(prefersReducedMotion() ? 0 : CLIMB_MS, setClimbProgress);
  }, []);

  const eased = easeOutCubic(climbProgress);
  const padLog = Math.log10(LAUNCH_PAD_ALTITUDE_KM);
  const peakLog = Math.log10(peakAltitudeKm);
  const currentAltitudeKm = Math.pow(10, padLog + (peakLog - padLog) * eased);
  const rocketBottomPercent = Math.max(
    ROCKET_REST_PERCENT,
    altitudeTrackPercent(peakAltitudeKm) * eased,
  );
  const destinationText =
    climbProgress === 0
      ? "Ignition…"
      : climbProgress < 1
        ? "Climbing…"
        : destination;

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
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          minWidth: 0,
        }}
      >
        <div>
          <p className="label">Peak altitude</p>
          <p className="alt num">{formatAltitude(currentAltitudeKm)}</p>
          <p className="dest">{destinationText}</p>
        </div>
        <ul className="summary">
          {stageResults.map((result, index) => (
            <li key={index}>
              <span>{result.emoji}</span>
              <span>{questions[index].prompt}</span>
              <span className="pt">+{formatNumber(result.points)}</span>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="label">Share</p>
          <pre className="share" ref={shareRef}>
            {shareText}
          </pre>
          <div className="row">
            <button
              className="fire"
              type="button"
              style={{ fontSize: 18, padding: "10px 22px" }}
              onClick={copyShareText}
            >
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
          🎯 exact · 🟢 locked in · 🟡 solid · 🟠 rough · 🔴 misfire. Crowd
          stats are simulated in this prototype.
        </p>
      </section>
      <div className="sky" aria-label="Altitude track, log scale">
        {MILESTONES.map((milestone) => (
          <div
            key={milestone.name}
            className="tick"
            style={{ bottom: `${altitudeTrackPercent(milestone.altitudeKm)}%` }}
          >
            <span>{milestone.name}</span>
            <span>{formatAltitude(milestone.altitudeKm)}</span>
          </div>
        ))}
        <div className="ground"></div>
        <div className="rocket" style={{ bottom: `${rocketBottomPercent}%` }}>
          <svg viewBox="0 0 30 64" aria-hidden="true">
            <path
              d="M15 0 C24 10 24 22 24 40 L6 40 C6 22 6 10 15 0Z"
              fill="#F4F6FA"
              stroke="#12213A"
              strokeWidth="1.5"
            />
            <circle
              cx="15"
              cy="20"
              r="4"
              fill="#3B5B8C"
              stroke="#12213A"
              strokeWidth="1.2"
            />
            <path d="M6 30 L0 44 L6 42Z M24 30 L30 44 L24 42Z" fill="#F2541B" />
            <g className="flame">
              <path d="M9 41 L15 62 L21 41Z" fill="#FFB020" />
              <path d="M12 41 L15 54 L18 41Z" fill="#FFF1C4" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
