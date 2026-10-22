import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeLaunchNumber,
  daysUntilFirstLaunch,
  FIRST_LAUNCH_DATE,
  launchNumberFromAddress,
} from "./schedule";

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

describe("daysUntilFirstLaunch", () => {
  it("counts calendar days down to the first launch", () => {
    const firstLaunch = new Date(`${FIRST_LAUNCH_DATE}T09:00:00`);
    expect(daysUntilFirstLaunch(firstLaunch)).toBe(0);
    const twoDaysBefore = new Date(firstLaunch);
    twoDaysBefore.setDate(firstLaunch.getDate() - 2);
    expect(daysUntilFirstLaunch(twoDaysBefore)).toBe(2);
  });
});

describe("launchNumberFromAddress", () => {
  it("reads a launch named in the address", () => {
    expect(launchNumberFromAddress("?launch=12")).toBe(12);
  });
  it.each(["", "?launch=", "?launch=0", "?launch=abc", "?launch=1.5"])(
    "ignores %j",
    (search) => {
      expect(launchNumberFromAddress(search)).toBeNull();
    },
  );
});
