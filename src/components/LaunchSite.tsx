import { useId } from "react";
import {
  GROUND_Y,
  PAD_HEIGHT,
  SCENERY_LEFT,
  SCENERY_RIGHT,
  SCENERY_WIDTH,
} from "../pixel/padLayout";
import { PixelGroup } from "../pixel/Sprite";
import {
  COLORS,
  CRITTER_PALETTE,
  LANDSCAPE,
  planet,
  RABBIT_FRAMES,
  TANKER,
} from "../pixel/sprites";

/** The buildings of the launch site, out beyond the pad on wide screens. */
const HANGAR = { x: -124, width: 56, height: 30 };
const BUNKER = { x: -60, width: 26, height: 10 };
const FLAG_POLE_X = -24;
const WINDSOCK_X = -12;
const WATER_TOWER = { x: 206, width: 12, legHeight: 26, tankHeight: 9 };
const FUEL_SPHERE_XS = [228, 246];
const FUEL_SPHERE = planet({
  radius: 6,
  bands: [LANDSCAPE.building, LANDSCAPE.building, LANDSCAPE.buildingShade],
});
/** Floodlight masts, and where on the ground each one's light falls. */
const FLOODLIGHTS = [
  { x: -74, aimX: -20 },
  { x: 150, aimX: 96 },
  { x: 194, aimX: 150 },
];
const FLOODLIGHT_HEIGHT = 48;
/** The service road behind the pad, where a tanker passes now and then, and where along it and the field the tanker and the rabbit set off from. */
const ROAD_Y = GROUND_Y - 3;
const TANKER_START_X = -220;
const RABBIT_START_X = -40;

/** The windsock's three cloth segments, striped, and how far each sags in each of its flapping frames. */
const WINDSOCK_SEGMENTS = [
  { dx: 1, width: 3, height: 3, color: COLORS.orange },
  { dx: 4, width: 3, height: 3, color: COLORS.offWhite },
  { dx: 7, width: 2, height: 2, color: COLORS.orange },
];
const WINDSOCK_SAG_BY_FRAME = [
  [0, 0, 1],
  [0, 1, 1],
  [0, 0, 0],
];
/** The flag's stripes, and how far each column of cloth ripples down in each frame. */
const FLAG_STRIPES = [
  COLORS.orange,
  COLORS.offWhite,
  COLORS.orange,
  LANDSCAPE.stripe,
];
const FLAG_RIPPLE_BY_FRAME = [
  [0, 0, 1, 1, 1, 0, 0, 0, 1],
  [0, 1, 1, 0, 0, 0, 1, 1, 1],
  [0, 0, 0, 0, 1, 1, 1, 0, 0],
];
/** The radar dish turning: which way it faces in each frame, as its width and how far it leans. */
const RADAR_LOOKS = [
  { width: 9, lean: -2 },
  { width: 5, lean: 0 },
  { width: 9, lean: 2 },
  { width: 5, lean: 0 },
];
/** Grass blades and flowers along the edge of the field, as x positions. */
const GRASS_TUFT_XS = [
  -120, -88, -61, -40, -19, 9, 33, 52, 89, 101, 160, 186, 211, 240,
];
const FLOWERS = [
  { x: -71, color: COLORS.pink },
  { x: -29, color: COLORS.gold },
  { x: 47, color: COLORS.offWhite },
  { x: 96, color: COLORS.pink },
  { x: 172, color: COLORS.gold },
  { x: 225, color: COLORS.offWhite },
];

/** A stepped ridge across the horizon, closed down to the ground: two sine swells summed, so the hills never visibly repeat. */
function ridgePath(
  baseY: number,
  maxHeight: number,
  phase: number,
  stepWidth: number,
): string {
  let path = `M ${SCENERY_LEFT} ${GROUND_Y}`;
  for (let x = SCENERY_LEFT; x < SCENERY_RIGHT; x += stepWidth) {
    const heightShare =
      0.55 +
      0.3 * Math.sin(x * 0.029 + phase) +
      0.15 * Math.sin(x * 0.081 + phase * 2.3);
    path += ` V ${Math.round(baseY - maxHeight * heightShare)} H ${x + stepWidth}`;
  }
  return `${path} V ${GROUND_Y} Z`;
}

const MOUNTAINS = ridgePath(GROUND_Y - 14, 34, 0.7, 4);
const HILLS = ridgePath(GROUND_Y - 2, 16, 2.1, 3);
const SCRUB = ridgePath(GROUND_Y, 3, 4.2, 2);

/** A two-colour checkerboard, the dither that blends one shade into the next. */
function DitherPattern({
  id,
  base,
  speck,
}: {
  id: string;
  base: string;
  speck: string;
}) {
  return (
    <pattern id={id} width={2} height={2} patternUnits="userSpaceOnUse">
      <rect width={2} height={2} fill={base} />
      <rect width={1} height={1} fill={speck} />
      <rect x={1} y={1} width={1} height={1} fill={speck} />
    </pattern>
  );
}

/**
 * The launch site around the pad at dusk, in the pad's art pixels: hazy
 * violet mountains, dark hills, the hangar and the control bunker with
 * their windows lit and the radar turning, the flag and the windsock, the
 * water tower and fuel spheres, floodlights throwing their light on the
 * ground, the service road a tanker drives along now and then, and the
 * field a rabbit hops through. frame is the pad's animation frame, for the
 * cloth and the radar.
 */
export function LaunchSite({ frame }: { frame: number }) {
  // React's ids carry punctuation that an SVG url() reference can't hold.
  const idPrefix = `site-${useId().replace(/\W/g, "")}`;
  const mistId = `${idPrefix}-mist`;
  const hillShadeId = `${idPrefix}-hill-shade`;
  const grassShadeId = `${idPrefix}-grass-shade`;
  const windsockSag = WINDSOCK_SAG_BY_FRAME[Math.floor(frame / 5) % 3];
  const flagRipple = FLAG_RIPPLE_BY_FRAME[Math.floor(frame / 4) % 3];
  const radar = RADAR_LOOKS[Math.floor(frame / 6) % RADAR_LOOKS.length];

  return (
    <g>
      {/* Mountains with mist at their feet, then the hills, shaded toward the ground. */}
      <defs>
        <DitherPattern
          id={mistId}
          base={LANDSCAPE.mountainFar}
          speck={LANDSCAPE.skyHorizon}
        />
        <DitherPattern
          id={hillShadeId}
          base={LANDSCAPE.hillMid}
          speck={LANDSCAPE.hillMidDark}
        />
        <DitherPattern
          id={grassShadeId}
          base={LANDSCAPE.grass}
          speck={LANDSCAPE.grassDark}
        />
      </defs>
      <path d={MOUNTAINS} fill={LANDSCAPE.mountainFarLight} />
      <path
        d={MOUNTAINS}
        transform="translate(0 2)"
        fill={LANDSCAPE.mountainFar}
      />
      <rect
        x={SCENERY_LEFT}
        y={GROUND_Y - 20}
        width={SCENERY_WIDTH}
        height={6}
        fill={`url(#${mistId})`}
      />
      <path d={HILLS} fill={LANDSCAPE.hillMidLight} />
      <path d={HILLS} transform="translate(0 1)" fill={LANDSCAPE.hillMid} />
      <rect
        x={SCENERY_LEFT}
        y={GROUND_Y - 6}
        width={SCENERY_WIDTH}
        height={6}
        fill={`url(#${hillShadeId})`}
      />

      {/* The hangar: a row of windows, a striped fascia, and the big door in panels. */}
      <rect
        x={HANGAR.x}
        y={GROUND_Y - HANGAR.height}
        width={HANGAR.width}
        height={HANGAR.height}
        fill={LANDSCAPE.building}
      />
      <rect
        x={HANGAR.x - 1}
        y={GROUND_Y - HANGAR.height - 2}
        width={HANGAR.width + 2}
        height={2}
        fill={LANDSCAPE.buildingShade}
      />
      <rect
        x={HANGAR.x + HANGAR.width - 5}
        y={GROUND_Y - HANGAR.height}
        width={5}
        height={HANGAR.height}
        fill={LANDSCAPE.buildingShade}
      />
      <rect
        x={HANGAR.x}
        y={GROUND_Y - HANGAR.height + 3}
        width={HANGAR.width - 5}
        height={2}
        fill={LANDSCAPE.stripe}
      />
      {Array.from({ length: 5 }, (_, index) => (
        <rect
          key={index}
          x={HANGAR.x + 40 + (index % 2) * 5}
          y={GROUND_Y - HANGAR.height + 8 + Math.floor(index / 2) * 6}
          width={3}
          height={3}
          fill={LANDSCAPE.litWindow}
        />
      ))}
      <rect
        x={HANGAR.x + 8}
        y={GROUND_Y - HANGAR.height + 9}
        width={28}
        height={HANGAR.height - 9}
        fill={LANDSCAPE.buildingShade}
      />
      {Array.from({ length: 6 }, (_, index) => (
        <rect
          key={index}
          x={HANGAR.x + 8}
          y={GROUND_Y - HANGAR.height + 11 + index * 3}
          width={28}
          height={1}
          fill={COLORS.steel}
        />
      ))}

      {/* The control bunker, its console lights blinking, the radar turning on its mast. */}
      <rect
        x={BUNKER.x}
        y={GROUND_Y - BUNKER.height}
        width={BUNKER.width}
        height={BUNKER.height}
        fill={LANDSCAPE.concrete}
      />
      <rect
        x={BUNKER.x - 1}
        y={GROUND_Y - BUNKER.height - 1}
        width={BUNKER.width + 2}
        height={2}
        fill={LANDSCAPE.concreteSeam}
      />
      <rect
        x={BUNKER.x + 4}
        y={GROUND_Y - BUNKER.height + 3}
        width={14}
        height={3}
        fill={COLORS.outline}
      />
      <rect
        x={BUNKER.x + 4}
        y={GROUND_Y - BUNKER.height + 5}
        width={14}
        height={1}
        fill={LANDSCAPE.litWindow}
        opacity={0.5}
      />
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={index}
          className={`console-light light-${index}`}
          x={BUNKER.x + 5 + index * 3}
          y={GROUND_Y - BUNKER.height + 4}
          width={1}
          height={1}
          fill={[COLORS.fuel, COLORS.gold, "#E8505B", COLORS.glass][index]}
        />
      ))}
      <rect
        x={BUNKER.x + 20}
        y={GROUND_Y - BUNKER.height - 9}
        width={1}
        height={9}
        fill={COLORS.steelDark}
      />
      <rect
        x={BUNKER.x + 20 - Math.floor(radar.width / 2) + radar.lean}
        y={GROUND_Y - BUNKER.height - 12}
        width={radar.width}
        height={2}
        fill={LANDSCAPE.building}
      />
      <rect
        x={BUNKER.x + 20 - Math.floor(radar.width / 2) + radar.lean}
        y={GROUND_Y - BUNKER.height - 10}
        width={radar.width}
        height={1}
        fill={LANDSCAPE.buildingShade}
      />

      {/* The mission flag, rippling on its pole. */}
      <rect
        x={FLAG_POLE_X}
        y={GROUND_Y - 24}
        width={1}
        height={24}
        fill={COLORS.steelDark}
      />
      <rect
        x={FLAG_POLE_X - 1}
        y={GROUND_Y - 25}
        width={3}
        height={1}
        fill={COLORS.gold}
      />
      {flagRipple.map((ripple, column) =>
        FLAG_STRIPES.map((color, stripe) => (
          <rect
            key={`${column}-${stripe}`}
            x={FLAG_POLE_X + 1 + column}
            y={GROUND_Y - 24 + stripe + ripple}
            width={1}
            height={1}
            fill={color}
          />
        )),
      )}

      {/* The water tower on its legs. */}
      {[0, WATER_TOWER.width - 2].map((dx) => (
        <rect
          key={dx}
          x={WATER_TOWER.x + 1 + dx}
          y={GROUND_Y - WATER_TOWER.legHeight}
          width={1}
          height={WATER_TOWER.legHeight}
          fill={COLORS.steelDark}
        />
      ))}
      {[6, 14, 20].map((dy) => (
        <rect
          key={dy}
          x={WATER_TOWER.x + 2}
          y={GROUND_Y - WATER_TOWER.legHeight + dy}
          width={WATER_TOWER.width - 4}
          height={1}
          fill={COLORS.steelDark}
        />
      ))}
      <rect
        x={WATER_TOWER.x}
        y={GROUND_Y - WATER_TOWER.legHeight - WATER_TOWER.tankHeight}
        width={WATER_TOWER.width}
        height={WATER_TOWER.tankHeight}
        fill={LANDSCAPE.building}
      />
      <rect
        x={WATER_TOWER.x + WATER_TOWER.width - 3}
        y={GROUND_Y - WATER_TOWER.legHeight - WATER_TOWER.tankHeight}
        width={3}
        height={WATER_TOWER.tankHeight}
        fill={LANDSCAPE.buildingShade}
      />
      <rect
        x={WATER_TOWER.x + 2}
        y={GROUND_Y - WATER_TOWER.legHeight - WATER_TOWER.tankHeight - 2}
        width={WATER_TOWER.width - 4}
        height={2}
        fill={LANDSCAPE.stripe}
      />

      {/* Fuel spheres on their legs. */}
      {FUEL_SPHERE_XS.map((x) => (
        <g key={x}>
          {[3, 9].map((dx) => (
            <rect
              key={dx}
              x={x + dx}
              y={GROUND_Y - 6}
              width={1}
              height={6}
              fill={COLORS.steelDark}
            />
          ))}
          <PixelGroup
            grid={FUEL_SPHERE.grid}
            palette={FUEL_SPHERE.palette}
            x={x}
            y={GROUND_Y - 18}
          />
        </g>
      ))}

      {/* Floodlight masts, their lamps lit and their light falling across the ground. */}
      {FLOODLIGHTS.map(({ x, aimX }) => (
        <g key={x}>
          <polygon
            points={`${x},${GROUND_Y - FLOODLIGHT_HEIGHT} ${aimX - 22},${GROUND_Y} ${aimX + 22},${GROUND_Y}`}
            fill={LANDSCAPE.lamp}
            opacity={0.1}
          />
          <rect
            x={x}
            y={GROUND_Y - FLOODLIGHT_HEIGHT}
            width={1}
            height={FLOODLIGHT_HEIGHT}
            fill={COLORS.steelDark}
          />
          <rect
            x={x - 2}
            y={GROUND_Y - FLOODLIGHT_HEIGHT - 2}
            width={5}
            height={2}
            fill={COLORS.steel}
          />
          <rect
            x={x - 1}
            y={GROUND_Y - FLOODLIGHT_HEIGHT}
            width={3}
            height={1}
            fill={LANDSCAPE.lamp}
          />
        </g>
      ))}

      {/* The service road, and the tanker that drives along it now and then. */}
      <rect
        x={SCENERY_LEFT}
        y={ROAD_Y}
        width={SCENERY_WIDTH}
        height={3}
        fill={LANDSCAPE.concreteSeam}
      />
      <g className="tanker">
        <PixelGroup
          grid={TANKER}
          palette={CRITTER_PALETTE}
          x={TANKER_START_X}
          y={ROAD_Y - TANKER.length + 2}
        />
      </g>

      {/* Scrub along the edge of the field, then the grass, shaded toward the soil. */}
      <path d={SCRUB} fill={LANDSCAPE.scrubLight} />
      <path d={SCRUB} transform="translate(0 1)" fill={LANDSCAPE.scrub} />
      <rect
        x={SCENERY_LEFT}
        y={GROUND_Y}
        width={SCENERY_WIDTH}
        height={PAD_HEIGHT - GROUND_Y}
        fill={LANDSCAPE.grass}
      />
      <rect
        x={SCENERY_LEFT}
        y={GROUND_Y}
        width={SCENERY_WIDTH}
        height={1}
        fill={LANDSCAPE.grassLight}
      />
      <rect
        x={SCENERY_LEFT}
        y={PAD_HEIGHT - 2}
        width={SCENERY_WIDTH}
        height={2}
        fill={`url(#${grassShadeId})`}
      />
      {GRASS_TUFT_XS.map((x, index) => (
        <g key={x}>
          <rect
            x={x}
            y={GROUND_Y - 2}
            width={1}
            height={2}
            fill={LANDSCAPE.grassDark}
          />
          <rect
            x={x + 1}
            y={GROUND_Y - 1 - (index % 2)}
            width={1}
            height={1 + (index % 2)}
            fill={LANDSCAPE.grassLight}
          />
        </g>
      ))}
      {FLOWERS.map((flower) => (
        <rect
          key={flower.x}
          x={flower.x}
          y={GROUND_Y - 2}
          width={1}
          height={1}
          fill={flower.color}
        />
      ))}

      {/* The windsock, flapping on its pole. */}
      <rect
        x={WINDSOCK_X}
        y={GROUND_Y - 20}
        width={1}
        height={20}
        fill={COLORS.steelDark}
      />
      {WINDSOCK_SEGMENTS.map((segment, index) => (
        <rect
          key={index}
          x={WINDSOCK_X + segment.dx}
          y={GROUND_Y - 20 + windsockSag[index]}
          width={segment.width}
          height={segment.height}
          fill={segment.color}
        />
      ))}

      {/* A rabbit that hops across the field now and then. */}
      <g className="rabbit">
        {RABBIT_FRAMES.map((grid, index) => (
          <PixelGroup
            key={index}
            className={`rabbit-frame frame-${index}`}
            grid={grid}
            palette={CRITTER_PALETTE}
            x={RABBIT_START_X}
            y={GROUND_Y - grid.length}
          />
        ))}
      </g>
    </g>
  );
}
