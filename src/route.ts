import { launchNumberAt, launchNumberFromAddress } from "./questions/schedule";

/** What the page shows, decided by the address and the clock. */
export type Route =
  | { screen: "countdown"; days: number }
  | { screen: "today"; launch: number }
  | { screen: "archive"; today: number }
  /** A past launch from the archive, or a future one opened with `&test`: played apart from today's run and streak. */
  | { screen: "replay"; launch: number }
  | { screen: "not-yet"; launch: number };

/**
 * `?archive` lists past launches; `?launch=N` plays launch N. A future
 * launch only opens with `&test`, for checking a set on a preview, or before
 * the first launch, when every set is still a preview.
 */
export function routeFor(search: string, now: Date): Route {
  const today = launchNumberAt(now);
  const params = new URLSearchParams(search);
  const named = launchNumberFromAddress(search);
  if (named !== null) {
    if (named === today) return { screen: "today", launch: today };
    if (named < today || params.has("test") || today < 1)
      return { screen: "replay", launch: named };
    return { screen: "not-yet", launch: named };
  }
  if (today < 1) return { screen: "countdown", days: 1 - today };
  if (params.has("archive")) return { screen: "archive", today };
  return { screen: "today", launch: today };
}

/** The address of a screen, relative to where the game is served. */
export const hrefFor = {
  today: () => import.meta.env.BASE_URL,
  archive: () => `${import.meta.env.BASE_URL}?archive`,
  launch: (launch: number) => `${import.meta.env.BASE_URL}?launch=${launch}`,
};
