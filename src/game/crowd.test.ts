import { describe, expect, it } from "vitest";
import { simulatedCrowdLockedInHitPercent } from "./crowd";

describe("simulatedCrowdLockedInHitPercent", () => {
  it("gives each of the fixed day's five stages its placeholder", () => {
    expect(simulatedCrowdLockedInHitPercent(0)).toBe(34);
    expect(simulatedCrowdLockedInHitPercent(4)).toBe(4);
  });
});
