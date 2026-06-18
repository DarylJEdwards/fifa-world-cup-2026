import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "qa/playwright-results",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: browserChannel,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"]
      }
    }
  ]
});
