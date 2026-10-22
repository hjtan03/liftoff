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
  glass: "#BFE3FF",
  skin: "#FFD2A8",
  hair: "#7A4A2A",
  mouth: "#E0466A",
} as const;

const SUIT_PALETTE: Palette = {
  K: COLORS.outline,
  W: COLORS.suit,
  w: COLORS.suitShade,
  g: COLORS.glass,
  h: COLORS.eye,
  S: COLORS.skin,
  H: COLORS.hair,
  b: COLORS.blush,
  t: COLORS.tear,
  M: COLORS.mouth,
  G: COLORS.orange,
  O: COLORS.orange,
  R: COLORS.blush,
  B: COLORS.visorShine,
  E: COLORS.fuel,
};
export const ASTRONAUT_PALETTE = SUIT_PALETTE;

/** How a crew member feels, from concentrating on the job to dancing on a perfect fill. */
export type Mood = "working" | "sad" | "meh" | "happy" | "cheer" | "party";

/**
 * What a crew member's body is doing. Run and pump cycle through frames;
 * hose holds the nozzle out at the tank's valve.
 */
export type Pose =
  "stand" | "run" | "hose" | "pump" | "cheer" | "shrug" | "slump";

export const ASTRONAUT_WIDTH = 16;
export const ASTRONAUT_HEIGHT = 20;
/** Where the front glove sits in the hose pose, in sprite pixels: the hose attaches here. */
export const HOSE_HAND = { x: 14, y: 14 } as const;

/**
 * One crew member, 16 × 20 pixels, turned three-quarters to the right: a
 * round glass helmet with a face inside, a white suit with a chest panel, a
 * life-support pack on the back, orange gloves and boots.
 */
export function astronaut(
  mood: Mood,
  pose: Pose = "stand",
  frame = 0,
  isBlinking = false,
): SpriteGrid {
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
  const vline = (x: number, y0: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y += 1) put(x, y, c);
  };

  // Life-support pack, behind everything else.
  for (let y = 10; y <= 16; y += 1) hline(1, 3, y, "w");
  vline(0, 10, 16, "K");
  hline(1, 3, 9, "K");
  hline(1, 3, 17, "K");
  put(2, 12, "E");

  // Suit: torso with a chest panel and a belt.
  for (let y = 11; y <= 16; y += 1) {
    put(3, y, "K");
    hline(4, 10, y, "W");
    put(11, y, "w");
    put(12, y, "K");
  }
  hline(4, 11, 16, "w");
  put(7, 13, "O");
  put(8, 13, "R");
  put(9, 13, "B");

  // Helmet: a glass bubble with the face inside and a shine on the glass.
  for (let y = 0; y <= 11; y += 1) {
    for (let x = 1; x <= 14; x += 1) {
      const d = Math.hypot(x - 7.5, y - 5.5);
      if (d > 5.9) continue;
      if (d > 4.9) {
        put(x, y, "K");
        continue;
      }
      const fx = (x - 8.6) / 3.4;
      const fy = (y - 6.4) / 3.1;
      if (fx * fx + fy * fy <= 1) put(x, y, y <= 3 ? "H" : "S");
      else put(x, y, "g");
    }
  }
  put(4, 3, "h");
  put(4, 4, "h");
  put(5, 2, "h");
  hline(4, 11, 11, "w");
  put(3, 11, "K");
  put(12, 11, "K");

  // Face: eyes, cheeks, mouth.
  const eyeY = mood === "sad" ? 6 : 5;
  const eyes = [7, 10];
  for (const x of eyes) {
    if (isBlinking) put(x, eyeY + 1, "K");
    else if (mood === "happy" || mood === "party") put(x, eyeY, "K");
    else {
      put(x, eyeY, "K");
      put(x, eyeY + 1, "K");
    }
  }
  if (mood !== "sad" && mood !== "working") {
    put(6, 7, "b");
    put(11, 7, "b");
  }
  if (mood === "sad") {
    put(7, 9, "K");
    hline(8, 9, 8, "K");
    put(10, 9, "K");
    put(11, 7, "t");
    put(11, 8, "t");
  } else if (mood === "cheer" || mood === "party") {
    hline(8, 9, 8, "M");
    hline(8, 9, 9, "M");
  } else if (mood === "happy") {
    put(7, 8, "K");
    hline(8, 9, 9, "K");
    put(10, 8, "K");
  } else {
    hline(8, 9, 8, "K");
  }

  // Legs and boots, by pose and frame.
  const leg = (hipX: number, footX: number, lifted: boolean) => {
    const footY = lifted ? 18 : 19;
    put(hipX, 17, "W");
    put(hipX + 1, 17, "w");
    put(footX, footY - 1, "W");
    put(footX + 1, footY - 1, "w");
    hline(footX, footX + 2, footY, "G");
  };
  if (pose === "run") {
    const step = frame % 4;
    if (step === 0) {
      leg(8, 10, false);
      leg(5, 3, true);
    } else if (step === 2) {
      leg(5, 4, false);
      leg(8, 9, true);
    } else {
      leg(5, 5, false);
      leg(8, 8, true);
    }
  } else if (pose === "cheer" && frame % 2 === 1) {
    leg(5, 5, true);
    leg(8, 8, true);
  } else {
    leg(5, 5, false);
    leg(8, 8, false);
  }

  // Arms: the far arm mostly hides behind the pack; the near arm does the work.
  const glove = (x: number, y: number) => put(x, y, "G");
  switch (pose) {
    case "run": {
      const swingForward = frame % 4 < 2;
      if (swingForward) {
        put(12, 12, "W");
        put(13, 13, "W");
        glove(14, 13);
      } else {
        vline(12, 12, 14, "W");
        glove(11, 15);
      }
      break;
    }
    case "hose":
      put(12, 12, "W");
      put(13, 13, "W");
      glove(HOSE_HAND.x, HOSE_HAND.y);
      glove(13, 14);
      break;
    case "pump":
      if (frame % 2 === 0) {
        put(12, 12, "W");
        put(13, 12, "W");
        glove(14, 11);
      } else {
        put(12, 13, "W");
        put(13, 14, "W");
        glove(14, 15);
      }
      break;
    case "cheer":
      put(12, 10, "W");
      put(13, 9, "W");
      glove(13, 8);
      put(2, 9, "W");
      glove(1, 8);
      break;
    case "shrug":
      put(12, 12, "W");
      put(13, 12, "W");
      glove(14, 11);
      put(2, 11, "W");
      glove(1, 10);
      break;
    case "slump":
      vline(12, 13, 15, "W");
      glove(12, 16);
      break;
    default:
      vline(12, 12, 14, "W");
      glove(12, 15);
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
