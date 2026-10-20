import { useReducer, useState } from "react";
import { submitGuess, type CrowdState } from "../api/client";
import { Calculator } from "../calculator/Calculator";
import type { FactorValues } from "../questions/factors";
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
  /** The crowd for each stage of this run, by stage index, filled in as the server answers. */
  const [crowdByStage, setCrowdByStage] = useState<Record<number, CrowdState>>(
    {},
  );

  /** Reveals the fired stage and records it with the server, which answers with the crowd. */
  const revealStage = (assumedFactorValues: FactorValues) => {
    const pending = game.pendingResult;
    if (!pending) return;
    const stageIndex = game.stageIndex;
    dispatch({ type: "assumptions-submitted", assumedFactorValues });
    setCrowdByStage((crowds) => ({
      ...crowds,
      [stageIndex]: { status: "loading" },
    }));
    void submitGuess({
      launch: Number(game.launchNumber),
      stage: stageIndex + 1,
      guess: pending.guess,
      band: pending.band,
      assumptions: assumedFactorValues,
    }).then((crowd) =>
      setCrowdByStage((crowds) => ({
        ...crowds,
        [stageIndex]: crowd
          ? { status: "loaded", crowd }
          : { status: "unavailable" },
      })),
    );
  };

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
              setCrowdByStage({});
              window.scrollTo({ top: 0 });
            }}
          />
        ) : (
          <StageScreen
            game={game}
            dispatch={dispatch}
            crowd={crowdByStage[game.stageIndex] ?? { status: "unavailable" }}
            onAssumptionsSubmitted={revealStage}
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
