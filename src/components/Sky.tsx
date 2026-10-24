import { type CSSProperties, memo, useState } from "react";
import { PixelSprite } from "../pixel/Sprite";
import {
  BIRD_FRAMES,
  BIRD_PALETTE,
  BLIMP,
  cloud,
  CLOUD_LOOKS,
  CLOUD_PALETTE,
  CRITTER_PALETTE,
} from "../pixel/sprites";

/**
 * Where each cloud rests, as shares of the sky, and how slowly it drifts:
 * the far ones are paler and slower, so the sky has depth.
 */
const CLOUDS = [
  { look: 2, top: "7%", left: "8%", isFar: false, driftSeconds: 150 },
  { look: 0, top: "18%", left: "58%", isFar: false, driftSeconds: 190 },
  { look: 1, top: "4%", left: "78%", isFar: true, driftSeconds: 260 },
  { look: 1, top: "26%", left: "30%", isFar: true, driftSeconds: 300 },
  { look: 0, top: "13%", left: "-6%", isFar: true, driftSeconds: 280 },
];
const CLOUD_GRIDS = CLOUD_LOOKS.map(cloud);
const FLOCK = [
  { x: 0, y: 6 },
  { x: 9, y: 0 },
  { x: 17, y: 8 },
];

/**
 * The life in the dusk sky over the pad, placed as shares of whatever box
 * holds it: clouds drifting at two depths, a blimp far off, and now and
 * then a few birds. Each cloud's place in its drift is set from the page's
 * clock, not from when it appeared, so the sky carries on unbroken from one
 * screen to the next. Reduced motion leaves the clouds and the blimp where
 * they rest.
 */
export const SkyLife = memo(function SkyLife({
  artPixelSize,
}: {
  artPixelSize: number;
}) {
  const [pageClockAtMountSeconds] = useState(() => performance.now() / 1000);
  return (
    <>
      {CLOUDS.map((placement, index) => {
        const driftOffsetSeconds =
          (placement.driftSeconds * index) / CLOUDS.length;
        const driftDelaySeconds = -(
          (pageClockAtMountSeconds + driftOffsetSeconds) %
          placement.driftSeconds
        );
        return (
          <div
            key={index}
            className={`cloud${placement.isFar ? " far" : ""}`}
            style={
              {
                top: placement.top,
                left: placement.left,
                "--drift-seconds": `${placement.driftSeconds}s`,
                "--drift-delay": `${driftDelaySeconds}s`,
              } as CSSProperties
            }
          >
            <PixelSprite
              grid={CLOUD_GRIDS[placement.look]}
              palette={CLOUD_PALETTE}
              pixelSize={artPixelSize}
            />
          </div>
        );
      })}
      <div className="blimp">
        <PixelSprite
          grid={BLIMP}
          palette={CRITTER_PALETTE}
          pixelSize={artPixelSize}
        />
      </div>
      <div className="flock">
        {FLOCK.map((bird, index) => (
          <div
            key={index}
            className="bird"
            style={{
              left: bird.x * artPixelSize,
              top: bird.y * artPixelSize,
              animationDelay: `${index * 0.15}s`,
            }}
          >
            {BIRD_FRAMES.map((frame, frameIndex) => (
              <PixelSprite
                key={frameIndex}
                className={`bird-frame frame-${frameIndex}`}
                grid={frame}
                palette={BIRD_PALETTE}
                pixelSize={artPixelSize}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
});
