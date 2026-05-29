import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1, // UI crawler must run serially — parallel workers interfere with auth state

  use: {
    headless: true,
    screenshot: 'off', // Crawler takes its own screenshots
    video: 'off',
    trace: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'ui-qa',
      testMatch: /ui-qa\/.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
      },
    },
  ],

  reporter: [['list'], ['json', { outputFile: 'ui-qa-output/playwright-results.json' }]],
});
