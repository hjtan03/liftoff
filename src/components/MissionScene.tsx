import {
  type CSSProperties,
  memo,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { prefersReducedMotion, tween } from "../animation";
import { stopIndexAt, STOPS } from "../game/journey";
import {
  type ArcPoint,
  arcPointAt,
  arcPointsBetween,
  STOP_SPACING,
} from "../pixel/arc";
import { PAD_HEIGHT, PAD_WIDTH, ROCKET_FOOT } from "../pixel/padLayout";
import {
  ROCKET_CENTER_X,
  ROCKET_WIDTH,
  rocketHeight,
  rocketRects,
  SPENT_STAGE_HEIGHT,
  spentStageRects,
  STAGE_HEIGHT,
} from "../pixel/rocket";
import { paintSky, positiveModulo, starChanceAt } from "../pixel/sky";
import { PixelGroup, PixelSprite } from "../pixel/Sprite";
import {
  cloud,
  CLOUD_LOOKS,
  CLOUD_PALETTE,
  FLAME_FRAMES,
  FLAME_PALETTE,
  gridRects,
  IDLE_FLAME_FRAMES,
  type Palette,
  type Rect,
  planet,
  PLANET_LOOKS,
  PLUME,
  SMOKE_PALETTE,
  smokePuff,
  SOOT_PALETTE,
  SPARKLE,
  SPARKLE_PALETTE,
  type SpriteGrid,
} from "../pixel/sprites";
import { sfx } from "../sound";
import { type CrowdMood, PadScene } from "./PadScene";
import { SkyLife } from "./Sky";

/** A hit's burn, in milliseconds: the engine lights, the rocket travels for longer the further it goes, the spent stage drops away, and the result comes up. Off the pad, the engine burns in the smoke a while before the rocket moves. */
const IGNITION_MS = 350;
const LIFTOFF_IGNITION_MS = 1400;
const TRAVEL_MS = { base: 1300, perStop: 900, longest: 3000 };
const CUTOFF_MS = 350;
const SEPARATION_TO_RESULT_MS = 450;
/** Once the stage drops, the shorter rocket's foot is a stage further on; the camera glides there over this long rather than jumping. */
const CAMERA_SETTLE_MS = 450;
const DEBRIS_LIFE_MS = 1600;
/** A scrub: the engine coughs, the rocket lurches NUDGE art pixels along its heading, the scorched stage drops at the top of the lurch, and what is left sinks back. */
const SPUTTER_MS = 1000;
const SPUTTER_SEPARATION_MS = 450;
const NUDGE = 16;
/** A spent stage falling away, in art pixels a millisecond: back along the route, off to one side, turning over, and pulled down. */
const DEBRIS = {
  fallBackSpeed: 0.06,
  driftSpeed: 0.024,
  spinDegreesPerMs: 0.15,
  gravity: 0.0001,
};
/** Liftoff's white flash and how long the camera shakes. */
const FLASH_MS = 280;
const SHAKE_MS = 1800;
/**
 * The smoke bank at liftoff: puffs roll out from the flame trench both ways
 * along the ground and pile up into a bank the rocket climbs out of, lit
 * pink near the engine, then drift apart. Its reach and height are in art
 * pixels.
 */
const SMOKE = {
  puffCount: 110,
  rollOutMs: 1500,
  reach: 600,
  height: 200,
  smallestRadius: 12,
  largestRadius: 30,
  lifeMs: 6500,
  fadeMs: 2400,
  /** How quickly each puff rolls out to its place, climbs, and swells, as the time it takes to get most of the way; and how it keeps drifting up after. */
  rollMs: 450,
  climbMs: 900,
  swellMs: 600,
  driftPerMs: 0.003,
};
/** The engine's pink light on the smoke: how far it reaches across the bank, and how high the rocket climbs before it no longer lights it, in art pixels. */
const ENGINE_LIGHT = {
  rgb: "255, 150, 210",
  reach: 220,
  fadedByAltitude: 400,
};
/**
 * Liftoff's camera: on the pad it holds still while the rocket climbs out
 * of the smoke, until its nose comes within TOP_MARGIN screen pixels of
 * the top of the window, where the heads-up bar is; a beat after the
 * rocket starts to move it pulls back to flight scale, over a fixed time
 * so the move reads however hard the rocket accelerates.
 */
const TOP_MARGIN = 80;
const LIFTOFF_ZOOM = { delayMs: 300, durationMs: 1200 };
/** The camera pulling back over the whole route once the launch is over. */
const PULL_BACK_MS = 2600;

/**
 * The climb's motion: a heavy start that accelerates over ACCELERATE_SHARE
 * of the time, covering ACCELERATE_DISTANCE of the way, then easing to a
 * stop. The distance is chosen so the two halves meet at the same speed.
 */
const ACCELERATE_SHARE = 0.65;
const ACCELERATE_DISTANCE = (2 * ACCELERATE_SHARE) / (3 - ACCELERATE_SHARE);

/** The burning plume behind the nozzle: how far back it reaches and how wide it is at the nozzle, in art pixels. */
const PLUME_LENGTH = 300;
const PLUME_WIDTH = 30;
/** The plume's layers, outermost first: each narrower, shorter and brighter than the last. */
const PLUME_LAYERS = [
  { color: PLUME.edge, width: PLUME_WIDTH, opacity: 0.55 },
  { color: PLUME.pink, width: PLUME_WIDTH * 0.62, opacity: 0.9 },
  { color: PLUME.core, width: PLUME_WIDTH * 0.28, opacity: 1 },
];
/** In flight the camera keeps the rocket's foot this share of the sky above where it stood on the pad, with the rocket's middle across from the centre. */
const FLIGHT_LIFT_SHARE = 0.07;
const FOLLOW_AHEAD = 80;
/** The stars are far off: they drift this share of the way the camera moves, enough to feel the speed. */
const STAR_PARALLAX = 0.25;
/** However far the camera pulls back, the rocket is drawn at no less than this share of its size, so it can still be found at the end of its route. */
const SMALLEST_ROCKET_ZOOM = 0.15;
/** Stops closer together on screen than this, in screen pixels, are too crowded to name. */
const SMALLEST_STOP_NAME_SPACING = 45;

/** How long after a launch's scene first shows its planets are painted, out of the way of the first paint. */
const PLANET_PAINT_DELAY_MS = 1000;
/** Planets are drawn this many art pixels to each of their own, and stand this far off the route on the outside of its bend. */
const PLANET_PIXEL = 2;
const PLANET_GAP = 52;
/** The bank of cloud the rocket climbs through, and how many art pixels each cloud pixel is. */
const CLOUD_SEA_ALTITUDE = 600;
const CLOUD_PIXEL = 4;
const CLOUD_GRIDS = CLOUD_LOOKS.map(cloud);

/** The engine's flame is drawn this many art pixels to each of its own, to match the rocket's size. */
const FLAME_PIXEL = 2;
/** A puff of a burn's smoke starts this small and swells a pixel at a time. */
const SMALLEST_PUFF_RADIUS = 2;
const PUFF_SWELL_MS = 140;

/** A sparkle's resting place as shares of the window, and when in its twinkle it starts. */
const SPARKLES = [
  { x: 0.12, y: 0.16, delay: 0 },
  { x: 0.83, y: 0.09, delay: -1.3 },
  { x: 0.64, y: 0.31, delay: -2.1 },
  { x: 0.27, y: 0.42, delay: -0.6 },
  { x: 0.93, y: 0.5, delay: -2.8 },
  { x: 0.05, y: 0.67, delay: -1.8 },
  { x: 0.48, y: 0.07, delay: -3.3 },
  { x: 0.74, y: 0.72, delay: -0.9 },
];

/** A stop's label: "Launch pad", "Atmosphere", "Moon", "Mars". */
const stopLabel = (name: string) => {
  const bare = name.replace(/^the /, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
};
const LAST_STOP = STOPS.length - 1;
/** Whether a route position is the pad itself, where the rocket stands until a burn carries it off. */
const isAtPad = (position: number) => position === 0;

/** Each planet beside its stop on the route, on the outside of the bend, close enough for the rocket to feel it. */
const PLANETS = STOPS.slice(2).map((stop, offset) => {
  const stopIndex = offset + 2;
  const look = PLANET_LOOKS[stop.name];
  const radius = look.radius * PLANET_PIXEL;
  const point = arcPointAt(stopIndex);
  // A ringed planet stands further off, so its rings pass behind the route rather than across it.
  const reach =
    ROCKET_WIDTH / 2 + PLANET_GAP + radius * (look.isRinged ? 1.5 : 1);
  return {
    stopIndex,
    look,
    radius,
    // Once the route runs nearly level it passes under the planets, so their names go on top.
    isNamedAbove: point.heading > Math.PI / 3,
    x: point.x - Math.cos(point.heading) * reach,
    altitude: point.altitude + Math.sin(point.heading) * reach,
  };
});
const ATMOSPHERE = arcPointAt(1);

/** The bank of cloud across the sky, scattered by fixed offsets so it never looks tiled; a third of it passes in front of the rocket. */
const CLOUD_BANK = Array.from({ length: 90 }, (_, index) => ({
  look: (index * 7) % 3,
  x: -6000 + index * 136 + ((index * 37) % 23) * 2 - 22,
  altitude: CLOUD_SEA_ALTITUDE + ((index * 53) % 41) * 2 - 40,
  isInFront: index % 3 === 0,
}));

/**
 * Art painted once onto a canvas of its own, its top row at top. Drawn as
 * rects, the rocket, the planets and the cloud bank would be thousands of
 * shapes for the browser to sort through on every frame of a burn; as
 * images they are one each.
 */
function rectsCanvas(
  rects: readonly Rect[],
  width: number,
  height: number,
  top: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  for (const rect of rects) {
    context.fillStyle = rect.fill;
    context.fillRect(rect.x, rect.y - top, rect.w, rect.h);
  }
  return canvas;
}

function spriteCanvas(grid: SpriteGrid, palette: Palette): HTMLCanvasElement {
  return rectsCanvas(gridRects(grid, palette), grid[0].length, grid.length, 0);
}

/** What paint makes for key: painted the first time it is asked for, and kept. */
function paintedOnce<T>(cache: Map<string, T>, key: string, paint: () => T): T {
  let painted = cache.get(key);
  if (painted === undefined) {
    painted = paint();
    cache.set(key, painted);
  }
  return painted;
}

const rocketImages = new Map<string, string>();
/** The rocket with this many stages left, as an image standing on y = 0. */
function rocketImage(stagesLeft: number): string {
  return paintedOnce(rocketImages, `rocket ${stagesLeft}`, () => {
    const height = rocketHeight(stagesLeft);
    return rectsCanvas(
      rocketRects(stagesLeft),
      ROCKET_WIDTH,
      height,
      -height,
    ).toDataURL();
  });
}

/** A spent stage, as an image standing on y = 0: scorched when a scrub burned it. */
function spentStageImage(isScorched: boolean): string {
  return paintedOnce(rocketImages, `spent ${isScorched}`, () =>
    rectsCanvas(
      spentStageRects(isScorched),
      ROCKET_WIDTH,
      SPENT_STAGE_HEIGHT,
      -SPENT_STAGE_HEIGHT,
    ).toDataURL(),
  );
}

const smokePuffCanvases = new Map<string, HTMLCanvasElement>();
/** A puff of smoke this many canvas pixels in radius, pale or sooty. */
function smokePuffCanvas(radius: number, isSoot: boolean): HTMLCanvasElement {
  return paintedOnce(smokePuffCanvases, `${radius} ${isSoot}`, () =>
    spriteCanvas(smokePuff(radius), isSoot ? SOOT_PALETTE : SMOKE_PALETTE),
  );
}

let planetImages: { href: string; width: number; height: number }[] | null =
  null;
/** The planets as images in art pixels, painted the first time they are needed: big as they are, that takes a moment, so it waits until a launch might fly. */
function paintedPlanets() {
  planetImages ??= PLANETS.map((shown) => {
    const art = planet(shown.look);
    return {
      href: spriteCanvas(art.grid, art.palette).toDataURL(),
      width: art.grid[0].length * PLANET_PIXEL,
      height: art.grid.length * PLANET_PIXEL,
    };
  });
  return planetImages;
}

let cloudImages: string[] | null = null;
/** The cloud bank's three looks as images, painted the first time they are needed. */
function paintedClouds() {
  cloudImages ??= CLOUD_GRIDS.map((grid) =>
    spriteCanvas(grid, CLOUD_PALETTE).toDataURL(),
  );
  return cloudImages;
}

/** A stage burning: which one, the route positions it carries the rocket between, and whether it was scrubbed. onFinished runs once its result can come up. */
type Burn = {
  stageIndex: number;
  from: number;
  to: number;
  isScrub: boolean;
  onFinished: () => void;
};

type Props = {
  /** Where the rocket rests along the route, in stops from the pad. */
  position: number;
  /** The stages still on the rocket under its capsule. */
  stagesLeft: number;
  /** The stage burning now; null between burns. */
  burn: Burn | null;
  /** Once the launch is over the camera pulls back over the whole route and says when it has; null until then. */
  pullBack: { hasPulledBack: boolean; onPulledBack: () => void } | null;
  /** The route ahead, and the ruler down the side, for a launch in play. */
  showsRoute: boolean;
};

/** A burn under way: the burn, the stages the rocket had when it lit, and how far into it we are. */
type Timeline = { burn: Burn; stagesBefore: number; elapsed: number };

/** The window as measured, and the sizes the stylesheet sets for it. */
type View = {
  width: number;
  height: number;
  artPixelSize: number;
  groundHeight: number;
  /** What the flight report covers once the camera pulls back, so the route is framed in the rest. */
  overviewInsets: { top: number; right: number; bottom: number; left: number };
};

/** What the camera looks at: the world point it holds at a screen anchor, and how far it has pulled back. */
type Camera = {
  x: number;
  altitude: number;
  zoom: number;
  anchorX: number;
  anchorY: number;
};

/** When each beat of a burn falls, in milliseconds from when it lights. */
type Beats = {
  ignitionMs: number;
  travelMs: number;
  separationMs: number;
  resultMs: number;
  endMs: number;
};

function beatsOf(burn: Burn): Beats {
  if (burn.isScrub)
    return {
      ignitionMs: 0,
      travelMs: 0,
      separationMs: SPUTTER_SEPARATION_MS,
      resultMs: SPUTTER_MS,
      endMs: SPUTTER_SEPARATION_MS + DEBRIS_LIFE_MS,
    };
  const ignitionMs = isAtPad(burn.from) ? LIFTOFF_IGNITION_MS : IGNITION_MS;
  const travelMs = Math.min(
    TRAVEL_MS.longest,
    TRAVEL_MS.base + (burn.to - burn.from) * TRAVEL_MS.perStop,
  );
  const separationMs = ignitionMs + travelMs;
  return {
    ignitionMs,
    travelMs,
    separationMs,
    resultMs: separationMs + SEPARATION_TO_RESULT_MS,
    // Off the pad, the burn runs on until the smoke bank has drifted away.
    endMs: Math.max(
      separationMs + DEBRIS_LIFE_MS,
      isAtPad(burn.from) ? SMOKE.lifeMs : 0,
    ),
  };
}

/** How far through a climb the rocket has come, 0 to 1, a share of the time into it. */
function climbShareAt(timeShare: number): number {
  if (timeShare <= 0) return 0;
  if (timeShare >= 1) return 1;
  if (timeShare < ACCELERATE_SHARE)
    return ACCELERATE_DISTANCE * (timeShare / ACCELERATE_SHARE) ** 3;
  const easing = (timeShare - ACCELERATE_SHARE) / (1 - ACCELERATE_SHARE);
  return (
    ACCELERATE_DISTANCE + (1 - ACCELERATE_DISTANCE) * (1 - (1 - easing) ** 2)
  );
}

/**
 * Where a hit's burn leaves the foot of the rocket before its stage drops:
 * a stage short of where it is going, so that once the stage is gone, the
 * shorter rocket's foot is there without the rest of it moving.
 */
function separationPosition(burn: Burn): number {
  return Math.max(burn.from, burn.to - STAGE_HEIGHT / STOP_SPACING);
}

/** Where the foot of the rocket is along the route during a hit's burn. */
function travelPosition(burn: Burn, beats: Beats, elapsed: number): number {
  if (elapsed >= beats.separationMs) return burn.to;
  const timeShare = (elapsed - beats.ignitionMs) / beats.travelMs;
  return (
    burn.from + (separationPosition(burn) - burn.from) * climbShareAt(timeShare)
  );
}

/** How far a scrubbed rocket stands off its place along its heading: lurching up to the drop, then what is left sinking back down. */
function scrubLurch(elapsed: number): number {
  if (elapsed < SPUTTER_SEPARATION_MS)
    return NUDGE * Math.sin((Math.PI / 2) * (elapsed / SPUTTER_SEPARATION_MS));
  const sinkShare = Math.min(
    1,
    (elapsed - SPUTTER_SEPARATION_MS) / (SPUTTER_MS - SPUTTER_SEPARATION_MS),
  );
  return (NUDGE + STAGE_HEIGHT) * (1 - sinkShare * sinkShare);
}

/** A puff of smoke: when and where it starts, how it drifts in art pixels a millisecond, how big it grows and how long it lasts. */
type Puff = {
  startMs: number;
  x: number;
  altitude: number;
  driftX: number;
  driftAltitude: number;
  largestRadius: number;
  lifeMs: number;
  isSoot: boolean;
};

/** The smoke a burn makes beyond liftoff's bank: a puff as the stage lets go, and soot coughed out by a scrub. */
function puffsOf(burn: Burn, beats: Beats, separationFoot: ArcPoint): Puff[] {
  const puffs: Puff[] = [];
  const nozzle = arcPointAt(burn.from);
  if (burn.isScrub)
    for (let index = 0; index < 6; index += 1) {
      const side = index % 2 ? 1 : -1;
      puffs.push({
        startMs: index * 140,
        x: nozzle.x,
        altitude: nozzle.altitude - 4,
        driftX: side * 0.024 - Math.sin(nozzle.heading) * 0.03,
        driftAltitude: -Math.cos(nozzle.heading) * 0.024 + 0.008,
        largestRadius: 10 + (index % 2),
        lifeMs: 1400,
        isSoot: true,
      });
    }
  for (let index = 0; index < 4; index += 1) {
    const side = index % 2 ? 1 : -1;
    puffs.push({
      startMs: beats.separationMs,
      x: separationFoot.x + side * 6,
      altitude: separationFoot.altitude + STAGE_HEIGHT - index * 2,
      driftX: side * 0.04,
      driftAltitude: -0.016 * index,
      largestRadius: 8 + (index % 2),
      lifeMs: 1100,
      isSoot: burn.isScrub,
    });
  }
  return puffs;
}

/**
 * The smoke bank's puffs, rolling out of the flame trench one after another
 * to each side: the first run furthest along the ground, the later ones
 * fill in behind and pile up higher round the rocket. Fixed offsets scatter
 * how far each goes, how high and how big, so the bank billows instead of
 * lining up.
 */
const SMOKE_PUFFS = Array.from({ length: SMOKE.puffCount }, (_, index) => {
  const order = index / (SMOKE.puffCount - 1);
  const scatter = (index * 0.618034) % 1;
  const scatterToo = (index * 0.381966 + 0.27) % 1;
  return {
    side: index % 2 ? 1 : -1,
    reach: SMOKE.reach * (1 - order) ** 0.8 * (0.8 + 0.4 * scatter),
    height: SMOKE.height * (0.1 + 0.9 * scatterToo) * (0.35 + 0.65 * order),
    radius:
      SMOKE.smallestRadius +
      (SMOKE.largestRadius - SMOKE.smallestRadius) * (0.4 + 0.6 * scatter),
    startMs: order * SMOKE.rollOutMs,
  };
});

/** The smoke bank on this frame of liftoff: each puff rolling out, rising and swelling, and the whole bank thinning away at the end. */
function smokeBankAt(
  elapsed: number,
): { x: number; altitude: number; radius: number; opacity: number }[] {
  const opacity = Math.min(
    1,
    Math.max(0, (SMOKE.lifeMs - elapsed) / SMOKE.fadeMs),
  );
  return SMOKE_PUFFS.filter((puff) => elapsed >= puff.startMs).map((puff) => {
    const age = elapsed - puff.startMs;
    return {
      x: puff.side * puff.reach * (1 - Math.exp(-age / SMOKE.rollMs)),
      altitude:
        puff.height * (1 - Math.exp(-age / SMOKE.climbMs)) +
        SMOKE.driftPerMs * age,
      radius: puff.radius * (0.4 + 0.6 * (1 - Math.exp(-age / SMOKE.swellMs))),
      opacity,
    };
  });
}

/** How many screen pixels make an art pixel in flight: one fewer than on the pad, so the camera pulls back by a whole step and stays crisp. */
const flightPixelSize = (view: View) => Math.max(1, view.artPixelSize - 1);

/**
 * Where the camera stands to follow a rocket standingHeight art pixels tall,
 * flightShare of the way from framing the pad to framing the flight,
 * holding the rocket's middle across from the centre either way. On the
 * pad the rocket stands at full size and the camera holds still until its
 * nose nears the top of the window; in flight the camera has pulled back a
 * step and follows it closely.
 */
function followCamera(
  view: View,
  foot: ArcPoint,
  standingHeight: number,
  flightShare: number,
): Camera {
  const padFootY = padFootScreenY(view);
  const zoom =
    1 + (flightPixelSize(view) / view.artPixelSize - 1) * flightShare;
  const flightLiftArt =
    (padFootY / (view.artPixelSize * zoom)) * FLIGHT_LIFT_SHARE;
  const pixelsPerArtPixel = view.artPixelSize * zoom;
  const holdArt = Math.max(
    flightLiftArt,
    (padFootY - TOP_MARGIN) / pixelsPerArtPixel - standingHeight,
  );
  const liftArt = holdArt + (flightLiftArt - holdArt) * flightShare;
  return {
    x: foot.x + Math.sin(foot.heading) * FOLLOW_AHEAD,
    altitude: Math.max(0, foot.altitude - liftArt),
    zoom,
    anchorX: view.width / 2,
    anchorY: padFootY,
  };
}

/** The camera pulled back to frame the whole flight: the pad, the route flown, and the planets passed, in the part of the window the report leaves free. */
function overviewCamera(view: View, endPosition: number): Camera {
  // The pad, from a strip of soil under it to the top of its tower.
  const box = {
    left: -PAD_WIDTH / 2,
    right: PAD_WIDTH / 2,
    bottom: -40,
    top: 200,
  };
  const include = (x: number, altitude: number, margin: number) => {
    box.left = Math.min(box.left, x - margin);
    box.right = Math.max(box.right, x + margin);
    box.bottom = Math.min(box.bottom, altitude - margin);
    box.top = Math.max(box.top, altitude + margin);
  };
  for (const point of arcPointsBetween(0, endPosition, 24))
    include(point.x, point.altitude, 140);
  for (const passed of PLANETS)
    if (passed.stopIndex <= stopIndexAt(endPosition))
      include(passed.x, passed.altitude, passed.radius + 16);
  const insets = view.overviewInsets;
  const across = spanBetween(view.width, insets.left, insets.right);
  const down = spanBetween(view.height, insets.top, insets.bottom);
  const fit = Math.min(
    across.length / (box.right - box.left),
    down.length / (box.top - box.bottom),
  );
  return {
    x: (box.left + box.right) / 2,
    altitude: (box.bottom + box.top) / 2,
    // Pulling back never pulls in closer than the camera already is.
    zoom: Math.min(
      isAtPad(endPosition) ? 1 : flightPixelSize(view) / view.artPixelSize,
      fit / view.artPixelSize,
    ),
    anchorX: across.start + across.length / 2,
    anchorY: down.start + down.length / 2,
  };
}

/** The span of the window the panels leave free along one side; a window too small for that gives the route its middle third and lets the panels cover what they cover. */
function spanBetween(
  size: number,
  coveredBefore: number,
  coveredAfter: number,
): { start: number; length: number } {
  const free = size - coveredBefore - coveredAfter;
  return free >= size / 3
    ? { start: coveredBefore, length: free }
    : { start: size / 3, length: size / 3 };
}

/**
 * The camera part of the way from one framing to another. The zoom eases
 * out evenly on a log scale, and the camera slides across only as fast as
 * the view widens, so what it started on never leaves the frame.
 */
function cameraBetween(from: Camera, to: Camera, share: number): Camera {
  const zoom = from.zoom * (to.zoom / from.zoom) ** share;
  const slide =
    from.zoom === to.zoom
      ? share
      : (1 / zoom - 1 / from.zoom) / (1 / to.zoom - 1 / from.zoom);
  const along = (start: number, end: number) => start + (end - start) * slide;
  return {
    x: along(from.x, to.x),
    altitude: along(from.altitude, to.altitude),
    zoom,
    anchorX: along(from.anchorX, to.anchorX),
    anchorY: along(from.anchorY, to.anchorY),
  };
}

/** How far down the window the rocket's foot stands on the pad: the pad sits on the soil band, which holds the controls. */
function padFootScreenY(view: View): number {
  return (
    view.height -
    view.groundHeight -
    (PAD_HEIGHT - ROCKET_FOOT.y) * view.artPixelSize
  );
}

const easeInOutCubic = (share: number) =>
  share < 0.5 ? 4 * share ** 3 : 1 - (-2 * share + 2) ** 3 / 2;
/** A world point as SVG coordinates: x across, and down where altitude counts up. */
const svgPoint = (x: number, altitude: number) =>
  `${x.toFixed(1)},${(-altitude).toFixed(1)}`;

/** The route between two positions, as an SVG polyline. */
function routePoints(from: number, to: number): string {
  return arcPointsBetween(from, to, 6)
    .map((point) => svgPoint(point.x, point.altitude))
    .join(" ");
}

/** The burning plume as an outline along the route behind the nozzle, widest at the nozzle and tapering to a point. */
function plumeOutline(nozzle: number, length: number, width: number): string {
  const tail = Math.max(0, nozzle - length / STOP_SPACING);
  const points = arcPointsBetween(nozzle, tail, 4);
  const left: string[] = [];
  const right: string[] = [];
  points.forEach((point, index) => {
    const half = (width / 2) * (1 - index / (points.length - 1)) ** 0.6;
    const acrossX = Math.cos(point.heading) * half;
    const acrossAltitude = -Math.sin(point.heading) * half;
    left.push(svgPoint(point.x - acrossX, point.altitude - acrossAltitude));
    right.push(svgPoint(point.x + acrossX, point.altitude + acrossAltitude));
  });
  return [...left, ...right.reverse()].join(" ");
}

/**
 * The launch at dusk, filmed. The rocket stands fully built on the pad;
 * each burn drives it further along one long curving route, straight up
 * through the cloud bank and then turning over into space, its plume
 * bending with the arc and a glowing trail left behind, the spent stage
 * tumbling away at the end. A scrub only coughs and drops its stage
 * scorched. The camera rides with the rocket between questions, and once
 * the launch is over it pulls back over the whole route from the pad to
 * wherever the rocket got to. Reduced motion skips straight to the end of
 * each move.
 */
export function MissionScene({
  position,
  stagesLeft,
  burn,
  pullBack,
  showsRoute,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [pullBackProgress, setPullBackProgress] = useState<number | null>(null);
  // React's ids carry punctuation that an SVG url() reference can't hold.
  const glowId = `nozzle-glow-${useId().replace(/\W/g, "")}`;

  // Measured before the first paint, so the scene never shows a frame of bare sky as it mounts.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const style = getComputedStyle(root);
      const length = (name: string) =>
        parseFloat(style.getPropertyValue(name)) || 0;
      setView({
        width: root.clientWidth,
        height: root.clientHeight,
        artPixelSize: length("--art-pixel-size"),
        groundHeight: length("--ground-height"),
        overviewInsets: {
          top: length("--overview-inset-top"),
          right: length("--overview-inset-right"),
          bottom: length("--overview-inset-bottom"),
          left: length("--overview-inset-left"),
        },
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // A launch in play will fly past the planets, so they are painted once the first screen is up rather than in the middle of liftoff.
  useEffect(() => {
    if (!showsRoute) return;
    const handle = window.setTimeout(paintedPlanets, PLANET_PAINT_DELAY_MS);
    return () => clearTimeout(handle);
  }, [showsRoute]);

  // A burn plays to its end even once its result is up, so the spent stage can finish tumbling away; only another burn or leaving cuts it short.
  const cancelTimelineRef = useRef(() => {});
  useEffect(() => () => cancelTimelineRef.current(), []);
  const startBurn = useEffectEvent((): (() => void) => {
    if (!burn) return () => {};
    const startedBurn = burn;
    if (prefersReducedMotion()) {
      startedBurn.onFinished();
      return () => {};
    }
    const beats = beatsOf(startedBurn);
    const stagesBefore = stagesLeft;
    if (startedBurn.isScrub) sfx.sputter();
    else if (isAtPad(startedBurn.from))
      sfx.liftoff((beats.ignitionMs + beats.travelMs) / 1000);
    else sfx.burn((beats.ignitionMs + beats.travelMs) / 1000);
    let stopsPassed = stopIndexAt(startedBurn.from);
    let hasSeparated = false;
    let hasFinished = false;
    return tween(
      beats.endMs,
      (progress) => {
        const elapsed = progress * beats.endMs;
        setTimeline({ burn: startedBurn, stagesBefore, elapsed });
        if (!startedBurn.isScrub) {
          const reached = travelPosition(startedBurn, beats, elapsed);
          while (stopsPassed < stopIndexAt(reached)) {
            stopsPassed += 1;
            sfx.passStop(stopsPassed);
          }
        }
        if (!hasSeparated && elapsed >= beats.separationMs) {
          hasSeparated = true;
          sfx.separate();
        }
        if (!hasFinished && elapsed >= beats.resultMs) {
          hasFinished = true;
          startedBurn.onFinished();
        }
      },
      () => setTimeline(null),
    );
  });
  const burningStageIndex = burn?.stageIndex ?? null;
  useEffect(() => {
    if (burningStageIndex === null) return;
    cancelTimelineRef.current();
    cancelTimelineRef.current = startBurn();
  }, [burningStageIndex]);

  const isPullingBack = pullBack !== null;
  const finishPullBack = useEffectEvent(() => pullBack?.onPulledBack());
  useEffect(() => {
    if (!isPullingBack) return;
    const cancel = tween(
      prefersReducedMotion() ? 0 : PULL_BACK_MS,
      setPullBackProgress,
      finishPullBack,
    );
    return () => {
      cancel();
      setPullBackProgress(null);
    };
  }, [isPullingBack]);

  // The rocket on this frame: where its foot is along the route, how far it stands off it, and what its engine is doing.
  const elapsed = timeline?.elapsed ?? 0;
  const hasLeftPad = !isAtPad(position);
  let footPosition = position;
  let followedPosition = position;
  let lurch = 0;
  let stagesOnRocket = stagesLeft;
  let plumeLength = 0;
  let flame: "burn" | "sputter" | "idle" | "none" = hasLeftPad
    ? "idle"
    : "none";
  let puffs: Puff[] = [];
  let debris: {
    x: number;
    altitude: number;
    angle: number;
    opacity: number;
    isScorched: boolean;
  } | null = null;
  let shake = 0;
  let flashOpacity = 0;
  // How far the camera has gone from framing the rocket on the pad to framing its flight.
  let flightShare = hasLeftPad ? 1 : 0;
  let smokeBank: ReturnType<typeof smokeBankAt> = [];
  let engineGlowOnSmoke = 0;
  if (timeline) {
    const { burn: running, stagesBefore } = timeline;
    const beats = beatsOf(running);
    const hasSeparated = elapsed >= beats.separationMs;
    stagesOnRocket = stagesBefore - (hasSeparated ? 1 : 0);
    let separationFoot: ArcPoint;
    if (running.isScrub) {
      footPosition = running.from;
      followedPosition = running.from;
      lurch = scrubLurch(elapsed);
      const isCoughing =
        elapsed < SPUTTER_MS * 0.8 && Math.floor(elapsed / 90) % 3 !== 1;
      flame = isCoughing ? "sputter" : isAtPad(running.from) ? "none" : "idle";
      const point = arcPointAt(running.from);
      separationFoot = {
        ...point,
        x: point.x + Math.sin(point.heading) * NUDGE,
        altitude: point.altitude + Math.cos(point.heading) * NUDGE,
      };
    } else {
      footPosition = travelPosition(running, beats, elapsed);
      const settleShare = Math.min(
        1,
        Math.max(0, (elapsed - beats.separationMs) / CAMERA_SETTLE_MS),
      );
      followedPosition =
        elapsed < beats.separationMs
          ? footPosition
          : separationPosition(running) +
            (running.to - separationPosition(running)) *
              easeInOutCubic(settleShare);
      plumeLength =
        PLUME_LENGTH *
        (elapsed < beats.ignitionMs
          ? elapsed / beats.ignitionMs
          : Math.max(
              0,
              1 - Math.max(0, elapsed - beats.separationMs) / CUTOFF_MS,
            ));
      flame = elapsed < beats.separationMs + CUTOFF_MS / 2 ? "burn" : "idle";
      separationFoot = arcPointAt(separationPosition(running));
      if (isAtPad(running.from)) {
        shake = Math.max(0, 1 - elapsed / SHAKE_MS);
        flashOpacity = 0.85 * Math.max(0, 1 - elapsed / FLASH_MS);
        flightShare = easeInOutCubic(
          Math.min(
            1,
            Math.max(
              0,
              (elapsed - beats.ignitionMs - LIFTOFF_ZOOM.delayMs) /
                LIFTOFF_ZOOM.durationMs,
            ),
          ),
        );
        smokeBank = smokeBankAt(elapsed);
        // The engine lights the smoke pink while it burns low over it.
        engineGlowOnSmoke =
          flame === "burn"
            ? Math.max(
                0,
                1 -
                  arcPointAt(footPosition).altitude /
                    ENGINE_LIGHT.fadedByAltitude,
              )
            : 0;
      }
    }
    puffs = puffsOf(running, beats, separationFoot);
    const debrisAge = elapsed - beats.separationMs;
    if (debrisAge >= 0 && debrisAge < DEBRIS_LIFE_MS) {
      const along = {
        x: Math.sin(separationFoot.heading),
        altitude: Math.cos(separationFoot.heading),
      };
      // Stages alternate which side they fall away to and which way they turn.
      const side = running.stageIndex % 2 ? 1 : -1;
      // A stage dropped on the pad tips off the side of the platform instead of falling back through it.
      const isDroppedOnPad = isAtPad(running.from) && running.isScrub;
      const fallenBack =
        SPENT_STAGE_HEIGHT / 2 -
        (isDroppedOnPad ? 0 : DEBRIS.fallBackSpeed * debrisAge);
      const drifted =
        DEBRIS.driftSpeed * debrisAge * side * (isDroppedOnPad ? 3 : 1);
      debris = {
        x: separationFoot.x + along.x * fallenBack - along.altitude * drifted,
        altitude:
          separationFoot.altitude +
          along.altitude * fallenBack +
          along.x * drifted -
          DEBRIS.gravity * debrisAge ** 2,
        angle:
          (separationFoot.heading * 180) / Math.PI +
          side * DEBRIS.spinDegreesPerMs * debrisAge,
        opacity: 1 - (debrisAge / DEBRIS_LIFE_MS) ** 2,
        isScorched: running.isScrub,
      };
    }
  }
  // All the smoke on this frame, for the smoke canvas: liftoff's bank, and each puff from a separation or a scrub as it swells and thins.
  const smoke = [
    ...smokeBank.map((puff) => ({ ...puff, isSoot: false })),
    ...puffs.flatMap((puff) => {
      const age = elapsed - puff.startMs;
      if (age < 0 || age >= puff.lifeMs) return [];
      return [
        {
          x: puff.x + puff.driftX * age,
          altitude: puff.altitude + puff.driftAltitude * age,
          radius: Math.min(
            puff.largestRadius,
            SMALLEST_PUFF_RADIUS + Math.floor(age / PUFF_SWELL_MS),
          ),
          opacity: 0.9 * (1 - age / puff.lifeMs),
          isSoot: puff.isSoot,
        },
      ];
    }),
  ];
  const footOnRoute = arcPointAt(footPosition);
  const foot = {
    x: footOnRoute.x + Math.sin(footOnRoute.heading) * lurch,
    altitude: footOnRoute.altitude + Math.cos(footOnRoute.heading) * lurch,
  };
  const headingDegrees = (footOnRoute.heading * 180) / Math.PI;
  const isStandingOnPad = isAtPad(footPosition) && !timeline;
  const crowdMood: CrowdMood =
    timeline && isAtPad(timeline.burn.from)
      ? timeline.burn.isScrub
        ? "dismayed"
        : "cheering"
      : hasLeftPad
        ? "pleased"
        : "waiting";

  if (!view)
    return <div ref={rootRef} className="mission" aria-hidden="true" />;

  const artPixelSize = view.artPixelSize;
  const camera =
    pullBack && pullBackProgress !== null
      ? cameraBetween(
          followCamera(
            view,
            arcPointAt(position),
            rocketHeight(stagesOnRocket),
            hasLeftPad ? 1 : 0,
          ),
          overviewCamera(view, position),
          easeInOutCubic(pullBackProgress),
        )
      : followCamera(
          view,
          arcPointAt(followedPosition),
          rocketHeight(stagesOnRocket),
          flightShare,
        );
  const pixelsPerArtPixel = artPixelSize * camera.zoom;
  const isScaleSteady = !pullBack && (flightShare === 0 || flightShare === 1);
  // Lines along the route keep their width on screen however far the camera pulls back; only they read the zoom, so changing it restyles nothing else.
  const zoomStyle = { "--zoom": camera.zoom } as CSSProperties;
  const rocketScale = Math.max(1, SMALLEST_ROCKET_ZOOM / camera.zoom);
  const shakeAmplitude = artPixelSize * 2 * shake;
  const translateX = Math.round(
    camera.anchorX -
      camera.x * pixelsPerArtPixel +
      (Math.floor(elapsed / 50) % 2 ? 1 : -1) * shakeAmplitude,
  );
  const translateY = Math.round(
    camera.anchorY +
      camera.altitude * pixelsPerArtPixel +
      (Math.floor(elapsed / 70) % 2 ? 1 : -1) * shakeAmplitude * 0.5,
  );
  // The pad and the sky over it, from the soil up a window high, are in sight until the camera climbs clear of them.
  const padSkyTop = translateY - padFootScreenY(view) * camera.zoom;
  const padSkyBottom =
    translateY + (view.height - padFootScreenY(view)) * camera.zoom;
  const isPadInView = padSkyTop < view.height && padSkyBottom > 0;
  const toScreen = (x: number, altitude: number) => ({
    left: translateX + x * pixelsPerArtPixel,
    top: translateY - altitude * pixelsPerArtPixel,
  });
  // The sky's pixels are the world's art pixels on the pad and in flight, and no finer than flight's while the camera pulls back further.
  const skyPixel = Math.min(
    artPixelSize,
    Math.max(flightPixelSize(view), Math.round(pixelsPerArtPixel)),
  );
  // The sky canvas sits a fraction of a pixel off the window, so its pixels stay on the world's grid as the camera moves.
  const canvasOffsetX = -positiveModulo(-translateX, skyPixel);
  const canvasOffsetY = -positiveModulo(-translateY, skyPixel);
  const canvasColumns = Math.ceil(view.width / skyPixel) + 1;
  const canvasRows = Math.ceil(view.height / skyPixel) + 1;
  const canvasStyle = {
    width: canvasColumns * skyPixel,
    height: canvasRows * skyPixel,
    transform: `translate(${canvasOffsetX}px, ${canvasOffsetY}px)`,
  };
  const toCanvas = (x: number, altitude: number) => {
    const place = toScreen(x, altitude);
    return {
      column: (place.left - canvasOffsetX) / skyPixel,
      row: (place.top - canvasOffsetY) / skyPixel,
    };
  };

  // Each stop's name: under the pad, on the edge of space beside the route, and by each planet on the side away from the route.
  const labels = [
    { stopIndex: 0, x: 0, altitude: -22, isAbove: false },
    {
      stopIndex: 1,
      x: ATMOSPHERE.x + 40,
      altitude: ATMOSPHERE.altitude + 4,
      isAbove: false,
    },
    ...PLANETS.map((shown) => ({
      stopIndex: shown.stopIndex,
      x: shown.x,
      altitude: shown.isNamedAbove
        ? shown.altitude + shown.radius + 6
        : shown.altitude - shown.radius - 8,
      isAbove: shown.isNamedAbove,
    })),
  ];
  const hasPulledBack = pullBack?.hasPulledBack ?? false;
  const reachedStopIndex = stopIndexAt(position);
  // Pulled back far enough, the stops crowd together; the ruler down the side still names them all.
  const hasRoomForStopNames =
    STOP_SPACING * pixelsPerArtPixel >= SMALLEST_STOP_NAME_SPACING;
  const flameGrid =
    flame === "burn"
      ? FLAME_FRAMES[Math.floor(elapsed / 70) % FLAME_FRAMES.length]
      : IDLE_FLAME_FRAMES[Math.floor(elapsed / 90) % IDLE_FLAME_FRAMES.length];

  return (
    <div
      ref={rootRef}
      className="mission"
      role="img"
      aria-label={
        isStandingOnPad
          ? "The rocket standing on the launch pad at dusk."
          : `The rocket on its way out, past ${stopLabel(STOPS[stopIndexAt(footPosition)].name)}.`
      }
    >
      <SkyCanvas
        style={canvasStyle}
        columns={canvasColumns}
        rows={canvasRows}
        topAltitude={(translateY - canvasOffsetY) / pixelsPerArtPixel}
        altitudePerRow={skyPixel / pixelsPerArtPixel}
        leftColumn={Math.round((canvasOffsetX - translateX) / skyPixel)}
        pixelSize={skyPixel}
        starShiftX={translateX * STAR_PARALLAX - canvasOffsetX}
        starShiftY={translateY * STAR_PARALLAX - canvasOffsetY}
      />
      {SPARKLES.map((sparkle, index) => {
        const left = positiveModulo(
          sparkle.x * view.width + translateX * STAR_PARALLAX,
          view.width,
        );
        const top = positiveModulo(
          sparkle.y * view.height + translateY * STAR_PARALLAX,
          view.height,
        );
        if (starChanceAt((translateY - top) / pixelsPerArtPixel) < 0.2)
          return null;
        return (
          <div
            key={index}
            className="sparkle"
            style={{ left, top, animationDelay: `${sparkle.delay}s` }}
          >
            <PixelSprite
              grid={SPARKLE}
              palette={SPARKLE_PALETTE}
              pixelSize={skyPixel}
            />
          </div>
        );
      })}

      <div
        className={`mission-world${isScaleSteady ? " following" : ""}`}
        style={
          {
            transform: `translate(${translateX}px, ${translateY}px) scale(${camera.zoom})`,
          } as CSSProperties
        }
      >
        <div
          className={`sky-life${isPadInView ? "" : " resting"}`}
          style={{
            left: -view.width / 2,
            top: -padFootScreenY(view),
            width: view.width,
            height: view.height,
          }}
        >
          <SkyLife artPixelSize={artPixelSize} />
        </div>
        <WorldLayer artPixelSize={artPixelSize}>
          <line
            className="atmosphere-line"
            style={zoomStyle}
            x1={-8000}
            x2={12000}
            y1={-ATMOSPHERE.altitude}
            y2={-ATMOSPHERE.altitude}
          />
          <Scenery
            isInFront={false}
            hasPlanets={hasLeftPad || timeline !== null || pullBack !== null}
          />
        </WorldLayer>
        <WorldLayer artPixelSize={artPixelSize}>
          <g transform={`translate(${-ROCKET_FOOT.x} ${-ROCKET_FOOT.y})`}>
            <PadScene
              standingRocketHeight={
                isStandingOnPad ? rocketHeight(stagesOnRocket) : null
              }
              mood={crowdMood}
              isInView={isPadInView}
            />
          </g>
        </WorldLayer>
        <WorldLayer artPixelSize={artPixelSize}>
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0" stopColor={PLUME.pink} stopOpacity={0.55} />
              <stop offset="0.5" stopColor={PLUME.lilac} stopOpacity={0.22} />
              <stop offset="1" stopColor={PLUME.edge} stopOpacity={0} />
            </radialGradient>
          </defs>
          {showsRoute && footPosition < LAST_STOP && (
            <polyline
              className="route-ahead"
              style={zoomStyle}
              points={routePoints(footPosition, LAST_STOP)}
            />
          )}
          {!isAtPad(footPosition) && (
            <>
              <polyline
                className="route-flown glow"
                style={zoomStyle}
                points={routePoints(0, footPosition)}
              />
              <polyline
                className="route-flown core"
                style={zoomStyle}
                points={routePoints(0, footPosition)}
              />
            </>
          )}
          {plumeLength > 0 &&
            PLUME_LAYERS.map((layer) => (
              <polygon
                key={layer.color}
                points={plumeOutline(
                  footPosition,
                  plumeLength * (layer.width / PLUME_WIDTH) ** 0.3,
                  layer.width * (1 + 0.08 * Math.sin(elapsed / 40)),
                )}
                fill={layer.color}
                opacity={layer.opacity}
              />
            ))}
          {flame !== "none" && (
            <circle
              cx={foot.x}
              cy={-foot.altitude}
              r={
                (flame === "burn" ? 60 + 4 * Math.sin(elapsed / 55) : 24) *
                rocketScale
              }
              fill={`url(#${glowId})`}
            />
          )}
          {debris && (
            <g
              opacity={debris.opacity}
              transform={`translate(${debris.x} ${-debris.altitude}) rotate(${debris.angle}) translate(${-ROCKET_CENTER_X} ${SPENT_STAGE_HEIGHT / 2})`}
            >
              <image
                href={spentStageImage(debris.isScorched)}
                y={-SPENT_STAGE_HEIGHT}
                width={ROCKET_WIDTH}
                height={SPENT_STAGE_HEIGHT}
              />
            </g>
          )}
          <g
            transform={`translate(${foot.x} ${-foot.altitude}) rotate(${headingDegrees}) scale(${rocketScale}) translate(${-ROCKET_CENTER_X} 0)`}
          >
            <g
              transform={`translate(${ROCKET_CENTER_X} 0) scale(${FLAME_PIXEL})`}
            >
              {flame === "idle" && !timeline ? (
                IDLE_FLAME_FRAMES.map((grid, index) => (
                  <PixelGroup
                    key={index}
                    className={`idle-flame frame-${index}`}
                    grid={grid}
                    palette={FLAME_PALETTE}
                    x={-grid[0].length / 2}
                  />
                ))
              ) : flame !== "none" ? (
                <PixelGroup
                  grid={flameGrid}
                  palette={FLAME_PALETTE}
                  x={-flameGrid[0].length / 2}
                />
              ) : null}
            </g>
            <image
              href={rocketImage(stagesOnRocket)}
              y={-rocketHeight(stagesOnRocket)}
              width={ROCKET_WIDTH}
              height={rocketHeight(stagesOnRocket)}
            />
          </g>
        </WorldLayer>
        <WorldLayer artPixelSize={artPixelSize}>
          <Scenery isInFront hasPlanets={false} />
        </WorldLayer>
        <div
          className="soil"
          style={{
            left: -view.width * 40,
            top: (PAD_HEIGHT - ROCKET_FOOT.y) * artPixelSize,
            width: view.width * 80,
            height: view.height * 20,
          }}
        />
      </div>

      {smoke.length > 0 && (
        <SmokeCanvas
          style={canvasStyle}
          columns={canvasColumns}
          rows={canvasRows}
          puffs={smoke.map((puff) => {
            const centre = toCanvas(puff.x, puff.altitude);
            const radius = Math.max(
              1,
              Math.round((puff.radius * pixelsPerArtPixel) / skyPixel),
            );
            return {
              left: Math.round(centre.column) - radius,
              top: Math.round(centre.row) - radius,
              radius,
              opacity: puff.opacity,
              isSoot: puff.isSoot,
            };
          })}
          glow={
            engineGlowOnSmoke > 0
              ? {
                  ...toCanvas(foot.x, foot.altitude),
                  radius: (ENGINE_LIGHT.reach * pixelsPerArtPixel) / skyPixel,
                  strength: engineGlowOnSmoke,
                }
              : null
          }
        />
      )}
      <div className="mission-labels" aria-hidden="true">
        {labels.map((label) => {
          const place = toScreen(label.x, label.altitude);
          const isOffScreen =
            place.left < -200 ||
            place.left > view.width + 200 ||
            place.top < -40 ||
            place.top > view.height + 40;
          // The pad needs no name until the camera pulls back and it is a speck at the foot of the route.
          if (isOffScreen || (label.stopIndex === 0 && !pullBack)) return null;
          const isHere = hasPulledBack && label.stopIndex === reachedStopIndex;
          if (!isHere && !hasRoomForStopNames) return null;
          const state = isHere
            ? " here"
            : label.stopIndex <= stopIndexAt(footPosition)
              ? " passed"
              : "";
          return (
            <span
              key={label.stopIndex}
              className={`stop-label${label.isAbove ? " above" : ""}${state}`}
              style={place}
            >
              {stopLabel(STOPS[label.stopIndex].name)}
            </span>
          );
        })}
      </div>
      {showsRoute && (
        <RouteRuler
          position={footPosition}
          reachedStopIndex={hasPulledBack ? reachedStopIndex : null}
        />
      )}
      <div className="mission-flash" style={{ opacity: flashOpacity }} />
    </div>
  );
}

/** The sky canvas, repainted whenever what it shows changes. */
function SkyCanvas({
  style,
  columns,
  rows,
  topAltitude,
  altitudePerRow,
  leftColumn,
  pixelSize,
  starShiftX,
  starShiftY,
}: {
  style: CSSProperties;
  columns: number;
  rows: number;
  topAltitude: number;
  altitudePerRow: number;
  leftColumn: number;
  pixelSize: number;
  starShiftX: number;
  starShiftY: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<ImageData | null>(null);
  // Painted before the browser shows the frame, so the sky never lags the world it sits behind.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (canvas.width !== columns) canvas.width = columns;
    if (canvas.height !== rows) canvas.height = rows;
    if (imageRef.current?.width !== columns || imageRef.current.height !== rows)
      imageRef.current = context.createImageData(columns, rows);
    paintSky(imageRef.current, {
      topAltitude,
      altitudePerRow,
      leftColumn,
      pixelSize,
      starShiftX,
      starShiftY,
    });
    context.putImageData(imageRef.current, 0, 0);
  }, [
    columns,
    rows,
    topAltitude,
    altitudePerRow,
    leftColumn,
    pixelSize,
    starShiftX,
    starShiftY,
  ]);
  return <canvas ref={canvasRef} className="mission-sky" style={style} />;
}

/**
 * A burn's smoke, painted fresh on every frame it lives, over the world so
 * the rocket climbs up out of it: each puff a pixel sprite at the canvas's
 * own pixel size, and the engine's light laid over the smoke only,
 * strongest at the nozzle.
 */
function SmokeCanvas({
  style,
  columns,
  rows,
  puffs,
  glow,
}: {
  style: CSSProperties;
  columns: number;
  rows: number;
  puffs: {
    left: number;
    top: number;
    radius: number;
    opacity: number;
    isSoot: boolean;
  }[];
  glow: {
    column: number;
    row: number;
    radius: number;
    strength: number;
  } | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (canvas.width !== columns) canvas.width = columns;
    if (canvas.height !== rows) canvas.height = rows;
    context.clearRect(0, 0, columns, rows);
    context.imageSmoothingEnabled = false;
    for (const puff of puffs) {
      context.globalAlpha = puff.opacity;
      context.drawImage(
        smokePuffCanvas(puff.radius, puff.isSoot),
        puff.left,
        puff.top,
      );
    }
    context.globalAlpha = 1;
    if (glow) {
      const light = context.createRadialGradient(
        glow.column,
        glow.row,
        0,
        glow.column,
        glow.row,
        glow.radius,
      );
      light.addColorStop(
        0,
        `rgba(${ENGINE_LIGHT.rgb}, ${0.7 * glow.strength})`,
      );
      light.addColorStop(1, `rgba(${ENGINE_LIGHT.rgb}, 0)`);
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = light;
      context.fillRect(0, 0, columns, rows);
      context.globalCompositeOperation = "source-over";
    }
  });
  return <canvas ref={canvasRef} className="mission-smoke" style={style} />;
}

/** A layer of the world as SVG in art pixels, x across and y down from the foot of the rocket on the pad. */
function WorldLayer({
  artPixelSize,
  children,
}: {
  artPixelSize: number;
  children: ReactNode;
}) {
  return (
    <svg
      className="world-layer"
      width={1}
      height={1}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g transform={`scale(${artPixelSize})`}>{children}</g>
    </svg>
  );
}

/** What never moves, as images in the world's art pixels: behind the rocket the planets, once a launch is flying, and the back of the cloud bank; in front of it the rest of the bank. */
const Scenery = memo(function Scenery({
  isInFront,
  hasPlanets,
}: {
  isInFront: boolean;
  hasPlanets: boolean;
}) {
  return (
    <>
      {hasPlanets &&
        paintedPlanets().map((image, index) => {
          const shown = PLANETS[index];
          return (
            <image
              key={shown.stopIndex}
              href={image.href}
              x={Math.round(shown.x - image.width / 2)}
              y={Math.round(-shown.altitude - image.height / 2)}
              width={image.width}
              height={image.height}
            />
          );
        })}
      {CLOUD_BANK.filter((placed) => placed.isInFront === isInFront).map(
        (placed, index) => {
          const grid = CLOUD_GRIDS[placed.look];
          const width = grid[0].length * CLOUD_PIXEL;
          const height = grid.length * CLOUD_PIXEL;
          return (
            <image
              key={index}
              href={paintedClouds()[placed.look]}
              x={placed.x - width / 2}
              y={-placed.altitude - height}
              width={width}
              height={height}
            />
          );
        },
      )}
    </>
  );
});

/** Pad to Neptune down the side: a mark for each stop, filling as the rocket goes, the stop it reached lit up once the camera has pulled back. */
function RouteRuler({
  position,
  reachedStopIndex,
}: {
  position: number;
  reachedStopIndex: number | null;
}) {
  return (
    <div className="route-ruler" aria-hidden="true">
      <div className="ruler-track">
        <div
          className="ruler-fill"
          style={{ height: `${(position / LAST_STOP) * 100}%` }}
        />
      </div>
      {STOPS.map((stop, index) => (
        <div
          key={stop.name}
          className={`ruler-stop${index <= stopIndexAt(position) ? " passed" : ""}${index === reachedStopIndex ? " here" : ""}`}
          style={{ bottom: `${(index / LAST_STOP) * 100}%` }}
        >
          <span className="ruler-name">{stopLabel(stop.name)}</span>
          <span className="ruler-tick" />
        </div>
      ))}
      <div
        className="ruler-marker"
        style={{ bottom: `${(position / LAST_STOP) * 100}%` }}
      />
    </div>
  );
}
