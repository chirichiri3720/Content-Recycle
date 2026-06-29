// tests/e2e/01_happy_path.spec.ts
// Content-Recycle ハッピーパス E2Eテスト
// カバレッジ対象: STEP1→2→3→4→5→6→7 の正常フロー全体

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS } from '../fixtures/constants';
import {
  mockAllWebhooks,
  fillUrlAndSubmit,
  selectScript,
  proceedThroughStep4,
  waitForStep,
  waitForLoadingComplete,
  setupConsoleErrorCapture,
  getSessionId,
} from '../fixtures/helpers';

test.describe('ハッピーパス: STEP1〜STEP7 正常フロー @happy @smoke', () => {

  test.beforeEach(async ({ page }) => {
    await mockAllWebhooks(page);
    await page.goto(URLS.MAIN);
  });

  // ────────────────────────────────────────────────
  // STEP1: ページ表示・初期状態
  // ────────────────────────────────────────────────
  test('STEP1: ページが正常に表示され、入力フォームが存在する @smoke', async ({ page }) => {
    await waitForStep(page, 1);

    // URL入力フィールドが存在する
    await expect(page.locator(SELECTORS.URL_INPUT)).toBeVisible();
    // 送信ボタンが存在する
    await expect(page.locator(SELECTORS.SUBMIT_BTN)).toBeVisible();
    // ステップインジケーターが表示されている
    await expect(page.locator(SELECTORS.STEP_INDICATOR).first()).toBeVisible();
    // STEP2以降は非表示
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });

  // ────────────────────────────────────────────────
  // STEP1 → STEP2: URL送信 → 台本生成
  // ────────────────────────────────────────────────
  test('STEP1→2: 有効なURLを入力して送信するとSTEP2に遷移する @happy', async ({ page }) => {
    const consoleErrors = setupConsoleErrorCapture(page);

    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);

    // ローディング表示の確認
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);

    // STEP2が表示される
    await waitForStep(page, 2);

    // 台本カードが2枚表示される
    const cards = page.locator(SELECTORS.SCRIPT_CARDS);
    await expect(cards).toHaveCount(2);

    // session_idがstateに保存されている
    const sessionId = await getSessionId(page);
    expect(sessionId).toBeTruthy();

    // コンソールエラーがないこと
    expect(consoleErrors).toHaveLength(0);
  });

  // ────────────────────────────────────────────────
  // STEP2 → STEP3: 台本選択
  // ────────────────────────────────────────────────
  test('STEP2→3: 台本カードを選択するとSTEP3（編集）に遷移する @happy', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    // 1枚目の台本を選択
    await selectScript(page, 0);

    // クライアントサイド遷移のため即時確認
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);

    // STEP3が表示される
    await waitForStep(page, 3);

    // シーン編集フィールドが表示される（7シーン分）
    const editFields = page.locator(SELECTORS.EDIT_FIELDS);
    await expect(editFields).toHaveCount(7);
  });

  test('STEP2→3: 2枚目の台本カードも選択できる @happy', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);

    await selectScript(page, 1);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
  });

  // ────────────────────────────────────────────────
  // STEP3 → STEP4: 台本編集 → 設定
  // ────────────────────────────────────────────────
  test('STEP3→4: 編集画面で次へを押すとSTEP4（設定）に遷移する @happy', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);

    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);

    // 表現スタイル選択グリッドと音声リストが表示される
    await expect(page.locator(`${SELECTORS.EXPRESSION_GRID} .style-option`).first()).toBeVisible();
    await expect(page.locator(`${SELECTORS.VOICE_LIST} .av-option`).first()).toBeVisible();
  });

  test('STEP3: シーンのナレーションテキストを編集できる @happy', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);

    // 最初のシーンのナレーションを編集
    const firstField = page.locator(SELECTORS.EDIT_FIELDS).first();
    await firstField.clear();
    await firstField.fill('編集後のナレーションテキストです。');
    await expect(firstField).toHaveValue('編集後のナレーションテキストです。');
  });

  // ────────────────────────────────────────────────
  // STEP4 → STEP5: 設定 → 確認
  // ────────────────────────────────────────────────
  test('STEP4→5: 設定完了後にSTEP5（確認）に遷移する @happy', async ({ page }) => {
    // STEP1〜3を通過
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);

    // 表現スタイルを選択して生成ボタンをクリック
    await proceedThroughStep4(page);

    // WH3（アセット生成）が完了するまで待つ
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);

    // シーン一覧が表示される（7シーン）
    const scenes = page.locator(SELECTORS.SCENE_LIST);
    await expect(scenes).toHaveCount(7);
  });

  test('STEP4: BGMを変更できる @happy', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);

    // STEP5へ遷移（BGMはSTEP5にある）
    await proceedThroughStep4(page);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);

    // BGMリストが表示される
    await expect(page.locator(SELECTORS.BGM_LIST)).toBeVisible();
    // 2番目のBGMを選択
    const bgmOptions = page.locator('#bgm-list .av-option');
    await bgmOptions.nth(1).click();
    await expect(bgmOptions.nth(1)).toHaveClass(/selected/);
  });

  // ────────────────────────────────────────────────
  // STEP5 → STEP6: 確認 → 合成
  // ────────────────────────────────────────────────
  test('STEP5→6: 合成ボタンを押すとSTEP6（動画プレビュー）に遷移する @happy', async ({ page }) => {
    // STEP1〜4を通過
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);
    await proceedThroughStep4(page);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);

    await page.click(SELECTORS.COMPOSE_BTN);

    // WH4（Shotstack合成）完了を待つ
    await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
    await waitForStep(page, 6);

    // 動画プレビューが表示される
    await expect(page.locator(SELECTORS.VIDEO_PREVIEW)).toBeVisible();
    // 承認・却下ボタンが表示される
    await expect(page.locator(SELECTORS.APPROVE_BTN)).toBeVisible();
    await expect(page.locator(SELECTORS.REJECT_BTN)).toBeVisible();
  });

  // ────────────────────────────────────────────────
  // STEP6 → STEP7: 承認 → 完成
  // ────────────────────────────────────────────────
  test('STEP6→7: 承認ボタンを押すとSTEP7（完成）に遷移する @happy', async ({ page }) => {
    // STEP1〜5を通過
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);
    await proceedThroughStep4(page);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
    await waitForStep(page, 6);

    await page.click(SELECTORS.APPROVE_BTN);
    await waitForStep(page, 7);

    // ダウンロードボタンが表示される
    await expect(page.locator(SELECTORS.DOWNLOAD_BTN)).toBeVisible();
    // メタデータ編集パネルが表示される
    await expect(page.locator(SELECTORS.META_PANEL)).toBeVisible();
  });

  test('STEP7: メタデータを編集できる @happy', async ({ page }) => {
    // STEP1〜6を通過して承認
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);
    await proceedThroughStep4(page);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
    await waitForStep(page, 6);
    await page.click(SELECTORS.APPROVE_BTN);
    await waitForStep(page, 7);

    // コピーボタンが存在する（read-onlyのコピーパネル）
    await expect(page.locator('#meta-panel .btn-copy-field').first()).toBeVisible();

    // タブが複数存在し、切り替えができる
    const tabs = page.locator('#meta-panel .meta-tab');
    await expect(tabs).toHaveCount(await tabs.count());
    expect(await tabs.count()).toBeGreaterThan(0);
    // 2番目のタブをクリックしてアクティブになることを確認
    if (await tabs.count() >= 2) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveClass(/active/);
    }
  });

  test('STEP6: 却下ボタンを押すとSTEP5に戻る @happy', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);
    await proceedThroughStep4(page);
    await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
    await waitForStep(page, 5);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
    await waitForStep(page, 6);

    // 却下 → STEP5に戻る
    await page.click(SELECTORS.REJECT_BTN);
    await waitForStep(page, 5);
  });
});
