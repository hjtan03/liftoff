/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vercel serves the site from the domain root.
export default defineConfig({
  base: "/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
