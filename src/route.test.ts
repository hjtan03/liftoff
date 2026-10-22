import { describe, expect, it } from "vitest";
import { routeFor } from "./route";

// Noon Eastern on October 26, 2026: launch 3.
const LAUNCH_3 = new Date("2026-10-26T16:00:00Z");
// Noon Eastern two days before launch 1.
const BEFORE_LAUNCH = new Date("2026-10-22T16:00:00Z");

describe("routeFor", () => {
  it("plays today's launch with no address", () => {
    expect(routeFor("", LAUNCH_3)).toEqual({ screen: "today", launch: 3 });
  });
  it("lists the archive", () => {
    expect(routeFor("?archive", LAUNCH_3)).toEqual({
      screen: "archive",
      today: 3,
    });
  });
  it("replays a past launch apart from today's run", () => {
    expect(routeFor("?launch=1", LAUNCH_3)).toEqual({
      screen: "replay",
      launch: 1,
    });
  });
  it("treats today's own number as today", () => {
    expect(routeFor("?launch=3", LAUNCH_3)).toEqual({
      screen: "today",
      launch: 3,
    });
  });
  it("keeps future launches shut unless testing", () => {
    expect(routeFor("?launch=4", LAUNCH_3)).toEqual({
      screen: "not-yet",
      launch: 4,
    });
    expect(routeFor("?launch=4&test", LAUNCH_3)).toEqual({
      screen: "replay",
      launch: 4,
    });
  });
  it("counts down before the first launch, but lets any set be tested", () => {
    expect(routeFor("", BEFORE_LAUNCH)).toEqual({
      screen: "countdown",
      days: 2,
    });
    expect(routeFor("?archive", BEFORE_LAUNCH)).toEqual({
      screen: "countdown",
      days: 2,
    });
    expect(routeFor("?launch=1", BEFORE_LAUNCH)).toEqual({
      screen: "replay",
      launch: 1,
    });
  });
});
