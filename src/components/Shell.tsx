import type { ReactNode } from "react";
import { GAME_NAME } from "../brand";
import { PixelSprite } from "../pixel/Sprite";
import {
  ROCKET,
  ROCKET_PALETTE,
  SPEAKER_OFF,
  SPEAKER_ON,
  SPEAKER_PALETTE,
} from "../pixel/sprites";
import { launchNumberAt } from "../questions/schedule";
import { hrefFor } from "../route";
import { setMuted, useMuted } from "../sound";
import { MissionScene } from "./MissionScene";

/** The rocket waiting on the pad between launches stands ready for a launch's five questions. */
const IDLE_ROCKET_STAGES = 5;

type Props = {
  /** The top-left box: the fuel banked during a launch, the game's name everywhere else. */
  readout: ReactNode;
  /** The top-centre box: where the launch has got to, or which screen this is. */
  status: ReactNode;
  /** Which screen this is, so the bar links to the others: today's launch, a replay, the archive, or neither. */
  screen?: "today" | "replay" | "archive" | "other";
  /** The scene behind everything: a launch in play, or else the rocket waiting on the pad. */
  scene?: ReactNode;
  children: ReactNode;
};

/**
 * The frame every screen shares: the launch scene filling the window, a
 * heads-up bar across the top (readout, status, the way to the archive, the
 * sound switch), and under it the screen's own panels.
 */
export function Shell({
  readout,
  status,
  screen = "other",
  scene = (
    <MissionScene
      position={0}
      stagesLeft={IDLE_ROCKET_STAGES}
      burn={null}
      pullBack={null}
      showsRoute={false}
    />
  ),
  children,
}: Props) {
  const muted = useMuted();
  // The archive opens on day 2, once there is a past launch to fly.
  const hasArchive = launchNumberAt(new Date()) >= 2;
  return (
    <div className="frame">
      {scene}
      <header className="hud">
        <div className="hud-box hud-readout">{readout}</div>
        <div className="hud-box hud-status">{status}</div>
        <nav className="hud-controls">
          {hasArchive && screen !== "archive" && (
            <a className="hud-box hud-link" href={hrefFor.archive()}>
              Archive
            </a>
          )}
          {screen === "archive" || screen === "replay" ? (
            <a className="hud-box hud-link" href={hrefFor.today()}>
              Today
            </a>
          ) : null}
          <button
            type="button"
            className="hud-box sound-toggle"
            aria-label="Sound"
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            <PixelSprite
              grid={muted ? SPEAKER_OFF : SPEAKER_ON}
              palette={SPEAKER_PALETTE}
              pixelSize={2}
            />
          </button>
        </nav>
      </header>
      <main className="stage">{children}</main>
    </div>
  );
}

/** The game's name with its little rocket, linking to today's launch. */
export function BrandLink() {
  return (
    <a className="brand" href={hrefFor.today()}>
      <PixelSprite
        className="brand-rocket"
        grid={ROCKET}
        palette={ROCKET_PALETTE}
        pixelSize={2}
      />
      {GAME_NAME}
    </a>
  );
}

/** A screen between launches: a card over the sky, the rocket waiting on the pad behind it, and the soil band below. */
export function IdlePadScreen({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="sky-area">
        <div className="overlay-area">{children}</div>
      </div>
      <div className="ground" />
    </>
  );
}
