import { defineConfig, devices } from "@playwright/test";

const useExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3110",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3110",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
