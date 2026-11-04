import { describe, expect, it } from "vitest";
import { adConfig, tipUrl } from "./monetization";

describe("adConfig", () => {
  const env = {
    VITE_ADSENSE_CLIENT: "ca-pub-1234567890123456",
    VITE_ADSENSE_SLOT_REPORT: "1234567890",
  };
  it("is off with nothing configured", () => {
    expect(adConfig("report", {})).toBeNull();
  });
  it("gives the client and the placement's unit when both are set", () => {
    expect(adConfig("report", env)).toEqual({
      client: "ca-pub-1234567890123456",
      slot: "1234567890",
    });
  });
  it("stays off for a placement without its own unit", () => {
    expect(adConfig("archive", env)).toBeNull();
  });
  it.each(["pub-123", "ca-pub-12<script>", " "])(
    "rejects a client id that isn't AdSense's: %j",
    (client) => {
      expect(
        adConfig("report", { ...env, VITE_ADSENSE_CLIENT: client }),
      ).toBeNull();
    },
  );
});

describe("tipUrl", () => {
  it("is off with nothing configured", () => {
    expect(tipUrl({})).toBeNull();
  });
  it("accepts an https link", () => {
    expect(tipUrl({ VITE_TIP_URL: "https://ko-fi.com/liftoff" })).toBe(
      "https://ko-fi.com/liftoff",
    );
  });
  it.each(["http://ko-fi.com/liftoff", "javascript:alert(1)", "ko-fi.com/x"])(
    "rejects %j",
    (value) => {
      expect(tipUrl({ VITE_TIP_URL: value })).toBeNull();
    },
  );
});
