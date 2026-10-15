import { describe, expect, it } from "vitest";
import { gameReducer, INITIAL_GAME_STATE, type GameState } from "./state";

function playToReveal(state: GameState, guess: number): GameState {
  const fired = gameReducer(state, { type: "stage-fired", guess });
  return gameReducer(fired, {
    type: "assumptions-submitted",
    assumedFactorValues: {},
  });
}

describe("gameReducer", () => {
  it("starts at stage one, asking, with the solid band selected", () => {
    expect(INITIAL_GAME_STATE).toEqual({
      stageIndex: 0,
      phase: "ask",
      selectedBand: "solid",
      guessText: "",
      stageResults: [],
      pendingResult: null,
      animatingStageIndex: null,
    });
  });
  it("records the typed guess and the selected band", () => {
    const typed = gameReducer(INITIAL_GAME_STATE, {
      type: "guess-text-changed",
      text: "4.2k",
    });
    expect(typed.guessText).toBe("4.2k");
    const banded = gameReducer(typed, { type: "band-selected", band: "lock" });
    expect(banded.selectedBand).toBe("lock");
  });
  it("firing a stage scores the guess, clears the text, and moves to the assumptions", () => {
    const locked = gameReducer(INITIAL_GAME_STATE, {
      type: "band-selected",
      band: "lock",
    });
    const typed = gameReducer(locked, {
      type: "guess-text-changed",
      text: "506",
    });
    const fired = gameReducer(typed, { type: "stage-fired", guess: 506 });
    expect(fired.phase).toBe("assume");
    expect(fired.guessText).toBe("");
    expect(fired.pendingResult?.points).toBe(1250);
  });
  it("submitting assumptions stores the stage result and starts the reveal animation", () => {
    const fired = gameReducer(INITIAL_GAME_STATE, {
      type: "stage-fired",
      guess: 506,
    });
    const revealed = gameReducer(fired, {
      type: "assumptions-submitted",
      assumedFactorValues: { d: 42 },
    });
    expect(revealed.phase).toBe("reveal");
    expect(revealed.pendingResult).toBeNull();
    expect(revealed.stageResults[0]?.assumedFactorValues).toEqual({ d: 42 });
    expect(revealed.animatingStageIndex).toBe(0);
  });
  it("finishing the reveal animation clears the animating stage", () => {
    const revealed = playToReveal(INITIAL_GAME_STATE, 506);
    const settled = gameReducer(revealed, {
      type: "reveal-animation-finished",
    });
    expect(settled.animatingStageIndex).toBeNull();
  });
  it("the next stage resets the band to solid and asks again", () => {
    const locked = gameReducer(INITIAL_GAME_STATE, {
      type: "band-selected",
      band: "lock",
    });
    const next = gameReducer(playToReveal(locked, 506), { type: "next-stage" });
    expect(next.stageIndex).toBe(1);
    expect(next.phase).toBe("ask");
    expect(next.selectedBand).toBe("solid");
  });
  it("the fifth stage's next step launches the rocket", () => {
    let state: GameState = INITIAL_GAME_STATE;
    for (let stage = 0; stage < 5; stage += 1) {
      state = gameReducer(playToReveal(state, 1), { type: "next-stage" });
    }
    expect(state.phase).toBe("done");
    expect(state.stageResults).toHaveLength(5);
  });
  it("restarting returns to the initial state", () => {
    const played = playToReveal(INITIAL_GAME_STATE, 506);
    expect(gameReducer(played, { type: "game-restarted" })).toEqual(
      INITIAL_GAME_STATE,
    );
  });
});
