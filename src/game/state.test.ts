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
  return gameReducer(state, { type: "stage-fired", guess });
}

describe("gameReducer", () => {
  it("starts the loaded set at stage one, asking, with an empty scratch pad", () => {
    expect(START).toEqual({
      launchNumber: "042",
      questions: TWO_QUESTIONS.questions,
      stageIndex: 0,
      phase: "ask",
      guessText: "",
      notes: "",
      stageResults: [],
      animatingStageIndex: null,
    });
  });
  it("records the typed guess and the scratch pad", () => {
    const typed = gameReducer(START, {
      type: "guess-text-changed",
      text: "4.2k",
    });
    expect(typed.guessText).toBe("4.2k");
    const noted = gameReducer(typed, { type: "notes-changed", text: "10 ft" });
    expect(noted.notes).toBe("10 ft");
  });
  it("firing a stage scores the guess, keeps the notes with it, and starts the reveal", () => {
    const noted = gameReducer(START, { type: "notes-changed", text: "10 ft" });
    const typed = gameReducer(noted, {
      type: "guess-text-changed",
      text: "4011",
    });
    const fired = gameReducer(typed, { type: "stage-fired", guess: 4011 });
    expect(fired.phase).toBe("reveal");
    expect(fired.guessText).toBe("");
    expect(fired.stageResults[0]?.points).toBe(1250);
    expect(fired.stageResults[0]?.notes).toBe("10 ft");
    expect(fired.animatingStageIndex).toBe(0);
  });
  it("a miss still earns fuel for how close it was", () => {
    const fired = playToReveal(START, 2000);
    expect(fired.stageResults[0]?.points).toBeGreaterThan(0);
    expect(fired.stageResults[0]?.tier).toBe("suborbital");
  });
  it("finishing the reveal animation clears the animating stage", () => {
    const settled = gameReducer(playToReveal(START, 4011), {
      type: "reveal-animation-finished",
    });
    expect(settled.animatingStageIndex).toBeNull();
  });
  it("the next stage clears the scratch pad and asks again", () => {
    const noted = gameReducer(START, { type: "notes-changed", text: "10 ft" });
    const next = gameReducer(playToReveal(noted, 4011), {
      type: "next-stage",
    });
    expect(next.stageIndex).toBe(1);
    expect(next.phase).toBe("ask");
    expect(next.notes).toBe("");
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
