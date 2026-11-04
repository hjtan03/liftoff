import { describe, expect, it } from "vitest";
import {
  daysUntilFirstLaunch,
  launchDateLabel,
  launchNumberAt,
  launchNumberFromAddress,
} from "./schedule";

// Launch 1 is October 24, 2026, when the East Coast is on daylight time (UTC−4).
describe("launchNumberAt", () => {
  it.each([
    ["2026-10-24T04:00:00Z", 1, "midnight Eastern starts launch 1"],
    ["2026-10-24T03:59:59Z", 0, "a second earlier is still the day before"],
    ["2026-10-25T03:59:59Z", 1, "launch 1 runs to the next Eastern midnight"],
    ["2026-10-25T04:00:00Z", 2, "the next Eastern midnight starts launch 2"],
  ])("%s is launch %i: %s", (time, launch) => {
    expect(launchNumberAt(new Date(time))).toBe(launch);
  });

  it("rolls over at midnight Eastern after the clocks change, on standard time (UTC−5)", () => {
    // November 1 is launch 9; daylight time ended at 2 a.m. that morning.
    expect(launchNumberAt(new Date("2026-11-02T04:59:59Z"))).toBe(9);
    expect(launchNumberAt(new Date("2026-11-02T05:00:00Z"))).toBe(10);
  });
});

describe("the same moment everywhere", () => {
  it("is already launch 1 at 9 p.m. on the 23rd in Los Angeles", () => {
    expect(launchNumberAt(new Date("2026-10-24T04:00:00Z"))).toBe(1);
  });
});

describe("daysUntilFirstLaunch", () => {
  it("counts Eastern days down to the first launch", () => {
    expect(daysUntilFirstLaunch(new Date("2026-10-22T22:00:00Z"))).toBe(2);
    expect(daysUntilFirstLaunch(new Date("2026-10-24T03:59:59Z"))).toBe(1);
    expect(daysUntilFirstLaunch(new Date("2026-10-24T04:00:00Z"))).toBe(0);
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

describe("launchDateLabel", () => {
  it("names each launch's calendar date", () => {
    expect(launchDateLabel(1)).toBe("Sat, Oct 24");
    expect(launchDateLabel(69)).toBe("Thu, Dec 31");
  });
});
