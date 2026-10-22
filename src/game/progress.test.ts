import { describe, expect, it } from "vitest";
import type { LoadedQuestionSet } from "../questions/source";
import {
  computeStreak,
  parseHistory,
  recordFinishedLaunch,
  restoreRun,
  serializeRun,
} from "./progress";
import { gameReducer, initialGameState } from "./state";

const QUESTION = {
  id: "q",
  category: "Everyday",
  prompt: "p",
  unit: "u",
  rounding: "round" as const,
  roundingNote: "n",
  factors: [{ key: "d", label: "D", unit: "km", value: 1, source: "s" }],
  formula: "d",
  answer: 100,
};
const SET: LoadedQuestionSet = { id: "007", questions: [QUESTION, QUESTION] };

function playedFirstStage() {
  let state = initialGameState(SET);
  state = gameReducer(state, { type: "band-selected", band: "lock" });
  state = gameReducer(state, { type: "stage-fired", guess: 100 });
  state = gameReducer(state, {
    type: "assumptions-submitted",
    assumedFactorValues: {},
  });
  return state;
}

describe("restoreRun", () => {
  it("resumes a saved run of the same launch, settled", () => {
    const played = playedFirstStage();
    const restored = restoreRun(SET, serializeRun(played));
    expect(restored.stageResults).toEqual(played.stageResults);
    expect(restored.phase).toBe("reveal");
    expect(restored.animatingStageIndex).toBeNull();
  });

  it("resumes between firing and the reveal", () => {
    const fired = gameReducer(initialGameState(SET), {
      type: "stage-fired",
      guess: 90,
    });
    const restored = restoreRun(SET, serializeRun(fired));
    expect(restored.phase).toBe("assume");
    expect(restored.pendingResult?.guess).toBe(90);
  });

  it("starts fresh for another launch's run", () => {
    const saved = serializeRun(playedFirstStage());
    const restored = restoreRun({ ...SET, id: "008" }, saved);
    expect(restored).toEqual(initialGameState({ ...SET, id: "008" }));
  });

  it.each([
    ["nothing", null],
    ["broken JSON", "{"],
    ["a different format", JSON.stringify({ version: 99 })],
    [
      "a stage out of range",
      serializeRun({ ...playedFirstStage(), stageIndex: 5 }),
    ],
  ])("starts fresh from %s", (_, saved) => {
    expect(restoreRun(SET, saved)).toEqual(initialGameState(SET));
  });
});

describe("history", () => {
  it("keeps the first result when a launch is replayed", () => {
    const once = recordFinishedLaunch({}, "007", { points: 900, grid: "🟢" });
    const twice = recordFinishedLaunch(once, "007", { points: 10, grid: "🔴" });
    expect(twice["007"].points).toBe(900);
  });

  it("drops damaged entries when reading back", () => {
    expect(
      parseHistory(
        JSON.stringify({ "003": { points: 5, grid: "🟢" }, x: {}, "4": 1 }),
      ),
    ).toEqual({ "003": { points: 5, grid: "🟢" } });
    expect(parseHistory("nope")).toEqual({});
  });
});

describe("computeStreak", () => {
  const finished = (...launches: number[]) =>
    Object.fromEntries(
      launches.map((launch) => [
        String(launch).padStart(3, "0"),
        { points: 1, grid: "" },
      ]),
    );

  it("counts consecutive finished launches up to today", () => {
    expect(computeStreak(finished(3, 4, 5), 5)).toEqual({
      current: 3,
      best: 3,
      played: 3,
    });
  });

  it("keeps the streak alive while today is still unplayed", () => {
    expect(computeStreak(finished(3, 4), 5).current).toBe(2);
  });

  it("resets after a missed launch but remembers the best", () => {
    expect(computeStreak(finished(1, 2, 3, 4, 7), 8)).toEqual({
      current: 1,
      best: 4,
      played: 5,
    });
    expect(computeStreak(finished(1, 2), 9).current).toBe(0);
  });

  it("is zero with no history", () => {
    expect(computeStreak({}, 1)).toEqual({ current: 0, best: 0, played: 0 });
  });
});
