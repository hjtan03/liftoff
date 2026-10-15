/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves this repository as a project site under /liftoff/.
export default defineConfig({
  base: "/liftoff/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
