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
│   └── e2e/
│       ├── 01_happy_path.spec.ts    # ハッピーパス（STEP1〜7正常フロー）
│       ├── 02_error_cases.spec.ts   # エラー系テスト
│       ├── 03_integration.spec.ts   # 統合テスト（実API疎通）
│       ├── 04_endurance.spec.ts     # 耐久テスト
│       └── 05_manual_checklist.spec.ts  # 人間テスト（スクショ生成）
├── scripts/
│   └── coverage-report.js        # カバレッジレポート生成
└── test-results/                 # テスト結果（自動生成）
    ├── results.json
    ├── coverage-report.txt
    └── manual-review/            # 人間確認用スクリーンショット
```

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

# n8n Webhook URL（統合テスト用）
WH1_URL=https://weby.app.n8n.cloud/webhook/content-recycle-wh1
WH2_URL=https://weby.app.n8n.cloud/webhook/content-recycle-wh2
WH3_URL=https://weby.app.n8n.cloud/webhook/content-recycle-wh3
WH4_URL=https://weby.app.n8n.cloud/webhook/content-recycle-wh4

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

### カバレッジレポート

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

**目標: 80%**

| カテゴリ | テスト数 | 自動化率 |
|---------|---------|---------|
| UIフロー（STEP1〜7） | 12件 | 100% |
| 入力バリデーション | 3件 | 100% |
| WH1エラー | 5件 | 100% |
| WH2エラー | 2件 | 100% |
| WH3エラー | 2件 | 100% |
| WH4エラー | 3件 | 100% |
| n8nノード系エラー | 4件 | 100% |
| 耐久テスト | 4件 | 100% |
| 統合テスト | 4件 | 要実API |
| 人間テスト（視覚確認） | 7件 | スクショのみ |
| **合計** | **46件** | **約85%** |

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
モックのルートパターン（`**/webhook/content-recycle-**`）がn8n URLと一致しているか確認してください。

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
