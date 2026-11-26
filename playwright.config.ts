import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', baseURL: 'http://127.0.0.1:3100' },
  webServer: { command: 'pnpm exec tsx tests/e2e/serve.ts', url: 'http://127.0.0.1:3100' },
})
