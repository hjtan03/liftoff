/**
 * The game's pixel art. A sprite is rows of characters, one per pixel, each
 * character a key into a palette; "." is transparent. The astronauts and the
 * planets are generated, so a new mood or planet is a few lines, not a drawing.
 */

export type SpriteGrid = readonly string[];
export type Palette = Readonly<Record<string, string>>;

/** The colors every sprite draws from; the stylesheet's tokens use the same values. */
export const COLORS = {
  outline: "#120C2E",
  suit: "#F4F0FF",
  suitShade: "#C9C0EE",
  visor: "#24386E",
  visorShine: "#8FD3FF",
  eye: "#FFFFFF",
  blush: "#FF8FA3",
  tear: "#8FD3FF",
  orange: "#FF8B4D",
  orangeDark: "#D45A2A",
  fuel: "#63E6A8",
  fuelLight: "#B6F7D6",
  fuelDark: "#2E9E73",
  gold: "#FFD35C",
  steel: "#8C86B8",
  steelDark: "#5A5490",
  smoke: "#9C94C9",
} as const;

const SUIT_PALETTE: Palette = {
  K: COLORS.outline,
  W: COLORS.suit,
  w: COLORS.suitShade,
  V: COLORS.visor,
  h: COLORS.visorShine,
  e: COLORS.eye,
  b: COLORS.blush,
  t: COLORS.tear,
  G: COLORS.orange,
  O: COLORS.fuel,
};
export const ASTRONAUT_PALETTE = SUIT_PALETTE;

/** How a crew member feels, from watching the gauge to dancing on a perfect fill. */
export type Mood = "working" | "sad" | "meh" | "happy" | "cheer" | "party";

const ASTRONAUT_WIDTH = 15;
const ASTRONAUT_HEIGHT = 16;

/** One crew member, 15 × 16 pixels. holdsHose points the right arm at the tank. */
export function astronaut(mood: Mood, holdsHose = false): SpriteGrid {
  const grid = Array.from({ length: ASTRONAUT_HEIGHT }, () =>
    Array<string>(ASTRONAUT_WIDTH).fill("."),
  );
  const put = (x: number, y: number, c: string) => {
    if (x >= 0 && x < ASTRONAUT_WIDTH && y >= 0 && y < ASTRONAUT_HEIGHT)
      grid[y][x] = c;
  };
  const hline = (x0: number, x1: number, y: number, c: string) => {
    for (let x = x0; x <= x1; x += 1) put(x, y, c);
  };

  // Helmet with visor.
  hline(5, 9, 0, "K");
  put(4, 1, "K");
  hline(5, 9, 1, "W");
  put(10, 1, "K");
  for (const y of [2, 3, 4]) {
    put(3, y, "K");
    put(4, y, "W");
    hline(5, 9, y, "V");
    put(10, y, "W");
    put(11, y, "K");
  }
  put(4, 5, "K");
  hline(5, 9, 5, "W");
  put(10, 5, "K");
  put(5, 2, "h");

  // Face.
  const eyeRow = mood === "sad" ? 4 : 3;
  put(6, eyeRow, "e");
  put(8, eyeRow, "e");
  if (mood === "happy" || mood === "cheer" || mood === "party") {
    put(5, 4, "b");
    put(9, 4, "b");
  }
  if (mood === "cheer" || mood === "party") put(7, 4, "e");
  if (mood === "sad") put(9, 3, "t");

  // Body, belt, badge.
  hline(4, 10, 6, "K");
  for (let y = 7; y <= 11; y += 1) {
    put(4, y, "K");
    hline(5, 9, y, y === 10 ? "w" : "W");
    put(10, y, "K");
  }
  put(7, 8, "O");

  // Legs and boots.
  for (const y of [12, 13]) {
    put(4, y, "K");
    put(5, y, "W");
    put(6, y, "K");
    put(8, y, "K");
    put(9, y, "W");
    put(10, y, "K");
  }
  hline(4, 6, 14, "G");
  hline(8, 10, 14, "G");
  hline(4, 6, 15, "K");
  hline(8, 10, 15, "K");

  // Arms.
  const armDown = (side: -1 | 1) => {
    const x = side < 0 ? 3 : 11;
    for (let y = 7; y <= 9; y += 1) put(x, y, "W");
    put(x + side, 7, "K");
    put(x + side, 8, "K");
    put(x + side, 9, "K");
    put(x, 10, "G");
  };
  const armUp = (side: -1 | 1) => {
    const x = side < 0 ? 3 : 11;
    put(x, 7, "W");
    put(x + side, 6, "W");
    put(x + side, 5, "W");
    put(x + 2 * side, 4, "G");
    put(x + 2 * side, 3, "G");
  };
  const armOut = (side: -1 | 1) => {
    const x = side < 0 ? 3 : 11;
    put(x, 7, "W");
    put(x + side, 7, "W");
    put(x + 2 * side, 6, "G");
  };
  const armForward = () => {
    put(11, 8, "W");
    put(12, 8, "W");
    put(13, 8, "G");
    put(11, 9, "K");
    put(12, 9, "K");
  };

  if (holdsHose && mood !== "cheer" && mood !== "party") {
    armForward();
    armDown(-1);
  } else if (mood === "cheer" || mood === "party") {
    armUp(-1);
    armUp(1);
  } else if (mood === "happy") {
    armDown(-1);
    armUp(1);
  } else if (mood === "meh") {
    armOut(-1);
    armOut(1);
  } else {
    armDown(-1);
    armDown(1);
  }

  return grid.map((row) => row.join(""));
}

export const ROCKET_PALETTE: Palette = {
  K: COLORS.outline,
  W: COLORS.suit,
  w: COLORS.suitShade,
  B: COLORS.steelDark,
  L: COLORS.visorShine,
  O: COLORS.orange,
  o: COLORS.orangeDark,
  F: COLORS.gold,
  f: COLORS.orange,
};

/** The rocket, 13 × 22 pixels, nose up. The last three rows are its flame. */
export const ROCKET: SpriteGrid = [
  "......K......",
  ".....KOK.....",
  "....KOOOK....",
  "....KWWWK....",
  "...KWWWWwK...",
  "...KWKKKwK...",
  "...KWKLKwK...",
  "...KWKKKwK...",
  "...KWWWWwK...",
  "...KWWWWwK...",
  "...KOOOOoK...",
  "...KWWWWwK...",
  "..KKWWWWwKK..",
  ".KOKWWWWwKOK.",
  "KOOKWWWWwKOoK",
  "KOK.KBBBK.KOK",
  "KK..KBBBK..KK",
  ".....KKK.....",
  "....FffF.....",
  ".....FfF.....",
  ".....FF......",
  "......F......",
];

/** A planet's look: its radius in pixels, its bands top to bottom, and whether it wears rings. */
type PlanetLook = {
  radius: number;
  bands: readonly string[];
  ringed?: boolean;
};

export const PLANET_LOOKS: Readonly<Record<string, PlanetLook>> = {
  "the Moon": { radius: 4, bands: ["#D9D4EE", "#B9B2D9", "#D9D4EE"] },
  Mars: { radius: 4, bands: ["#FF9A6B", "#E0623A", "#C9502F", "#E0623A"] },
  Jupiter: {
    radius: 7,
    bands: ["#F2D3A6", "#D9A066", "#F7E3C4", "#C98A55", "#F2D3A6", "#D9A066"],
  },
  Saturn: {
    radius: 5,
    bands: ["#F7E3A1", "#E5C77A", "#F7E3A1", "#D4B060"],
    ringed: true,
  },
  Uranus: { radius: 5, bands: ["#A8F0F0", "#7FDADB", "#A8F0F0"] },
  Neptune: { radius: 5, bands: ["#6F8CFF", "#4C63E0", "#6F8CFF", "#3D4FC2"] },
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

/**
 * A planet rasterized to pixels: a filled circle in horizontal bands, the
 * lower-right crescent in a darker shade of each band, and an optional ring
 * that passes behind the top half and in front of the bottom half.
 */
export function planet(look: PlanetLook): {
  grid: SpriteGrid;
  palette: Palette;
} {
  const { radius: r, bands, ringed } = look;
  const margin = ringed ? 4 : 0;
  const size = 2 * r + 1;
  const palette: Record<string, string> = { R: "#E8D9A8", r: "#B8A878" };
  bands.forEach((color, index) => {
    palette[String(index)] = color;
    palette[String.fromCharCode(97 + index)] = shade(color);
  });
  const rows: string[] = [];
  for (let y = -r; y <= r; y += 1) {
    let row = "";
    for (let x = -r - margin; x <= r + margin; x += 1) {
      const inside = x * x + y * y <= r * r + r * 0.6;
      const onRing = ringed && y === Math.round(-x * 0.4) && Math.abs(x) > 1;
      if (onRing && (!inside || y > 0)) {
        row += x > 0 ? "r" : "R";
      } else if (inside) {
        const band = Math.min(
          bands.length - 1,
          Math.floor(((y + r) / size) * bands.length),
        );
        const inShadow = x + y > r * 0.55 && x * x + y * y > r * r * 0.45;
        row += inShadow ? String.fromCharCode(97 + band) : String(band);
      } else row += ".";
    }
    rows.push(row);
  }
  return { grid: rows, palette };
}
