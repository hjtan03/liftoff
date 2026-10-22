import { type CSSProperties, useEffect, useRef, useState } from "react";
import { prefersReducedMotion, tween } from "../animation";
import { STOPS } from "../game/journey";
import { PixelSprite } from "../pixel/Sprite";
import { planet, PLANET_LOOKS, ROCKET, ROCKET_PALETTE } from "../pixel/sprites";
import { sfx } from "../sound";

/** The world the camera flies through, in CSS pixels: one stop every SPACING, bottom to top. */
const SPACING = 240;
const PAD_BOTTOM = 70;
const PAD_TOP = 260;
const WORLD_HEIGHT = PAD_BOTTOM + (STOPS.length - 1) * SPACING + PAD_TOP;
/** Where the camera holds the rocket, as a share of the view's height from the bottom. */
const ROCKET_IN_VIEW = 0.38;

/** The flight's beats, in milliseconds. */
const IGNITION_MS = 800;
const CLIMB_MS = 4600;
const HOLD_MS = 450;
const ZOOM_MS = 1500;
const TOTAL_MS = IGNITION_MS + CLIMB_MS + HOLD_MS + ZOOM_MS;

/** Where the flight is, from engines lighting on the pad to the camera pulled all the way back. */
export type FlightPhase = "ignition" | "climb" | "arrived" | "zoomed";

type Props = {
  /** How far the fuel carries the rocket: 0 at the pad, STOPS.length − 1 at Neptune. */
  finalPosition: number;
  destinationName: string;
  onPhase: (phase: FlightPhase) => void;
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
const stopY = (position: number) => PAD_BOTTOM + position * SPACING;

/** The rocket's flame in two flickers, swapped every few frames while the engine burns. */
const FLAMES = [
  ["....FffF.....", ".....FfF.....", ".....FF......", "......F......"],
  ["....fFFf.....", "....FfF......", "......Ff.....", ".....F......."],
];

/**
 * The launch, filmed: the camera rides along as the rocket climbs past the
 * Moon and the planets it reaches, then pulls back until the whole route,
 * pad to Neptune, fits the frame, with the trail showing how far it got.
 */
export function Flight({ finalPosition, destinationName, onPhase }: Props) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [viewHeight, setViewHeight] = useState(420);
  // With reduced motion the flight is already over: the route, zoomed out.
  const [elapsed, setElapsed] = useState(() =>
    prefersReducedMotion() ? TOTAL_MS : 0,
  );

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const measure = () => setViewHeight(view.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      onPhase("zoomed");
      return;
    }
    sfx.launch();
    let stopsPassed = 0;
    let lastPhase: FlightPhase | null = null;
    return tween(TOTAL_MS, (progress) => {
      const now = progress * TOTAL_MS;
      setElapsed(now);
      const phase = phaseAt(now);
      if (phase !== lastPhase) {
        lastPhase = phase;
        onPhase(phase);
      }
      const position = rocketPositionAt(now, finalPosition);
      while (stopsPassed < Math.floor(position + 1e-9)) {
        stopsPassed += 1;
        sfx.passStop(stopsPassed);
      }
    });
    // onPhase is a notification; restarting the flight when it changes would replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalPosition]);

  const phase = phaseAt(elapsed);
  const position = rocketPositionAt(elapsed, finalPosition);
  const rocketY = stopY(position);
  const isBurning = phase === "ignition" || phase === "climb";
  const shake =
    phase === "ignition" ? (Math.floor(elapsed / 60) % 2) * 2 - 1 : 0;

  // The camera follows the rocket, then pulls back to fit the whole world.
  const follow = clamp(
    rocketY - viewHeight * ROCKET_IN_VIEW,
    0,
    WORLD_HEIGHT - viewHeight,
  );
  const zoom =
    phase === "zoomed"
      ? easeInOutCubic(
          clamp((elapsed - IGNITION_MS - CLIMB_MS - HOLD_MS) / ZOOM_MS, 0, 1),
        )
      : 0;
  const fitScale = viewHeight / WORLD_HEIGHT;
  const scale = 1 + (fitScale - 1) * zoom;
  const offset = follow * (1 - zoom);
  const flame = FLAMES[Math.floor(elapsed / 90) % 2];
  const reached = Math.floor(position + 1e-9);

  return (
    <div
      ref={viewRef}
      className={`flight${isBurning ? " burning" : ""}${phase === "zoomed" ? " zoomed" : ""}`}
      style={{ "--cam": `${offset}px` } as CSSProperties}
      role="img"
      aria-label={`The rocket's flight from the launch pad toward Neptune. It reached ${destinationName}.`}
    >
      <div
        className="flight-world"
        style={{
          height: WORLD_HEIGHT,
          transform: `translateY(${offset}px) scale(${scale})`,
        }}
      >
        <div className="flight-ground" style={{ height: PAD_BOTTOM }} />
        <div
          className="flight-trail"
          style={{
            bottom: PAD_BOTTOM + 30,
            height: Math.max(0, rocketY - PAD_BOTTOM - 30),
          }}
        />
        {STOPS.map((stop, index) => {
          const look = PLANET_LOOKS[stop.name];
          const art = look ? planet(look) : null;
          const side = index % 2 === 0 ? "left" : "right";
          const state =
            index === reached && phase !== "climb" && phase !== "ignition"
              ? " here"
              : index <= reached
                ? " passed"
                : "";
          return (
            <div
              key={stop.name}
              className={`flight-stop ${side}${state}${index === 0 ? " pad" : ""}${index === 1 ? " orbit" : ""}`}
              style={{ bottom: index === 0 ? stopY(0) + 8 : stopY(index) }}
            >
              {art ? (
                <PixelSprite
                  grid={art.grid}
                  palette={art.palette}
                  pixelSize={6}
                />
              ) : null}
              <span className="flight-name">{stop.name}</span>
            </div>
          );
        })}
        <div
          className="flight-rocket"
          style={{
            bottom: rocketY,
            transform: `translateX(calc(-50% + ${shake}px))`,
          }}
        >
          <PixelSprite
            grid={
              isBurning
                ? [...ROCKET.slice(0, 18), ...flame]
                : ROCKET.slice(0, 18)
            }
            palette={ROCKET_PALETTE}
            pixelSize={4}
          />
        </div>
      </div>
    </div>
  );
}

function phaseAt(elapsed: number): FlightPhase {
  if (elapsed < IGNITION_MS) return "ignition";
  if (elapsed < IGNITION_MS + CLIMB_MS) return "climb";
  if (elapsed < IGNITION_MS + CLIMB_MS + HOLD_MS) return "arrived";
  return "zoomed";
}

function rocketPositionAt(elapsed: number, finalPosition: number): number {
  const climb = clamp((elapsed - IGNITION_MS) / CLIMB_MS, 0, 1);
  return finalPosition * easeInOutCubic(climb);
}
