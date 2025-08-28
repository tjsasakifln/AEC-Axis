import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration for AEC Axis Frontend
 * Comprehensive testing setup for complete user journeys and business workflows
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: process.env.CI 
    ? [['github'], ['html']] 
    : [['list'], ['html', { open: 'never' }]],
  
  // Global test timeout
  timeout: 30000,
  
  // Global setup timeout
  globalTimeout: 60000,
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot only when test fails
    screenshot: 'only-on-failure',
    
    // Record video only when test fails
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 15000,
    
    // Action timeout
    actionTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Test against branded browsers
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./src/test-utils/global-setup.ts'),
  globalTeardown: require.resolve('./src/test-utils/global-teardown.ts'),

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Expect configuration
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,
    
    // Custom matchers
    toHaveScreenshot: { 
      threshold: 0.2, 
      mode: 'strict' 
    },
    toMatchSnapshot: { 
      threshold: 0.2 
    },
  },

  // Test metadata
  metadata: {
    testType: 'e2e',
    project: 'AEC Axis Frontend',
    environment: process.env.NODE_ENV || 'test',
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
})