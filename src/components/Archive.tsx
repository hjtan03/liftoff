import { useState } from "react";
import { readStorage } from "../browserStorage";
import { formatNumber } from "../game/numbers";
import {
  archiveRunKey,
  HISTORY_STORAGE_KEY,
  parseHistory,
  summarizeSavedRun,
} from "../game/progress";
import { formatQuestionSetId, launchDateLabel } from "../questions/schedule";
import { hrefFor } from "../route";
import { BrandLink, IdlePadScreen, Shell } from "./Shell";

type Props = { today: number };

/** Every launch before today, newest first, with how this player did on the day or in a replay. */
export function Archive({ today }: Props) {
  const [rows] = useState(() => {
    const history = parseHistory(readStorage(HISTORY_STORAGE_KEY));
    return Array.from({ length: today - 1 }, (_, index) => {
      const launch = today - 1 - index;
      const id = formatQuestionSetId(launch);
      return {
        launch,
        id,
        date: launchDateLabel(launch),
        onTheDay: history[id] ?? null,
        replay: summarizeSavedRun(readStorage(archiveRunKey(id))),
      };
    });
  });

  return (
    <Shell readout={<BrandLink />} status="Archive" screen="archive">
      <IdlePadScreen>
        <section className="card archive">
          <h1 className="archive-title">Past launches</h1>
          <p className="note">
            Fly any launch you missed. Replays don’t count toward your streak.
          </p>
          {rows.length === 0 ? (
            <p className="note">
              The archive opens tomorrow, after the first launch.
            </p>
          ) : (
            <ol className="archive-list">
              {rows.map((row) => {
                const result = row.onTheDay ?? row.replay;
                const status = row.onTheDay
                  ? "Flown on the day"
                  : row.replay?.isFinished
                    ? "Replayed"
                    : row.replay
                      ? "In progress"
                      : "Not flown yet";
                return (
                  <li key={row.launch}>
                    <a
                      className="archive-row"
                      href={hrefFor.launch(row.launch)}
                    >
                      <span className="archive-id num">#{row.id}</span>
                      <span className="archive-date">{row.date}</span>
                      <span className="archive-result">
                        {result ? (
                          <>
                            <span className="archive-grid">{result.grid}</span>{" "}
                            <span className="num">
                              {formatNumber(result.points)}
                            </span>
                          </>
                        ) : null}
                        <span className="archive-status">{status}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </IdlePadScreen>
    </Shell>
  );
}
