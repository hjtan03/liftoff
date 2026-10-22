import { beforeEach, describe, expect, it } from "vitest";
import { FIRST_LAUNCH_DATE } from "../questions/schedule.js";
import type { QuestionSet } from "../questions/schema.js";
import type { Crowd } from "./contract.js";
import {
  handleCrowd,
  handleGuess,
  isPlayableLaunch,
  logError,
  parseGuessRequest,
  utcLaunchNumber,
  type Dependencies,
  type GuessStore,
  type StoredGuess,
} from "./handlers.js";

const PLAYER = "11111111-1111-4111-8111-111111111111";
const OTHER_PLAYER = "22222222-2222-4222-8222-222222222222";
const DAY_MS = 86_400_000;
/** Noon UTC two days after the first launch date: launch 3. */
const NOW = new Date(Date.parse(FIRST_LAUNCH_DATE) + 2 * DAY_MS + DAY_MS / 2);

const SET: QuestionSet = {
  id: "003",
  questions: [
    {
      id: "marathon-walk",
      category: "Everyday",
      prompt: "Walking at 5 km/h, how many minutes is a marathon?",
      unit: "min",
      rounding: "round",
      roundingNote: "Rounded to the nearest minute.",
      factors: [
        {
          key: "d",
          label: "Marathon distance",
          unit: "km",
          value: 42.195,
          source: "World Athletics",
        },
      ],
      formula: "d / 5 * 60",
    },
  ],
};

/** An in-memory store whose crowd stats follow the same definitions as the SQL function. */
function memoryStore(): GuessStore & { rows: StoredGuess[] } {
  const rows: StoredGuess[] = [];
  const share = (list: StoredGuess[], test: (row: StoredGuess) => boolean) =>
    list.length === 0 ? null : list.filter(test).length / list.length;
  return {
    rows,
    async insertGuess(guess) {
      const taken = rows.some(
        (row) =>
          row.playerId === guess.playerId &&
          row.launch === guess.launch &&
          row.stage === guess.stage,
      );
      if (taken) return "duplicate";
      rows.push(guess);
      return "inserted";
    },
    async findGuess(playerId, launch, stage) {
      return (
        rows.find(
          (row) =>
            row.playerId === playerId &&
            row.launch === launch &&
            row.stage === stage,
        ) ?? null
      );
    },
    async crowdStats(launch, stage, logErrorOfGuess): Promise<Crowd> {
      const onStage = rows.filter(
        (row) => row.launch === launch && row.stage === stage,
      );
      const inBand = (band: StoredGuess["band"]) =>
        onStage.filter((row) => row.band === band);
      return {
        players: onStage.length,
        hitRate: {
          lock: share(inBand("lock"), (row) => row.hit),
          solid: share(inBand("solid"), (row) => row.hit),
          rough: share(inBand("rough"), (row) => row.hit),
        },
        lockHitShare:
          share(onStage, (row) => row.band === "lock" && row.hit) ?? 0,
        percentile:
          logErrorOfGuess === null
            ? null
            : (share(onStage, (row) => row.logError > logErrorOfGuess) ?? 0),
      };
    },
  };
}

let store: ReturnType<typeof memoryStore>;
let dependencies: Dependencies;

beforeEach(() => {
  store = memoryStore();
  dependencies = {
    store,
    loadQuestionSet: async (launch) => (launch === 3 ? SET : null),
  };
});

const guess = (
  body: Record<string, unknown>,
  playerId: string | null = PLAYER,
) =>
  handleGuess(
    { playerId, body: { launch: 3, stage: 1, ...body }, now: NOW },
    dependencies,
  );

describe("launch numbers", () => {
  it("count UTC calendar days from the first launch", () => {
    expect(utcLaunchNumber(new Date(`${FIRST_LAUNCH_DATE}T00:00:00Z`))).toBe(1);
    expect(utcLaunchNumber(new Date(`${FIRST_LAUNCH_DATE}T23:59:59Z`))).toBe(1);
    expect(utcLaunchNumber(NOW)).toBe(3);
  });
  it("are playable within one day of UTC's, so every time zone is covered", () => {
    expect(isPlayableLaunch(2, NOW)).toBe(true);
    expect(isPlayableLaunch(3, NOW)).toBe(true);
    expect(isPlayableLaunch(4, NOW)).toBe(true);
    expect(isPlayableLaunch(1, NOW)).toBe(false);
    expect(isPlayableLaunch(5, NOW)).toBe(false);
  });
});

describe("logError", () => {
  it("treats 2× too high and 2× too low the same", () => {
    expect(logError(200, 100)).toBeCloseTo(logError(50, 100));
    expect(logError(100, 100)).toBe(0);
  });
});

describe("parseGuessRequest", () => {
  const valid = { launch: 3, stage: 1, guess: 500, band: "solid" };
  it("accepts a valid guess, with or without assumptions", () => {
    expect(parseGuessRequest(valid)).toEqual(valid);
    expect(parseGuessRequest({ ...valid, assumptions: { d: 42 } })).toEqual({
      ...valid,
      assumptions: { d: 42 },
    });
  });
  it.each([
    ["a non-object", "nope"],
    ["a fractional launch", { ...valid, launch: 1.5 }],
    ["stage 6", { ...valid, stage: 6 }],
    ["a zero guess", { ...valid, guess: 0 }],
    ["an infinite guess", { ...valid, guess: Infinity }],
    ["a string guess", { ...valid, guess: "500" }],
    ["an unknown band", { ...valid, band: "yolo" }],
    ["non-numeric assumptions", { ...valid, assumptions: { d: "42" } }],
  ])("rejects %s", (_, body) => {
    expect(typeof parseGuessRequest(body)).toBe("string");
  });
});

describe("POST /api/guess", () => {
  it("scores on the server and returns the crowd including this guess", async () => {
    const result = await guess({ guess: 506, band: "lock" });
    expect(result).toEqual({
      status: 200,
      body: {
        hit: true,
        exact: true,
        points: 1250,
        crowd: {
          players: 1,
          hitRate: { lock: 1, solid: null, rough: null },
          lockHitShare: 1,
          percentile: 0,
        },
      },
    });
    expect(store.rows[0]).toMatchObject({
      questionId: "marathon-walk",
      hit: true,
      points: 1250,
      assumptions: null,
    });
  });

  it("ignores any score the client claims", async () => {
    const result = await guess({
      guess: 100,
      band: "lock",
      points: 1250,
      hit: true,
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ hit: false, points: 0 });
  });

  it("ranks a guess against the crowd", async () => {
    await guess({ guess: 300, band: "rough" }, OTHER_PLAYER);
    const result = await guess({ guess: 500, band: "solid" });
    expect(result.body).toMatchObject({
      crowd: { players: 2, percentile: 0.5 },
    });
  });

  it("refuses a second submission and returns what was stored", async () => {
    await guess({ guess: 506, band: "lock" });
    const second = await guess({ guess: 100, band: "rough" });
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({
      error: "already-submitted",
      result: { hit: true, exact: true, points: 1250 },
      crowd: { players: 1 },
    });
    expect(store.rows).toHaveLength(1);
  });

  it("needs a UUID player id", async () => {
    expect((await guess({ guess: 1, band: "lock" }, null)).status).toBe(400);
    expect((await guess({ guess: 1, band: "lock" }, "me")).status).toBe(400);
  });

  it("rejects an invalid body", async () => {
    const result = await guess({ guess: -1, band: "lock" });
    expect(result).toMatchObject({
      status: 400,
      body: { error: "invalid-request" },
    });
  });

  it("refuses a launch nobody is playing today", async () => {
    const result = await handleGuess(
      {
        playerId: PLAYER,
        body: { launch: 9, stage: 1, guess: 1, band: "lock" },
        now: NOW,
      },
      dependencies,
    );
    expect(result).toMatchObject({
      status: 403,
      body: { error: "launch-not-playable" },
    });
  });

  it("answers 404 for a stage the set does not have", async () => {
    const result = await guess({ stage: 2, guess: 1, band: "lock" });
    expect(result).toMatchObject({ status: 404, body: { error: "not-found" } });
  });
});

describe("GET /api/crowd", () => {
  it("returns every stage's crowd without a percentile", async () => {
    await guess({ guess: 506, band: "lock" });
    const result = await handleCrowd({ launch: "3", now: NOW }, dependencies);
    expect(result).toEqual({
      status: 200,
      body: {
        launch: 3,
        stages: [
          {
            stage: 1,
            players: 1,
            hitRate: { lock: 1, solid: null, rough: null },
            lockHitShare: 1,
          },
        ],
      },
    });
  });

  it.each([null, "", "abc", "0", "1.5"])(
    "rejects launch %j",
    async (launch) => {
      expect(
        (await handleCrowd({ launch, now: NOW }, dependencies)).status,
      ).toBe(400);
    },
  );

  it("refuses a launch that has not started", async () => {
    expect(
      (await handleCrowd({ launch: "5", now: NOW }, dependencies)).status,
    ).toBe(403);
  });

  it("answers 404 for a launch with no set", async () => {
    expect(
      (await handleCrowd({ launch: "2", now: NOW }, dependencies)).status,
    ).toBe(404);
  });
});
