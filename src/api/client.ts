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

let sessionPlayerId: string | undefined;

/**
 * The anonymous id this browser plays under, created once and kept in
 * localStorage. Where storage is blocked it lasts for the page's lifetime.
 */
export function playerId(storage: Storage | null = safeLocalStorage()): string {
  const stored = readStorage(storage, PLAYER_ID_STORAGE_KEY);
  if (stored) return stored;
  sessionPlayerId ??= crypto.randomUUID();
  writeStorage(storage, PLAYER_ID_STORAGE_KEY, sessionPlayerId);
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

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStorage(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Blocked storage: the id lasts for this page only.
  }
}
