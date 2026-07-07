// tests/e2e/08_media_interactions.spec.ts
// Content-Recycle メディア操作・エッジケーステスト
// カバレッジ対象:
//   - STEP5 ライトボックス（サムネイル拡大表示）の開閉
//   - STEP6合成: 許可リスト外ドメインのvideo_urlが拒否される（validateVideoUrl）
//   - STEP7: メタ保存(fire-and-forget)が失敗してもSTEP7表示はブロックされない
//   - STEP7: コピー機能でボタン表示が一時的に切り替わる

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS, MOCK_RESPONSES } from '../fixtures/constants';
import {
  mockWH4,
  waitForLoadingComplete,
  waitForStep,
  goToStep5,
  goToStep7,
} from '../fixtures/helpers';

test.describe('STEP5: ライトボックス @happy', () => {
  test.beforeEach(async ({ page }) => {
    await goToStep5(page);
  });

  test('サムネイルをクリックするとライトボックスが開く', async ({ page }) => {
    await page.locator(SELECTORS.REVIEW_THUMB).first().click();
    await expect(page.locator(SELECTORS.LIGHTBOX)).toBeVisible();
  });

  test('×ボタンでライトボックスが閉じる', async ({ page }) => {
    await page.locator(SELECTORS.REVIEW_THUMB).first().click();
    await expect(page.locator(SELECTORS.LIGHTBOX)).toBeVisible();
    await page.locator(SELECTORS.LIGHTBOX_CLOSE).click();
    await expect(page.locator(SELECTORS.LIGHTBOX)).toHaveCount(0);
  });

  test('オーバーレイの余白クリックでライトボックスが閉じる', async ({ page }) => {
    await page.locator(SELECTORS.REVIEW_THUMB).first().click();
    const overlay = page.locator(SELECTORS.LIGHTBOX);
    await expect(overlay).toBeVisible();
    // 中央のメディアではなく、オーバーレイ自身の左上余白をクリックして閉じる
    await overlay.click({ position: { x: 2, y: 2 } });
    await expect(overlay).toHaveCount(0);
  });
});

test.describe('STEP6合成: 動画URLホワイトリスト検証 @error', () => {
  test('許可リスト外ドメインのvideo_urlが返るとエラーが表示されSTEP5に留まる', async ({ page }) => {
    await goToStep5(page);
    await mockWH4(page, MOCK_RESPONSES.WH4_UNTRUSTED_DOMAIN);
    await page.click(SELECTORS.COMPOSE_BTN);
    await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
    await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
    await expect(page.locator(SELECTORS.STEP6_CONTAINER)).not.toBeVisible();
    await expect(page.locator(SELECTORS.STEP5_CONTAINER)).toBeVisible();
  });
});

test.describe('STEP7: メタ保存失敗時の耐性 @error', () => {
  test('メタ保存(fire-and-forget)が500を返してもSTEP7表示はブロックされない', async ({ page }) => {
    await goToStep7(page, { saveMetaStatus: 500, saveMetaResponse: { error: 'internal_server_error' } });
    await waitForStep(page, 7);
    await expect(page.locator(SELECTORS.DOWNLOAD_BTN)).toBeVisible();
    await expect(page.locator(SELECTORS.META_PANEL)).toBeVisible();
  });
});

test.describe('STEP7: コピー機能 @happy', () => {
  test.beforeEach(async ({ page }) => {
    // headless Chromiumではclipboard権限がないとnavigator.clipboard.writeTextが失敗するためスタブ化
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async () => {} },
        configurable: true,
      });
    });
    await goToStep7(page);
  });

  test('コピー ボタンを押すと一時的に「コピー済み」表示に切り替わる', async ({ page }) => {
    const btn = page.locator(SELECTORS.COPY_FIELD_BTN).first();
    await btn.click();
    await expect(btn).toHaveText('✓ コピー済み');
  });
});
