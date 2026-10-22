import { MAX_POINTS_PER_STAGE } from "../game/scoring";
import { PixelGroup } from "../pixel/Sprite";
import {
  ASTRONAUT_PALETTE,
  astronaut,
  COLORS,
  type Mood,
} from "../pixel/sprites";

/** Scene size in pixel units; the SVG scales it up with crisp edges. */
const WIDTH = 84;
const HEIGHT = 52;
const GROUND_Y = 46;

const TANK = { x: 46, y: 12, width: 14, height: 32 };

type Tick = { label: string; points: number; isMine: boolean };

type Props = {
  /** 0–100: how full the tank is drawn right now. */
  fillPercent: number;
  /** Whether fuel is flowing through the hose. */
  isFlowing: boolean;
  /** How the crew feels: they work while it fills, then react to the result. */
  mood: Mood;
  /** A misfire leaks smoke once it drains. */
  isSmoking: boolean;
  ticks: Tick[];
  /** The fill level shown as a number on the tank. */
  readoutPercent: number;
  isMisfire: boolean;
};

/**
 * The reveal: two of the crew run a hose to the stage's tank and fill it with
 * the fuel the guess earned. The fill rises in whole pixel rows; the gauge
 * marks show where each confidence band would have filled to; and the crew's
 * mood follows the result, from a slumped misfire to a party for dead on.
 */
export function FuelScene({
  fillPercent,
  isFlowing,
  mood,
  isSmoking,
  ticks,
  readoutPercent,
  isMisfire,
}: Props) {
  const fillRows = Math.round((fillPercent / 100) * TANK.height);
  const fillTop = TANK.y + TANK.height - fillRows;
  const fuelColor = isMisfire ? COLORS.blush : COLORS.fuel;
  const fuelTop = isMisfire ? COLORS.eye : COLORS.fuelLight;
  const hosePath = `M 31 38 H 38 V 5 H 53 V ${TANK.y - 3}`;

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

      {/* Hose from the crew member's hands up and over into the tank's inlet. */}
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

      {/* Tank: cap, outline, fuel in whole rows, gauge marks. */}
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
              <rect
                x={TANK.x + 3}
                y={TANK.y + TANK.height - 2}
                width={1}
                height={1}
                fill={COLORS.fuelLight}
              />
              <rect
                x={TANK.x + 8}
                y={TANK.y + TANK.height - 3}
                width={1}
                height={1}
                fill={COLORS.fuelLight}
              />
              <rect
                x={TANK.x + 11}
                y={TANK.y + TANK.height - 2}
                width={1}
                height={1}
                fill={COLORS.fuelLight}
              />
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

      {/* Smoke from a drained misfire. */}
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

      {/* The crew: one watches the gauge, one works the hose. */}
      <PixelGroup
        className="crew crew-1"
        grid={astronaut(mood)}
        palette={ASTRONAUT_PALETTE}
        x={2}
        y={GROUND_Y - 16}
      />
      <PixelGroup
        className="crew crew-2"
        grid={astronaut(mood, true)}
        palette={ASTRONAUT_PALETTE}
        x={18}
        y={GROUND_Y - 16}
      />

      {/* Confetti for a dead-on fill. */}
      {mood === "party" && (
        <g className="confetti">
          {[6, 14, 24, 33, 40, 66, 74, 80].map((x, index) => (
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
