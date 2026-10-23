import { BAND_KEYS, scoreGuess, type BandKey } from "../game/scoring.js";
import { launchNumberAt } from "../questions/schedule.js";
import type { QuestionSet } from "../questions/schema.js";
import { computeAnswer } from "../questions/source.js";
import type {
  ApiError,
  Crowd,
  CrowdResponse,
  GuessConflict,
  GuessRequest,
  GuessResponse,
} from "./contract.js";

/**
 * The API's rules as plain functions: data in, a status and a body out. They
 * never touch the database or the file system directly; the Vercel functions
 * in api/ pass those in, and the tests pass fakes.
 */

export type StoredGuess = {
  playerId: string;
  launch: number;
  stage: number;
  questionId: string;
  guess: number;
  band: BandKey;
  hit: boolean;
  exact: boolean;
  points: number;
  logError: number;
  assumptions: Record<string, number> | null;
};

export interface GuessStore {
  /** Records the player (if new) and the guess; "duplicate" when the stage was already submitted. */
  insertGuess(guess: StoredGuess): Promise<"inserted" | "duplicate">;
  findGuess(
    playerId: string,
    launch: number,
    stage: number,
  ): Promise<StoredGuess | null>;
  crowdStats(
    launch: number,
    stage: number,
    logError: number | null,
  ): Promise<Crowd>;
}

export type Dependencies = {
  store: GuessStore;
  /** The published question set for a launch, or null when none exists. */
  loadQuestionSet(launch: number): Promise<QuestionSet | null>;
};

export type ApiResult =
  | { status: 200; body: GuessResponse | CrowdResponse }
  | { status: 409; body: GuessConflict }
  | { status: 400 | 403 | 404 | 500; body: ApiError };

const PLAYER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GUESS = 1e15;
const MAX_ASSUMPTIONS = 20;

/**
 * A launch a player can be submitting right now: today's, in the launch time
 * zone the game also uses, or the one either side of it, for a run started
 * just before midnight and a device whose clock runs a little fast.
 */
export function isPlayableLaunch(launch: number, now: Date): boolean {
  const today = launchNumberAt(now);
  return launch >= 1 && launch >= today - 1 && launch <= today + 1;
}

/** How far off a guess is, on a scale where 2× too high and 2× too low count the same. */
export function logError(guess: number, answer: number): number {
  // Published answers are positive; a non-positive one can only be infinitely far off.
  if (answer <= 0) return Number.MAX_VALUE;
  return Math.abs(Math.log(guess / answer));
}

/** The request body if it is a valid guess, otherwise a message saying what is wrong. */
export function parseGuessRequest(body: unknown): GuessRequest | string {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return "the body must be a JSON object";
  const { launch, stage, guess, band, assumptions } = body as Record<
    string,
    unknown
  >;
  if (!Number.isInteger(launch) || (launch as number) < 1)
    return "launch must be a positive integer";
  if (
    !Number.isInteger(stage) ||
    (stage as number) < 1 ||
    (stage as number) > 5
  )
    return "stage must be an integer from 1 to 5";
  if (
    typeof guess !== "number" ||
    !Number.isFinite(guess) ||
    guess <= 0 ||
    guess >= MAX_GUESS
  )
    return `guess must be a number above 0 and below ${MAX_GUESS}`;
  if (!BAND_KEYS.includes(band as BandKey))
    return `band must be one of ${BAND_KEYS.join(", ")}`;
  const parsed: GuessRequest = {
    launch: launch as number,
    stage: stage as number,
    guess,
    band: band as BandKey,
  };
  if (assumptions !== undefined) {
    if (
      typeof assumptions !== "object" ||
      assumptions === null ||
      Array.isArray(assumptions)
    )
      return "assumptions must be an object of factor keys to numbers";
    const entries = Object.entries(assumptions);
    if (entries.length > MAX_ASSUMPTIONS)
      return `assumptions can name at most ${MAX_ASSUMPTIONS} factors`;
    if (
      !entries.every(
        ([key, value]) =>
          key.length > 0 &&
          key.length <= 64 &&
          typeof value === "number" &&
          Number.isFinite(value),
      )
    )
      return "assumptions must map factor keys to finite numbers";
    parsed.assumptions = Object.fromEntries(entries) as Record<string, number>;
  }
  return parsed;
}

function error(
  status: 400 | 403 | 404,
  code: ApiError["error"],
  message: string,
): ApiResult {
  return { status, body: { error: code, message } };
}

/** POST /api/guess */
export async function handleGuess(
  input: { playerId: string | null; body: unknown; now: Date },
  dependencies: Dependencies,
): Promise<ApiResult> {
  const { playerId, body, now } = input;
  if (playerId === null || !PLAYER_ID.test(playerId))
    return error(
      400,
      "invalid-player",
      "the x-player-id header must be a UUID",
    );
  const request = parseGuessRequest(body);
  if (typeof request === "string")
    return error(400, "invalid-request", request);
  if (!isPlayableLaunch(request.launch, now))
    return error(
      403,
      "launch-not-playable",
      `launch ${request.launch} is not being played today`,
    );

  const set = await dependencies.loadQuestionSet(request.launch);
  const question = set?.questions[request.stage - 1];
  if (!question)
    return error(
      404,
      "not-found",
      `launch ${request.launch} has no stage ${request.stage}`,
    );

  const answer = computeAnswer(question);
  const scored = scoreGuess({
    answer,
    guess: request.guess,
    band: request.band,
  });
  const stored: StoredGuess = {
    playerId,
    launch: request.launch,
    stage: request.stage,
    questionId: question.id,
    guess: request.guess,
    band: request.band,
    hit: scored.hit,
    exact: scored.exact,
    points: scored.points,
    logError: logError(request.guess, answer),
    assumptions: request.assumptions ?? null,
  };

  const outcome = await dependencies.store.insertGuess(stored);
  if (outcome === "duplicate") {
    const existing = await dependencies.store.findGuess(
      playerId,
      request.launch,
      request.stage,
    );
    if (!existing) throw new Error("a duplicate guess could not be found");
    return {
      status: 409,
      body: {
        error: "already-submitted",
        message: `stage ${request.stage} of launch ${request.launch} was already submitted`,
        result: {
          hit: existing.hit,
          exact: existing.exact,
          points: existing.points,
        },
        crowd: await dependencies.store.crowdStats(
          request.launch,
          request.stage,
          existing.logError,
        ),
      },
    };
  }

  return {
    status: 200,
    body: {
      hit: scored.hit,
      exact: scored.exact,
      points: scored.points,
      crowd: await dependencies.store.crowdStats(
        request.launch,
        request.stage,
        stored.logError,
      ),
    },
  };
}

/** GET /api/crowd?launch=N */
export async function handleCrowd(
  input: { launch: string | null; now: Date },
  dependencies: Dependencies,
): Promise<ApiResult> {
  const launch = Number(input.launch);
  if (input.launch === null || !/^\d+$/.test(input.launch) || launch < 1)
    return error(400, "invalid-request", "launch must be a positive integer");
  if (launch > launchNumberAt(input.now) + 1)
    return error(
      403,
      "launch-not-playable",
      `launch ${launch} has not started`,
    );
  const set = await dependencies.loadQuestionSet(launch);
  if (!set) return error(404, "not-found", `launch ${launch} has no set`);
  const stages = await Promise.all(
    set.questions.map(async (_, index) => {
      const { players, hitRate, lockHitShare } =
        await dependencies.store.crowdStats(launch, index + 1, null);
      return { stage: index + 1, players, hitRate, lockHitShare };
    }),
  );
  return { status: 200, body: { launch, stages } };
}
