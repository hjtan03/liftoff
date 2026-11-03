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
