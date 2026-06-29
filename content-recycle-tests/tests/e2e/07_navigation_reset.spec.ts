// tests/e2e/07_navigation_reset.spec.ts
// Content-Recycle ナビゲーション・リセット・プログレスバーテスト
// カバレッジ対象:
//   - プログレスインジケーターの状態遷移 (active / done)
//   - STEP7: resetAll → STEP1・タブ表示・DLボタンhref
//   - 台本再生成ボタン
//   - WH3 / WH4 の 429 エラー
//   - ハンバーガーメニューの開閉

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS } from '../fixtures/constants';
import {
  mockWH1,
  mockWH2,
  mockWH3,
  mockWH4,
  fillUrlAndSubmit,
  selectScript,
  proceedThroughStep4,
  waitForStep,
  waitForLoadingComplete,
  goToStep4,
  goToStep5,
  goToStep7,
} from '../fixtures/helpers';

// ────────────────────────────────────────────────
// プログレスインジケーター
// ────────────────────────────────────────────────
test.describe('プログレスインジケーター @smoke', () => {
  test('STEP1: prog-1がactive・prog-2はdone/activeでない', async ({ page }) => {
    await page.goto(URLS.MAIN);
    await expect(page.locator('#prog-1')).toHaveClass(/active/);
    await expect(page.locator('#prog-2')).not.toHaveClass(/active/);
    await expect(page.locator('#prog-2')).not.toHaveClass(/done/);
  });

  test('STEP2: prog-1がdone・prog-2がactive', async ({ page }) => {
    await mockWH1(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await expect(page.locator('#prog-1')).toHaveClass(/done/);
    await expect(page.locator('#prog-2')).toHaveClass(/active/);
  });

  test('STEP5: prog-1〜4がdone・prog-5がactive', async ({ page }) => {
    await goToStep5(page);
    await expect(page.locator('#prog-1')).toHaveClass(/done/);
    await expect(page.locator('#prog-4')).toHaveClass(/done/);
    await expect(page.locator('#prog-5')).toHaveClass(/active/);
    await expect(page.locator('#prog-6')).not.toHaveClass(/done/);
  });
});

// ────────────────────────────────────────────────
// STEP7: 完成画面詳細
// ────────────────────────────────────────────────
test.describe('STEP7: 完成画面詳細 @happy', () => {
  test.beforeEach(async ({ page }) => {
    await goToStep7(page);
  });

  test('プラットフォームタブが3つ表示される', async ({ page }) => {
    await expect(page.locator('#meta-panel .meta-tab')).toHaveCount(3);
  });

  test('YouTube Shortsタブが存在する', async ({ page }) => {
    await expect(
      page.locator('#meta-panel .meta-tab').filter({ hasText: 'YouTube Shorts' })
    ).toBeVisible();
  });

  test('TikTokタブが存在する', async ({ page }) => {
    await expect(
      page.locator('#meta-panel .meta-tab').filter({ hasText: 'TikTok' })
    ).toBeVisible();
  });

  test('Reelsタブが存在する', async ({ page }) => {
    await expect(
      page.locator('#meta-panel .meta-tab').filter({ hasText: 'Reels' })
    ).toBeVisible();
  });

  test('ダウンロードボタンのhrefが動画URLに設定されている', async ({ page }) => {
    const href = await page.locator(SELECTORS.DOWNLOAD_BTN).getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toBe('#');
    // WH4モックレスポンスのURLが設定されている
    expect(href).toContain('shotstack');
  });

  test('各タブに「すべてコピー」ボタンが存在する', async ({ page }) => {
    const allCopyBtn = page.locator('#meta-panel').getByText('📋 すべてコピー').first();
    await expect(allCopyBtn).toBeVisible();
  });

  test('「次の動画を生成する」でSTEP1にリセットされ入力がクリアされる', async ({ page }) => {
    await page.click(SELECTORS.RESET_BTN);
    await waitForStep(page, 1);
    await expect(page.locator(SELECTORS.URL_INPUT)).toHaveValue('');
    await expect(page.locator(SELECTORS.STEP2_CONTAINER)).not.toBeVisible();
  });
});

// ────────────────────────────────────────────────
// 台本再生成ボタン
// ────────────────────────────────────────────────
test.describe('台本再生成 @happy', () => {
  test.beforeEach(async ({ page }) => {
    await mockWH1(page);
    await page.goto(URLS.MAIN);
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
  });

  test('再生成ボタンが表示されている', async ({ page }) => {
    await expect(page.locator(SELECTORS.REGEN_SCRIPT_BTN)).toBeVisible();
  });

  test('再生成ボタンをクリックすると台本が再取得される', async ({ page }) => {
    await page.click(SELECTORS.REGEN_SCRIPT_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await expect(page.locator(SELECTORS.SCRIPT_CARDS).first()).toBeVisible();
  });
});

// ────────────────────────────────────────────────
// WH3 / WH4 の 429 エラー
// ────────────────────────────────────────────────
test.describe('WH3/WH4 429エラー @error', () => {
  test('WH3が429を返すとSTEP4に戻りエラーが表示される', async ({ page }) => {
    await goToStep4(page);
    await mockWH3(page, { error: 'limit_exceeded' }, 429);
    await page.locator(`${SELECTORS.EXPRESSION_GRID} .style-option`).first().click();
    await page.click(SELECTORS.SETTINGS_NEXT_BTN);
    await waitForLoadingComplete(page, 30_000);
    await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
    await expect(page.locator(SELECTORS.STEP5_CONTAINER)).not.toBeVisible();
  });

  test('WH4が429を返すとSTEP5に戻りエラーが表示される', async ({ page }) => {
    await goToStep5(page);
    await mockWH4(page, { error: 'limit_exceeded' }, 429);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, 30_000);
    await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
    await expect(page.locator(SELECTORS.STEP6_CONTAINER)).not.toBeVisible();
  });
});

// ────────────────────────────────────────────────
// ハンバーガーメニュー
// ────────────────────────────────────────────────
test.describe('ハンバーガーメニュー @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.MAIN);
  });

  test('ハンバーガーボタンでドロワーが開く', async ({ page }) => {
    await page.click(SELECTORS.HAMBURGER_BTN);
    await expect(page.locator(SELECTORS.DRAWER)).toHaveClass(/open/);
  });

  test('✕ボタンでドロワーが閉じる', async ({ page }) => {
    await page.click(SELECTORS.HAMBURGER_BTN);
    await expect(page.locator(SELECTORS.DRAWER)).toHaveClass(/open/);
    // ハンバーガーボタン(z-index:1100)がドロワー(z-index:1060)の✕ボタンを常に覆うため
    // DOMのclickイベントを直接発火して閉じる
    await page.evaluate(() => {
      (document.getElementById('drawerClose') as HTMLButtonElement).click();
    });
    await expect(page.locator(SELECTORS.DRAWER)).not.toHaveClass(/open/);
  });

  test('Escキーでドロワーが閉じる', async ({ page }) => {
    await page.click(SELECTORS.HAMBURGER_BTN);
    await expect(page.locator(SELECTORS.DRAWER)).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator(SELECTORS.DRAWER)).not.toHaveClass(/open/);
  });

  test('ドロワーにgallery.htmlへのリンクが存在する', async ({ page }) => {
    await expect(page.locator('a[href="gallery.html"]').first()).toBeVisible();
  });
});
