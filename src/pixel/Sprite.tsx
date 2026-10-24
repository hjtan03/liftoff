import { memo } from "react";
import { gridRects, type Palette, type SpriteGrid } from "./sprites";

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
        {gridRects(grid, palette).map((rect) => (
          <rect
            key={`${rect.x},${rect.y}`}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={rect.fill}
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
