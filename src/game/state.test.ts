import { describe, expect, it } from "vitest";
import type { LoadedQuestionSet } from "../questions/source";
import { gameReducer, initialGameState, type GameState } from "./state";

const TWO_QUESTIONS: LoadedQuestionSet = {
  id: "042",
  questions: [
    {
      id: "cards-to-the-rim",
      category: "Everyday",
      prompt: "How many cards reach the rim?",
      unit: "cards",
      rounding: "ceil",
      roundingNote: "Round up.",
      factors: [
        {
          key: "ft",
          label: "Rim height",
          unit: "ft",
          value: 10,
          source: "NBA",
        },
      ],
      formula: "ft * 304.8 / 0.76",
      answer: 4011,
    },
    {
      id: "sheets-on-a-field",
      category: "Sport",
      prompt: "How many sheets cover the field?",
      unit: "sheets",
      rounding: "ceil",
      roundingNote: "Round up.",
      factors: [
        {
          key: "yd",
          label: "Field length",
          unit: "yd",
          value: 100,
          source: "NFL",
        },
      ],
      formula: "yd * 36 / 11",
      answer: 328,
    },
  ],
};

const START = initialGameState(TWO_QUESTIONS);

function playToReveal(state: GameState, guess: number): GameState {
  const fired = gameReducer(state, { type: "stage-fired", guess });
  return gameReducer(fired, {
    type: "assumptions-submitted",
    assumedFactorValues: {},
  });
}

describe("gameReducer", () => {
  it("starts the loaded set at stage one, asking, with the solid band selected", () => {
    expect(START).toEqual({
      launchNumber: "042",
      questions: TWO_QUESTIONS.questions,
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
    const typed = gameReducer(START, {
      type: "guess-text-changed",
      text: "4.2k",
    });
    expect(typed.guessText).toBe("4.2k");
    const banded = gameReducer(typed, { type: "band-selected", band: "lock" });
    expect(banded.selectedBand).toBe("lock");
  });
  it("firing a stage scores the guess against the loaded answer, clears the text, and moves to the assumptions", () => {
    const locked = gameReducer(START, { type: "band-selected", band: "lock" });
    const typed = gameReducer(locked, {
      type: "guess-text-changed",
      text: "4011",
    });
    const fired = gameReducer(typed, { type: "stage-fired", guess: 4011 });
    expect(fired.phase).toBe("assume");
    expect(fired.guessText).toBe("");
    expect(fired.pendingResult?.points).toBe(1250);
  });
  it("submitting assumptions stores the stage result and starts the reveal animation", () => {
    const fired = gameReducer(START, { type: "stage-fired", guess: 4011 });
    const revealed = gameReducer(fired, {
      type: "assumptions-submitted",
      assumedFactorValues: { ft: 9 },
    });
    expect(revealed.phase).toBe("reveal");
    expect(revealed.pendingResult).toBeNull();
    expect(revealed.stageResults[0]?.assumedFactorValues).toEqual({ ft: 9 });
    expect(revealed.animatingStageIndex).toBe(0);
  });
  it("finishing the reveal animation clears the animating stage", () => {
    const settled = gameReducer(playToReveal(START, 4011), {
      type: "reveal-animation-finished",
    });
    expect(settled.animatingStageIndex).toBeNull();
  });
  it("the next stage resets the band to solid and asks again", () => {
    const locked = gameReducer(START, { type: "band-selected", band: "lock" });
    const next = gameReducer(playToReveal(locked, 4011), {
      type: "next-stage",
    });
    expect(next.stageIndex).toBe(1);
    expect(next.phase).toBe("ask");
    expect(next.selectedBand).toBe("solid");
  });
  it("the last stage's next step launches the rocket", () => {
    const afterFirst = gameReducer(playToReveal(START, 1), {
      type: "next-stage",
    });
    const afterSecond = gameReducer(playToReveal(afterFirst, 1), {
      type: "next-stage",
    });
    expect(afterSecond.phase).toBe("done");
    expect(afterSecond.stageResults).toHaveLength(2);
  });
  it("restarting returns to the start of the same set", () => {
    const played = playToReveal(START, 4011);
    expect(gameReducer(played, { type: "game-restarted" })).toEqual(START);
  });
});
