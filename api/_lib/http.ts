import type { ApiResult } from "../../src/api/handlers.js";

export function toResponse(result: ApiResult): Response {
  return Response.json(result.body, {
    status: result.status,
    headers: { "cache-control": "no-store" },
  });
}

/** Logs the cause for the Vercel function logs and answers 500 without leaking it. */
export function internalError(cause: unknown): Response {
  console.error(cause);
  return toResponse({
    status: 500,
    body: { error: "internal", message: "something went wrong on our side" },
  });
}
