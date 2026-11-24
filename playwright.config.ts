import { defineConfig } from "@playwright/test";
const port = Number(process.env.CABIN_TEST_PORT ?? 5197);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 4,
  maxFailures: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: { baseURL, viewport: { width: 1440, height: 980 }, trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/game.mjs --serve",
    url: baseURL,
    env: { CABIN_PORT: String(port) },
    timeout: 120_000,
  },
});
