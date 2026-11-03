/**
 * The contract between the game and the API (docs/backend.md). The game sends
 * a guess; the server recomputes hit, exact and points from the question and
 * answers with the crowd for that stage.
 */

export type GuessRequest = {
  launch: number;
  stage: number;
  guess: number;
};

export type GuessResult = {
  hit: boolean;
  exact: boolean;
  points: number;
};

export type Crowd = {
  /** Players who submitted this stage, including this guess. */
  players: number;
  /** Of all players on the stage, the share who got it exactly or within 10%. */
  closeShare: number;
  /** The share of players whose guess was further off; null when not asked for. */
  percentile: number | null;
};

export type GuessResponse = GuessResult & { crowd: Crowd };

/**
 * What the game reports beyond guesses, for the analytics queries in
 * docs/analytics.sql. Each is kept at most once per player per launch.
 */
export const EVENT_NAMES = [
  /** Today's launch loaded. */
  "launch_opened",
  /** A past launch loaded from the archive. */
  "replay_opened",
  /** Today's rocket flew all five stages. */
  "launch_finished",
  /** An archive replay flew all five stages. */
  "replay_finished",
  /** Copy result was pressed. */
  "result_shared",
  /** The calculator was opened during the launch. */
  "calculator_used",
  /** A stage was fired with something on the scratch pad. */
  "notes_used",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type EventRequest = { launch: number; name: EventName };

export type EventResponse = { recorded: true };

/** 409: this player already submitted the stage. Carries what was stored so the client can recover. */
export type GuessConflict = {
  error: "already-submitted";
  message: string;
  result: GuessResult;
  crowd: Crowd;
};

export type StageCrowd = { stage: number } & Omit<Crowd, "percentile">;

export type CrowdResponse = { launch: number; stages: StageCrowd[] };

export type ApiError = {
  error:
    | "invalid-player"
    | "invalid-request"
    | "launch-not-playable"
    | "not-found"
    | "internal";
  message: string;
};

/** The header that carries the anonymous player id. */
export const PLAYER_ID_HEADER = "x-player-id";
