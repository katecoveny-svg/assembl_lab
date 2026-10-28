export default {
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4185",
    headless: true,
    viewport: { width: 1280, height: 1000 },
  },
  outputDir: "../../output/playwright/stage-two-test-results",
};
