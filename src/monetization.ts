/**
 * Ads and tips, both off unless configured. Set these in Vercel (Project →
 * Settings → Environment Variables) and redeploy; nothing shows or loads
 * while they are empty. docs/monetization.md has the steps.
 *
 *   VITE_ADSENSE_CLIENT         ca-pub-… from AdSense
 *   VITE_ADSENSE_SLOT_REPORT    the ad unit id for the flight report
 *   VITE_ADSENSE_SLOT_ARCHIVE   the ad unit id for the archive
 *   VITE_TIP_URL                an https link to a tip page (Ko-fi, Buy Me a Coffee…)
 */

const ADSENSE_CLIENT = /^ca-pub-\d{10,20}$/;
const ADSENSE_SLOT = /^\d{6,20}$/;

/** Where an ad can appear: never during a stage, only between launches. */
export type AdPlacement = "report" | "archive";

export type AdConfig = { client: string; slot: string };

type Env = Record<string, string | boolean | undefined>;

/** The AdSense client and unit for a placement, or null when ads are off or the values don't look like AdSense ids. */
export function adConfig(
  placement: AdPlacement,
  env: Env = import.meta.env,
): AdConfig | null {
  const client = String(env.VITE_ADSENSE_CLIENT ?? "").trim();
  const slot = String(
    env[
      placement === "report"
        ? "VITE_ADSENSE_SLOT_REPORT"
        : "VITE_ADSENSE_SLOT_ARCHIVE"
    ] ?? "",
  ).trim();
  if (!ADSENSE_CLIENT.test(client) || !ADSENSE_SLOT.test(slot)) return null;
  return { client, slot };
}

/** The tip page's address, or null when tips are off; only an https link is accepted. */
export function tipUrl(env: Env = import.meta.env): string | null {
  const value = String(env.VITE_TIP_URL ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
