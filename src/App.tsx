import { useEffect, useState } from "react";
import { Game } from "./components/Game";
import { Shell } from "./components/Shell";
import {
  computeLaunchNumber,
  daysUntilFirstLaunch,
  formatQuestionSetId,
  launchNumberFromAddress,
} from "./questions/schedule";
import { fetchQuestionSet, type LoadedQuestionSet } from "./questions/source";

/** Where the question sets are served, one file per launch. */
const QUESTION_SETS_URL = `${import.meta.env.BASE_URL}questions/`;

type QuestionSetLoad =
  | { status: "before-launch"; days: number }
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "loaded"; questionSet: LoadedQuestionSet };

export function App() {
  const [load, setLoad] = useState<QuestionSetLoad>(() => {
    const days = daysUntilFirstLaunch(new Date());
    const isTesting = launchNumberFromAddress(window.location.search) !== null;
    return days > 0 && !isTesting
      ? { status: "before-launch", days }
      : { status: "loading" };
  });

  useEffect(() => {
    if (load.status !== "loading") return;
    let isStale = false;
    fetchQuestionSetForToday()
      .then((questionSet) => {
        if (!isStale) setLoad({ status: "loaded", questionSet });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!isStale) setLoad({ status: "failed", message });
      });
    return () => {
      isStale = true;
    };
  }, [load.status]);

  if (load.status === "before-launch") {
    return (
      <Shell metaText="Countdown">
        <div className="countdown">
          <p className="label">Launch #001</p>
          <p className="countdown-days num">
            T−{load.days} {load.days === 1 ? "day" : "days"}
          </p>
          <p className="note">
            The first daily launch lifts off on Saturday, October 24. Five
            questions, one rocket, a new flight every day.
          </p>
        </div>
      </Shell>
    );
  }

  if (load.status === "loading") {
    return (
      <Shell metaText="Loading">
        <p className="note">Loading the day’s questions…</p>
      </Shell>
    );
  }
  if (load.status === "failed") {
    return (
      <Shell metaText="Could not load">
        <p className="err">{load.message}</p>
      </Shell>
    );
  }
  return <Game questionSet={load.questionSet} />;
}

/**
 * Fetches the set for the launch on the device's calendar date, or the one
 * named in the address (`?launch=N`) when testing.
 */
async function fetchQuestionSetForToday(): Promise<LoadedQuestionSet> {
  const launchNumber =
    launchNumberFromAddress(window.location.search) ??
    computeLaunchNumber(new Date());
  const questionSetId = formatQuestionSetId(launchNumber);
  return fetchQuestionSet(`${QUESTION_SETS_URL}${questionSetId}.json`);
}
