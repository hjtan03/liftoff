import { useEffect, useRef } from "react";
import { type AdPlacement, adConfig, tipUrl } from "../monetization";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_SCRIPT_ID = "adsense-script";

/** Loads the AdSense script once per page, the first time an ad slot needs it. */
function loadAdSense(client: string) {
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(script);
}

/**
 * One responsive AdSense unit, or nothing at all while ads are off. Google's
 * consent banner for Europe comes with the same script once it is set up in
 * AdSense under Privacy & messaging.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const config = adConfig(placement);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!config || pushedRef.current) return;
    pushedRef.current = true;
    loadAdSense(config.client);
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // An ad that can't load (a blocker, no fill) leaves the space empty.
    }
  }, [config]);

  if (!config) return null;
  return (
    <aside className="ad" aria-label="Advertisement">
      <span className="ad-label">Ad</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={config.client}
        data-ad-slot={config.slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

/** The optional tip link and the privacy policy, at the foot of a screen between launches. */
export function SupportLinks() {
  const tip = tipUrl();
  return (
    <p className="support note">
      {tip && (
        <>
          Enjoying Liftoff?{" "}
          <a href={tip} target="_blank" rel="noopener noreferrer">
            Tip the crew ☕
          </a>
          {" · "}
        </>
      )}
      <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy</a>
    </p>
  );
}
