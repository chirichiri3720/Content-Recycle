import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // ステートフルなパイプラインなので直列実行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://chirichiri3720.github.io/Content-Recycle/main.html',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // タイムアウト設定（外部API呼び出しが多いため長めに）
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  timeout: 120_000, // 1テストあたり2分（WH3など重い処理を考慮）
  expect: {
    timeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 耐久テスト用の設定（別途 npm run test:endurance で実行）
  // workers: 1 を維持しつつ繰り返しはテストコード側で制御
});
