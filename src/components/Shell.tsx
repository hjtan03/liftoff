import type { ReactNode } from "react";
import { GAME_NAME } from "../brand";
import { PixelSprite } from "../pixel/Sprite";
import { ROCKET, ROCKET_PALETTE } from "../pixel/sprites";
import { setMuted, useMuted } from "../sound";

type Props = { metaText: string; children: ReactNode };

/** The page frame every screen shares: the name, the launch status, the sound switch, then the content. */
export function Shell({ metaText, children }: Props) {
  const muted = useMuted();
  return (
    <div className="wrap">
      <header className="bar">
        <div className="brand">
          <PixelSprite
            className="brand-rocket"
            grid={ROCKET.slice(0, 17)}
            palette={ROCKET_PALETTE}
            pixelSize={2}
          />
          {GAME_NAME}
        </div>
        <div className="bar-right">
          <span className="meta">{metaText}</span>
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
