// tests/e2e/02_error_cases.spec.ts
// Content-Recycle エラー系テスト
// カバレッジ対象:
//   - フロントエンド入力バリデーション
//   - WH1〜WH4 APIエラーハンドリング
//   - n8nノード系エラー（クォータ超過・タイムアウト・500エラー）
//   - ネットワークエラー

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS, MOCK_RESPONSES } from '../fixtures/constants';
import {
  mockWH1,
  mockWH2,
  mockWH3,
  mockWH4,
  mockWH1NetworkError,
  mockWH1Timeout,
  mockAllWebhooks,
  fillUrlAndSubmit,
  selectScript,
  waitForStep,
  waitForLoadingComplete,
  expectErrorMessage,
  setupConsoleErrorCapture,
} from '../fixtures/helpers';

test.describe('入力バリデーション @error', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.MAIN);
  });

  test('空のURLで送信するとエラーメッセージが表示される', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.EMPTY);
    await expectErrorMessage(page, /URL/);
    // STEP2に遷移しないこと
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });

  test('不正なURL形式で送信するとエラーが表示される', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.INVALID_FORMAT);
    await expectErrorMessage(page);
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });

  test('非常に長いURLで送信しても適切にハンドリングされる', async ({ page }) => {
    await mockWH1(page, MOCK_RESPONSES.WH1_ERROR_INVALID_URL, 400);
    await fillUrlAndSubmit(page, TEST_ARTICLES.TOO_LONG);
    // エラー表示 or バリデーションで弾かれる（どちらでもSTEP2に進まない）
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });
});

test.describe('WH1エラー: スクリプト生成失敗 @error', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.MAIN);
  });

  test('WH1がAPIクォータ超過(429)を返すとエラーメッセージが表示される', async ({ page }) => {
    await mockWH1(page, { error: 'quota_exceeded', message: 'APIクォータが上限に達しました' }, 429);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });

  test('WH1が500エラーを返すとエラーメッセージが表示される', async ({ page }) => {
    await mockWH1(page, { error: 'internal_server_error' }, 500);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);
  });

  test('WH1がネットワークエラーでもフリーズしない', async ({ page }) => {
    await mockWH1NetworkError(page);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    // タイムアウトではなくエラー表示でリカバリする
    await expectErrorMessage(page, undefined);
    // ページがフリーズしていないこと（別操作が可能）
    await expect(page.locator(SELECTORS.URL_INPUT)).toBeEnabled();
  });

  test('WH1が404を返すと記事取得失敗メッセージが表示される', async ({ page }) => {
    await mockWH1(page, MOCK_RESPONSES.WH1_ERROR_INVALID_URL, 404);
    await fillUrlAndSubmit(page, TEST_ARTICLES.NOT_FOUND);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);
  });

  test('WH1エラー後に再送信できる（リトライ可能）', async ({ page }) => {
    // 1回目: エラー
    await mockWH1(page, { error: 'server_error' }, 500);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);

    // ルートを成功に変更してリトライ
    await page.unroute('**/webhook/content-recycle-wh1**');
    await mockWH1(page);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
  });
});

test.describe('WH2エラー: 台本選択失敗 @error', () => {

  test.beforeEach(async ({ page }) => {
    await mockWH1(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
  });

  test('WH2が500エラーを返すとエラーメッセージが表示される', async ({ page }) => {
    await mockWH2(page, { error: 'internal_server_error' }, 500);
    await selectScript(page, 0);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);
    await expect(page.locator(SELECTORS.STEP4_CONTAINER)).not.toBeVisible();
  });

  test('WH2エラー後にSTEP2で別の台本を選択できる', async ({ page }) => {
    // 1回目: エラー
    await mockWH2(page, { error: 'error' }, 500);
    await selectScript(page, 0);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);

    // STEP2に戻ってリトライ
    await page.click('button[onclick="goBackToStep2()"]');
    await page.unroute('**/webhook/content-recycle-wh2**');
    await mockWH2(page);
    await selectScript(page, 1);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 4);
  });
});

test.describe('WH3エラー: アセット生成失敗 @error', () => {

  async function goToStep4(page: any) {
    await mockWH1(page);
    await mockWH2(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 4);
  }

  test('WH3が500エラーを返すとエラーが表示される', async ({ page }) => {
    await goToStep4(page);
    await mockWH3(page, { error: 'asset_generation_failed' }, 500);
    await page.click(SELECTORS.SETTINGS_NEXT_BTN);
    await waitForLoadingComplete(page, 30_000);
    await expectErrorMessage(page);
    await expect(page.locator(SELECTORS.STEP5_CONTAINER)).not.toBeVisible();
  });

  test('WH3が部分的に失敗した場合（一部シーン欠落）でもクラッシュしない', async ({ page }) => {
    await goToStep4(page);
    // シーン4のimage_urlが欠落した不完全なレスポンス
    const partialResponse = {
      ...MOCK_RESPONSES.WH3_SUCCESS,
      scenes: MOCK_RESPONSES.WH3_SUCCESS.scenes.map((s, i) =>
        i === 3 ? { ...s, image_url: null } : s
      ),
    };
    await mockWH3(page, partialResponse);
    await page.click(SELECTORS.SETTINGS_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    // エラー表示 or STEP5に遷移するが、ページがクラッシュしていないこと
    await expect(page.locator('body')).not.toContainText('Uncaught');
  });
});

test.describe('WH4エラー: 動画合成失敗 @error', () => {

  async function goToStep5(page: any) {
    await mockWH1(page);
    await mockWH2(page);
    await mockWH3(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 4);
    await page.click(SELECTORS.SETTINGS_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);
  }

  test('WH4が500エラーを返すとエラーが表示される', async ({ page }) => {
    await goToStep5(page);
    await mockWH4(page, { error: 'shotstack_render_failed' }, 500);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, 30_000);
    await expectErrorMessage(page);
    await expect(page.locator(SELECTORS.STEP6_CONTAINER)).not.toBeVisible();
  });

  test('WH4がShotstack合成失敗を返すと適切なメッセージが表示される', async ({ page }) => {
    await goToStep5(page);
    await mockWH4(page, { error: 'render_failed', message: 'Shotstackのレンダリングに失敗しました' }, 422);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, 30_000);
    await expectErrorMessage(page);
  });

  test('WH4エラー後に再合成を試みられる', async ({ page }) => {
    await goToStep5(page);
    // 1回目: エラー
    await mockWH4(page, { error: 'error' }, 500);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, 30_000);
    await expectErrorMessage(page);

    // リトライ
    await page.unroute('**/webhook/content-recycle-wh4**');
    await mockWH4(page);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
    await waitForStep(page, 6);
  });
});

test.describe('n8nノード系エラー @error', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.MAIN);
  });

  test('WH1クォータチェックエラー: 月次クォータ超過メッセージが表示される', async ({ page }) => {
    await mockWH1(page, {
      error: 'monthly_quota_exceeded',
      message: '今月の動画生成クォータに達しました',
    }, 429);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, 15_000);
    await expectErrorMessage(page);
  });

  test('Supabase書き込みエラー: DBエラーでも画面がフリーズしない', async ({ page }) => {
    await mockWH1(page, {
      error: 'supabase_error',
      message: 'データベースへの書き込みに失敗しました',
    }, 500);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, 15_000);
    // エラーが表示され、入力フォームが再度操作可能
    await expect(page.locator(SELECTORS.URL_INPUT)).toBeEnabled();
  });

  test('session_idが返ってこない場合でもクラッシュしない', async ({ page }) => {
    // session_idなしのレスポンス
    await mockWH1(page, {
      script_candidates: MOCK_RESPONSES.WH1_SUCCESS.script_candidates,
      // session_id なし
    });
    const errors = setupConsoleErrorCapture(page);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    // ページエラーではなくグレースフルな処理
    const pageErrors = errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'));
    expect(pageErrors).toHaveLength(0);
  });

  test('script_candidatesが空配列の場合のハンドリング', async ({ page }) => {
    await mockWH1(page, {
      session_id: 'test-session-empty',
      script_candidates: [],
    });
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    // 空の台本リストでも適切なメッセージ表示
    await expect(page.locator('body')).not.toContainText('Uncaught');
  });

  test('WH2(select)がscenes欠落の不正レスポンスを返してもクラッシュしない', async ({ page }) => {
    await mockWH1(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    const errors = setupConsoleErrorCapture(page);
    await mockWH2(page, MOCK_RESPONSES.WH2_MALFORMED);
    await selectScript(page, 0);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);

    // STEP4に遷移し、シーン確認パネルが空のままでもエラーにならないこと
    await waitForStep(page, 4);
    const pageErrors = errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'));
    expect(pageErrors).toHaveLength(0);
  });

  test('generate(旧WH3表記)がscenes空配列を返してもSTEP5がクラッシュせず表示される', async ({ page }) => {
    await mockWH1(page);
    await mockWH2(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 4);

    await mockWH3(page, MOCK_RESPONSES.WH3_EMPTY_SCENES);
    await page.click(SELECTORS.SETTINGS_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);
    await expect(page.locator('body')).not.toContainText('Uncaught');
  });

  test('映像タイプ「動画」選択時、kling_tasksが空でもSTEP4に遷移しクラッシュしない', async ({ page }) => {
    await mockWH1(page);
    await mockWH2(page, { ...MOCK_RESPONSES.WH2_SUCCESS, scenes: [], kling_tasks: [] });
    await page.goto(URLS.MAIN);
    await page.fill(SELECTORS.URL_INPUT, TEST_ARTICLES.VALID_1);
    await page.selectOption(SELECTORS.CONTENT_TYPE_SELECT, { index: 1 });
    await page.click(SELECTORS.VT_VIDEO_OPTION);
    await page.click(SELECTORS.SUBMIT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    const errors = setupConsoleErrorCapture(page);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 4);

    const pageErrors = errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'));
    expect(pageErrors).toHaveLength(0);
  });
});
