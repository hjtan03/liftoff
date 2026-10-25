import type { Dispatch } from "react";
import type { CrowdState } from "../api/client";
import type { GameAction, GameState } from "../game/state";
import type { FactorValues } from "../questions/factors";
import { AskStage } from "./AskStage";
import { AssumptionsBar, AssumptionsCard } from "./AssumptionsForm";
import { RevealStage } from "./RevealStage";

type Props = {
  game: GameState;
  dispatch: Dispatch<GameAction>;
  /** What the server said about this stage's crowd. */
  crowd: CrowdState;
  /** A replay of a past launch shows its launch-day crowd. */
  isReplay: boolean;
  onAssumptionsSubmitted: (assumedFactorValues: FactorValues) => void;
  isCalculatorOpen: boolean;
  onToggleCalculator: () => void;
};

/** One stage: the question over the rocket wherever it has got to, the controls in the band below, then the reveal. */
export function StageScreen({
  game,
  dispatch,
  crowd,
  isReplay,
  onAssumptionsSubmitted,
  isCalculatorOpen,
  onToggleCalculator,
}: Props) {
  const question = game.questions[game.stageIndex];
  const stageNumber = game.stageIndex + 1;
  const stageResult = game.stageResults[game.stageIndex];

  if (game.phase === "reveal" && stageResult) {
    return (
      <RevealStage
        key={game.stageIndex}
        question={question}
        stageNumber={stageNumber}
        result={stageResult}
        crowd={crowd}
        isReplay={isReplay}
        isLastStage={game.stageIndex === game.questions.length - 1}
        isAnimating={game.animatingStageIndex === game.stageIndex}
        onNext={() => dispatch({ type: "next-stage" })}
      />
    );
  }

  const pendingResult = game.phase === "assume" ? game.pendingResult : null;
  return (
    <>
      <div className="sky-area">
        <div className="overlay-area top">
          <div className="overlay-stack">
            <section className="card prompt">
              <p className="qrow">
                <span className="stage-tag">Stage {stageNumber}</span>
                <span className="chip">{question.category}</span>
              </p>
              <h1 className="q">{question.prompt}</h1>
              <p className="round-note">{question.roundingNote}</p>
            </section>
            {pendingResult && (
              <AssumptionsCard
                question={question}
                pendingResult={pendingResult}
                onSubmit={onAssumptionsSubmitted}
              />
            )}
          </div>
        </div>
      </div>
      <div className="ground">
        {game.phase === "ask" && (
          <AskStage
            question={question}
            stageNumber={stageNumber}
            guessText={game.guessText}
            selectedBand={game.selectedBand}
            isCalculatorOpen={isCalculatorOpen}
            onGuessTextChange={(text) =>
              dispatch({ type: "guess-text-changed", text })
            }
            onBandSelect={(band) => dispatch({ type: "band-selected", band })}
            onFire={(guess) => dispatch({ type: "stage-fired", guess })}
            onToggleCalculator={onToggleCalculator}
          />
        )}
        {pendingResult && (
          <AssumptionsBar onSkip={() => onAssumptionsSubmitted({})} />
        )}
      </div>
    </>
  );
}
