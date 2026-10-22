import { useEffect, useState } from "react";
import { Archive } from "./components/Archive";
import { Game } from "./components/Game";
import { Shell } from "./components/Shell";
import { formatQuestionSetId } from "./questions/schedule";
import { fetchQuestionSet, type LoadedQuestionSet } from "./questions/source";
import { hrefFor, routeFor } from "./route";

/** Where the question sets are served, one file per launch. */
const QUESTION_SETS_URL = `${import.meta.env.BASE_URL}questions/`;

type QuestionSetLoad =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "loaded"; questionSet: LoadedQuestionSet };

export function App() {
  const [route] = useState(() => routeFor(window.location.search, new Date()));
  const launch =
    route.screen === "today" || route.screen === "replay" ? route.launch : null;
  const [load, setLoad] = useState<QuestionSetLoad>({ status: "loading" });

  useEffect(() => {
    if (launch === null) return;
    let isStale = false;
    fetchQuestionSet(`${QUESTION_SETS_URL}${formatQuestionSetId(launch)}.json`)
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
  }, [launch]);

  if (route.screen === "countdown") {
    return (
      <Shell metaText="Countdown" screen="other">
        <div className="countdown">
          <p className="label">Launch #001</p>
          <p className="countdown-days num">
            T−{route.days} {route.days === 1 ? "day" : "days"}
          </p>
          <p className="note">
            The first daily launch lifts off at midnight Eastern on Saturday,
            October 24. Five questions, one rocket, a new flight every day.
          </p>
        </div>
      </Shell>
    );
  }
  if (route.screen === "archive") return <Archive today={route.today} />;
  if (route.screen === "not-yet") {
    return (
      <Shell metaText={`Launch #${formatQuestionSetId(route.launch)}`}>
        <div className="countdown">
          <p className="countdown-days num">Still on the pad.</p>
          <p className="note">
            Launch #{formatQuestionSetId(route.launch)} hasn’t lifted off yet.{" "}
            <a href={hrefFor.today()}>Fly today’s launch</a> instead.
          </p>
        </div>
      </Shell>
    );
  }

  const screen = route.screen === "today" ? "today" : "replay";
  if (load.status === "loading") {
    return (
      <Shell metaText="Loading" screen={screen}>
        <p className="note">Loading the day’s questions…</p>
      </Shell>
    );
  }
  if (load.status === "failed") {
    return (
      <Shell metaText="Could not load" screen={screen}>
        <p className="err">{load.message}</p>
      </Shell>
    );
  }
  return (
    <Game questionSet={load.questionSet} isToday={route.screen === "today"} />
  );
}
