import { Component, type ErrorInfo, type ReactNode } from "react";
import { pageStorage } from "../browserStorage";
import { RUN_STORAGE_KEY } from "../game/progress";

/** Archive replays are kept under keys starting with this; see archiveRunKey. */
const ARCHIVE_RUN_KEY_PREFIX = "liftoff.archive.";

/**
 * Forgets the runs in progress, today's and any replays, so a run saved in
 * a shape the game can't draw stops crashing it. Finished launches, streaks
 * and the sound setting are kept.
 */
function forgetRunsInProgress() {
  const storage = pageStorage();
  if (!storage) return;
  try {
    const keys = Array.from({ length: storage.length }, (_, index) =>
      storage.key(index),
    );
    for (const key of keys)
      if (key === RUN_STORAGE_KEY || key?.startsWith(ARCHIVE_RUN_KEY_PREFIX))
        storage.removeItem(key);
  } catch {
    // Storage unavailable: there is nothing saved to forget.
  }
}

type State = { hasCrashed: boolean };

/**
 * The last line of defence: if drawing the game throws, a plain screen with
 * a way out replaces the blank page React would otherwise leave.
 */
export class CrashScreen extends Component<{ children: ReactNode }, State> {
  state: State = { hasCrashed: false };

  static getDerivedStateFromError(): State {
    return { hasCrashed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.hasCrashed) return this.props.children;
    return (
      <main className="crash">
        <div className="card crash-card" role="alert">
          <h1 className="crash-title">Houston, we have a problem.</h1>
          <p className="note">
            Something went wrong drawing the game. Reloading usually fixes it.
            If it keeps happening, start the run over: your streak and past
            results are kept.
          </p>
          <div className="row">
            <button
              className="fire"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                forgetRunsInProgress();
                window.location.reload();
              }}
            >
              Start the run over
            </button>
          </div>
        </div>
      </main>
    );
  }
}
