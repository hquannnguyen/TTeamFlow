import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests cho TTeamFlow.
 * Yêu cầu: backend (localhost:3000) + frontend dev server đang chạy,
 * DB riêng cho e2e (không chạy trên DB thật của nhóm).
 * Chạy: npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // các test dùng chung dữ liệu seed, chạy tuần tự
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'vi-VN',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
