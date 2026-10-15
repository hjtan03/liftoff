import { afterEach, describe, expect, it, vi } from "vitest";
import { computeLaunchNumber, FIRST_LAUNCH_DATE } from "./schedule";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("computeLaunchNumber", () => {
  it.each([
    ["America/Los_Angeles", "23:30"],
    ["Asia/Tokyo", "00:30"],
  ])(
    "plays launch 1 all through the first launch date on the device's own calendar, in %s at %s",
    (timeZone, timeOfDay) => {
      vi.stubEnv("TZ", timeZone);
      expect(
        computeLaunchNumber(new Date(`${FIRST_LAUNCH_DATE}T${timeOfDay}:00`)),
      ).toBe(1);
    },
  );
});
