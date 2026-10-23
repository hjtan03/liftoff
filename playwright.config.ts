import { defineConfig, devices } from "@playwright/test";

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}/`;

// Runs against the production build: `npm run build` first, then `npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: PREVIEW_URL,
    trace: "retain-on-failure",
    // Launches roll over at midnight Eastern, so the tests' fixed clock times are Eastern too.
    timezoneId: "America/New_York",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run preview -- --port ${PREVIEW_PORT} --strictPort`,
    url: PREVIEW_URL,
    reuseExistingServer: !process.env.CI,
  },
});
