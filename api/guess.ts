import { PLAYER_ID_HEADER } from "../src/api/contract.js";
import { handleGuess } from "../src/api/handlers.js";
import { internalError, toResponse } from "./_lib/http.js";
import { loadQuestionSet } from "./_lib/questionSets.js";
import { supabaseStore } from "./_lib/store.js";

/** POST /api/guess: records a guess, scores it on the server, returns the crowd. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toResponse({
      status: 400,
      body: { error: "invalid-request", message: "the body must be JSON" },
    });
  }
  try {
    return toResponse(
      await handleGuess(
        {
          playerId: request.headers.get(PLAYER_ID_HEADER),
          body,
          now: new Date(),
        },
        { store: supabaseStore, loadQuestionSet },
      ),
    );
  } catch (cause) {
    return internalError(cause);
  }
}
