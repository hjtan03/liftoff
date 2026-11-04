import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { CrashScreen } from "./components/CrashScreen";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CrashScreen>
      <App />
    </CrashScreen>
    {/* Page views, referrers, countries and devices, in the Vercel dashboard; no cookies. */}
    <Analytics mode={import.meta.env.DEV ? "development" : "production"} />
  </StrictMode>,
);
