import { formatNumber } from "./numbers";

/**
 * The score as a trip through the solar system. Fuel carries the rocket from
 * the pad past the Moon and out to the planets; a perfect launch reaches
 * Neptune. Distances are rough averages from Earth, for the flight report.
 */

export type Stop = {
  name: string;
  /** Average distance from Earth, in km. */
  distanceKm: number;
};

export const STOPS: readonly Stop[] = [
  { name: "the launch pad", distanceKm: 0 },
  { name: "low Earth orbit", distanceKm: 400 },
  { name: "the Moon", distanceKm: 384_400 },
  { name: "Mars", distanceKm: 225_000_000 },
  { name: "Jupiter", distanceKm: 778_000_000 },
  { name: "Saturn", distanceKm: 1_430_000_000 },
  { name: "Uranus", distanceKm: 2_870_000_000 },
  { name: "Neptune", distanceKm: 4_500_000_000 },
];

/** Below one, the curve favours partial scores, so a decent day still leaves Earth. */
const SCORE_CURVE_EXPONENT = 0.85;
/** Absorbs floating-point noise so a score exactly on a threshold reaches its stop. */
const EPSILON = 1e-9;

/** How far along the route a score carries the rocket: 0 at the pad, STOPS.length − 1 at Neptune. */
export function routePosition(score: number, maxPoints: number): number {
  if (score <= 0) return 0;
  const progress = Math.pow(
    Math.min(score / maxPoints, 1),
    SCORE_CURVE_EXPONENT,
  );
  return progress * (STOPS.length - 1);
}

/** The farthest stop the rocket reaches. */
export function stopReached(score: number, maxPoints: number): Stop {
  return STOPS[Math.floor(routePosition(score, maxPoints) + EPSILON)];
}

/** "384,400 km", "225 million km", "4.5 billion km". */
export function formatDistance(distanceKm: number): string {
  if (distanceKm >= 1e9)
    return `${formatNumber(distanceKm / 1e9, 1)} billion km`;
  if (distanceKm >= 1e6)
    return `${formatNumber(distanceKm / 1e6, 0)} million km`;
  return `${formatNumber(distanceKm, 0)} km`;
}
