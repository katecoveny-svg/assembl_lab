import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 60000,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "output/playwright/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "mobile-chromium",
      use: { browserName: "chromium", ...devices["Pixel 7"] },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
