import { type Dispatch, useState } from "react";
import type { CrowdState } from "../api/client";
import type { GameAction, GameState } from "../game/state";
import { AskStage } from "./AskStage";
import { RevealStage } from "./RevealStage";

type Props = {
  game: GameState;
  dispatch: Dispatch<GameAction>;
  /** What the server said about this stage's crowd. */
  crowd: CrowdState;
  /** A replay of a past launch shows its launch-day crowd. */
  isReplay: boolean;
  onFire: (guess: number) => void;
  isCalculatorOpen: boolean;
  onToggleCalculator: () => void;
};

/** One stage: the question over the rocket wherever it has got to, the controls in the band below, then the reveal. */
export function StageScreen({
  game,
  dispatch,
  crowd,
  isReplay,
  onFire,
  isCalculatorOpen,
  onToggleCalculator,
}: Props) {
  const question = game.questions[game.stageIndex];
  const stageNumber = game.stageIndex + 1;
  const stageResult = game.stageResults[game.stageIndex];
  // The pad opens by itself when a refresh brings back notes already written.
  const [isScratchPadOpen, setScratchPadOpen] = useState(
    () => game.notes.trim() !== "",
  );

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
            {isScratchPadOpen && (
              <section className="card scratch" id="scratch-pad">
                <label className="label" htmlFor="scratch-pad-text">
                  Scratch pad
                </label>
                <textarea
                  id="scratch-pad-text"
                  className="scratch-text"
                  rows={4}
                  placeholder={
                    "Jot down the numbers you're assuming, e.g.\nmarathon ≈ 42 km, walking ≈ 5 km/h"
                  }
                  value={game.notes}
                  onChange={(event) =>
                    dispatch({
                      type: "notes-changed",
                      text: event.target.value,
                    })
                  }
                />
                <p className="note">
                  Your notes show again next to the real numbers after the
                  reveal.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
      <div className="ground">
        <AskStage
          question={question}
          stageNumber={stageNumber}
          guessText={game.guessText}
          isCalculatorOpen={isCalculatorOpen}
          isScratchPadOpen={isScratchPadOpen}
          onGuessTextChange={(text) =>
            dispatch({ type: "guess-text-changed", text })
          }
          onFire={onFire}
          onToggleCalculator={onToggleCalculator}
          onToggleScratchPad={() => setScratchPadOpen((open) => !open)}
        />
      </div>
    </>
  );
}
