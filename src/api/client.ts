import type { BandKey } from "../game/scoring.js";
import {
  PLAYER_ID_HEADER,
  type Crowd,
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
    band: BandKey;
    assumptions: Record<string, number>;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<Crowd | null> {
  const body: GuessRequest = {
    launch: request.launch,
    stage: request.stage,
    guess: request.guess,
    band: request.band,
    ...(Object.keys(request.assumptions).length > 0
      ? { assumptions: request.assumptions }
      : {}),
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
