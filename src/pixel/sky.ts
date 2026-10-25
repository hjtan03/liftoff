import { LANDSCAPE } from "./sprites";

/**
 * The sky, painted one art pixel at a time the way hand-drawn pixel skies
 * are: flat bands of colour climbing from a pink dusk horizon through
 * violet into space, each turning into the next through a 4 × 4 ordered
 * dither, and stars that thicken as the air thins. Altitudes are in art
 * pixels above the foot of the rocket on the pad.
 */

type SkyStop = { altitude: number; color: string };

const DUSK_SKY: readonly SkyStop[] = [
  { altitude: -40, color: LANDSCAPE.skyHorizon },
  { altitude: 60, color: LANDSCAPE.skyLow },
  { altitude: 180, color: LANDSCAPE.skyMid },
  { altitude: 360, color: LANDSCAPE.skyHigh },
  { altitude: 900, color: LANDSCAPE.upperAir },
  { altitude: 1800, color: LANDSCAPE.space },
  { altitude: 3600, color: LANDSCAPE.spaceDeep },
];

/** The 4 × 4 Bayer matrix: the order in which a dithered band switches pixels to the next colour. */
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Flat bands between two stops. */
const BANDS_PER_STOP = 5;
/**
 * Stars: at most one to each square STAR_CELL screen pixels across, a few
 * already out in the dusk above STARS_FROM_ALTITUDE and up to
 * MAX_STAR_CHANCE of the cells lit STAR_FADE_IN_HEIGHT above it. Most are
 * dim; a few are bright, with a small cross of light round them. They are
 * scattered in screen pixels, not the canvas's, so they stay where they are
 * when the sky's pixels change size.
 */
const STAR_CELL = 54;
const STARS_FROM_ALTITUDE = 90;
const STAR_FADE_IN_HEIGHT = 1300;
const FIRST_STAR_CHANCE = 0.06;
const MAX_STAR_CHANCE = 0.4;
const STAR_LIGHT: Rgb = [255, 244, 236];
/** The brightness tiers, as the share of stars in each and how much of a star's light shows over the sky behind it. */
const STAR_TIERS = [
  { share: 0.65, light: 0.35 },
  { share: 0.27, light: 0.7 },
  { share: 0.08, light: 1 },
];
const BRIGHT_STAR_CROSS_LIGHT = 0.3;
const BRIGHT_STAR_CROSS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * What a canvas of sky shows: the altitude at its top edge and how much
 * altitude each row spans, the world column its left edge stands on so the
 * dither stays put as the camera pans, how many screen pixels each of its
 * pixels covers, and how far the stars, which are far off and barely move,
 * have drifted, in screen pixels.
 */
type SkyView = {
  topAltitude: number;
  altitudePerRow: number;
  leftColumn: number;
  pixelSize: number;
  starShiftX: number;
  starShiftY: number;
};

/** How likely a star is to show at an altitude: none low in the dusk, thickening into space. */
export function starChanceAt(altitude: number): number {
  if (altitude <= STARS_FROM_ALTITUDE) return 0;
  const share = Math.min(
    1,
    (altitude - STARS_FROM_ALTITUDE) / STAR_FADE_IN_HEIGHT,
  );
  return FIRST_STAR_CHANCE + (MAX_STAR_CHANCE - FIRST_STAR_CHANCE) * share;
}

/** Paints the sky into every pixel of an image for what it shows; above and below the stops the sky keeps their colour. */
export function paintSky(image: ImageData, view: SkyView): void {
  const { width, height } = image;
  const altitudeAtRow = (row: number) =>
    view.topAltitude - (row + 0.5) * view.altitudePerRow;
  // The dither's rows are counted from the world, not the canvas, so they ride along with the camera.
  const firstWorldRow = Math.round(view.topAltitude / view.altitudePerRow);
  for (let row = 0; row < height; row += 1) {
    const { lowerBand, upperBand, shareOfUpper } = bandsAt(altitudeAtRow(row));
    const bayerRow = positiveModulo(row - firstWorldRow, 4);
    for (let column = 0; column < width; column += 1) {
      const bayerColumn = positiveModulo(column + view.leftColumn, 4);
      const threshold =
        (BAYER_4X4[bayerRow * 4 + bayerColumn] + 0.5) / BAYER_4X4.length;
      const rgb = shareOfUpper > threshold ? upperBand : lowerBand;
      const offset = (row * width + column) * 4;
      image.data[offset] = rgb[0];
      image.data[offset + 1] = rgb[1];
      image.data[offset + 2] = rgb[2];
      image.data[offset + 3] = 255;
    }
  }
  paintStars(image, view, altitudeAtRow);
}

type Rgb = readonly [number, number, number];

const DUSK_SKY_RGB = DUSK_SKY.map((stop) => ({
  altitude: stop.altitude,
  rgb: hexToRgb(stop.color),
}));

/** The two flat bands a row of sky falls between, and how far it has dithered into the upper one. */
function bandsAt(altitude: number): {
  lowerBand: Rgb;
  upperBand: Rgb;
  shareOfUpper: number;
} {
  const stops = DUSK_SKY_RGB;
  const upperIndex = stops.findIndex((stop) => stop.altitude > altitude);
  if (upperIndex <= 0) {
    const edge = upperIndex === 0 ? stops[0] : stops[stops.length - 1];
    return { lowerBand: edge.rgb, upperBand: edge.rgb, shareOfUpper: 0 };
  }
  const lower = stops[upperIndex - 1];
  const upper = stops[upperIndex];
  const bandPosition =
    ((altitude - lower.altitude) / (upper.altitude - lower.altitude)) *
    BANDS_PER_STOP;
  const band = Math.floor(bandPosition);
  return {
    lowerBand: mixRgb(lower.rgb, upper.rgb, band / BANDS_PER_STOP),
    upperBand: mixRgb(lower.rgb, upper.rgb, (band + 1) / BANDS_PER_STOP),
    // Only the last third of each band dithers, so most of it reads as one flat colour.
    shareOfUpper: Math.max(0, (bandPosition - band) * 3 - 2),
  };
}

/**
 * Lays the stars over the painted sky: one fixed scatter in the stars' own
 * frame, shifted with the view. Where a star sits and whether it shows
 * come from separate hashes, so the two never line up into streaks; a star
 * shows where the sky behind it is high enough for its roll.
 */
function paintStars(
  image: ImageData,
  view: SkyView,
  altitudeAtRow: (row: number) => number,
): void {
  const { width, height } = image;
  const lighten = (column: number, row: number, light: number) => {
    if (column < 0 || column >= width || row < 0 || row >= height) return;
    const offset = (row * width + column) * 4;
    const sky: Rgb = [
      image.data[offset],
      image.data[offset + 1],
      image.data[offset + 2],
    ];
    const lit = mixRgb(sky, STAR_LIGHT, light);
    image.data[offset] = lit[0];
    image.data[offset + 1] = lit[1];
    image.data[offset + 2] = lit[2];
  };
  const firstCellColumn = Math.floor(-view.starShiftX / STAR_CELL);
  const firstCellRow = Math.floor(-view.starShiftY / STAR_CELL);
  for (
    let cellRow = firstCellRow;
    cellRow * STAR_CELL + view.starShiftY < height * view.pixelSize;
    cellRow += 1
  ) {
    for (
      let cellColumn = firstCellColumn;
      cellColumn * STAR_CELL + view.starShiftX < width * view.pixelSize;
      cellColumn += 1
    ) {
      const place = scatterHash(cellColumn, cellRow);
      const column = Math.floor(
        (cellColumn * STAR_CELL + (place % STAR_CELL) + view.starShiftX) /
          view.pixelSize,
      );
      const row = Math.floor(
        (cellRow * STAR_CELL +
          (Math.floor(place / STAR_CELL) % STAR_CELL) +
          view.starShiftY) /
          view.pixelSize,
      );
      const chance = starChanceAt(altitudeAtRow(row));
      const roll = scatterHash(cellColumn + 7919, cellRow + 104729) / 2 ** 32;
      if (roll >= chance) continue;
      // Among the stars that show, the same roll picks the tier, dim most often.
      const tierRoll = roll / chance;
      let tier = STAR_TIERS[STAR_TIERS.length - 1];
      let sharesSoFar = 0;
      for (const candidate of STAR_TIERS) {
        sharesSoFar += candidate.share;
        if (tierRoll < sharesSoFar) {
          tier = candidate;
          break;
        }
      }
      lighten(column, row, tier.light);
      if (tier === STAR_TIERS[STAR_TIERS.length - 1])
        for (const [dx, dy] of BRIGHT_STAR_CROSS)
          lighten(column + dx, row + dy, BRIGHT_STAR_CROSS_LIGHT);
    }
  }
}

/** A repeatable pseudo-random number for a grid cell. */
function scatterHash(x: number, y: number): number {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** The remainder of value over divisor, never negative, so a grid repeats the same way either side of zero. */
export function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function mixRgb(from: Rgb, to: Rgb, share: number): Rgb {
  return [
    Math.round(from[0] + (to[0] - from[0]) * share),
    Math.round(from[1] + (to[1] - from[1]) * share),
    Math.round(from[2] + (to[2] - from[2]) * share),
  ];
}
