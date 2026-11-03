import type { LoadedQuestion, LoadedQuestionSet } from "../questions/source";
import { type ScoredGuess, scoreGuess } from "./scoring";

export type GamePhase = "ask" | "reveal" | "done";

/** A revealed stage: the scored guess and whatever the player jotted on the scratch pad for it. */
export type StageResult = ScoredGuess & { notes: string };

export type GameState = {
  launchNumber: string;
  questions: LoadedQuestion[];
  stageIndex: number;
  phase: GamePhase;
  guessText: string;
  /** The scratch pad for the stage being asked; it travels with the stage's result once fired. */
  notes: string;
  stageResults: StageResult[];
  /** The stage whose burn is playing; its result stays hidden until the burn finishes. */
  animatingStageIndex: number | null;
};

export type GameAction =
  | { type: "guess-text-changed"; text: string }
  | { type: "notes-changed"; text: string }
  | { type: "stage-fired"; guess: number }
  | { type: "reveal-animation-finished" }
  | { type: "next-stage" }
  | { type: "game-restarted" };

export function initialGameState(questionSet: LoadedQuestionSet): GameState {
  return {
    launchNumber: questionSet.id,
    questions: questionSet.questions,
    stageIndex: 0,
    phase: "ask",
    guessText: "",
    notes: "",
    stageResults: [],
    animatingStageIndex: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "guess-text-changed":
      return { ...state, guessText: action.text };
    case "notes-changed":
      return { ...state, notes: action.text };
    case "stage-fired": {
      const answer = state.questions[state.stageIndex].answer;
      const stageResults = [...state.stageResults];
      stageResults[state.stageIndex] = {
        ...scoreGuess({ answer, guess: action.guess }),
        notes: state.notes,
      };
      return {
        ...state,
        phase: "reveal",
        guessText: "",
        stageResults,
        animatingStageIndex: state.stageIndex,
      };
    }
    case "reveal-animation-finished":
      return { ...state, animatingStageIndex: null };
    case "next-stage": {
      const isLastStage = state.stageIndex === state.questions.length - 1;
      if (isLastStage) return { ...state, phase: "done" };
      return {
        ...state,
        stageIndex: state.stageIndex + 1,
        phase: "ask",
        notes: "",
      };
    }
    case "game-restarted":
      return initialGameState({
        id: state.launchNumber,
        questions: state.questions,
      });
  }
}

/** Each stage's result as the player has seen it: undefined until revealed, and while its reveal is still animating. */
export function shownStageResults(
  state: GameState,
): (StageResult | undefined)[] {
  return state.questions.map((_, index) =>
    index === state.animatingStageIndex ? undefined : state.stageResults[index],
  );
}
