/**
 * The game's pixel art. A sprite is rows of characters, one per pixel, each
 * character a key into a palette; "." is transparent. The spectators and the
 * planets are generated, so a new look or planet is a few lines, not a drawing.
 */

export type SpriteGrid = readonly string[];
export type Palette = Readonly<Record<string, string>>;
/** Art drawn as plain rects, for shapes too big or too regular to keep as a grid. */
export type Rect = { x: number; y: number; w: number; h: number; fill: string };

/** A sprite as plain rects, each row's same-coloured pixels merged into one, so a sprite is a few dozen rects, not hundreds. */
export function gridRects(grid: SpriteGrid, palette: Palette): Rect[] {
  const rects: Rect[] = [];
  grid.forEach((row, rowIndex) => {
    let start = 0;
    while (start < row.length) {
      let end = start + 1;
      while (end < row.length && row[end] === row[start]) end += 1;
      const fill = palette[row[start]];
      if (fill)
        rects.push({ x: start, y: rowIndex, w: end - start, h: 1, fill });
      start = end;
    }
  });
  return rects;
}

/** The colors every sprite draws from; the stylesheet's tokens use the same values. */
export const COLORS = {
  outline: "#120C2E",
  white: "#FFFFFF",
  offWhite: "#F4F0FF",
  glass: "#8FD3FF",
  deepGlass: "#24386E",
  pink: "#FF8FA3",
  orange: "#FF8B4D",
  orangeDark: "#D45A2A",
  fuel: "#63E6A8",
  gold: "#FFD35C",
  steel: "#8C86B8",
  steelDark: "#5A5490",
} as const;

/** The launch site at dusk, and the sky over it all the way up into space. */
export const LANDSCAPE = {
  skyHorizon: "#F4AACB",
  skyLow: "#D99BE2",
  skyMid: "#A986E0",
  skyHigh: "#7D66CF",
  upperAir: "#4E3FA8",
  space: "#241C63",
  spaceDeep: "#0D0B28",
  mountainFar: "#8A72C2",
  mountainFarLight: "#9E86CF",
  hillMid: "#4A3B86",
  hillMidLight: "#57479A",
  hillMidDark: "#3D3176",
  scrub: "#2E2660",
  scrubLight: "#3A3170",
  grass: "#2F3566",
  grassLight: "#434A82",
  grassDark: "#252A55",
  concrete: "#8E89B8",
  concreteSeam: "#6E6A9C",
  building: "#5B548F",
  buildingShade: "#463F78",
  litWindow: "#FFD98A",
  lamp: "#FFF1C2",
  stripe: "#E8435A",
} as const;

/** One spectator's look: their colouring, whether they are a child, and what they brought to the launch. */
export type SpectatorLook = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  isChild?: boolean;
  hasLongHair?: boolean;
  /** A cap's colour, worn instead of showing the hair on top. */
  cap?: string;
  holds?: "flag" | "camera";
};

/** What a spectator's body is doing: cheer and wave cycle through frames, dismay is both hands on the head. */
export type SpectatorPose = "stand" | "cheer" | "wave" | "dismay";

/** The spectators' palette for one look; the flag and the camera are the same for everyone. */
export function spectatorPalette(look: SpectatorLook): Palette {
  return {
    K: COLORS.outline,
    S: look.skin,
    h: look.hair,
    c: look.cap ?? look.hair,
    T: look.shirt,
    t: shade(look.shirt, 0.25),
    P: look.pants,
    B: "#1E1838",
    F: COLORS.pink,
    f: COLORS.offWhite,
    W: COLORS.steel,
    C: "#2A2448",
    L: COLORS.white,
  };
}

/**
 * One spectator, 9 pixels wide and 15 tall, or 13 for a child, facing the
 * pad: a round head with hair or a cap, a shirt shaded on the far side,
 * trousers and shoes, and arms by pose. The top two rows are for raised
 * hands and a flag held high. A camera, when they have one, comes up to
 * their face whenever their hands are free, and flashes on odd frames.
 */
export function spectator(
  look: SpectatorLook,
  pose: SpectatorPose,
  frame = 0,
): SpriteGrid {
  const width = 9;
  const height = look.isChild ? 13 : 15;
  const grid = Array.from({ length: height }, () =>
    Array<string>(width).fill("."),
  );
  const put = (x: number, y: number, c: string) => {
    if (x >= 0 && x < width && y >= 0 && y < height) grid[y][x] = c;
  };
  const hline = (x0: number, x1: number, y: number, c: string) => {
    for (let x = x0; x <= x1; x += 1) put(x, y, c);
  };
  const vline = (x: number, y0: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y += 1) put(x, y, c);
  };

  // Head: hair or a cap with its brim, then the face with two dark eyes.
  const head = 2;
  const top = look.cap ? "c" : "h";
  hline(3, 5, head, top);
  hline(2, 6, head + 1, top);
  if (look.cap) put(7, head + 1, "c");
  hline(2, 6, head + 2, "S");
  hline(2, 6, head + 3, "S");
  put(3, head + 3, "K");
  put(5, head + 3, "K");
  if (look.hasLongHair) {
    vline(2, head + 2, head + 4, "h");
    vline(6, head + 2, head + 4, "h");
  }
  hline(3, 5, head + 4, "S");

  // Body: shirt, trousers, shoes; a child is shorter in both.
  const shoulders = head + 5;
  const torsoRows = look.isChild ? 2 : 3;
  for (let row = 0; row <= torsoRows; row += 1) {
    hline(2, 6, shoulders + row, "T");
    put(6, shoulders + row, "t");
  }
  const hips = shoulders + torsoRows + 1;
  hline(3, 5, hips, "P");
  for (let y = hips + 1; y < height - 1; y += 1) {
    put(3, y, "P");
    put(5, y, "P");
  }
  hline(2, 3, height - 1, "B");
  hline(5, 6, height - 1, "B");

  // Arms, by pose.
  const armDown = (x: number) => {
    vline(x, shoulders + 1, shoulders + 2, "T");
    put(x, shoulders + 3, "S");
  };
  const armUp = (x: number, handX: number) => {
    vline(x, head + 2, shoulders, "T");
    put(handX, head + 1, "S");
  };
  const isFlashing = frame % 2 === 1;
  switch (pose) {
    case "cheer":
      armUp(1, frame % 2 ? 0 : 1);
      armUp(7, frame % 2 ? 8 : 7);
      break;
    case "wave":
      armDown(1);
      armUp(7, frame % 2 ? 8 : 7);
      break;
    case "dismay":
      vline(1, head + 2, shoulders, "T");
      vline(7, head + 2, shoulders, "T");
      put(2, head + 1, "S");
      put(6, head + 1, "S");
      break;
    default:
      if (look.holds === "camera") {
        // The camera up at the face, both hands on it, flashing.
        vline(1, head + 4, shoulders + 1, "T");
        vline(7, head + 4, shoulders + 1, "T");
        hline(2, 6, head + 3, "C");
        put(4, head + 3, "K");
        put(2, head + 4, "S");
        put(6, head + 4, "S");
        if (isFlashing) {
          put(5, head + 2, "L");
          put(5, head, "L");
          put(7, head + 2, "L");
        }
      } else {
        armDown(1);
        armDown(7);
      }
  }
  // A flag held high on a stick in the right hand, its cloth flying.
  if (look.holds === "flag" && (pose === "cheer" || pose === "wave")) {
    const handX = frame % 2 ? 8 : 7;
    vline(handX, 0, head, "W");
    hline(handX - 3, handX - 1, frame % 2 ? 0 : 1, "F");
    hline(handX - 3, handX - 1, frame % 2 ? 1 : 0, "f");
  }

  return grid.map((row) => row.join(""));
}

export const ROCKET_PALETTE: Palette = {
  K: COLORS.outline,
  W: "#EEEAF8",
  w: "#C2BADF",
  R: "#E8435A",
  r: "#A92E4B",
  L: COLORS.glass,
  P: "#FF8FBF",
  p: "#D45E93",
  B: COLORS.steel,
};

/** The game's mark, 11 × 18 pixels: the slim rocket, nose up. */
export const ROCKET: SpriteGrid = [
  ".....K.....",
  "....KRK....",
  "....KRK....",
  "...KRRrK...",
  "...KRRrK...",
  "..KRRRRrK..",
  "..KWWWWwK..",
  "..KWKKKwK..",
  "..KWKLKwK..",
  "..KWKKKwK..",
  "..KWWWWwK..",
  "..KRRRRrK..",
  "..KWWWWwK..",
  ".KKWWWWwKK.",
  "KPKWWWWwKpK",
  "KPKWWWWwKpK",
  "KPKKBBBKKpK",
  "KKK.KBK.KKK",
];

export const SPEAKER_PALETTE: Palette = {
  W: COLORS.offWhite,
  G: COLORS.gold,
  R: COLORS.pink,
};

/** The sound switch's speaker, 12 × 9 pixels: sound waves while on, a cross while muted. */
export const SPEAKER_ON: SpriteGrid = [
  "....W.......",
  "...WW.....G.",
  "..WWW..G...G",
  "WWWWW...G..G",
  "WWWWW...G..G",
  "WWWWW...G..G",
  "..WWW..G...G",
  "...WW.....G.",
  "....W.......",
];
export const SPEAKER_OFF: SpriteGrid = [
  "....W.......",
  "...WW.......",
  "..WWW..R...R",
  "WWWWW...R.R.",
  "WWWWW....R..",
  "WWWWW...R.R.",
  "..WWW..R...R",
  "...WW.......",
  "....W.......",
];

/** A cloud's look: its size, and the round puffs it is built from, as centres and radii in pixels. */
type CloudLook = {
  width: number;
  height: number;
  puffs: readonly { x: number; y: number; r: number }[];
};

export const CLOUD_LOOKS: readonly CloudLook[] = [
  {
    width: 34,
    height: 12,
    puffs: [
      { x: 7, y: 8, r: 4 },
      { x: 14, y: 6, r: 6 },
      { x: 22, y: 6, r: 5 },
      { x: 28, y: 8, r: 4 },
    ],
  },
  {
    width: 22,
    height: 9,
    puffs: [
      { x: 6, y: 6, r: 3 },
      { x: 11, y: 4, r: 4 },
      { x: 17, y: 6, r: 3 },
    ],
  },
  {
    width: 46,
    height: 14,
    puffs: [
      { x: 7, y: 10, r: 4 },
      { x: 15, y: 7, r: 6 },
      { x: 24, y: 5, r: 7 },
      { x: 33, y: 8, r: 5 },
      { x: 40, y: 10, r: 4 },
    ],
  },
];

export const CLOUD_PALETTE: Palette = {
  W: "#FBF0FF",
  w: "#E2CDF6",
  s: "#BBA1E6",
  o: "#957CD2",
};

/**
 * A cloud rasterized from its puffs, cut flat along the bottom: bright where
 * the last light catches the top edge, lavender through the middle, a
 * dithered turn into the shaded underside, and a darker last row.
 */
export function cloud(look: CloudLook): SpriteGrid {
  const { width, height, puffs } = look;
  const isInside = (x: number, y: number) =>
    y >= 0 &&
    y < height &&
    puffs.some(
      (puff) => (x - puff.x) ** 2 + (y - puff.y) ** 2 <= puff.r ** 2 + puff.r,
    );
  const rows: string[] = [];
  for (let y = 0; y < height; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      if (!isInside(x, y)) row += ".";
      else if (y === height - 1) row += "o";
      else if (y >= height - 3) row += "s";
      else if (y === height - 4) row += (x + y) % 2 ? "s" : "w";
      else if (!isInside(x, y - 1)) row += "W";
      else row += "w";
    }
    rows.push(row);
  }
  return rows;
}

/** The launch site's little lives: a gull on the tower, a rabbit in the grass, a tanker on the service road, a blimp far off. */
export const CRITTER_PALETTE: Palette = {
  K: COLORS.outline,
  W: "#D9D2F0",
  w: "#9F97C4",
  O: COLORS.orange,
  o: COLORS.orangeDark,
  F: "#B7A6C9",
  f: "#8F7FA6",
  B: LANDSCAPE.stripe,
  L: LANDSCAPE.litWindow,
  s: COLORS.steelDark,
};

/** A gull, 7 × 5 pixels: perched, then with its wings up. */
export const GULL_FRAMES: readonly SpriteGrid[] = [
  ["...WW..", "..WWKO.", "wwWWW..", ".wwWW..", "..o.o.."],
  ["w....w.", ".w..WW.", "..wWWKO", "..wWW..", "..o.o.."],
];

/** A rabbit, 8 × 6 pixels: sitting, then mid-hop. */
export const RABBIT_FRAMES: readonly SpriteGrid[] = [
  ["....ff..", "....fF..", ".fffFFF.", "fffFFFKF", "fffFFFF.", ".ff..ff."],
  ["......ff", ".....fF.", "..fffFFF", "fffFFFKF", ".ffFF...", "f....ff."],
];

/** A fuel tanker, 30 × 9 pixels, facing right. */
export const TANKER: SpriteGrid = [
  "..KKKKKKKKKKKKKKKKKK..........",
  ".KWWWWWWWWWWWWWWWWWWK...KKKK..",
  "KWWWWWWWWWWWWWWWWWWWWK.KOOOOK.",
  "KWBBBBBBBBBBBBBBBBBBWK.KOLLOOK",
  "KWWWWWWWWWWWWWWWWWWWWK.KOLLOOK",
  ".KwwwwwwwwwwwwwwwwwwK..KOOOOOK",
  "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "..KssK....KssK.......KssK.KssK",
  "...KK......KK.........KK...KK.",
];

/** A blimp, 28 × 10 pixels, drifting far off. */
export const BLIMP: SpriteGrid = [
  "......KKKKKKKKKKKKK.........",
  "....KKWWWWWWWWWWWWWKK.......",
  "..KKWWWWWWWWWWWWWWWWWKK..KK.",
  ".KWWBBBBBBBBBBBBBBBBWWWKKWK.",
  "KWWWWWWWWWWWWWWWWWWWWWWWKWWK",
  ".KwwwwwwwwwwwwwwwwwwwwwKKwK.",
  "..KKwwwwwwwwwwwwwwwwwKK..KK.",
  "....KKKKKKKKKKKKKKKKK.......",
  "..........KOOOOK............",
  "...........KKKK.............",
];

/** The exhaust: white-hot at the core, through pink, to lilac at its edge. */
export const PLUME = {
  core: "#FFFFFF",
  hot: "#FFE6F5",
  pink: "#FFB2DE",
  lilac: "#D69BFF",
  edge: "#9C7BEA",
} as const;

export const FLAME_PALETTE: Palette = {
  W: PLUME.core,
  Y: PLUME.hot,
  F: PLUME.pink,
  f: PLUME.lilac,
  o: PLUME.edge,
};

/** The engine at full burn, 13 × 14 pixels in three flickers: a white-hot core in a pink and lilac flame. */
export const FLAME_FRAMES: readonly SpriteGrid[] = [
  [
    "..ofFFFFFfo..",
    "..fFYWWYFf...",
    "..fFYWWYFfo..",
    "...fFYWYFf...",
    "...fFYYYFf...",
    "...ofFYFfo...",
    "....fFYFf....",
    "....ofFfo....",
    ".....fFf.....",
    ".....ofo.....",
    "......f......",
    "......o......",
    ".............",
    ".............",
  ],
  [
    ".ofFFFFFFFfo.",
    "..fFYWWWYFf..",
    "..fFYWWWYFf..",
    "..ofFYWYFfo..",
    "...fFYYYFf...",
    "...fFYYYFf...",
    "....fFYFf....",
    "....fFYFfo...",
    "....ofFFf....",
    ".....fFf.....",
    ".....ofo.....",
    "......f......",
    "......o......",
    ".............",
  ],
  [
    "..ofFFFFFfo..",
    ".ofFYWWWYFfo.",
    "..fFYWWWYFf..",
    "..fFYWWYFfo..",
    "..ofFYWYFf...",
    "...fFYYYFf...",
    "...ofFYYFf...",
    "....fFYFfo...",
    "....fFYFf....",
    "....ofFfo....",
    ".....fFf.....",
    ".....ofo.....",
    "......f......",
    "......o......",
  ],
];

/** The engine idling between burns, 9 × 4 pixels in two flickers. */
export const IDLE_FLAME_FRAMES: readonly SpriteGrid[] = [
  [".ofFFFfo.", "..fFYFf..", "...fFf...", "....o...."],
  ["..fFFFf..", "..oFYFo..", "...fFf...", "...o....."],
];

export const SMOKE_PALETTE: Palette = {
  W: "#E6DCFA",
  w: "#BDB0E2",
  s: "#8E80BE",
};

/** The dark smoke a scrubbed engine coughs out. */
export const SOOT_PALETTE: Palette = {
  W: "#8C82AE",
  w: "#6E6491",
  s: "#4F4673",
};

export const SPARKLE_PALETTE: Palette = {
  W: "#FFFFFF",
  w: "#CDB8FF",
};

/** A four-pointed sparkle in the night sky, 7 × 7 pixels. */
export const SPARKLE: SpriteGrid = [
  "...w...",
  "...W...",
  "..wWw..",
  "wWWWWWw",
  "..wWw..",
  "...W...",
  "...w...",
];

/**
 * A puff of smoke of the given radius in pixels, lit from the upper left:
 * a bright cap, a soft middle and a shaded underside, each turning into
 * the next through a checkered edge, so a big puff reads as round.
 */
export function smokePuff(radius: number): SpriteGrid {
  const rows: string[] = [];
  for (let y = -radius; y <= radius; y += 1) {
    let row = "";
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y > radius * radius + radius * 0.5) {
        row += ".";
        continue;
      }
      const isChecker = (x + y) % 2 !== 0;
      // Lit inside a small circle toward the light; shaded outside a large one shifted the same way.
      const litReach =
        Math.hypot(x + radius * 0.3, y + radius * 0.45) - radius * 0.62;
      const shadeReach =
        Math.hypot(x + radius * 0.25, y + radius * 0.3) - radius * 0.95;
      if (litReach < -1 || (litReach < 1 && isChecker)) row += "W";
      else if (shadeReach > 1 || (shadeReach > -1 && isChecker)) row += "s";
      else row += "w";
    }
    rows.push(row);
  }
  return rows;
}

export const BIRD_PALETTE: Palette = { K: "#2A1F4F" };

/** A bird far off, 5 × 3 pixels: wings out, then wings up. */
export const BIRD_FRAMES: readonly SpriteGrid[] = [
  [".....", "KK.KK", "..K.."],
  ["K...K", ".K.K.", "..K.."],
];

/** A planet's look: its radius in pixels, its bands top to bottom, round marks on its face, and whether it wears rings. */
type PlanetLook = {
  radius: number;
  bands: readonly string[];
  /** Craters and storms: centre and radius as shares of the planet's radius, and their colour. */
  spots?: readonly { x: number; y: number; r: number; color: string }[];
  isRinged?: boolean;
};

/** The planets the rocket passes, big enough beside it to feel the distance. */
export const PLANET_LOOKS: Readonly<Record<string, PlanetLook>> = {
  "the Moon": {
    radius: 44,
    bands: ["#E4DFF4", "#D9D4EE", "#CFC9E6"],
    spots: [
      { x: -0.35, y: -0.25, r: 0.2, color: "#B9B2D9" },
      { x: 0.25, y: 0.3, r: 0.15, color: "#B9B2D9" },
      { x: 0.3, y: -0.45, r: 0.1, color: "#C4BDE0" },
      { x: -0.15, y: 0.55, r: 0.09, color: "#C4BDE0" },
      { x: -0.6, y: 0.2, r: 0.08, color: "#B9B2D9" },
    ],
  },
  Mars: {
    radius: 52,
    bands: ["#FF9A6B", "#E0623A", "#C9502F", "#E0623A"],
    spots: [
      { x: 0, y: -0.92, r: 0.3, color: "#FFE9E0" },
      { x: -0.3, y: 0.15, r: 0.22, color: "#A9442A" },
      { x: 0.35, y: -0.2, r: 0.12, color: "#A9442A" },
    ],
  },
  Jupiter: {
    radius: 116,
    bands: [
      "#F2D3A6",
      "#D9A066",
      "#F7E3C4",
      "#C98A55",
      "#F2D3A6",
      "#D9A066",
      "#F7E3C4",
    ],
    spots: [{ x: 0.3, y: 0.32, r: 0.16, color: "#C9502F" }],
  },
  Saturn: {
    radius: 92,
    bands: ["#F7E3A1", "#E5C77A", "#F7E3A1", "#D4B060", "#E5C77A"],
    isRinged: true,
  },
  Uranus: { radius: 72, bands: ["#B8F4F2", "#A8F0F0", "#7FDADB", "#A8F0F0"] },
  Neptune: {
    radius: 72,
    bands: ["#6F8CFF", "#4C63E0", "#6F8CFF", "#3D4FC2"],
    spots: [{ x: -0.25, y: -0.15, r: 0.13, color: "#2E3A9E" }],
  },
};

/** Darkens a #rrggbb color by mixing it toward the night outline. */
function shade(hex: string, amount = 0.35): string {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16);
    const target = parseInt(COLORS.outline.slice(offset, offset + 2), 16);
    return Math.round(value + (target - value) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Saturn's rings, as shares of the planet's radius: the ellipse they fill, how flat it is, and its tilt in radians. */
const RING = { inner: 1.3, outer: 1.9, flatness: 0.26, tilt: -0.3 };

/**
 * A planet rasterized to pixels: a filled circle in horizontal bands with
 * its marks on top, lit from the upper left so a crescent of shadow sits
 * on the lower right behind a dithered edge, and rings that pass behind
 * its top half and in front of its bottom half.
 */
export function planet(look: PlanetLook): {
  grid: SpriteGrid;
  palette: Palette;
} {
  const { radius: r, bands, spots = [], isRinged } = look;
  const palette: Record<string, string> = {
    R: "#E8D9A8",
    r: shade("#E8D9A8"),
  };
  // Bands are digits, marks are letters from A; each one's shadow is the lower-case letter that pairs with it.
  const keys = [...bands, ...spots.map((spot) => spot.color)].map(
    (color, index) => {
      const lit =
        index < bands.length ? String(index) : String.fromCharCode(65 + index);
      const dark = String.fromCharCode(97 + index);
      palette[lit] = color;
      palette[dark] = shade(color);
      return { lit, dark };
    },
  );
  const ringCos = Math.cos(RING.tilt);
  const ringSin = Math.sin(RING.tilt);
  const ringHalfWidth = isRinged
    ? Math.ceil(
        r *
          Math.hypot(
            RING.outer * ringCos,
            RING.outer * RING.flatness * ringSin,
          ),
      )
    : r;
  const ringHalfHeight = isRinged
    ? Math.ceil(
        r *
          Math.hypot(
            RING.outer * ringSin,
            RING.outer * RING.flatness * ringCos,
          ),
      )
    : r;
  const halfHeight = Math.max(r, ringHalfHeight);
  const rows: string[] = [];
  for (let y = -halfHeight; y <= halfHeight; y += 1) {
    let row = "";
    for (let x = -ringHalfWidth; x <= ringHalfWidth; x += 1) {
      const isInside = x * x + y * y <= r * r + r * 0.6;
      // The ring in its own frame: along it, and across it, in shares of the planet's radius.
      const along = (x * ringCos + y * ringSin) / r;
      const across = (-x * ringSin + y * ringCos) / r / RING.flatness;
      const ringReach = Math.hypot(along, across);
      const isOnRing =
        isRinged && ringReach >= RING.inner && ringReach <= RING.outer;
      if (isOnRing && (!isInside || across > 0)) {
        row += along > 0.4 ? "r" : "R";
        continue;
      }
      if (!isInside) {
        row += ".";
        continue;
      }
      const spotIndex = spots.findIndex(
        (spot) => (x / r - spot.x) ** 2 + (y / r - spot.y) ** 2 <= spot.r ** 2,
      );
      const key =
        keys[
          spotIndex >= 0
            ? bands.length + spotIndex
            : Math.min(
                bands.length - 1,
                Math.floor(((y + r) / (2 * r + 1)) * bands.length),
              )
        ];
      // Shadow where a circle shifted toward the light no longer covers, with a checkered edge between.
      const litReach = Math.hypot(x + r * 0.35, y + r * 0.35) - r * 1.02;
      const isShadow = litReach > 1 || (litReach > -1 && (x + y) % 2 !== 0);
      row += isShadow ? key.dark : key.lit;
    }
    rows.push(row);
  }
  return { grid: rows, palette };
}
