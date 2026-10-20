import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Crowd } from "../../src/api/contract.js";
import type { GuessStore, StoredGuess } from "../../src/api/handlers.js";

/** Postgres's code for a unique-constraint violation: the stage was already submitted. */
const UNIQUE_VIOLATION = "23505";

let client: SupabaseClient | undefined;

/** One client per function instance, created on first use with the secret key. */
function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey)
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

type GuessRow = {
  player_id: string;
  launch: number;
  stage: number;
  question_id: string;
  guess: number;
  band: StoredGuess["band"];
  hit: boolean;
  exact: boolean;
  points: number;
  log_error: number;
  assumptions: Record<string, number> | null;
};

function toRow(guess: StoredGuess): GuessRow {
  return {
    player_id: guess.playerId,
    launch: guess.launch,
    stage: guess.stage,
    question_id: guess.questionId,
    guess: guess.guess,
    band: guess.band,
    hit: guess.hit,
    exact: guess.exact,
    points: guess.points,
    log_error: guess.logError,
    assumptions: guess.assumptions,
  };
}

function fromRow(row: GuessRow): StoredGuess {
  return {
    playerId: row.player_id,
    launch: row.launch,
    stage: row.stage,
    questionId: row.question_id,
    guess: row.guess,
    band: row.band,
    hit: row.hit,
    exact: row.exact,
    points: row.points,
    logError: row.log_error,
    assumptions: row.assumptions,
  };
}

/** The guess store backed by the Supabase tables and crowd_stats() in supabase/migrations/. */
export const supabaseStore: GuessStore = {
  async insertGuess(guess) {
    const db = supabase();
    const player = await db
      .from("players")
      .upsert(
        { player_id: guess.playerId },
        { onConflict: "player_id", ignoreDuplicates: true },
      );
    if (player.error) throw new Error(player.error.message);
    const inserted = await db.from("guesses").insert(toRow(guess));
    if (inserted.error) {
      if (inserted.error.code === UNIQUE_VIOLATION) return "duplicate";
      throw new Error(inserted.error.message);
    }
    return "inserted";
  },

  async findGuess(playerId, launch, stage) {
    const { data, error } = await supabase()
      .from("guesses")
      .select(
        "player_id, launch, stage, question_id, guess, band, hit, exact, points, log_error, assumptions",
      )
      .eq("player_id", playerId)
      .eq("launch", launch)
      .eq("stage", stage)
      .maybeSingle<GuessRow>();
    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
  },

  async crowdStats(launch, stage, logError) {
    const { data, error } = await supabase().rpc("crowd_stats", {
      p_launch: launch,
      p_stage: stage,
      p_log_error: logError,
    });
    if (error) throw new Error(error.message);
    return data as Crowd;
  },
};
