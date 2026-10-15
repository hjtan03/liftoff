/**
 * Which question set plays on which day. Launch 001 plays on the first launch
 * date, and each calendar day after it plays the next number, read in the
 * device's own time zone, so every player meets the same launch on the same
 * calendar date wherever they are.
 */
export const FIRST_LAUNCH_DATE = "2026-10-15";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * The launch number for the calendar date deviceTime falls on in the device's
 * time zone. Both dates are counted as UTC midnights of their calendar
 * components, so a day a clock change makes 23 or 25 hours long still counts
 * as one. Throws for a date before the first launch.
 */
export function computeLaunchNumber(deviceTime: Date): number {
  const deviceCalendarDayMs = Date.UTC(
    deviceTime.getFullYear(),
    deviceTime.getMonth(),
    deviceTime.getDate(),
  );
  const daysSinceFirstLaunch =
    (deviceCalendarDayMs - Date.parse(FIRST_LAUNCH_DATE)) /
    MILLISECONDS_PER_DAY;
  if (daysSinceFirstLaunch < 0)
    throw new Error(
      `no launch before ${FIRST_LAUNCH_DATE}, and this device’s clock says ${deviceTime.toDateString()}`,
    );
  return daysSinceFirstLaunch + 1;
}

/** The id of a launch's question set, which names its published file: the number padded to three digits. */
export function formatQuestionSetId(launchNumber: number): string {
  return String(launchNumber).padStart(3, "0");
}
