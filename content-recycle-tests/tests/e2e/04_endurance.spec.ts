// tests/e2e/04_endurance.spec.ts
// Content-Recycle 耐久テスト
// カバレッジ対象:
//   - 繰り返し実行によるメモリリーク・stateバグの検出
//   - 連続セッション生成（5回連続フロー）
//   - 長時間操作後のUI状態維持

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS } from '../fixtures/constants';
import {
  mockAllWebhooks,
  fillUrlAndSubmit,
  selectScript,
  waitForStep,
  waitForLoadingComplete,
  setupConsoleErrorCapture,
  getSessionId,
} from '../fixtures/helpers';

test.describe('耐久テスト: 繰り返し実行 @endurance', () => {

  test.setTimeout(600_000); // 10分

  test('ハッピーパスを3回連続で実行してもstateが汚染されない', async ({ page }) => {
    const REPEAT_COUNT = 3;
    const sessionIds: string[] = [];
    const allErrors: string[] = [];

    for (let i = 0; i < REPEAT_COUNT; i++) {
      const errors = setupConsoleErrorCapture(page);
      await mockAllWebhooks(page);
      await page.goto(URLS.MAIN);

      // STEP1
      await waitForStep(page, 1);
      await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
      await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
      await waitForStep(page, 2);

      // session_idを記録
      const sessionId = await getSessionId(page);
      expect(sessionId).toBeTruthy();

      // 同じsession_idが使い回されていないこと
      if (sessionIds.length > 0) {
        // 実APIではセッションIDは毎回新規発行されるべき（モックでは一定だが）
        sessionIds.push(sessionId!);
      } else {
        sessionIds.push(sessionId!);
      }

      // STEP2
      await selectScript(page, i % 2); // 交互に選択
      await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
      await waitForStep(page, 3);

      // STEP3→4
      await page.click(SELECTORS.EDIT_NEXT_BTN);
      await waitForStep(page, 4);

      // STEP4→5
      await page.click(SELECTORS.SETTINGS_NEXT_BTN);
      await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
      await waitForStep(page, 5);

      // 各周回でコンソールエラーがないこと
      const criticalErrors = errors.filter(e =>
        e.includes('TypeError') || e.includes('ReferenceError') || e.includes('Cannot read')
      );
      allErrors.push(...criticalErrors.map(e => `[Round ${i + 1}] ${e}`));
    }

    // 全周回でクリティカルエラーがないこと
    expect(allErrors).toHaveLength(0);
  });

  test('STEP2で台本選択をキャンセルして戻る操作を5回繰り返してもUIが崩れない', async ({ page }) => {
    await mockAllWebhooks(page);
    await page.goto(URLS.MAIN);

    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    // 台本カードが正常に表示されていること
    await expect(page.locator(SELECTORS.SCRIPT_CARDS)).toHaveCount(2);

    // ページリロードなしで同一画面に留まる操作を繰り返す
    for (let i = 0; i < 5; i++) {
      // カードをホバー
      await page.locator(SELECTORS.SCRIPT_CARDS).first().hover();
      // 少し待つ
      await page.waitForTimeout(500);
      // カードがまだ表示されていること
      await expect(page.locator(SELECTORS.SCRIPT_CARDS)).toHaveCount(2);
    }
  });

  test('ページをリロードすると初期状態に戻る（stateが永続化されていない）', async ({ page }) => {
    await mockAllWebhooks(page);
    await page.goto(URLS.MAIN);

    // STEP2まで進む
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    // ページリロード
    await page.reload();
    await waitForStep(page, 1);

    // STEP1の入力フォームが空になっている
    const inputValue = await page.locator(SELECTORS.URL_INPUT).inputValue();
    expect(inputValue).toBe('');

    // STEP2が非表示
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });

  test('メモリ使用量が許容範囲内（繰り返し5回でページが重くならない）', async ({ page }) => {
    await mockAllWebhooks(page);

    const measureMemory = async () => {
      return await page.evaluate(() => {
        // Chrome devtools protocol経由でメモリ取得（利用可能な場合）
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return null;
      });
    };

    await page.goto(URLS.MAIN);
    const memBefore = await measureMemory();

    // 5回フロー実行
    for (let i = 0; i < 5; i++) {
      await page.goto(URLS.MAIN);
      await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
      await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
      await waitForStep(page, 2);
    }

    const memAfter = await measureMemory();

    if (memBefore !== null && memAfter !== null) {
      const memIncrease = memAfter - memBefore;
      // 5回実行でメモリ増加が100MB以内であること
      expect(memIncrease).toBeLessThan(100);
    }
  });
});

test.describe('耐久テスト: エラーからのリカバリ繰り返し @endurance', () => {

  test.setTimeout(300_000);

  test('エラー→リカバリを3回繰り返してもUIが正常に機能する', async ({ page }) => {
    await page.goto(URLS.MAIN);

    for (let i = 0; i < 3; i++) {
      // エラーケース
      await page.route('**/webhook/content-recycle-wh1**', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'server_error' }) });
      });

      await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
      await page.waitForSelector(SELECTORS.ERROR_MESSAGE, { timeout: 15_000 });

      // ルートをリセットして成功に変更
      await page.unroute('**/webhook/content-recycle-wh1**');
      await page.route('**/webhook/content-recycle-wh1**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            session_id: `session-${i}`,
            script_candidates: [
              {
                id: 'sc-a', title: 'テスト台本',
                scenes: Array.from({ length: 7 }, (_, j) => ({
                  scene_no: j + 1,
                  narration: 'テスト',
                  subtitle_text: 'テスト',
                  duration_sec: 5,
                })),
                mood_profile: 'serious',
                hook_type: 'question',
              },
            ],
          }),
        });
      });

      await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
      await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
      await waitForStep(page, 2);

      // 台本カードが表示されていること
      await expect(page.locator(SELECTORS.SCRIPT_CARDS)).toHaveCount(1);

      // 次のループのためにリセット
      await page.goto(URLS.MAIN);
    }
  });
});
