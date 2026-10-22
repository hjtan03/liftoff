/**
 * Which question set plays on which day. Launch 001 plays on the first launch
 * date, and each day after it plays the next number. Days roll over at
 * midnight Eastern time for everyone, wherever they are, so every player gets
 * the same launch at the same moment and the API agrees with the game about
 * which launch is today.
 */
export const FIRST_LAUNCH_DATE = "2026-10-24";

/** The time zone whose midnight starts each launch. It follows daylight saving, so the reset is always 12:00 a.m. on the East Coast. */
export const LAUNCH_TIME_ZONE = "America/New_York";

const MILLISECONDS_PER_DAY = 86_400_000;

const launchCalendar = new Intl.DateTimeFormat("en-US", {
  timeZone: LAUNCH_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/**
 * The calendar date `time` falls on in the launch time zone, as the UTC
 * midnight of that date, so a day a clock change makes 23 or 25 hours long
 * still counts as one.
 */
function launchCalendarDayMs(time: Date): number {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(
      launchCalendar.formatToParts(time).find((p) => p.type === type)!.value,
    );
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

/**
 * The launch number for the day `time` falls on in the launch time zone:
 * 1 on the first launch date, zero or less before it.
 */
export function launchNumberAt(time: Date): number {
  return (
    Math.round(
      (launchCalendarDayMs(time) - Date.parse(FIRST_LAUNCH_DATE)) /
        MILLISECONDS_PER_DAY,
    ) + 1
  );
}

/** Today's launch number. Throws for a time before the first launch. */
export function computeLaunchNumber(time: Date): number {
  const launch = launchNumberAt(time);
  if (launch < 1)
    throw new Error(
      `no launch before ${FIRST_LAUNCH_DATE}, and this device’s clock says ${time.toDateString()}`,
    );
  return launch;
}

/** The calendar date a launch plays on, like "Sat, Oct 24". */
export function launchDateLabel(launchNumber: number): string {
  const date = new Date(
    Date.parse(FIRST_LAUNCH_DATE) + (launchNumber - 1) * MILLISECONDS_PER_DAY,
  );
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The id of a launch's question set, which names its published file: the number padded to three digits. */
export function formatQuestionSetId(launchNumber: number): string {
  return String(launchNumber).padStart(3, "0");
}

/** Whole days until the first launch, counted in the launch time zone; zero or less once it has begun. */
export function daysUntilFirstLaunch(time: Date): number {
  return 1 - launchNumberAt(time);
}

/**
 * A launch number named in the page address (`?launch=12`): a past launch
 * replayed from the archive, or, with `&test`, a future one on a preview.
 * Null when none is given.
 */
export function launchNumberFromAddress(search: string): number | null {
  const named = new URLSearchParams(search).get("launch");
  if (!named || !/^\d{1,4}$/.test(named) || Number(named) < 1) return null;
  return Number(named);
}
