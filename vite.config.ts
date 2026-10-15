/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vercel serves the site from the domain root.
export default defineConfig({
  base: "/",
  // No single-page fallback: a missing file answers 404 here, as it does on the host.
  appType: "mpa",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
