import type { ReactNode } from "react";
import { GAME_NAME } from "../brand";
import { PixelSprite } from "../pixel/Sprite";
import { ROCKET, ROCKET_PALETTE } from "../pixel/sprites";
import { launchNumberAt } from "../questions/schedule";
import { hrefFor } from "../route";
import { setMuted, useMuted } from "../sound";

type Props = {
  metaText: string;
  /** Which screen this is, so the bar links to the others: today's launch, a replay, the archive, or neither. */
  screen?: "today" | "replay" | "archive" | "other";
  children: ReactNode;
};

/** The page frame every screen shares: the name, the launch status, the way to the archive, the sound switch, then the content. */
export function Shell({ metaText, screen = "other", children }: Props) {
  const muted = useMuted();
  // The archive opens on day 2, once there is a past launch to fly.
  const hasArchive = launchNumberAt(new Date()) >= 2;
  return (
    <div className="wrap">
      <header className="bar">
        <a className="brand" href={hrefFor.today()}>
          <PixelSprite
            className="brand-rocket"
            grid={ROCKET.slice(0, 17)}
            palette={ROCKET_PALETTE}
            pixelSize={2}
          />
          {GAME_NAME}
        </a>
        <div className="bar-right">
          <span className="meta">{metaText}</span>
          {hasArchive && screen !== "archive" && (
            <a className="bar-link" href={hrefFor.archive()}>
              Archive
            </a>
          )}
          {screen === "archive" || screen === "replay" ? (
            <a className="bar-link" href={hrefFor.today()}>
              Today
            </a>
          ) : null}
          <button
            type="button"
            className="sound-toggle"
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
