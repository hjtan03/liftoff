import type { Dispatch } from "react";
import { simulatedCrowdLockedInHitPercent } from "../game/crowd";
import type { GameAction, GameState } from "../game/state";
import { AskStage } from "./AskStage";
import { AssumptionsForm } from "./AssumptionsForm";
import { RevealStage } from "./RevealStage";
import { RocketStack } from "./RocketStack";

type Props = {
  game: GameState;
  dispatch: Dispatch<GameAction>;
  isCalculatorOpen: boolean;
  onToggleCalculator: () => void;
};

export function StageScreen({
  game,
  dispatch,
  isCalculatorOpen,
  onToggleCalculator,
}: Props) {
  const question = game.questions[game.stageIndex];
  const stageNumber = game.stageIndex + 1;
  const stageResult = game.stageResults[game.stageIndex];

  return (
    <div className="grid">
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          minWidth: 0,
        }}
      >
        <div className="qhead">
          <div className="qrow">
            <span className="stage-tag">Stage {stageNumber}</span>
            <span className="chip">{question.category}</span>
          </div>
          <h1 className="q">{question.prompt}</h1>
          <p className="round-note">{question.roundingNote}</p>
        </div>
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
        {game.phase === "assume" && game.pendingResult && (
          <AssumptionsForm
            question={question}
            pendingResult={game.pendingResult}
            onSubmit={(assumedFactorValues) =>
              dispatch({ type: "assumptions-submitted", assumedFactorValues })
            }
          />
        )}
        {game.phase === "reveal" && stageResult && (
          <RevealStage
            key={game.stageIndex}
            question={question}
            result={stageResult}
            crowdLockedInHitPercent={simulatedCrowdLockedInHitPercent(
              game.stageIndex,
            )}
            isLastStage={game.stageIndex === game.questions.length - 1}
            isAnimating={game.animatingStageIndex === game.stageIndex}
            onAnimationFinished={() =>
              dispatch({ type: "reveal-animation-finished" })
            }
            onNext={() => {
              dispatch({ type: "next-stage" });
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </section>
      <RocketStack
        stageCount={game.questions.length}
        stageResults={game.stageResults}
        stageIndex={game.stageIndex}
        phase={game.phase}
        animatingStageIndex={game.animatingStageIndex}
      />
    </div>
  );
}
