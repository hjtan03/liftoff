import { useReducer, useState } from "react";
import { Calculator } from "../calculator/Calculator";
import { gameReducer, initialGameState } from "../game/state";
import type { LoadedQuestionSet } from "../questions/source";
import { LaunchReport } from "./LaunchReport";
import { Shell } from "./Shell";
import { StageScreen } from "./StageScreen";

type Props = { questionSet: LoadedQuestionSet };

export function Game({ questionSet }: Props) {
  const [game, dispatch] = useReducer(
    gameReducer,
    questionSet,
    initialGameState,
  );
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);

  const metaText =
    game.phase === "done"
      ? `Launch #${game.launchNumber} · Flight report`
      : `Launch #${game.launchNumber} · Stage ${game.stageIndex + 1} of ${game.questions.length}`;

  return (
    <>
      <Shell metaText={metaText}>
        {game.phase === "done" ? (
          <LaunchReport
            launchNumber={game.launchNumber}
            questions={game.questions}
            stageResults={game.stageResults}
            onRestart={() => {
              dispatch({ type: "game-restarted" });
              window.scrollTo({ top: 0 });
            }}
          />
        ) : (
          <StageScreen
            game={game}
            dispatch={dispatch}
            isCalculatorOpen={isCalculatorOpen}
            onToggleCalculator={() => setCalculatorOpen((open) => !open)}
          />
        )}
      </Shell>
      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
    </>
  );
}
