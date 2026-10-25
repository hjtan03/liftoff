import { memo, useEffect, useState } from "react";
import { prefersReducedMotion } from "../animation";
import { GROUND_Y, PAD_HEIGHT, ROCKET_FOOT } from "../pixel/padLayout";
import { ROCKET_BODY_REACH } from "../pixel/rocket";
import { PixelGroup } from "../pixel/Sprite";
import {
  COLORS,
  CRITTER_PALETTE,
  GULL_FRAMES,
  LANDSCAPE,
  spectator,
  type SpectatorLook,
  spectatorPalette,
  type SpectatorPose,
} from "../pixel/sprites";
import { LaunchSite } from "./LaunchSite";

const PLATFORM = { x: ROCKET_FOOT.x - 22, width: 45 };
const TOWER = { x: ROCKET_FOOT.x + 23, width: 14, top: -52 };
const TOWER_LEVEL_HEIGHT = 12;
/** The tower's arms reach across to the rocket's body, past its fins. */
const ARM_FROM_X = ROCKET_FOOT.x + ROCKET_BODY_REACH + 1;
const APRON = { x: 58, width: 84 };
/** The rope the crowd stands behind, and the posts that hold it. */
const ROPE_POST_XS = [4, 19, 34, 49, 64];
const ROPE_Y = GROUND_Y - 6;
/** The back row stands this much further off, so it shows over the front row's heads. */
const BACK_ROW_RISE = 3;

/** How fast the scene's frames advance. */
const FRAME_MS = 110;

/** How the crowd feels about the launch: waiting on it, dismayed at a scrub, pleased it got away, or cheering it off the pad. */
export type CrowdMood = "waiting" | "dismayed" | "pleased" | "cheering";

const SKIN = ["#FFE0BD", "#F2C9A0", "#D9A47A", "#A86E4A", "#7A4B30"];
const HAIR = {
  black: "#1E1828",
  brown: "#6B3F22",
  blond: "#E8C26A",
  ginger: "#B5512B",
  grey: "#C9C9D6",
};
const SHIRT = {
  pink: "#FF8FBF",
  mint: "#63E6A8",
  gold: "#FFD35C",
  cyan: "#5FD8F2",
  orange: "#FF8B4D",
  violet: "#9C7BEA",
  white: "#F4F0FF",
  red: "#E8435A",
};
const PANTS = { navy: "#2E2A55", denim: "#3D4F7A", plum: "#4A3A5C" };

/** The crowd behind the rope, back row first: who they are and where they stand. */
const CROWD: { look: SpectatorLook; x: number; isBackRow: boolean }[] = [
  {
    look: {
      skin: SKIN[2],
      hair: HAIR.black,
      shirt: SHIRT.cyan,
      pants: PANTS.navy,
    },
    x: 6,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[0],
      hair: HAIR.blond,
      shirt: SHIRT.violet,
      pants: PANTS.denim,
      hasLongHair: true,
    },
    x: 14,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[4],
      hair: HAIR.black,
      shirt: SHIRT.gold,
      pants: PANTS.plum,
      holds: "flag",
    },
    x: 22,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[1],
      hair: HAIR.grey,
      shirt: SHIRT.white,
      pants: PANTS.navy,
      cap: SHIRT.red,
    },
    x: 30,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[3],
      hair: HAIR.brown,
      shirt: SHIRT.mint,
      pants: PANTS.denim,
      hasLongHair: true,
    },
    x: 38,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[0],
      hair: HAIR.ginger,
      shirt: SHIRT.orange,
      pants: PANTS.navy,
    },
    x: 46,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[2],
      hair: HAIR.brown,
      shirt: SHIRT.pink,
      pants: PANTS.plum,
      holds: "camera",
    },
    x: 54,
    isBackRow: true,
  },
  {
    look: {
      skin: SKIN[1],
      hair: HAIR.brown,
      shirt: SHIRT.red,
      pants: PANTS.denim,
      hasLongHair: true,
    },
    x: 10,
    isBackRow: false,
  },
  {
    look: {
      skin: SKIN[3],
      hair: HAIR.black,
      shirt: SHIRT.gold,
      pants: PANTS.navy,
      isChild: true,
    },
    x: 18,
    isBackRow: false,
  },
  {
    look: {
      skin: SKIN[0],
      hair: HAIR.blond,
      shirt: SHIRT.cyan,
      pants: PANTS.plum,
      cap: SHIRT.violet,
    },
    x: 26,
    isBackRow: false,
  },
  {
    look: {
      skin: SKIN[4],
      hair: HAIR.black,
      shirt: SHIRT.pink,
      pants: PANTS.denim,
      isChild: true,
      hasLongHair: true,
      holds: "flag",
    },
    x: 34,
    isBackRow: false,
  },
  {
    look: {
      skin: SKIN[2],
      hair: HAIR.grey,
      shirt: SHIRT.violet,
      pants: PANTS.navy,
    },
    x: 42,
    isBackRow: false,
  },
  {
    look: {
      skin: SKIN[1],
      hair: HAIR.ginger,
      shirt: SHIRT.mint,
      pants: PANTS.plum,
      holds: "camera",
    },
    x: 50,
    isBackRow: false,
  },
  {
    look: {
      skin: SKIN[3],
      hair: HAIR.brown,
      shirt: SHIRT.white,
      pants: PANTS.denim,
      isChild: true,
    },
    x: 58,
    isBackRow: false,
  },
];
const CROWD_PALETTES = CROWD.map((person) => spectatorPalette(person.look));

type Props = {
  /** How tall the rocket standing on the platform is, for the tower's arms to reach; null once it has flown. */
  standingRocketHeight: number | null;
  mood: CrowdMood;
  /** Whether the camera can see the pad; out of sight, its little animations rest. */
  isInView: boolean;
};

/** A frame counter for the scene's little animations, advancing while isRunning; it stays put when motion is reduced. */
function useFrame(isRunning: boolean): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!isRunning || prefersReducedMotion()) return;
    const handle = window.setInterval(() => setFrame((f) => f + 1), FRAME_MS);
    return () => clearInterval(handle);
  }, [isRunning]);
  return frame;
}

/** One spectator on this frame: their pose, the frame of it, and how far off the ground they have jumped. */
function spectatorOnFrame(
  mood: CrowdMood,
  frame: number,
  index: number,
): { pose: SpectatorPose; frame: number; lift: number } {
  // Each person keeps their own time, so the crowd never moves as one.
  const ownFrame = frame + index * 7;
  switch (mood) {
    case "cheering":
      return {
        pose: CROWD[index].look.holds === "camera" ? "stand" : "cheer",
        frame: Math.floor(ownFrame / 2),
        lift: index % 3 === 0 ? 0 : ownFrame % 4 < 2 ? 2 : 0,
      };
    case "pleased":
      return index % 2
        ? { pose: "wave", frame: Math.floor(ownFrame / 3), lift: 0 }
        : { pose: "stand", frame: 0, lift: 0 };
    case "dismayed":
      return { pose: index % 3 === 1 ? "stand" : "dismay", frame: 0, lift: 0 };
    default:
      // Waiting: now and then someone waves, and the children hop.
      if (index % 5 === 2 && Math.floor(ownFrame / 30) % 5 === 0)
        return { pose: "wave", frame: Math.floor(ownFrame / 3), lift: 0 };
      return {
        pose: "stand",
        frame: 0,
        lift:
          CROWD[index].look.isChild && Math.floor(ownFrame / 4) % 9 === 0
            ? 1
            : 0,
      };
  }
}

/**
 * The launch pad at dusk, inside the launch site, drawn as a group in the
 * pad's art pixels for a scene to place: the concrete apron, the tall
 * service tower with its beacon and a gull on top, its arms reaching to the
 * rocket while it stands there, the platform the rocket stands on, and a
 * crowd behind a rope to the side of the pad that waits, cheers the rocket off, or
 * puts its hands on its head at a scrub. The rocket itself is the scene's
 * to draw, since it flies.
 */
export const PadScene = memo(function PadScene({
  standingRocketHeight,
  mood,
  isInView,
}: Props) {
  const frame = useFrame(isInView);
  const armYs =
    standingRocketHeight === null
      ? []
      : [0.22, 0.55, 0.82].map((share) =>
          Math.round(ROCKET_FOOT.y - standingRocketHeight * share),
        );
  const towerLevels = Math.floor((GROUND_Y - TOWER.top) / TOWER_LEVEL_HEIGHT);

  return (
    <g className={isInView ? undefined : "resting"}>
      <LaunchSite frame={frame} />

      {/* The concrete apron round the platform. */}
      <rect
        x={APRON.x}
        y={GROUND_Y}
        width={APRON.width}
        height={PAD_HEIGHT - GROUND_Y}
        fill={LANDSCAPE.concrete}
      />
      {Array.from({ length: APRON.width / 12 }, (_, index) => (
        <rect
          key={index}
          x={APRON.x + index * 12}
          y={GROUND_Y}
          width={1}
          height={PAD_HEIGHT - GROUND_Y}
          fill={LANDSCAPE.concreteSeam}
        />
      ))}

      {/* The service tower: rails, X-bracing between deck levels, red bands and a beacon at the top. */}
      <rect
        x={TOWER.x}
        y={TOWER.top}
        width={1}
        height={GROUND_Y - TOWER.top}
        fill={COLORS.steel}
      />
      <rect
        x={TOWER.x + TOWER.width - 1}
        y={TOWER.top}
        width={1}
        height={GROUND_Y - TOWER.top}
        fill={COLORS.steelDark}
      />
      {Array.from({ length: towerLevels }, (_, level) => {
        const y = TOWER.top + level * TOWER_LEVEL_HEIGHT;
        return (
          <g key={y}>
            <rect
              x={TOWER.x}
              y={y}
              width={TOWER.width}
              height={1}
              fill={COLORS.steelDark}
            />
            {Array.from({ length: TOWER_LEVEL_HEIGHT - 1 }, (_, step) => (
              <g key={step}>
                <rect
                  x={TOWER.x + 1 + step}
                  y={y + 1 + step}
                  width={1}
                  height={1}
                  fill={COLORS.steelDark}
                />
                <rect
                  x={TOWER.x + TOWER.width - 2 - step}
                  y={y + 1 + step}
                  width={1}
                  height={1}
                  fill={COLORS.steel}
                />
              </g>
            ))}
          </g>
        );
      })}
      {[0, 8].map((dy) => (
        <g key={dy}>
          <rect
            x={TOWER.x}
            y={TOWER.top + dy}
            width={1}
            height={4}
            fill={LANDSCAPE.stripe}
          />
          <rect
            x={TOWER.x + TOWER.width - 1}
            y={TOWER.top + dy}
            width={1}
            height={4}
            fill={LANDSCAPE.stripe}
          />
        </g>
      ))}
      <rect
        x={TOWER.x + 6}
        y={TOWER.top - 8}
        width={1}
        height={8}
        fill={COLORS.steelDark}
      />
      <rect
        className="beacon"
        x={TOWER.x + 5}
        y={TOWER.top - 10}
        width={3}
        height={2}
        fill={LANDSCAPE.stripe}
      />
      <g className="gull flapper">
        {GULL_FRAMES.map((grid, frameIndex) => (
          <PixelGroup
            key={frameIndex}
            className={`gull-frame frame-${frameIndex}`}
            grid={grid}
            palette={CRITTER_PALETTE}
            x={TOWER.x + 8}
            y={TOWER.top - grid.length}
          />
        ))}
      </g>

      {/* The arms from the tower to the rocket, while it stands there. */}
      {armYs.map((y) => (
        <g key={y}>
          <rect
            x={ARM_FROM_X}
            y={y}
            width={TOWER.x - ARM_FROM_X}
            height={3}
            fill={COLORS.steelDark}
          />
          <rect
            x={ARM_FROM_X}
            y={y}
            width={TOWER.x - ARM_FROM_X}
            height={1}
            fill={COLORS.steel}
          />
        </g>
      ))}

      {/* The launch platform: a plinth with hold-down clamps and the flame trench under the engine. */}
      <rect
        x={PLATFORM.x - 1}
        y={ROCKET_FOOT.y - 1}
        width={PLATFORM.width + 2}
        height={GROUND_Y - ROCKET_FOOT.y + 1}
        fill={COLORS.outline}
      />
      <rect
        x={PLATFORM.x}
        y={ROCKET_FOOT.y}
        width={PLATFORM.width}
        height={GROUND_Y - ROCKET_FOOT.y}
        fill={COLORS.steel}
      />
      <rect
        x={PLATFORM.x}
        y={ROCKET_FOOT.y}
        width={PLATFORM.width}
        height={1}
        fill="#B9B2D9"
      />
      <rect
        x={ROCKET_FOOT.x - 7}
        y={ROCKET_FOOT.y}
        width={15}
        height={GROUND_Y - ROCKET_FOOT.y}
        fill={COLORS.outline}
      />
      {[PLATFORM.x + 3, PLATFORM.x + PLATFORM.width - 6].map((x) => (
        <rect
          key={x}
          x={x}
          y={ROCKET_FOOT.y - 4}
          width={3}
          height={4}
          fill={COLORS.steelDark}
        />
      ))}

      {/* The crowd, back row first, behind its rope. */}
      {CROWD.map((person, index) => {
        const onFrame = spectatorOnFrame(mood, frame, index);
        const grid = spectator(person.look, onFrame.pose, onFrame.frame);
        return (
          <PixelGroup
            key={index}
            grid={grid}
            palette={CROWD_PALETTES[index]}
            x={person.x}
            y={
              GROUND_Y -
              grid.length -
              (person.isBackRow ? BACK_ROW_RISE : 0) -
              onFrame.lift
            }
          />
        );
      })}
      {ROPE_POST_XS.map((x) => (
        <rect
          key={x}
          x={x}
          y={ROPE_Y}
          width={1}
          height={GROUND_Y - ROPE_Y}
          fill={COLORS.steel}
        />
      ))}
      {ROPE_POST_XS.slice(1).map((x, index) => (
        <path
          key={x}
          d={`M ${ROPE_POST_XS[index]} ${ROPE_Y} Q ${(ROPE_POST_XS[index] + x) / 2} ${ROPE_Y + 4} ${x} ${ROPE_Y}`}
          fill="none"
          stroke={LANDSCAPE.stripe}
          strokeWidth={1}
        />
      ))}
    </g>
  );
});
