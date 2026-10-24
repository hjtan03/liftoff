import { STOPS } from "../game/journey";

/**
 * The rocket's route through the sky, in art pixels from the foot of the
 * rocket on the pad, altitude counting up: straight up off the pad, then a
 * long gravity turn to the right that is nearly level by Neptune. A route
 * position counts stops, as in src/game/journey.ts, and each stop lies
 * STOP_SPACING art pixels further along the curve than the last.
 */

export const STOP_SPACING = 900;
const ROUTE_LENGTH = STOP_SPACING * (STOPS.length - 1);
/** How far the route has turned from straight up by its end, in radians. */
const FINAL_HEADING = (80 * Math.PI) / 180;

/** A place on the route, and its heading: radians clockwise from straight up. */
export type ArcPoint = { x: number; altitude: number; heading: number };

/** The heading a distance along the route: straight up at the pad, turning slowly, then faster, then easing level. */
function headingAt(distance: number): number {
  const share = Math.min(1, Math.max(0, distance / ROUTE_LENGTH));
  return FINAL_HEADING * share * share * (3 - 2 * share);
}

/** The route traced one art pixel at a time, so any point on it is a lookup. */
const TRACE = (() => {
  const points: { x: number; altitude: number }[] = [{ x: 0, altitude: 0 }];
  for (let distance = 0; distance < ROUTE_LENGTH; distance += 1) {
    const heading = headingAt(distance + 0.5);
    const last = points[points.length - 1];
    points.push({
      x: last.x + Math.sin(heading),
      altitude: last.altitude + Math.cos(heading),
    });
  }
  return points;
})();

/** Where a route position lies, from 0 at the pad to the last stop. */
export function arcPointAt(position: number): ArcPoint {
  const distance = Math.min(ROUTE_LENGTH, Math.max(0, position * STOP_SPACING));
  const index = Math.min(TRACE.length - 2, Math.floor(distance));
  const share = distance - index;
  const from = TRACE[index];
  const to = TRACE[index + 1];
  return {
    x: from.x + (to.x - from.x) * share,
    altitude: from.altitude + (to.altitude - from.altitude) * share,
    heading: headingAt(distance),
  };
}

/** Points along the route between two positions, about stepArt art pixels apart, ends included. */
export function arcPointsBetween(
  fromPosition: number,
  toPosition: number,
  stepArt: number,
): ArcPoint[] {
  const span = Math.abs(toPosition - fromPosition) * STOP_SPACING;
  const steps = Math.max(1, Math.ceil(span / stepArt));
  return Array.from({ length: steps + 1 }, (_, step) =>
    arcPointAt(fromPosition + ((toPosition - fromPosition) * step) / steps),
  );
}
