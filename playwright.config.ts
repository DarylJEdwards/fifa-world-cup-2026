import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : "msedge");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const browserUse = browserChannel ? { channel: browserChannel } : {};
const webServer = process.env.PLAYWRIGHT_BASE_URL
  ? {}
  : {
      webServer: {
        command: "npm run dev",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
    };

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "qa/playwright-results",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    ...browserUse,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off"
  },
  ...webServer,
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
