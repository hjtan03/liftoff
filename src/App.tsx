import { useEffect, useState } from "react";
import { Game } from "./components/Game";
import { Shell } from "./components/Shell";
import { computeLaunchNumber, formatQuestionSetId } from "./questions/schedule";
import { fetchQuestionSet, type LoadedQuestionSet } from "./questions/source";

/** Where the question sets are served, one file per launch. */
const QUESTION_SETS_URL = `${import.meta.env.BASE_URL}questions/`;

type QuestionSetLoad =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "loaded"; questionSet: LoadedQuestionSet };

export function App() {
  const [load, setLoad] = useState<QuestionSetLoad>({ status: "loading" });

  useEffect(() => {
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
  }, []);

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

/** Fetches the set for the launch on the device's calendar date; a date before the first launch rejects like a failed fetch. */
async function fetchQuestionSetForToday(): Promise<LoadedQuestionSet> {
  const questionSetId = formatQuestionSetId(computeLaunchNumber(new Date()));
  return fetchQuestionSet(`${QUESTION_SETS_URL}${questionSetId}.json`);
}
