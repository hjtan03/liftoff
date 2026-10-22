import { describe, expect, it } from "vitest";
import { formatDistance, routePosition, STOPS, stopReached } from "./journey";

const MAX = 6250;

describe("stopReached", () => {
  it.each([
    [0, "the launch pad"],
    [500, "the launch pad"],
    [1000, "low Earth orbit"],
    [2500, "Mars"],
    [5000, "Saturn"],
    [6000, "Uranus"],
    [6250, "Neptune"],
  ])("a score of %i reaches %s", (score, name) => {
    expect(stopReached(score, MAX).name).toBe(name);
  });

  it("only a perfect score reaches Neptune", () => {
    expect(stopReached(MAX - 1, MAX).name).not.toBe("Neptune");
  });
});

describe("routePosition", () => {
  it("runs from 0 at the pad to the last stop at a perfect score", () => {
    expect(routePosition(0, MAX)).toBe(0);
    expect(routePosition(MAX, MAX)).toBe(STOPS.length - 1);
  });
  it("climbs with the score", () => {
    expect(routePosition(3000, MAX)).toBeGreaterThan(routePosition(2000, MAX));
  });
});

describe("formatDistance", () => {
  it("reads naturally at each scale", () => {
    expect(formatDistance(384_400)).toBe("384,400 km");
    expect(formatDistance(225_000_000)).toBe("225 million km");
    expect(formatDistance(4_500_000_000)).toBe("4.5 billion km");
  });
});
