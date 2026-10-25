import { COLORS, type Rect } from "./sprites";

/**
 * The rocket in art pixels, drawn fine enough to hold up close on the pad:
 * a silver-white body shaded round, a red nose cone, a capsule with a
 * porthole, one stage per question with its panel seams, rivets, decal and
 * pink band, and pink fins and the engine bell on whatever is lowest. Every
 * burn spends the lowest stage, so the rocket gets shorter as it goes, down
 * to the capsule alone. Pieces are lists of rects standing with their
 * lowest row just above y = 0, centred on the column ROCKET_CENTER_X, so a
 * caller can stand the rocket on a platform or turn it about its foot.
 */

export const ROCKET_WIDTH = 33;
export const ROCKET_CENTER_X = 16;
/** The nose cone's rows, tip to base, as their painted widths; the tip is a single dark pixel. */
const NOSE_WIDTHS = [
  0, 1, 1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11, 13, 13, 13, 15, 15, 15, 17, 17, 17,
  19, 19,
];
const NOSE_HEIGHT = NOSE_WIDTHS.length;
const CAPSULE_HEIGHT = 20;
export const STAGE_HEIGHT = 22;
/** The engine bell's rows, top to bottom, as their painted widths. */
const BELL_WIDTHS = [11, 13, 13, 15, 15, 17, 17, 19];
const BELL_HEIGHT = BELL_WIDTHS.length;
/** How far each fin reaches out from the body, row by row down the lowest piece and past its foot. */
const FIN_REACH = [
  1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5,
];
export const SPENT_STAGE_HEIGHT = STAGE_HEIGHT + BELL_HEIGHT;
/** The body between the fins: its outline columns. */
const BODY = { left: 6, right: 26 };
/** How far the body's side stands out from its middle column, for anything that reaches across to it. */
export const ROCKET_BODY_REACH = BODY.right - ROCKET_CENTER_X;
const INSIDE_WIDTH = BODY.right - BODY.left - 1;

/** A round surface's tones, lit from the upper left: rim, base, highlight, shade, dark, and the deepest edge. */
type Tones = {
  rim: string;
  base: string;
  light: string;
  shade: string;
  dark: string;
  deep: string;
};

const HULL: Tones = {
  rim: "#C2BADF",
  base: "#EEEAF8",
  light: "#FFFFFF",
  shade: "#C2BADF",
  dark: "#8D85B8",
  deep: "#6A6299",
};
const NOSE: Tones = {
  rim: "#B52E4A",
  base: "#E8435A",
  light: "#FF8297",
  shade: "#C23A52",
  dark: "#A92E4B",
  deep: "#7E1F3A",
};
const BAND: Tones = {
  rim: "#D45E93",
  base: "#FF8FBF",
  light: "#FFC2DC",
  shade: "#E070A3",
  dark: "#C25288",
  deep: "#99406C",
};
const BELL: Tones = {
  rim: "#5A5490",
  base: COLORS.steel,
  light: "#B9B2D9",
  shade: COLORS.steelDark,
  dark: "#443E78",
  deep: "#2E2958",
};
/** The bell's lip, a shade darker all round. */
const BELL_LIP: Tones = { ...BELL, base: BELL.shade, light: BELL.base };
const SOOT = { dark: "#3B3448", light: "#5A5168" };

/** Where each tone falls across a surface this many pixels wide, as spans from its left edge. */
function toneSpans(
  width: number,
  tones: Tones,
): { offset: number; length: number; fill: string }[] {
  if (width < 3) return [{ offset: 0, length: width, fill: tones.base }];
  const rimEnd = width >= 7 ? 1 : 0;
  const lightStart = Math.max(1, Math.round(width * 0.14));
  const lightEnd = lightStart + Math.max(1, Math.round(width * 0.14));
  const shadeStart = Math.round(width * 0.6);
  const darkStart = Math.round(width * 0.78);
  const deepStart = width >= 11 ? width - 1 : width;
  return [
    { from: 0, to: rimEnd, fill: tones.rim },
    { from: rimEnd, to: lightStart, fill: tones.base },
    { from: lightStart, to: lightEnd, fill: tones.light },
    { from: lightEnd, to: shadeStart, fill: tones.base },
    { from: shadeStart, to: darkStart, fill: tones.shade },
    { from: darkStart, to: deepStart, fill: tones.dark },
    { from: deepStart, to: width, fill: tones.deep },
  ]
    .filter((span) => span.to > span.from)
    .map((span) => ({
      offset: span.from,
      length: span.to - span.from,
      fill: span.fill,
    }));
}

/** A stretch of round surface centred on the rocket, outlined both sides, its tones running the whole height. */
function roundRects(
  top: number,
  height: number,
  width: number,
  tones: Tones,
): Rect[] {
  const left = ROCKET_CENTER_X - (width - 1) / 2;
  return [
    { x: left - 1, y: top, w: 1, h: height, fill: COLORS.outline },
    { x: left + width, y: top, w: 1, h: height, fill: COLORS.outline },
    ...toneSpans(width, tones).map((span) => ({
      x: left + span.offset,
      y: top,
      w: span.length,
      h: height,
      fill: span.fill,
    })),
  ];
}

/** A rect across the body's inside at row y. */
const insideRow = (y: number, fill: string): Rect => ({
  x: BODY.left + 1,
  y,
  w: INSIDE_WIDTH,
  h: 1,
  fill,
});

/** The red nose cone, from its dark tip down to the full width of the body. */
function noseRects(top: number): Rect[] {
  return NOSE_WIDTHS.flatMap((width, row) =>
    width === 0
      ? [{ x: ROCKET_CENTER_X, y: top, w: 1, h: 1, fill: COLORS.outline }]
      : roundRects(top + row, 1, width, NOSE),
  );
}

/** The capsule under the nose: a seam, a porthole in a steel rim with four bolts round it, and a red ring at its foot. */
function capsuleRects(top: number): Rect[] {
  const centreY = top + 8;
  const rects = [
    ...roundRects(top, CAPSULE_HEIGHT, INSIDE_WIDTH, HULL),
    insideRow(top, COLORS.outline),
    ...roundRects(top + 15, 3, INSIDE_WIDTH, NOSE),
    insideRow(top + 18, HULL.dark),
  ];
  for (let dy = -5; dy <= 5; dy += 1)
    for (let dx = -5; dx <= 5; dx += 1) {
      const reach = Math.hypot(dx, dy);
      if (reach > 5.3) continue;
      const fill =
        reach > 4.4
          ? COLORS.outline
          : reach > 3.4
            ? COLORS.steel
            : dx + dy > 2
              ? COLORS.deepGlass
              : COLORS.glass;
      rects.push({
        x: ROCKET_CENTER_X + dx,
        y: centreY + dy,
        w: 1,
        h: 1,
        fill,
      });
    }
  rects.push(
    {
      x: ROCKET_CENTER_X - 2,
      y: centreY - 2,
      w: 2,
      h: 1,
      fill: COLORS.white,
    },
    {
      x: ROCKET_CENTER_X - 2,
      y: centreY - 1,
      w: 1,
      h: 1,
      fill: COLORS.white,
    },
  );
  for (const [dx, dy] of [
    [-7, -5],
    [7, -5],
    [-7, 5],
    [7, 5],
  ])
    rects.push({
      x: ROCKET_CENTER_X + dx,
      y: centreY + dy,
      w: 1,
      h: 1,
      fill: HULL.dark,
    });
  return rects;
}

/** One stage: a seam at its top, a row of rivets, panel seams, a striped decal, and a pink band; soot and scorch once a scrub has burned it. */
function stageRects(top: number, isScorched: boolean): Rect[] {
  const rects = [
    ...roundRects(top, STAGE_HEIGHT, INSIDE_WIDTH, HULL),
    insideRow(top, COLORS.outline),
    insideRow(top + 1, HULL.light),
    ...roundRects(top + 15, 3, INSIDE_WIDTH, BAND),
    insideRow(top + 18, HULL.dark),
  ];
  for (let x = BODY.left + 3; x < BODY.right - 1; x += 3)
    rects.push({ x, y: top + 3, w: 1, h: 1, fill: HULL.dark });
  rects.push(
    { x: BODY.left + 7, y: top + 5, w: 1, h: 8, fill: HULL.shade },
    { x: BODY.left + 15, y: top + 5, w: 1, h: 8, fill: HULL.deep },
  );
  // The decal: a round mission patch on the lit side, a gold star on navy in a red ring.
  rects.push(
    { x: BODY.left + 4, y: top + 6, w: 3, h: 5, fill: NOSE.base },
    { x: BODY.left + 3, y: top + 7, w: 5, h: 3, fill: NOSE.base },
    { x: BODY.left + 4, y: top + 7, w: 3, h: 3, fill: COLORS.deepGlass },
    { x: BODY.left + 5, y: top + 8, w: 1, h: 1, fill: COLORS.gold },
  );
  if (isScorched) {
    for (const [dx, dy, w, h] of [
      [2, 4, 3, 9],
      [6, 9, 3, 7],
      [11, 3, 3, 8],
      [15, 12, 3, 6],
      [4, 1, 5, 2],
      [9, 17, 6, 2],
    ])
      rects.push({ x: BODY.left + dx, y: top + dy, w, h, fill: SOOT.dark });
    for (const [dx, dy, w] of [
      [3, 6, 1],
      [12, 5, 2],
      [7, 13, 1],
      [16, 15, 1],
    ])
      rects.push({
        x: BODY.left + dx,
        y: top + dy,
        w,
        h: 1,
        fill: SOOT.light,
      });
  }
  return rects;
}

/** The fins and the engine bell under the lowest piece, closing the body off along its bottom row. */
function engineRects(): Rect[] {
  const bodyBottomRow = -BELL_HEIGHT - 1;
  const rects: Rect[] = [insideRow(bodyBottomRow, COLORS.outline)];
  // The fins run down the lowest piece and on past its foot, beside the top half of the bell.
  const finTop = bodyBottomRow + BELL_HEIGHT / 2 + 1 - FIN_REACH.length;
  FIN_REACH.forEach((reach, row) => {
    const y = finTop + row;
    const isLeadingEdge = row === 0 || FIN_REACH[row - 1] !== reach;
    for (const side of [-1, 1] as const) {
      const nearX = side < 0 ? BODY.left - 1 : BODY.right + 1;
      const farX = nearX + side * (reach - 1);
      const isLit = side < 0;
      rects.push(
        {
          x: Math.min(nearX, farX),
          y,
          w: reach,
          h: 1,
          fill: isLit ? BAND.base : BAND.dark,
        },
        { x: farX + side, y, w: 1, h: 1, fill: COLORS.outline },
      );
      // The swept front edge catches the light on one fin and falls into shadow on the other.
      if (isLeadingEdge)
        rects.push({
          x: farX,
          y,
          w: 1,
          h: 1,
          fill: isLit ? BAND.light : BAND.deep,
        });
    }
  });
  const finFootY = finTop + FIN_REACH.length;
  const finFootWidth = FIN_REACH[FIN_REACH.length - 1] + 1;
  rects.push(
    {
      x: BODY.left - finFootWidth,
      y: finFootY,
      w: finFootWidth,
      h: 1,
      fill: COLORS.outline,
    },
    {
      x: BODY.right + 1,
      y: finFootY,
      w: finFootWidth,
      h: 1,
      fill: COLORS.outline,
    },
  );
  BELL_WIDTHS.forEach((width, row) =>
    rects.push(
      ...roundRects(
        -BELL_HEIGHT + row,
        1,
        width,
        row === BELL_HEIGHT - 1 ? BELL_LIP : BELL,
      ),
    ),
  );
  return rects;
}

/** How tall the rocket stands with this many stages left. */
export function rocketHeight(stageCount: number): number {
  return NOSE_HEIGHT + CAPSULE_HEIGHT + stageCount * STAGE_HEIGHT + BELL_HEIGHT;
}

/** The rocket with this many stages left, standing on y = 0. */
export function rocketRects(stageCount: number): Rect[] {
  const bodyBottom = -BELL_HEIGHT;
  const capsuleTop = bodyBottom - stageCount * STAGE_HEIGHT - CAPSULE_HEIGHT;
  const rects = [
    ...noseRects(capsuleTop - NOSE_HEIGHT),
    ...capsuleRects(capsuleTop),
  ];
  for (let stage = stageCount - 1; stage >= 0; stage -= 1)
    rects.push(...stageRects(bodyBottom - (stage + 1) * STAGE_HEIGHT, false));
  return [...rects, ...engineRects()];
}

/** A spent stage dropping away with its fins and bell, standing on y = 0: scorched when a scrub burned it. */
export function spentStageRects(isScorched: boolean): Rect[] {
  return [...stageRects(-SPENT_STAGE_HEIGHT, isScorched), ...engineRects()];
}
