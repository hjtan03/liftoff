import { describe, expect, it, vi } from "vitest";
import type { Crowd } from "./contract.js";
import { playerId, submitGuess } from "./client.js";

const CROWD: Crowd = {
  players: 3,
  hitRate: { lock: 0.5, solid: 1, rough: null },
  lockHitShare: 0.3333,
  percentile: 0.6667,
};

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

const request = {
  launch: 6,
  stage: 1,
  guess: 459,
  band: "lock" as const,
  assumptions: {},
};

describe("playerId", () => {
  it("creates a UUID once and keeps it", () => {
    const storage = memoryStorage();
    const first = playerId(storage);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(playerId(storage)).toBe(first);
  });

  it("still returns an id when storage is unavailable", () => {
    expect(playerId(null)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("submitGuess", () => {
  it("posts the guess with the player id and returns the crowd", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ hit: true, exact: true, points: 1250, crowd: CROWD }),
    );
    await expect(submitGuess(request, fetchImpl)).resolves.toEqual(CROWD);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/guess");
    expect(JSON.parse(init.body as string)).toEqual({
      launch: 6,
      stage: 1,
      guess: 459,
      band: "lock",
    });
    expect(new Headers(init.headers).get("x-player-id")).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it("sends assumptions only when the player gave some", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ crowd: CROWD }));
    await submitGuess({ ...request, assumptions: { d: 42 } }, fetchImpl);
    const init = (
      fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect(JSON.parse(init.body as string).assumptions).toEqual({ d: 42 });
  });

  it("uses the crowd from a 409 for a stage already recorded", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { error: "already-submitted", crowd: CROWD },
        { status: 409 },
      ),
    );
    await expect(submitGuess(request, fetchImpl)).resolves.toEqual(CROWD);
  });

  it("gives null when the server errors or cannot be reached", async () => {
    await expect(
      submitGuess(request, async () => new Response("", { status: 500 })),
    ).resolves.toBeNull();
    await expect(
      submitGuess(request, async () => {
        throw new TypeError("offline");
      }),
    ).resolves.toBeNull();
  });
});
