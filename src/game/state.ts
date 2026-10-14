import type { FactorValues } from "../questions/factors";
import type { LoadedQuestion, LoadedQuestionSet } from "../questions/source";
import { type BandKey, type ScoredGuess, scoreGuess } from "./scoring";

export type GamePhase = "ask" | "assume" | "reveal" | "done";

export type StageResult = ScoredGuess & { assumedFactorValues: FactorValues };

export type GameState = {
  launchNumber: string;
  questions: LoadedQuestion[];
  stageIndex: number;
  phase: GamePhase;
  selectedBand: BandKey;
  guessText: string;
  stageResults: StageResult[];
  /** The scored guess between firing and the reveal, before assumptions are known. */
  pendingResult: ScoredGuess | null;
  /** The stage whose reveal animation is running; its result stays hidden on the stack until it finishes. */
  animatingStageIndex: number | null;
};

export type GameAction =
  | { type: "guess-text-changed"; text: string }
  | { type: "band-selected"; band: BandKey }
  | { type: "stage-fired"; guess: number }
  | { type: "assumptions-submitted"; assumedFactorValues: FactorValues }
  | { type: "reveal-animation-finished" }
  | { type: "next-stage" }
  | { type: "game-restarted" };

const DEFAULT_BAND: BandKey = "solid";

export function initialGameState(questionSet: LoadedQuestionSet): GameState {
  return {
    launchNumber: questionSet.id,
    questions: questionSet.questions,
    stageIndex: 0,
    phase: "ask",
    selectedBand: DEFAULT_BAND,
    guessText: "",
    stageResults: [],
    pendingResult: null,
    animatingStageIndex: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "guess-text-changed":
      return { ...state, guessText: action.text };
    case "band-selected":
      return { ...state, selectedBand: action.band };
    case "stage-fired": {
      const answer = state.questions[state.stageIndex].answer;
      const pendingResult = scoreGuess({
        answer,
        guess: action.guess,
        band: state.selectedBand,
      });
      return { ...state, phase: "assume", guessText: "", pendingResult };
    }
    case "assumptions-submitted": {
      if (!state.pendingResult) return state;
      const stageResults = [...state.stageResults];
      stageResults[state.stageIndex] = {
        ...state.pendingResult,
        assumedFactorValues: action.assumedFactorValues,
      };
      return {
        ...state,
        phase: "reveal",
        stageResults,
        pendingResult: null,
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
        selectedBand: DEFAULT_BAND,
      };
    }
    case "game-restarted":
      return initialGameState({
        id: state.launchNumber,
        questions: state.questions,
      });
  }
}
