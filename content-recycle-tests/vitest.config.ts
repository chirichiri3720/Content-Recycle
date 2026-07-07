import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Playwright の tests/e2e は対象外にし、純粋なロジックの単体テストのみ実行する
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 10_000,
  },
});
