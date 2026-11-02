import { defineConfig } from "vite";

// Relative base so the build works under https://hyangdan2.github.io/AGPilot0001/
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
  test: { include: ["tests/**/*.test.ts"] },
} as Parameters<typeof defineConfig>[0]);
