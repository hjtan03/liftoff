import {
  PLAYER_ID_HEADER,
  type Crowd,
  type CrowdResponse,
  type EventName,
  type EventRequest,
  type GuessConflict,
  type GuessRequest,
  type GuessResponse,
} from "./contract.js";
import { pageStorage, readStorage, writeStorage } from "../browserStorage.js";

/**
 * The game's side of the API. Every call degrades to null instead of
 * throwing: the game scores itself, so a missing or failing server only means
 * no crowd line.
 */

const PLAYER_ID_STORAGE_KEY = "liftoff.playerId";

/** What the reveal shows about the crowd for one stage. */
export type CrowdState =
  | { status: "loading" }
  | { status: "loaded"; crowd: Crowd }
  | { status: "unavailable" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let sessionPlayerId: string | undefined;

/**
 * The anonymous id this browser plays under, created once and kept in
 * localStorage. Where storage is blocked it lasts for the page's lifetime. A
 * stored value that isn't a UUID, which the API would refuse on every call,
 * is replaced.
 */
export function playerId(storage: Storage | null = pageStorage()): string {
  const stored = readStorage(PLAYER_ID_STORAGE_KEY, storage);
  if (stored && UUID.test(stored)) return stored;
  sessionPlayerId ??= crypto.randomUUID();
  writeStorage(PLAYER_ID_STORAGE_KEY, sessionPlayerId, storage);
  return sessionPlayerId;
}

/** Sends one fired stage. A 409 means it was already recorded, and carries the crowd too. */
export async function submitGuess(
  request: {
    launch: number;
    stage: number;
    guess: number;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<Crowd | null> {
  const body: GuessRequest = {
    launch: request.launch,
    stage: request.stage,
    guess: request.guess,
  };
  try {
    const response = await fetchImpl("/api/guess", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PLAYER_ID_HEADER]: playerId(),
      },
      body: JSON.stringify(body),
    });
    if (response.status !== 200 && response.status !== 409) return null;
    const result = (await response.json()) as GuessResponse | GuessConflict;
    return result.crowd ?? null;
  } catch {
    return null;
  }
}

/**
 * The crowd for every stage of a launch, without percentiles, for showing
 * crowd lines again on a run restored after a refresh. Null on any failure.
 */
export async function fetchCrowd(
  launch: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Crowd[] | null> {
  try {
    const response = await fetchImpl(`/api/crowd?launch=${launch}`);
    if (!response.ok) return null;
    const { stages } = (await response.json()) as CrowdResponse;
    return stages.map(({ players, closeShare }) => ({
      players,
      closeShare,
      percentile: null,
    }));
  } catch {
    return null;
  }
}

/** Events already sent this page load; the server keeps one per player per launch anyway. */
const sentEvents = new Set<string>();

/**
 * Reports one analytics event, fire and forget: it never throws or waits,
 * and keepalive lets it finish even if the page is closing.
 */
export function trackEvent(
  launch: number,
  name: EventName,
  fetchImpl: typeof fetch = fetch,
): void {
  const key = `${launch}:${name}`;
  if (sentEvents.has(key)) return;
  sentEvents.add(key);
  const body: EventRequest = { launch, name };
  try {
    void fetchImpl("/api/event", {
      method: "POST",
      keepalive: true,
      headers: {
        "content-type": "application/json",
        [PLAYER_ID_HEADER]: playerId(),
      },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // No network: analytics are best-effort.
  }
}
