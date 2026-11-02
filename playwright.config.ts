import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.E2E_URL || "http://127.0.0.1:4173/AGPilot0001/",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: "npm run build && node scripts/serve.mjs",
        url: "http://127.0.0.1:4173/AGPilot0001/",
        reuseExistingServer: false,
        timeout: 120000,
      },
});
