import { formatNumber } from "./numbers";

export const LAUNCH_PAD_ALTITUDE_KM = 0.005;
export const MOON_ALTITUDE_KM = 384400;
/** Where a score just above zero lands; the log curve starts here. */
const LOWEST_FLIGHT_ALTITUDE_KM = 0.02;
/** Top of the drawn altitude track, a little past the Moon. */
const TRACK_TOP_ALTITUDE_KM = 500000;
/** Below one, the curve favours partial scores; one would be linear in log space. */
const SCORE_CURVE_EXPONENT = 0.85;
/** A milestone counts as reached from a tenth of a percent below it. */
const MILESTONE_SLACK = 0.999;

export type Milestone = { altitudeKm: number; name: string };

export const MILESTONES: readonly Milestone[] = [
  { altitudeKm: 0.03, name: "Tree line" },
  { altitudeKm: 2, name: "Cloud deck" },
  { altitudeKm: 11, name: "Airliner altitude" },
  { altitudeKm: 100, name: "Kármán line" },
  { altitudeKm: 408, name: "ISS orbit" },
  { altitudeKm: 20200, name: "GPS orbit" },
  { altitudeKm: 35786, name: "Geostationary orbit" },
  { altitudeKm: MOON_ALTITUDE_KM, name: "The Moon" },
];

const FIZZLED_DESTINATION = "Fizzled on the pad";

/** Maps a score out of maxPoints onto a log-scale altitude from the pad to the Moon. */
export function altitudeForScore(score: number, maxPoints: number): number {
  if (score <= 0) return LAUNCH_PAD_ALTITUDE_KM;
  const progress = Math.pow(score / maxPoints, SCORE_CURVE_EXPONENT);
  const lowLog = Math.log10(LOWEST_FLIGHT_ALTITUDE_KM);
  const highLog = Math.log10(MOON_ALTITUDE_KM);
  return Math.pow(10, lowLog + progress * (highLog - lowLog));
}

export function destinationForAltitude(altitudeKm: number): string {
  let destination = FIZZLED_DESTINATION;
  for (const milestone of MILESTONES) {
    if (altitudeKm >= milestone.altitudeKm * MILESTONE_SLACK)
      destination = milestone.name;
  }
  return destination;
}

export function formatAltitude(altitudeKm: number): string {
  if (altitudeKm < 1) return `${formatNumber(altitudeKm * 1000, 0)} m`;
  return `${formatNumber(altitudeKm, altitudeKm < 100 ? 1 : 0)} km`;
}

const TRACK_BOTTOM_LOG = Math.log10(LAUNCH_PAD_ALTITUDE_KM);
const TRACK_TOP_LOG = Math.log10(TRACK_TOP_ALTITUDE_KM);

/** Vertical position on the drawn track, 0 at the pad and 100 at the top, log scale. */
export function altitudeTrackPercent(altitudeKm: number): number {
  const clamped = Math.max(altitudeKm, LAUNCH_PAD_ALTITUDE_KM);
  return (
    ((Math.log10(clamped) - TRACK_BOTTOM_LOG) /
      (TRACK_TOP_LOG - TRACK_BOTTOM_LOG)) *
    100
  );
}
