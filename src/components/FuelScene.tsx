import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../animation";
import { MAX_POINTS_PER_STAGE } from "../game/scoring";
import { PixelGroup } from "../pixel/Sprite";
import {
  ASTRONAUT_HEIGHT,
  ASTRONAUT_PALETTE,
  astronaut,
  COLORS,
  HOSE_HAND,
  type Mood,
  type Pose,
} from "../pixel/sprites";

/** Scene size in pixel units; the SVG scales it up with crisp edges. */
const WIDTH = 112;
const HEIGHT = 56;
const GROUND_Y = 50;
const CREW_Y = GROUND_Y - ASTRONAUT_HEIGHT;

const TANK = { x: 64, y: 14, width: 14, height: 32 };
/** The pump cart the hose runs from, and the crew member who works its lever. */
const CART = { x: 16, y: 36, width: 12 };
const NOZZLE = { x: CART.x + CART.width + 1, y: 42 };
const PUMPER_X = 1;
/** Where the hose runner starts, beside the cart, and where they stop, nozzle at the tank's valve. */
const RUNNER_START_X = CART.x + CART.width + 1;
const RUNNER_END_X = TANK.x - 1 - HOSE_HAND.x;
const VALVE = { x: TANK.x - 1, y: CREW_Y + HOSE_HAND.y };

/** How fast the crew's frames advance. */
const FRAME_MS = 110;

type Tick = { label: string; points: number; isMine: boolean };

/** Where the crew is in a reveal: running the hose over, hooking it up, fuel flowing, or done and reacting. */
export type CrewStage =
  | { stage: "run"; progress: number }
  | { stage: "hookup" }
  | { stage: "flow" }
  | { stage: "settled" };

type Props = {
  /** 0–100: how full the tank is drawn right now. */
  fillPercent: number;
  crew: CrewStage;
  /** How the crew feels once the tank settles. */
  mood: Mood;
  /** A misfire leaks smoke once it drains. */
  isSmoking: boolean;
  ticks: Tick[];
  /** The fill level shown as a number on the tank. */
  readoutPercent: number;
  isMisfire: boolean;
};

/** A frame counter for the crew's little animations; it stays at zero when motion is reduced. */
function useFrame(): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const handle = window.setInterval(() => setFrame((f) => f + 1), FRAME_MS);
    return () => clearInterval(handle);
  }, []);
  return frame;
}

/** One crew member's look on this frame: pose, sprite frame, and how high off the ground they are. */
type CrewLook = { pose: Pose; frame: number; lift: number; mood: Mood };

function reaction(mood: Mood, frame: number, offset: number): CrewLook {
  const f = frame + offset;
  switch (mood) {
    case "party":
      return { pose: "cheer", frame: f, lift: f % 2 ? 3 : 0, mood };
    case "cheer":
      return {
        pose: "cheer",
        frame: Math.floor(f / 2),
        lift: Math.floor(f / 2) % 2 ? 2 : 0,
        mood,
      };
    case "happy":
      return { pose: "stand", frame: 0, lift: Math.floor(f / 4) % 2, mood };
    case "meh":
      return {
        pose: Math.floor(f / 6) % 2 ? "shrug" : "stand",
        frame: 0,
        lift: 0,
        mood,
      };
    case "sad":
      return { pose: "slump", frame: 0, lift: -1, mood };
    default:
      return { pose: "stand", frame: 0, lift: 0, mood };
  }
}

/**
 * The reveal. One of the crew works the pump cart's lever; the other grabs
 * the hose, runs it over to the stage's tank and hooks it to the valve, and
 * the fuel the guess earned flows in, rising in whole pixel rows past gauge
 * marks for each band. Then both react: a slump for a scrub, up to jumping
 * for joy under confetti when it's docked.
 */
export function FuelScene({
  fillPercent,
  crew,
  mood,
  isSmoking,
  ticks,
  readoutPercent,
  isMisfire,
}: Props) {
  const frame = useFrame();
  const fillRows = Math.round((fillPercent / 100) * TANK.height);
  const fillTop = TANK.y + TANK.height - fillRows;
  const fuelColor = isMisfire ? COLORS.blush : COLORS.fuel;
  const fuelTop = isMisfire ? COLORS.eye : COLORS.fuelLight;
  const isFlowing = crew.stage === "flow";
  const isBlinking = (offset: number) => (frame + offset) % 34 === 0;

  // The runner: across to the tank, then holding the nozzle to the valve.
  const runnerX =
    crew.stage === "run"
      ? Math.round(
          RUNNER_START_X + (RUNNER_END_X - RUNNER_START_X) * crew.progress,
        )
      : RUNNER_END_X;
  const runner: CrewLook =
    crew.stage === "run"
      ? {
          pose: "run",
          frame,
          lift: frame % 2 ? 1 : 0,
          mood: "working",
        }
      : crew.stage === "settled"
        ? reaction(mood, frame, 0)
        : {
            pose: "hose",
            frame: 0,
            lift: isFlowing && Math.floor(frame / 3) % 2 ? 1 : 0,
            mood: "working",
          };
  // The pumper works the lever while fuel flows, and waits on the others.
  const pumper: CrewLook =
    crew.stage === "settled"
      ? reaction(mood, frame, 1)
      : isFlowing
        ? {
            pose: "pump",
            frame: Math.floor(frame / 2),
            lift: 0,
            mood: "working",
          }
        : { pose: "stand", frame: 0, lift: 0, mood: "working" };
  const isLeverDown = pumper.pose === "pump" && pumper.frame % 2 === 1;

  // The hose: out of the cart's nozzle, along the ground, up to the runner's glove.
  const handX = runnerX + HOSE_HAND.x;
  const handY = CREW_Y + HOSE_HAND.y - runner.lift;
  const hosePath =
    crew.stage === "run"
      ? `M ${NOZZLE.x} ${NOZZLE.y} V ${GROUND_Y - 1} H ${handX} V ${handY}`
      : `M ${NOZZLE.x} ${NOZZLE.y} V ${GROUND_Y - 1} H ${handX} V ${handY} H ${VALVE.x}`;

  return (
    <svg
      className={`scene mood-${mood}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`The crew fills the tank to ${readoutPercent}%.`}
    >
      {/* Ground. */}
      <rect
        x={0}
        y={GROUND_Y}
        width={WIDTH}
        height={HEIGHT - GROUND_Y}
        fill="#3B2F82"
      />
      <rect x={0} y={GROUND_Y} width={WIDTH} height={1} fill="#5A4BB0" />

      {/* Pump cart: body, fuel window, gauge, lever, wheels. */}
      <rect
        x={CART.x - 1}
        y={CART.y - 1}
        width={CART.width + 2}
        height={GROUND_Y - 2 - CART.y + 2}
        fill={COLORS.outline}
      />
      <rect
        x={CART.x}
        y={CART.y}
        width={CART.width}
        height={GROUND_Y - 3 - CART.y}
        fill={COLORS.steel}
      />
      <rect
        x={CART.x}
        y={CART.y}
        width={CART.width}
        height={1}
        fill="#B9B2D9"
      />
      <rect
        x={CART.x + 2}
        y={CART.y + 3}
        width={4}
        height={6}
        fill={COLORS.outline}
      />
      <rect
        x={CART.x + 2}
        y={CART.y + 3 + (isFlowing ? frame % 3 : 1)}
        width={4}
        height={6 - (isFlowing ? frame % 3 : 1)}
        fill={COLORS.fuel}
      />
      <rect
        x={CART.x + 8}
        y={CART.y + 3}
        width={2}
        height={2}
        fill={COLORS.gold}
      />
      <rect
        x={CART.x - 2}
        y={isLeverDown ? CART.y + 4 : CART.y - 3}
        width={3}
        height={1}
        fill={COLORS.outline}
      />
      <rect
        x={CART.x - 1}
        y={isLeverDown ? CART.y + 4 : CART.y - 3}
        width={1}
        height={isLeverDown ? 1 : 3}
        fill={COLORS.steelDark}
      />
      <rect
        x={CART.x + 1}
        y={GROUND_Y - 3}
        width={3}
        height={3}
        fill={COLORS.outline}
      />
      <rect
        x={CART.x + CART.width - 4}
        y={GROUND_Y - 3}
        width={3}
        height={3}
        fill={COLORS.outline}
      />
      <rect
        x={NOZZLE.x - 1}
        y={NOZZLE.y - 1}
        width={2}
        height={3}
        fill={COLORS.steelDark}
      />

      {/* Hose. */}
      <path d={hosePath} fill="none" stroke={COLORS.outline} strokeWidth={3} />
      <path d={hosePath} fill="none" stroke={COLORS.fuelDark} strokeWidth={1} />
      {isFlowing && (
        <path
          className="hose-flow"
          d={hosePath}
          fill="none"
          stroke={COLORS.fuelLight}
          strokeWidth={1}
          strokeDasharray="1 3"
        />
      )}

      {/* Tank: cap, outline, fuel in whole rows, gauge marks, valve. */}
      <rect
        x={TANK.x + 4}
        y={TANK.y - 3}
        width={TANK.width - 8}
        height={3}
        fill={COLORS.steelDark}
      />
      <rect
        x={TANK.x - 1}
        y={TANK.y - 1}
        width={TANK.width + 2}
        height={TANK.height + 2}
        fill={COLORS.outline}
      />
      <rect
        x={TANK.x}
        y={TANK.y}
        width={TANK.width}
        height={TANK.height}
        fill="#251C57"
      />
      {fillRows > 0 && (
        <>
          <rect
            x={TANK.x}
            y={fillTop}
            width={TANK.width}
            height={fillRows}
            fill={fuelColor}
          />
          <rect
            x={TANK.x}
            y={fillTop}
            width={TANK.width}
            height={1}
            fill={fuelTop}
          />
          {!isMisfire && fillRows > 4 && (
            <g className="bubbles">
              {[3, 8, 11].map((dx, index) => (
                <rect
                  key={dx}
                  x={TANK.x + dx}
                  y={TANK.y + TANK.height - 2 - (index % 2)}
                  width={1}
                  height={1}
                  fill={COLORS.fuelLight}
                />
              ))}
            </g>
          )}
        </>
      )}
      <rect
        x={TANK.x + 1}
        y={TANK.y + 1}
        width={1}
        height={TANK.height - 2}
        fill="rgba(255,255,255,0.18)"
      />
      <rect
        x={VALVE.x - 2}
        y={VALVE.y - 1}
        width={3}
        height={3}
        fill={COLORS.steelDark}
      />
      {crew.stage === "hookup" && (
        <g className="spark">
          <rect
            x={VALVE.x - 3}
            y={VALVE.y - 3}
            width={1}
            height={1}
            fill={COLORS.gold}
          />
          <rect
            x={VALVE.x}
            y={VALVE.y - 4}
            width={1}
            height={1}
            fill={COLORS.gold}
          />
          <rect
            x={VALVE.x + 1}
            y={VALVE.y + 2}
            width={1}
            height={1}
            fill={COLORS.gold}
          />
        </g>
      )}
      {ticks.map((tick) => {
        const y =
          TANK.y +
          TANK.height -
          Math.round((tick.points / MAX_POINTS_PER_STAGE) * TANK.height);
        return (
          <g key={tick.label} className={tick.isMine ? "tick mine" : "tick"}>
            <rect
              x={TANK.x + TANK.width + 1}
              y={y}
              width={tick.isMine ? 3 : 2}
              height={1}
              fill={tick.isMine ? COLORS.gold : COLORS.steel}
            />
            <text x={TANK.x + TANK.width + 5} y={y + 2} fontSize={4.2}>
              {tick.label}
            </text>
          </g>
        );
      })}
      <rect
        x={TANK.x + 2}
        y={TANK.y + TANK.height + 1}
        width={TANK.width - 4}
        height={GROUND_Y - (TANK.y + TANK.height + 1)}
        fill={COLORS.steelDark}
      />

      {/* The readout plate on the tank. */}
      <rect
        x={TANK.x + 2}
        y={TANK.y + 2}
        width={TANK.width - 4}
        height={7}
        fill={COLORS.outline}
      />
      <text
        className="readout"
        x={TANK.x + TANK.width / 2}
        y={TANK.y + 7.3}
        fontSize={readoutPercent >= 100 ? 4.2 : 5}
        textAnchor="middle"
      >
        {readoutPercent}%
      </text>

      {/* Smoke from a drained scrub. */}
      {isSmoking && (
        <g className="smoke-puffs">
          <rect
            x={TANK.x + 3}
            y={TANK.y - 6}
            width={3}
            height={3}
            fill={COLORS.smoke}
          />
          <rect
            x={TANK.x + 7}
            y={TANK.y - 9}
            width={4}
            height={4}
            fill={COLORS.smoke}
          />
          <rect
            x={TANK.x + 5}
            y={TANK.y - 13}
            width={2}
            height={2}
            fill={COLORS.smoke}
          />
        </g>
      )}

      {/* The crew. */}
      <PixelGroup
        grid={astronaut(pumper.mood, pumper.pose, pumper.frame, isBlinking(17))}
        palette={ASTRONAUT_PALETTE}
        x={PUMPER_X}
        y={CREW_Y - pumper.lift}
      />
      <PixelGroup
        grid={astronaut(runner.mood, runner.pose, runner.frame, isBlinking(0))}
        palette={ASTRONAUT_PALETTE}
        x={runnerX}
        y={CREW_Y - runner.lift}
      />

      {/* Confetti for a docked fill. */}
      {crew.stage === "settled" && mood === "party" && (
        <g className="confetti">
          {[6, 14, 24, 33, 42, 50, 86, 96, 104].map((x, index) => (
            <rect
              key={x}
              x={x}
              y={2 + (index % 3) * 3}
              width={1}
              height={1}
              fill={
                [COLORS.gold, COLORS.fuel, COLORS.blush, COLORS.visorShine][
                  index % 4
                ]
              }
              style={{ animationDelay: `${index * 0.11}s` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
