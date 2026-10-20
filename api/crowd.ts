import { handleCrowd } from "../src/api/handlers.js";
import { internalError, toResponse } from "./_lib/http.js";
import { loadQuestionSet } from "./_lib/questionSets.js";
import { supabaseStore } from "./_lib/store.js";

/** GET /api/crowd?launch=N: crowd stats for every stage of a launch. */
export async function GET(request: Request): Promise<Response> {
  try {
    return toResponse(
      await handleCrowd(
        {
          launch: new URL(request.url).searchParams.get("launch"),
          now: new Date(),
        },
        { store: supabaseStore, loadQuestionSet },
      ),
    );
  } catch (cause) {
    return internalError(cause);
  }
}
