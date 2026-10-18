import { defineConfig, devices } from '@playwright/test';

const port = process.env.DEMO_PORT || '4173';
const baseURL = process.env.DEMO_BASE_URL || `http://127.0.0.1:${port}`;
const extraBrowsers = process.env.ALL_BROWSERS === '1';

const reporter = process.env.PLAYWRIGHT_BLOB
  ? [['blob'], ['list']] as const
  : [
      ['list'],
      ['html', { outputFolder: 'Reports/html', open: 'never' }],
    ] as const;

export default defineConfig({
  testDir: './Automation Scripts',
  globalSetup: './fixtures/global-setup.mjs',
  globalTeardown: './fixtures/global-teardown.mjs',
  outputDir: './Reports/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [...reporter],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node fixtures/server.mjs',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      DEMO_PORT: port,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(extraBrowsers
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
});
