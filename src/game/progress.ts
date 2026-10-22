import type { LoadedQuestionSet } from "../questions/source";
import { BAND_KEYS } from "./scoring";
import { initialGameState, type GameState } from "./state";

/**
 * What the browser remembers between visits: the run in progress for today's
 * launch, and a history of finished launches that streaks are counted from.
 * Everything here is pure; the component reads and writes storage.
 */

export const RUN_STORAGE_KEY = "liftoff.run";
export const HISTORY_STORAGE_KEY = "liftoff.history";
const RUN_FORMAT_VERSION = 1;

type SavedRun = {
  version: typeof RUN_FORMAT_VERSION;
  launchNumber: string;
  stageCount: number;
  state: Pick<
    GameState,
    | "stageIndex"
    | "phase"
    | "selectedBand"
    | "guessText"
    | "stageResults"
    | "pendingResult"
  >;
};

/** A finished launch: what it scored and its emoji grid. */
export type FinishedLaunch = { points: number; grid: string };

/** Finished launches by launch number. */
export type LaunchHistory = Record<string, FinishedLaunch>;

export type Streak = { current: number; best: number; played: number };

export function serializeRun(state: GameState): string {
  const saved: SavedRun = {
    version: RUN_FORMAT_VERSION,
    launchNumber: state.launchNumber,
    stageCount: state.questions.length,
    state: {
      stageIndex: state.stageIndex,
      phase: state.phase,
      selectedBand: state.selectedBand,
      guessText: state.guessText,
      stageResults: state.stageResults,
      pendingResult: state.pendingResult,
    },
  };
  return JSON.stringify(saved);
}

/**
 * The game to start with: the saved run when it belongs to this launch and
 * reads back intact, otherwise a fresh one. A run from another day, another
 * format, or a damaged entry is ignored rather than trusted.
 */
export function restoreRun(
  questionSet: LoadedQuestionSet,
  saved: string | null,
): GameState {
  const fresh = initialGameState(questionSet);
  if (!saved) return fresh;
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return fresh;
  }
  if (!isSavedRunFor(parsed, questionSet)) return fresh;
  const { state } = parsed;
  // A reveal that was mid-animation resumes settled.
  return { ...fresh, ...state, animatingStageIndex: null };
}

function isSavedRunFor(
  value: unknown,
  questionSet: LoadedQuestionSet,
): value is SavedRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Partial<SavedRun>;
  const state = run.state;
  if (
    run.version !== RUN_FORMAT_VERSION ||
    run.launchNumber !== questionSet.id ||
    run.stageCount !== questionSet.questions.length ||
    typeof state !== "object" ||
    state === null
  )
    return false;
  const stageCount = questionSet.questions.length;
  return (
    Number.isInteger(state.stageIndex) &&
    state.stageIndex >= 0 &&
    state.stageIndex < stageCount &&
    ["ask", "assume", "reveal", "done"].includes(state.phase) &&
    BAND_KEYS.includes(state.selectedBand) &&
    typeof state.guessText === "string" &&
    Array.isArray(state.stageResults) &&
    state.stageResults.length <= stageCount &&
    (state.phase !== "assume" || state.pendingResult !== null) &&
    (state.phase !== "reveal" || state.stageResults[state.stageIndex] != null)
  );
}

export function parseHistory(saved: string | null): LaunchHistory {
  if (!saved) return {};
  try {
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    const history: LaunchHistory = {};
    for (const [launch, entry] of Object.entries(parsed)) {
      if (
        /^\d+$/.test(launch) &&
        typeof entry?.points === "number" &&
        typeof entry?.grid === "string"
      )
        history[launch] = { points: entry.points, grid: entry.grid };
    }
    return history;
  } catch {
    return {};
  }
}

/** Records a finished launch; replaying a launch keeps its first result. */
export function recordFinishedLaunch(
  history: LaunchHistory,
  launchNumber: string,
  finished: FinishedLaunch,
): LaunchHistory {
  if (history[launchNumber]) return history;
  return { ...history, [launchNumber]: finished };
}

/**
 * Streaks count consecutive launches finished. The current streak survives
 * until a whole launch is missed: if today's is not finished yet, it counts up
 * to yesterday's.
 */
export function computeStreak(
  history: LaunchHistory,
  todayLaunch: number,
): Streak {
  const finished = new Set(Object.keys(history).map(Number));
  let best = 0;
  let run = 0;
  for (const launch of [...finished].sort((a, b) => a - b)) {
    run = finished.has(launch - 1) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  let current = 0;
  let launch = finished.has(todayLaunch) ? todayLaunch : todayLaunch - 1;
  while (finished.has(launch)) {
    current += 1;
    launch -= 1;
  }
  return { current, best, played: finished.size };
}
