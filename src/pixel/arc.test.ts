import { describe, expect, it } from "vitest";
import { STOPS } from "../game/journey";
import { arcPointAt, arcPointsBetween, STOP_SPACING } from "./arc";

const LAST_STOP = STOPS.length - 1;

describe("arcPointAt", () => {
  it("starts at the foot of the rocket, pointing straight up", () => {
    expect(arcPointAt(0)).toEqual({ x: 0, altitude: 0, heading: 0 });
  });

  it("only ever climbs and turns to the right", () => {
    for (let position = 0.1; position <= LAST_STOP; position += 0.1) {
      const before = arcPointAt(position - 0.1);
      const after = arcPointAt(position);
      expect(after.altitude).toBeGreaterThan(before.altitude);
      expect(after.x).toBeGreaterThanOrEqual(before.x);
      expect(after.heading).toBeGreaterThanOrEqual(before.heading);
      expect(after.heading).toBeLessThan(Math.PI / 2);
    }
  });

  it("is still almost vertical at the edge of space", () => {
    expect(arcPointAt(1).heading).toBeLessThan(0.1);
  });

  it("puts each stop a stop's spacing along the curve from the last", () => {
    const points = arcPointsBetween(2, 3, 1);
    const length = points
      .slice(1)
      .reduce(
        (sum, point, index) =>
          sum +
          Math.hypot(
            point.x - points[index].x,
            point.altitude - points[index].altitude,
          ),
        0,
      );
    expect(length).toBeCloseTo(STOP_SPACING, 0);
  });

  it("holds at the last stop past the end of the route", () => {
    expect(arcPointAt(LAST_STOP + 1)).toEqual(arcPointAt(LAST_STOP));
  });
});
