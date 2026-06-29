// tests/e2e/06_step_details.spec.ts
// Content-Recycle 各ステップ詳細動作テスト
// カバレッジ対象:
//   - STEP1: コンテンツ種別未選択バリデーション
//   - STEP2: 確定ボタン有効/無効・カード表示・戻るボタン
//   - STEP3: 空ナレーション検証・編集バッジ・文字カウンター・戻るボタン
//   - STEP4: スタイル詳細選択・映像タイプ切替・音声選択・戻るボタン
//   - STEP5: 字幕位置選択・戻るボタン

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS } from '../fixtures/constants';
import {
  mockWH1,
  mockAllWebhooks,
  fillUrlAndSubmit,
  selectScript,
  waitForStep,
  waitForLoadingComplete,
  goToStep3,
  goToStep4,
  goToStep5,
} from '../fixtures/helpers';

// ────────────────────────────────────────────────
// STEP1: コンテンツ種別バリデーション
// ────────────────────────────────────────────────
test.describe('STEP1: コンテンツ種別バリデーション @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.MAIN);
  });

  test('コンテンツ種別を選択しないとエラーが表示される', async ({ page }) => {
    await page.fill(SELECTORS.URL_INPUT, TEST_ARTICLES.VALID_1);
    // content-typeは選択しない（デフォルト空値）
    await page.click(SELECTORS.SUBMIT_BTN);
    await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });
});

// ────────────────────────────────────────────────
// STEP2: 台本カード表示・選択・戻る
// ────────────────────────────────────────────────
test.describe('STEP2: 台本カード詳細 @happy', () => {
  test.beforeEach(async ({ page }) => {
    await mockWH1(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
  });

  test('台本未選択時に確定ボタンがdisabled', async ({ page }) => {
    await expect(page.locator(SELECTORS.SCRIPT_SELECT_BTN)).toBeDisabled();
  });

  test('台本選択後に確定ボタンが有効になる', async ({ page }) => {
    await page.locator(SELECTORS.SCRIPT_CARDS).first().click();
    await expect(page.locator(SELECTORS.SCRIPT_SELECT_BTN)).not.toBeDisabled();
  });

  test('台本カードにタイトルが表示される', async ({ page }) => {
    const title = page.locator('.script-title').first();
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('台本カードにコンセプト/概要が表示される', async ({ page }) => {
    await expect(page.locator('.script-body').first()).toBeVisible();
  });

  test('戻るボタンでSTEP1に戻り入力値が復元される', async ({ page }) => {
    await page.click(SELECTORS.BACK_TO_STEP1_BTN);
    await waitForStep(page, 1);
    await expect(page.locator(SELECTORS.URL_INPUT)).toHaveValue(TEST_ARTICLES.VALID_1);
  });
});

// ────────────────────────────────────────────────
// STEP3: 編集機能詳細
// ────────────────────────────────────────────────
test.describe('STEP3: 編集機能詳細 @happy', () => {
  test.beforeEach(async ({ page }) => {
    await goToStep3(page);
  });

  test('空白のみのナレーションがあると設定へ進めずエラーが表示される', async ({ page }) => {
    const firstField = page.locator(SELECTORS.EDIT_FIELDS).first();
    await firstField.fill('   ');
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
    await expect(page.locator(SELECTORS.STEP4_CONTAINER)).not.toBeVisible();
  });

  test('テキスト編集後に編集済みバッジが表示される', async ({ page }) => {
    const firstField = page.locator(SELECTORS.EDIT_FIELDS).first();
    await firstField.fill('まったく別のナレーションに変更しました。テストです。');
    await expect(page.locator('.edited-badge').first()).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
  });

  test('テキスト変更で合計秒数表示が更新される', async ({ page }) => {
    const durEl = page.locator(SELECTORS.TOTAL_DUR);
    const before = await durEl.textContent();
    const firstField = page.locator(SELECTORS.EDIT_FIELDS).first();
    await firstField.fill(
      '非常に長いナレーションテキストです。これはテスト用の長いテキストで文字数を大幅に増やすために記述しています。合計秒数が変わるはずです。'
    );
    const after = await durEl.textContent();
    expect(before).not.toBe(after);
  });

  test('左パネルに記事情報エリアが存在する', async ({ page }) => {
    await expect(page.locator('#step3-article-title')).toBeVisible();
    await expect(page.locator('#step3-concept')).toBeVisible();
  });

  test('戻るボタンでSTEP2に戻る', async ({ page }) => {
    await page.click(SELECTORS.BACK_TO_STEP2_BTN);
    await waitForStep(page, 2);
    await expect(page.locator(SELECTORS.SCRIPT_CARDS).first()).toBeVisible();
  });
});

// ────────────────────────────────────────────────
// STEP4: 設定詳細
// ────────────────────────────────────────────────
test.describe('STEP4: 設定詳細 @happy', () => {
  test.beforeEach(async ({ page }) => {
    await goToStep4(page);
  });

  test('表現スタイル未選択状態でボタンがdisabled', async ({ page }) => {
    // renderStep4で音声は自動選択されるが表現スタイルは未選択
    await expect(page.locator(SELECTORS.SETTINGS_NEXT_BTN)).toBeDisabled();
  });

  test('2番目の表現スタイルを選択できる', async ({ page }) => {
    const styles = page.locator(`${SELECTORS.EXPRESSION_GRID} .style-option`);
    await styles.nth(1).click();
    await expect(styles.nth(1)).toHaveClass(/selected/);
    await expect(styles.nth(0)).not.toHaveClass(/selected/);
  });

  test('3番目の表現スタイルを選択できる', async ({ page }) => {
    const styles = page.locator(`${SELECTORS.EXPRESSION_GRID} .style-option`);
    await styles.nth(2).click();
    await expect(styles.nth(2)).toHaveClass(/selected/);
  });

  test('表現スタイル選択後にボタンが有効になる', async ({ page }) => {
    await page.locator(`${SELECTORS.EXPRESSION_GRID} .style-option`).first().click();
    await expect(page.locator(SELECTORS.SETTINGS_NEXT_BTN)).not.toBeDisabled();
  });

  test('映像タイプを動画に切り替えられる', async ({ page }) => {
    await page.click(SELECTORS.VT_VIDEO_OPTION);
    await expect(page.locator(SELECTORS.VT_VIDEO_OPTION)).toHaveClass(/selected/);
    await expect(page.locator(SELECTORS.VT_IMAGE_OPTION)).not.toHaveClass(/selected/);
  });

  test('映像タイプを動画から画像に戻せる', async ({ page }) => {
    await page.click(SELECTORS.VT_VIDEO_OPTION);
    await page.click(SELECTORS.VT_IMAGE_OPTION);
    await expect(page.locator(SELECTORS.VT_IMAGE_OPTION)).toHaveClass(/selected/);
  });

  test('2番目の音声を選択できる', async ({ page }) => {
    const voices = page.locator(`${SELECTORS.VOICE_LIST} .av-option`);
    await voices.nth(1).click();
    await expect(voices.nth(1)).toHaveClass(/selected/);
    await expect(voices.nth(0)).not.toHaveClass(/selected/);
  });

  test('戻るボタンでSTEP3に戻る', async ({ page }) => {
    await page.click(SELECTORS.BACK_TO_STEP3_BTN);
    await waitForStep(page, 3);
  });
});

// ────────────────────────────────────────────────
// STEP5: シーン確認・字幕位置
// ────────────────────────────────────────────────
test.describe('STEP5: 字幕位置・戻るボタン @happy', () => {
  test.beforeEach(async ({ page }) => {
    await goToStep5(page);
  });

  test('字幕位置プリセットが3種類表示される', async ({ page }) => {
    await expect(page.locator('.subtitle-preset')).toHaveCount(3);
  });

  test('字幕位置を上に変更できる', async ({ page }) => {
    const topPreset = page.locator('.subtitle-preset.pos-top');
    await topPreset.click();
    await expect(topPreset).toHaveClass(/selected/);
    await expect(page.locator('.subtitle-preset.pos-bottom')).not.toHaveClass(/selected/);
  });

  test('字幕位置を中央に変更できる', async ({ page }) => {
    const centerPreset = page.locator('.subtitle-preset.pos-center');
    await centerPreset.click();
    await expect(centerPreset).toHaveClass(/selected/);
  });

  test('戻るボタンでSTEP4に戻る', async ({ page }) => {
    await page.click(SELECTORS.BACK_TO_STEP4_BTN);
    await waitForStep(page, 4);
  });
});
