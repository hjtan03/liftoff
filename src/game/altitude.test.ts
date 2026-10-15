import { describe, expect, it } from "vitest";
import {
  altitudeForScore,
  altitudeTrackPercent,
  destinationForAltitude,
  formatAltitude,
  LAUNCH_PAD_ALTITUDE_KM,
} from "./altitude";
import { MAX_TOTAL_POINTS } from "./scoring";

describe("altitudeForScore", () => {
  it("stays on the pad for zero points", () => {
    expect(altitudeForScore(0)).toBe(LAUNCH_PAD_ALTITUDE_KM);
  });
  it("reaches the Moon for the maximum score", () => {
    expect(altitudeForScore(MAX_TOTAL_POINTS)).toBeCloseTo(384400, 0);
  });
  it("rises with score", () => {
    expect(altitudeForScore(1000)).toBeLessThan(altitudeForScore(2000));
    expect(altitudeForScore(2000)).toBeLessThan(altitudeForScore(6000));
  });
  it("puts half the points past the Kármán line but short of the ISS", () => {
    const altitude = altitudeForScore(MAX_TOTAL_POINTS / 2);
    expect(altitude).toBeGreaterThan(100);
    expect(altitude).toBeLessThan(408);
  });
});

describe("destinationForAltitude", () => {
  it("fizzles below the tree line", () => {
    expect(destinationForAltitude(LAUNCH_PAD_ALTITUDE_KM)).toBe(
      "Fizzled on the pad",
    );
  });
  it("names the highest milestone reached", () => {
    expect(destinationForAltitude(0.03)).toBe("Tree line");
    expect(destinationForAltitude(104)).toBe("Kármán line");
    expect(destinationForAltitude(384400)).toBe("The Moon");
  });
  it("allows a tenth of a percent of slack under a milestone", () => {
    expect(destinationForAltitude(99.95)).toBe("Kármán line");
    expect(destinationForAltitude(99.8)).toBe("Airliner altitude");
  });
});

describe("formatAltitude", () => {
  it("shows metres below one kilometre", () => {
    expect(formatAltitude(0.005)).toBe("5 m");
    expect(formatAltitude(0.5)).toBe("500 m");
  });
  it("shows one decimal below a hundred kilometres and none above", () => {
    expect(formatAltitude(11.5)).toBe("11.5 km");
    expect(formatAltitude(104.3)).toBe("104 km");
    expect(formatAltitude(384400)).toBe("384,400 km");
  });
});

describe("altitudeTrackPercent", () => {
  it("maps the pad to the bottom and the top of the track to a hundred", () => {
    expect(altitudeTrackPercent(LAUNCH_PAD_ALTITUDE_KM)).toBe(0);
    expect(altitudeTrackPercent(500000)).toBeCloseTo(100);
  });
  it("places the Moon just under the top of the track", () => {
    expect(altitudeTrackPercent(384400)).toBeCloseTo(98.57, 1);
  });
  it("clamps anything below the pad to the bottom", () => {
    expect(altitudeTrackPercent(0)).toBe(0);
  });
});
