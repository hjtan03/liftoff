import { PLAYER_ID_HEADER } from "../src/api/contract.js";
import { handleEvent } from "../src/api/handlers.js";
import { internalError, toResponse } from "./_lib/http.js";
import { supabaseStore } from "./_lib/store.js";

/** POST /api/event: records one analytics event for a player and launch. */
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
      await handleEvent(
        {
          playerId: request.headers.get(PLAYER_ID_HEADER),
          body,
          now: new Date(),
        },
        { store: supabaseStore },
      ),
    );
  } catch (cause) {
    return internalError(cause);
  }
}
