import { useReducer, useState } from "react";
import { Calculator } from "./calculator/Calculator";
import { LaunchReport } from "./components/LaunchReport";
import { StageScreen } from "./components/StageScreen";
import { LAUNCH_NUMBER } from "./game/launch";
import { QUESTIONS } from "./game/questions";
import { gameReducer, INITIAL_GAME_STATE } from "./game/state";

export function App() {
  const [game, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);

  const metaText =
    game.phase === "done"
      ? `Launch ${LAUNCH_NUMBER} · Flight report`
      : `Launch ${LAUNCH_NUMBER} · Stage ${game.stageIndex + 1} of ${QUESTIONS.length}`;

  return (
    <>
      <div className="wrap">
        <header className="bar">
          <div className="brand">
            Lift<span>off</span>
          </div>
          <div className="meta">{metaText}</div>
        </header>
        <main>
          {game.phase === "done" ? (
            <LaunchReport
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
        </main>
      </div>
      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
    </>
  );
}
