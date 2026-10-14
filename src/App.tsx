import { useEffect, useState } from "react";
import { Game } from "./components/Game";
import { Shell } from "./components/Shell";
import { fetchQuestionSet, type LoadedQuestionSet } from "./questions/source";

/** The game's one piece of configuration: where today's question set is served. */
const QUESTION_SET_URL = `${import.meta.env.BASE_URL}questions/001.json`;

type QuestionSetLoad =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "loaded"; questionSet: LoadedQuestionSet };

export function App() {
  const [load, setLoad] = useState<QuestionSetLoad>({ status: "loading" });

  useEffect(() => {
    let isStale = false;
    fetchQuestionSet(QUESTION_SET_URL)
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
