import { memo } from "react";
import type { Palette, SpriteGrid } from "./sprites";

type Run = { x: number; y: number; width: number; color: string };

/** Merges each row's same-colored pixels into runs, so a sprite is a few dozen rects, not hundreds. */
function toRuns(grid: SpriteGrid, palette: Palette): Run[] {
  const runs: Run[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end += 1;
      const color = palette[key];
      if (color) runs.push({ x, y, width: end - x, color });
      x = end;
    }
  });
  return runs;
}

type GroupProps = {
  grid: SpriteGrid;
  palette: Palette;
  x?: number;
  y?: number;
  className?: string;
};

/** A sprite placed inside a larger pixel scene, in that scene's pixel units. */
export const PixelGroup = memo(function PixelGroup({
  grid,
  palette,
  x = 0,
  y = 0,
  className,
}: GroupProps) {
  return (
    // The position lives on the outer group so a CSS animation on the inner one can't override it.
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        {toRuns(grid, palette).map((run) => (
          <rect
            key={`${run.x},${run.y}`}
            x={run.x}
            y={run.y}
            width={run.width}
            height={1}
            fill={run.color}
          />
        ))}
      </g>
    </g>
  );
});

type SpriteProps = {
  grid: SpriteGrid;
  palette: Palette;
  className?: string;
  /** Rendered size of one sprite pixel, in CSS pixels. */
  pixelSize?: number;
};

/** A standalone sprite as a crisp SVG, decorative unless wrapped in labelled markup. */
export function PixelSprite({
  grid,
  palette,
  className,
  pixelSize = 4,
}: SpriteProps) {
  const width = Math.max(...grid.map((row) => row.length));
  const height = grid.length;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width * pixelSize}
      height={height * pixelSize}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <PixelGroup grid={grid} palette={palette} />
    </svg>
  );
}
