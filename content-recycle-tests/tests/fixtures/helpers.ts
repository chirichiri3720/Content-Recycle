// tests/fixtures/helpers.ts
// Content-Recycle E2Eテスト 共通ヘルパー

import { Page, Route, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS, MOCK_RESPONSES, URLS, TEST_ARTICLES } from './constants';

/**
 * ステップ遷移を確認するヘルパー
 */
export async function waitForStep(page: Page, stepNumber: number) {
  const stepContainer = page.locator(`#step${stepNumber}`);
  await expect(stepContainer).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
}

/**
 * ローディング完了を待つヘルパー
 */
export async function waitForLoadingComplete(page: Page, timeout = TIMEOUTS.WH1_SCRIPT_GEN) {
  const loading = page.locator(SELECTORS.LOADING_INDICATOR);
  // ローディングが出現してから消えるまで待つ
  try {
    await loading.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    // ローディングが出なかった場合はスキップ
  }
  await loading.waitFor({ state: 'hidden', timeout });
}

/**
 * エラーメッセージが表示されていることを確認
 */
export async function expectErrorMessage(page: Page, messagePattern?: string | RegExp) {
  const errorEl = page.locator(SELECTORS.ERROR_MESSAGE);
  await expect(errorEl).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
  if (messagePattern) {
    await expect(errorEl).toContainText(messagePattern);
  }
}

/**
 * WH1（スクリプト生成）をモックする
 */
export async function mockWH1(page: Page, response = MOCK_RESPONSES.WH1_SUCCESS, status = 200) {
  await page.route(URLS.WH1, (route: Route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * WH2（台本選択・凍結）をモックする
 */
export async function mockWH2(page: Page, response = MOCK_RESPONSES.WH2_SUCCESS, status = 200) {
  await page.route(URLS.WH2, (route: Route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * WH3（アセット生成）をモックする
 */
export async function mockWH3(page: Page, response = MOCK_RESPONSES.WH3_SUCCESS, status = 200) {
  await page.route(URLS.WH3, (route: Route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * WH4（動画合成）をモックする
 */
export async function mockWH4(page: Page, response = MOCK_RESPONSES.WH4_SUCCESS, status = 200) {
  await page.route(URLS.WH4, (route: Route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * 全Webhookをモックする（ハッピーパス用）
 */
export async function mockAllWebhooks(page: Page) {
  await mockWH1(page);
  await mockWH2(page);
  await mockWH3(page);
  await mockWH4(page);
}

/**
 * タイムアウトするWebhookモック（耐久テスト・タイムアウトテスト用）
 */
export async function mockWH1Timeout(page: Page, delayMs = 35_000) {
  await page.route(URLS.WH1, async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    route.fulfill({
      status: 504,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Gateway Timeout' }),
    });
  });
}

/**
 * ネットワークエラーをシミュレートするモック
 */
export async function mockWH1NetworkError(page: Page) {
  await page.route(URLS.WH1, (route: Route) => {
    route.abort('failed');
  });
}

/**
 * STEP1: URL入力してWH1を呼び出すまでの共通操作
 */
export async function fillUrlAndSubmit(page: Page, url: string) {
  await page.fill(SELECTORS.URL_INPUT, url);
  await page.selectOption(SELECTORS.CONTENT_TYPE_SELECT, { index: 1 });
  await page.click(SELECTORS.SUBMIT_BTN);
}

/**
 * STEP2: 台本カードを選択する（カードをクリックして選択後、確定ボタンをクリック）
 */
export async function selectScript(page: Page, index = 0) {
  const cards = page.locator(SELECTORS.SCRIPT_CARDS);
  await expect(cards.first()).toBeVisible({ timeout: TIMEOUTS.UI_TRANSITION });
  await cards.nth(index).click();
  await page.locator(SELECTORS.SCRIPT_SELECT_BTN).click();
}

/**
 * STEP4: 表現スタイルを選択して生成ボタンをクリックする
 */
export async function proceedThroughStep4(page: Page) {
  await page.locator(`${SELECTORS.EXPRESSION_GRID} .style-option`).first().click();
  await page.click(SELECTORS.SETTINGS_NEXT_BTN);
}

/**
 * コンソールエラーを収集するリスナーを設定
 */
export function setupConsoleErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(`[PageError] ${err.message}`);
  });
  return errors;
}

/**
 * STEP3まで進む（WH1のみモック。WH2は呼ばれない）
 */
export async function goToStep3(page: Page) {
  await mockWH1(page);
  await page.goto(URLS.MAIN);
  await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
  await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
  await waitForStep(page, 2);
  await selectScript(page, 0);
  await waitForStep(page, 3);
}

/**
 * STEP4まで進む（WH1 + WH2をモック）
 */
export async function goToStep4(page: Page) {
  await mockWH1(page);
  await mockWH2(page);
  await page.goto(URLS.MAIN);
  await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
  await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
  await waitForStep(page, 2);
  await selectScript(page, 0);
  await waitForStep(page, 3);
  await page.click(SELECTORS.EDIT_NEXT_BTN);
  await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
  await waitForStep(page, 4);
}

/**
 * STEP5まで進む（WH1 + WH2 + WH3をモック）
 */
export async function goToStep5(page: Page) {
  await mockWH1(page);
  await mockWH2(page);
  await mockWH3(page);
  await page.goto(URLS.MAIN);
  await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
  await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
  await waitForStep(page, 2);
  await selectScript(page, 0);
  await waitForStep(page, 3);
  await page.click(SELECTORS.EDIT_NEXT_BTN);
  await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
  await waitForStep(page, 4);
  await proceedThroughStep4(page);
  await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
  await waitForStep(page, 5);
}

/**
 * STEP7まで進む（全Webhookをモック）
 */
export async function goToStep7(page: Page) {
  await mockWH1(page);
  await mockWH2(page);
  await mockWH3(page);
  await mockWH4(page);
  await page.goto(URLS.MAIN);
  await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
  await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
  await waitForStep(page, 2);
  await selectScript(page, 0);
  await waitForStep(page, 3);
  await page.click(SELECTORS.EDIT_NEXT_BTN);
  await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
  await waitForStep(page, 4);
  await proceedThroughStep4(page);
  await waitForLoadingComplete(page, TIMEOUTS.WH3_ASSET_GEN);
  await waitForStep(page, 5);
  await page.click(SELECTORS.COMPOSE_BTN);
  await waitForLoadingComplete(page, TIMEOUTS.WH4_COMPOSE);
  await waitForStep(page, 6);
  await page.click(SELECTORS.APPROVE_BTN);
  await waitForStep(page, 7);
}

/**
 * session_idがlocalStorage/stateに保存されているか確認
 */
export async function getSessionId(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    try {
      // state は let 宣言のためwindowプロパティではないが、グローバルスコープからeval経由でアクセス可能
      const sessionId = (0, eval)('typeof state !== "undefined" ? state.sessionId : null');
      return sessionId ?? null;
    } catch {
      return null;
    }
  });
}
