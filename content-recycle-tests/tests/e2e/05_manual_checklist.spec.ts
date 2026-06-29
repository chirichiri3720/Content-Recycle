// tests/e2e/05_manual_checklist.spec.ts
// Content-Recycle 人間テスト（手動確認項目）
// ⚠️ このファイルは自動テスト化が困難な視覚的・主観的確認項目
//    実際の実行は人間が行い、Playwrightで補助的にスクリーンショットを撮影

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TEST_ARTICLES, TIMEOUTS } from '../fixtures/constants';
import {
  mockAllWebhooks,
  fillUrlAndSubmit,
  selectScript,
  proceedThroughStep4,
  waitForStep,
  waitForLoadingComplete,
} from '../fixtures/helpers';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'manual-review');

test.describe('人間テスト: 視覚的確認（スクリーンショット撮影） @manual', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await mockAllWebhooks(page);
    await page.goto(URLS.MAIN);
  });

  test('[人間確認] STEP1: UIレイアウト・ブランドカラーの確認', async ({ page }) => {
    await waitForStep(page, 1);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_step1_layout.png'),
      fullPage: true,
    });
    // 自動確認: ページタイトルが存在する
    await expect(page).toHaveTitle(/.+/);
    // 🔍 人間確認項目:
    // [ ] ブランドカラー（赤 #b4001b, 黄 #ffe600）が正しく適用されているか
    // [ ] フォントが日本語に対応しているか
    // [ ] モバイル表示でも崩れていないか
    // [ ] ステップインジケーターが見やすいか
  });

  test('[人間確認] STEP2: 台本カードのUI・内容確認', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_step2_script_cards.png'),
      fullPage: true,
    });
    // 🔍 人間確認項目:
    // [ ] 台本カードのテキストが読みやすいか
    // [ ] 2つの台本の差異が視覚的に分かるか
    // [ ] フックの種類（質問型/衝撃的事実型など）が表示されているか
    // [ ] 台本の文章が自然な日本語か（AI品質チェック）
  });

  test('[人間確認] STEP3: シーン編集UIの確認', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_step3_edit.png'),
      fullPage: true,
    });
    // 🔍 人間確認項目:
    // [ ] 7シーン分の編集フィールドが表示されているか
    // [ ] シーン番号が分かりやすいか
    // [ ] テキストエリアのサイズが適切か
    // [ ] 字幕強調テキスト（emphasis）が視覚的にわかるか
  });

  test('[人間確認] STEP4: BGM選択UIの確認', async ({ page }) => {
    await fillUrlAndSubmit(page, TEST_ARTICLES.VALID_1);
    await waitForLoadingComplete(page, TIMEOUTS.WH1_SCRIPT_GEN);
    await waitForStep(page, 2);
    await selectScript(page, 0);
    await waitForLoadingComplete(page, TIMEOUTS.WH2_PROCESSING);
    await waitForStep(page, 3);
    await page.click(SELECTORS.EDIT_NEXT_BTN);
    await waitForStep(page, 4);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04_step4_settings.png'),
      fullPage: true,
    });
    // 🔍 人間確認項目:
    // [ ] BGMの試聴ができるか
    // [ ] 字幕位置のプレビューが表示されるか
    // [ ] 設定項目の説明文が分かりやすいか
  });

  test('[人間確認] STEP5: シーン確認画面の確認', async ({ page }) => {
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
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05_step5_confirm.png'),
      fullPage: true,
    });
    // 🔍 人間確認項目:
    // [ ] 7シーンのサムネイルが表示されているか
    // [ ] 音声再生ボタンが機能するか
    // [ ] 字幕プレビューが正しく表示されるか
    // [ ] シーン1・7が赤バナースタイル（#b4001b）になっているか
    // [ ] シーン2〜6が透過背景スタイルになっているか
  });

  test('[人間確認] STEP6: 動画プレビューの確認', async ({ page }) => {
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
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06_step6_preview.png'),
      fullPage: true,
    });
    // 🔍 人間確認項目:
    // [ ] 動画プレビューが正常に再生されるか（縦型9:16）
    // [ ] 字幕のフォント・サイズ・位置が適切か
    // [ ] BGMが流れているか
    // [ ] 動画全体のテンポ感が自然か
    // [ ] シーン1のフック（赤バナー）がインパクトあるか
  });

  test('[人間確認] STEP7: 完成画面・メタデータ編集の確認', async ({ page }) => {
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
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07_step7_complete.png'),
      fullPage: true,
    });
    // 🔍 人間確認項目:
    // [ ] ダウンロードボタンからMP4ファイルがダウンロードできるか
    // [ ] タイトル・説明文・ハッシュタグのフォームが使いやすいか
    // [ ] 文字数カウンターが各プラットフォームの制限を示しているか
    //       (YouTube: タイトル100字, TikTok: 150字, Instagram: 2200字)
    // [ ] ギャラリーへのリンクが機能するか
  });
});

test.describe('人間テスト: コンテンツ品質確認（AI出力チェック）', () => {

  test.skip(true, '手動実行専用: npm run test:manual -- --headed で確認');

  test('[手動] AI生成台本の品質チェック項目', async ({ page }) => {
    // 🔍 チェックポイント:
    // [ ] シーン1のフックが「3秒で指が止まる」ものになっているか
    // [ ] シーン2〜6の内容が記事の核心をカバーしているか
    // [ ] シーン7のCTA（行動喚起）が適切か（「無料相談」など）
    // [ ] 全シーンを通じてナレーションが自然に繋がっているか
    // [ ] 法的に問題のある表現がないか（「必ず解決」「100%」など断定表現）
    // [ ] 字幕の強調（黄色テキスト）が効果的な場所に配置されているか
    // [ ] 1シーンあたりのナレーション長が duration_sec × 5文字以上あるか
  });

  test('[手動] 生成動画のSNS適合性チェック', async ({ page }) => {
    // 🔍 チェックポイント（YouTube Shorts）:
    // [ ] 縦型9:16（1080×1920）で出力されているか
    // [ ] 60秒以内（7シーン × 〜8秒程度）に収まっているか
    // [ ] 音量が適切か（BGMがナレーションを邪魔していないか）
    //
    // 🔍 チェックポイント（TikTok）:
    // [ ] 最初の3秒でフックが機能しているか
    // [ ] テキストが画面端にかかっていないか（セーフゾーン内）
    //
    // 🔍 チェックポイント（Instagram Reels）:
    // [ ] 字幕フォントサイズが十分大きいか
    // [ ] カラーコントラストが明確か（視認性）
  });
});
