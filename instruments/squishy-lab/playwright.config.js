import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.js",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "ignore",
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
