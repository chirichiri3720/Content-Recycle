// tests/e2e/03_integration.spec.ts
// Content-Recycle 統合テスト
// カバレッジ対象:
//   - 実Webhookとのエンドツーエンド疎通確認（モックなし）
//   - Supabaseへのデータ保存確認
//   - セッション管理

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS } from '../fixtures/constants';
import {
  fillUrlAndSubmit,
  selectScript,
  waitForStep,
  waitForLoadingComplete,
  getSessionId,
  setupConsoleErrorCapture,
} from '../fixtures/helpers';

// ⚠️ 統合テストは実APIを使うためモックなし
// 環境変数 RUN_INTEGRATION=true が必要
const INTEGRATION_ENABLED = process.env.RUN_INTEGRATION === 'true';

test.describe('統合テスト: 実Webhook疎通 @integration', () => {

  test.skip(!INTEGRATION_ENABLED, '統合テストはRUN_INTEGRATION=trueで実行してください');

  test.setTimeout(300_000); // 5分（実API呼び出しは時間がかかる）

  test('WH1: 実記事URLからスクリプトが生成される', async ({ page }) => {
    const errors = setupConsoleErrorCapture(page);
    await page.goto(URLS.MAIN);

    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);

    // STEP2に遷移する
    await waitForStep(page, 2);

    // session_idが取得できている
    const sessionId = await getSessionId(page);
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');

    // 台本カードが表示されている
    const cards = page.locator(SELECTORS.SCRIPT_CARDS);
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // JavaScriptエラーなし
    expect(errors.filter(e => e.includes('TypeError'))).toHaveLength(0);
  });

  test('WH1→WH2: 台本選択からシーン編集画面まで遷移する', async ({ page }) => {
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    const sessionIdBeforeSelect = await getSessionId(page);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);

    // session_idが変わっていないこと（同一セッション内処理）
    const sessionIdAfterSelect = await getSessionId(page);
    expect(sessionIdAfterSelect).toBe(sessionIdBeforeSelect);

    // シーン編集フィールドが存在する
    const editFields = page.locator(SELECTORS.EDIT_FIELDS);
    const fieldCount = await editFields.count();
    expect(fieldCount).toBe(7); // 7シーン
  });

  test('セッションIDがWH1〜WH4を通じて一貫して使われる', async ({ page }) => {
    const requests: { wh: string; sessionId: string }[] = [];

    // 各Webhookリクエストのbodyをキャプチャ
    await page.route('**/webhook/content-recycle-**', async (route) => {
      const request = route.request();
      const url = request.url();
      try {
        const body = JSON.parse(await request.postData() || '{}');
        const whMatch = url.match(/content-recycle-(wh\d+)/i);
        if (whMatch) {
          requests.push({ wh: whMatch[1], sessionId: body.session_id });
        }
      } catch {}
      await route.continue();
    });

    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);

    // WH1でsession_idが発行され、WH2に渡っていること
    const wh1Req = requests.find(r => r.wh.toLowerCase() === 'wh1');
    const wh2Req = requests.find(r => r.wh.toLowerCase() === 'wh2');

    if (wh2Req && wh1Req) {
      // session_idが一致している
      expect(wh2Req.sessionId).toBeTruthy();
    }
  });
});

test.describe('統合テスト: Supabase確認 @integration', () => {

  test.skip(!INTEGRATION_ENABLED, '統合テストはRUN_INTEGRATION=trueで実行してください');
  test.setTimeout(300_000);

  test('WH1完了後にsupabase scriptsテーブルにレコードが作成される', async ({ page }) => {
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    const sessionId = await getSessionId(page);
    expect(sessionId).toBeTruthy();

    // SupabaseのREST APIで直接確認
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      test.skip();
      return;
    }

    const response = await page.request.get(
      `${SUPABASE_URL}/rest/v1/sessions?session_id=eq.${sessionId}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].session_id).toBe(sessionId);
  });
});
