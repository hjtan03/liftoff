import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { easeOutCubic, prefersReducedMotion, tween } from "../animation";
import { fetchCrowd, submitGuess, type CrowdState } from "../api/client";
import { readStorage, writeStorage } from "../browserStorage";
import { Calculator } from "../calculator/Calculator";
import {
  archiveRunKey,
  computeStreak,
  HISTORY_STORAGE_KEY,
  parseHistory,
  recordFinishedLaunch,
  restoreRun,
  RUN_STORAGE_KEY,
  serializeRun,
} from "../game/progress";
import { routePosition } from "../game/journey";
import { formatNumber } from "../game/numbers";
import { maxTotalPoints } from "../game/scoring";
import { gameReducer, shownStageResults } from "../game/state";
import type { FactorValues } from "../questions/factors";
import type { LoadedQuestionSet } from "../questions/source";
import { LaunchReport } from "./LaunchReport";
import { MissionScene } from "./MissionScene";
import { Shell } from "./Shell";
import { StageScreen } from "./StageScreen";

const FUEL_COUNT_UP_MS = 700;

type Props = {
  questionSet: LoadedQuestionSet;
  /**
   * Today's launch counts: its guesses are recorded with the server and its
   * finish goes into the history streaks are counted from. Any other launch is
   * a replay, kept in its own storage, with the crowd from its own day.
   */
  isToday: boolean;
};

export function Game({ questionSet, isToday }: Props) {
  const runKey = isToday ? RUN_STORAGE_KEY : archiveRunKey(questionSet.id);
  /** The run as the browser left it, or a fresh one. */
  const [restoredGame] = useState(() =>
    restoreRun(questionSet, readStorage(runKey)),
  );
  const [game, dispatch] = useReducer(gameReducer, restoredGame);
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);
  /** Whether the camera has pulled back over the finished flight, so the report can come up over it. */
  const [hasPulledBack, setHasPulledBack] = useState(false);
  /** The crowd for each stage of this run, by stage index, filled in as the server answers. */
  const [crowdByStage, setCrowdByStage] = useState<Record<number, CrowdState>>(
    () =>
      Object.fromEntries(
        (isToday ? restoredGame.stageResults : questionSet.questions).map(
          (_, index) => [index, { status: "loading" } satisfies CrowdState],
        ),
      ),
  );
  const [storedHistory] = useState(() =>
    parseHistory(readStorage(HISTORY_STORAGE_KEY)),
  );

  // Every change to the run is saved, so a refresh resumes where it left off.
  useEffect(() => {
    writeStorage(runKey, serializeRun(game));
  }, [runKey, game]);

  // A restored run shows its crowd lines again without re-posting its guesses;
  // a replay shows the crowd from its launch day for every stage.
  useEffect(() => {
    const restoredStages = isToday
      ? restoredGame.stageResults.length
      : questionSet.questions.length;
    if (restoredStages === 0) return;
    let isStale = false;
    void fetchCrowd(Number(restoredGame.launchNumber)).then((crowds) => {
      if (isStale) return;
      setCrowdByStage((current) => {
        const next = { ...current };
        for (let index = 0; index < restoredStages; index += 1) {
          if (next[index]?.status !== "loading") continue;
          const crowd = crowds?.[index];
          next[index] = crowd
            ? { status: "loaded", crowd }
            : { status: "unavailable" };
        }
        return next;
      });
    });
    return () => {
      isStale = true;
    };
  }, [restoredGame, isToday, questionSet]);

  /** Finished launches, including today's once the rocket has flown. */
  const history = useMemo(() => {
    if (!isToday || game.phase !== "done") return storedHistory;
    return recordFinishedLaunch(storedHistory, game.launchNumber, {
      points: game.stageResults.reduce((sum, result) => sum + result.points, 0),
      grid: game.stageResults.map((result) => result.emoji).join(""),
    });
  }, [
    isToday,
    storedHistory,
    game.phase,
    game.launchNumber,
    game.stageResults,
  ]);

  useEffect(() => {
    if (history !== storedHistory)
      writeStorage(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history, storedHistory]);

  const streak = computeStreak(history, Number(game.launchNumber));

  /** Reveals the fired stage and records it with the server, which answers with the crowd. */
  const revealStage = (assumedFactorValues: FactorValues) => {
    const pending = game.pendingResult;
    if (!pending) return;
    const stageIndex = game.stageIndex;
    dispatch({ type: "assumptions-submitted", assumedFactorValues });
    // A replay's guesses are its own; the crowd it shows is from launch day.
    if (!isToday) return;
    setCrowdByStage((crowds) => ({
      ...crowds,
      [stageIndex]: { status: "loading" },
    }));
    void submitGuess({
      launch: Number(game.launchNumber),
      stage: stageIndex + 1,
      guess: pending.guess,
      band: pending.band,
      assumptions: assumedFactorValues,
    }).then((crowd) =>
      setCrowdByStage((crowds) => ({
        ...crowds,
        [stageIndex]: crowd
          ? { status: "loaded", crowd }
          : { status: "unavailable" },
      })),
    );
  };

  const launchLabel = isToday
    ? `Launch #${game.launchNumber}`
    : `Replay #${game.launchNumber}`;
  const metaText =
    game.phase === "done"
      ? `${launchLabel} · Flight report`
      : `${launchLabel} · Stage ${game.stageIndex + 1} of ${game.questions.length}`;
  const shownResults = shownStageResults(game);
  // How each stage stands for the pips: revealed, or the one being asked, or still to come.
  const stageStatuses = shownResults.map((result, index) =>
    result
      ? result.hit
        ? "fired"
        : "misfire"
      : index === game.stageIndex && game.phase !== "done"
        ? "current"
        : "pending",
  );
  const fuelBanked = shownResults.reduce(
    (sum, result) => sum + (result?.points ?? 0),
    0,
  );
  // The rocket rests where the fuel shown so far carries it, and a burning stage carries it on from there.
  const maxPoints = maxTotalPoints(game.questions.length);
  const restingPosition = routePosition(fuelBanked, maxPoints);
  const burningIndex = game.animatingStageIndex;
  const burn =
    burningIndex === null
      ? null
      : {
          stageIndex: burningIndex,
          from: restingPosition,
          to: routePosition(
            fuelBanked + game.stageResults[burningIndex].points,
            maxPoints,
          ),
          isScrub: !game.stageResults[burningIndex].hit,
          onFinished: () => dispatch({ type: "reveal-animation-finished" }),
        };
  const shownFuel = useTweenedNumber(fuelBanked, FUEL_COUNT_UP_MS);
  const stagesDescription = stageStatuses
    .map(
      (status, index) =>
        `Stage ${index + 1}: ${status === "misfire" ? "scrubbed" : status}`,
    )
    .join(", ");

  return (
    <>
      <Shell
        readout={
          <>
            <span className="hud-label">Fuel</span>
            <span className="hud-number num">{formatNumber(shownFuel)}</span>
          </>
        }
        status={
          <>
            <span className="pips" role="img" aria-label={stagesDescription}>
              {stageStatuses.map((status, index) => (
                <span key={index} className={`pip ${status}`} />
              ))}
            </span>
            <span className="meta">{metaText}</span>
          </>
        }
        screen={isToday ? "today" : "replay"}
        scene={
          <MissionScene
            position={restingPosition}
            stagesLeft={
              game.questions.length - shownResults.filter(Boolean).length
            }
            burn={burn}
            pullBack={
              game.phase === "done"
                ? {
                    hasPulledBack,
                    onPulledBack: () => setHasPulledBack(true),
                  }
                : null
            }
            showsRoute
          />
        }
      >
        {game.phase === "done" ? (
          <LaunchReport
            launchNumber={game.launchNumber}
            questions={game.questions}
            stageResults={game.stageResults}
            streak={isToday ? streak : null}
            hasPulledBack={hasPulledBack}
            onRestart={() => {
              dispatch({ type: "game-restarted" });
              setHasPulledBack(false);
              // A replay keeps its launch-day crowd; today's run starts over.
              if (isToday) setCrowdByStage({});
            }}
          />
        ) : (
          <StageScreen
            game={game}
            dispatch={dispatch}
            crowd={crowdByStage[game.stageIndex] ?? { status: "unavailable" }}
            isReplay={!isToday}
            onAssumptionsSubmitted={revealStage}
            isCalculatorOpen={isCalculatorOpen}
            onToggleCalculator={() => setCalculatorOpen((open) => !open)}
          />
        )}
      </Shell>
      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
    </>
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
