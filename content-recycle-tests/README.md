# Content-Recycle E2Eテスト

Playwright を使った Content-Recycle パイプラインのE2Eテストスイートです。

---

## ディレクトリ構成

```
content-recycle-tests/
├── playwright.config.ts          # Playwright設定
├── package.json
├── tests/
│   ├── fixtures/
│   │   ├── constants.ts          # 定数（URL・セレクター・モック）
│   │   └── helpers.ts            # 共通ヘルパー関数
│   ├── e2e/                      # Playwright E2E（npm test で実行）
│   │   ├── 01_happy_path.spec.ts        # ハッピーパス（STEP1〜7正常フロー）
│   │   ├── 02_error_cases.spec.ts       # エラー系テスト（入力・WH1〜4・n8nノード系）
│   │   ├── 03_integration.spec.ts       # 統合テスト（実API疎通、RUN_INTEGRATION=true時のみ）
│   │   ├── 04_endurance.spec.ts         # 耐久テスト
│   │   ├── 05_manual_checklist.spec.ts  # 人間テスト（スクショ生成）
│   │   ├── 06_step_details.spec.ts      # 各STEPの詳細動作（STEP1スタイル選択・STEP4音声等）
│   │   ├── 07_navigation_reset.spec.ts  # プログレスバー・リセット・ハンバーガーメニュー
│   │   └── 08_media_interactions.spec.ts # ライトボックス・動画URL検証・メタ保存耐性・コピー機能
│   └── unit/                     # Vitest 単体テスト（npm run test:unit で実行）
│       └── main-logic.spec.ts    # main.htmlのインラインJSをjsdomで実行し純粋関数を直接検証
├── vitest.config.ts               # Vitest設定（tests/unit のみを対象）
├── scripts/
│   └── coverage-report.js        # カバレッジレポート生成（Playwright E2Eのシナリオ網羅率）
└── test-results/                 # テスト結果（自動生成）
    ├── results.json
    ├── coverage-report.txt
    └── manual-review/            # 人間確認用スクリーンショット
```

> **単体テストとE2Eのカバレッジは別集計です。** `scripts/coverage-report.js` はPlaywright E2Eのシナリオ網羅率のみを計測します。`tests/unit/` のVitest結果は `npm run test:unit` の成否で別途確認してください（両方が揃って初めて「テスト完了」とみなします）。

---

## セットアップ

### 1. Node.js インストール確認

```bash
node --version  # v18以上推奨
```

### 2. 依存パッケージインストール

```bash
npm install
npx playwright install chromium  # ブラウザのインストール
```

### 3. 環境変数の設定（任意）

```bash
# .env ファイルを作成（または環境変数で設定）
cp .env.example .env
```

```env
# テスト対象URL（デフォルト: GitHub Pages本番）
BASE_URL=https://chirichiri3720.github.io/Content-Recycle/main.html

# ローカル開発サーバーをテストする場合
# BASE_URL=http://localhost:3000/main.html

# n8n Webhook URL（統合テスト用。実際のURLは大文字始まりの "Content-Recycle" 表記）
WH1_URL=https://weby.app.n8n.cloud/webhook/Content-Recycle
WH2_URL=https://weby.app.n8n.cloud/webhook/Content-Recycle-select
WH3_URL=https://weby.app.n8n.cloud/webhook/Content-Recycle-generate
WH4_URL=https://weby.app.n8n.cloud/webhook/Content-Recycle-compose

# Supabase（統合テスト・DB確認用）
SUPABASE_URL=https://eitwhzteuhouxfmogvnf.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# 統合テストの有効化（実APIを叩く）
RUN_INTEGRATION=false
```

---

## テスト実行コマンド

### 全テスト実行（推奨: 初回確認時）

```bash
npm test
```

### UIモードで実行（テスト開発・デバッグ時）

```bash
npm run test:ui
```

### ブラウザを表示しながら実行

```bash
npm run test:headed
```

### タグ別実行

```bash
# スモークテスト（最速確認）
npm run test:smoke

# ハッピーパスのみ
npm run test:happy

# エラー系のみ
npm run test:error

# 耐久テスト（時間かかる）
npm run test:endurance

# 統合テスト（実APIを使用）
RUN_INTEGRATION=true npm run test:integration
```

### 人間テスト（スクリーンショット生成）

```bash
npx playwright test tests/e2e/05_manual_checklist.spec.ts --headed
# → test-results/manual-review/ にスクリーンショットが保存される
```

### 単体テスト（main.htmlのロジックを直接検証）

```bash
npm run test:unit
```

main.html は変更せず、jsdom上でインラインスクリプトをそのまま実行し、`validateVideoUrl`（動画URLホワイトリスト）、
`escapeHtml`（XSS対策）、`estDuration`（秒数見積り）、`scoreAndSort`（レコメンドスコアリング）を直接呼び出して検証する。

### カバレッジレポート（Playwright E2Eのシナリオ網羅率）

```bash
npm run test:coverage
# または
npm test && node scripts/coverage-report.js
```

### HTMLレポートを確認

```bash
npm run test:report
```

---

## カバレッジ目標

**目標: シナリオ網羅率 90%**（`scripts/coverage-report.js` で計測。単体テストは別集計）

| カテゴリ | 自動化率 |
|---------|---------|
| UIフロー（STEP1〜7、スタイル/映像タイプ選択・音声自動選択を含む） | 100% |
| 入力バリデーション | 100% |
| WH1エラー | 100% |
| WH2エラー | 100% |
| WH3エラー | 100% |
| WH4エラー | 100% |
| n8nノード系エラー（クォータ・scenes欠落・kling_tasks等） | 100% |
| 動画URL検証・メタ保存耐性 | 100% |
| 耐久テスト | 100% |
| 統合テスト | 要実API（`RUN_INTEGRATION=true`、既定では未実行） |
| 人間テスト（視覚確認） | スクショのみ |

正確な件数・達成率は `npm run test:coverage` 実行後の `test-results/coverage-report.txt` を参照。

### main.htmlのデッドコード削除について

以下は完全に未使用（呼び出し元ゼロ）だったため main.html から削除済み:
`renderExpressionGrid()`/`selectExpression()`/`EXPRESSION_MOOD_MAP`（表現スタイル選択はSTEP1の`#expression-grid-step1`に統合済みで対応する`#expression-grid`要素が存在しなかった）、
`pollGenerationStatus()`/`STATUS_URL`、`regenerateScene()`、`goBackToStep5()`、`state.selectedDirection`/`state.selectedStyle`、および付随するCSS（`.style-recommend-badge`・`.btn-mini`）。
削除後もE2E/単体テスト（本ファイル記載の全スイート）は変わらず全件成功することを確認済み。

`OPTIONS_URL`（`Content-Recycle-options`）は削除していない: `USE_MOCK_OPTIONS = true` のためclient側モックのみが使われ現状fetchされないが、
`loadOptionsAndRenderStep4()`内の実コードパス（フラグをfalseにすれば有効）であり、単なるデッドコードではなくフィーチャーフラグの範囲内のため対象外とした。

---

## テスト設計方針

### モック戦略

- **ハッピーパス・エラー系・耐久テスト**: Webhook をモックして実行（外部依存なし・高速）
- **統合テスト**: 実Webhookを使用（`RUN_INTEGRATION=true` が必要）
- **人間テスト**: モックで各ステップに到達し、スクリーンショット撮影

### セレクターの管理

`tests/fixtures/constants.ts` の `SELECTORS` オブジェクトで一元管理。  
`main.html` のクラス名/IDが変わったらここだけ修正すれば全テストに反映される。

### タイムアウト設計

外部API呼び出し（GPT-4o, Shotstack等）が含まれるため、各ステップに個別タイムアウトを設定。

| 処理 | タイムアウト |
|------|-----------|
| WH1（スクリプト生成） | 60秒 |
| WH2（台本選択） | 30秒 |
| WH3（アセット生成） | 120秒 |
| WH4（Shotstack合成） | 180秒 |

---

## よくある問題

### セレクターが見つからない

`main.html` の実際のセレクターを確認して `constants.ts` の `SELECTORS` を更新してください。

```bash
# Playwright インスペクターでセレクターを確認
npx playwright codegen https://chirichiri3720.github.io/Content-Recycle/main.html
```

### Webhookモックが機能しない

`playwright.config.ts` の `baseURL` が正しいか確認。  
`tests/fixtures/constants.ts` の `URLS`（`Content-Recycle` は大文字始まり）が実際のn8n URLと一致しているか確認してください。

### STEP1の送信ボタンが押せない（disabledのまま）

`main.html` のSTEP1は表現スタイル/映像タイプのカードをクリックして `validateStep1()` が発火するまで送信ボタンが `disabled` のまま。
`fillUrlAndSubmit()` ヘルパーは自動でスタイルカードをクリックするが、独自にSTEP1操作を書く場合は
`#expression-grid-step1 .style-option` のいずれかを先にクリックすること。

### GitHub Pages のSPAルーティング問題

`page.goto(URLS.MAIN)` で直接 `main.html` を指定してください。

---

## CI/CD対応（将来）

GitHub Actions での実行例：

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
