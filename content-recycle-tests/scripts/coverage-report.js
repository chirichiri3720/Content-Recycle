// scripts/coverage-report.js
// テスト結果からカバレッジレポートを生成するスクリプト
// 実行: node scripts/coverage-report.js

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'results.json');
const COVERAGE_TARGET = 80; // カバレッジ目標 80%

// テストカバレッジマップ
// 各項目に対してどのテストがカバーしているかを定義
const COVERAGE_MAP = {
  'UI フロー': {
    items: [
      { id: 'UI-01', desc: 'STEP1 初期表示・入力フォーム', tests: ['STEP1: ページが正常に表示され'] },
      { id: 'UI-02', desc: 'STEP1→2 URL送信・台本生成', tests: ['STEP1→2: 有効なURLを入力'] },
      { id: 'UI-03', desc: 'STEP2→3 台本選択（1枚目）', tests: ['STEP2→3: 台本カードを選択'] },
      { id: 'UI-04', desc: 'STEP2→3 台本選択（2枚目）', tests: ['STEP2→3: 2枚目の台本カード'] },
      { id: 'UI-05', desc: 'STEP3→4 編集→設定遷移', tests: ['STEP3→4: 編集画面で次へを押す'] },
      { id: 'UI-06', desc: 'STEP3 ナレーション編集', tests: ['STEP3: シーンのナレーションテキスト'] },
      { id: 'UI-07', desc: 'STEP4→5 設定→確認遷移', tests: ['STEP4→5: 設定完了後にSTEP5'] },
      { id: 'UI-08', desc: 'STEP4 BGM変更', tests: ['STEP4: BGMを変更できる'] },
      { id: 'UI-09', desc: 'STEP5→6 合成実行', tests: ['STEP5→6: 合成ボタンを押す'] },
      { id: 'UI-10', desc: 'STEP6→7 承認→完成', tests: ['STEP6→7: 承認ボタンを押す'] },
      { id: 'UI-11', desc: 'STEP7 メタデータ編集', tests: ['STEP7: メタデータを編集できる'] },
      { id: 'UI-12', desc: 'STEP6 却下→STEP5戻り', tests: ['STEP6: 却下ボタンを押す'] },
    ],
  },
  '入力バリデーション': {
    items: [
      { id: 'VAL-01', desc: '空URL送信エラー', tests: ['空のURLで送信'] },
      { id: 'VAL-02', desc: '不正URL形式エラー', tests: ['不正なURL形式'] },
      { id: 'VAL-03', desc: '長すぎるURLハンドリング', tests: ['非常に長いURL'] },
    ],
  },
  'WH1 エラーハンドリング': {
    items: [
      { id: 'WH1-01', desc: 'クォータ超過(429)', tests: ['WH1がAPIクォータ超過'] },
      { id: 'WH1-02', desc: '500エラー', tests: ['WH1が500エラー'] },
      { id: 'WH1-03', desc: 'ネットワークエラー', tests: ['WH1がネットワークエラー'] },
      { id: 'WH1-04', desc: '404エラー', tests: ['WH1が404を返す'] },
      { id: 'WH1-05', desc: 'エラー後リトライ', tests: ['WH1エラー後に再送信'] },
    ],
  },
  'WH2 エラーハンドリング': {
    items: [
      { id: 'WH2-01', desc: '500エラー', tests: ['WH2が500エラー'] },
      { id: 'WH2-02', desc: 'エラー後リトライ', tests: ['WH2エラー後にSTEP2で'] },
    ],
  },
  'WH3 エラーハンドリング': {
    items: [
      { id: 'WH3-01', desc: '500エラー', tests: ['WH3が500エラー'] },
      { id: 'WH3-02', desc: '部分失敗（シーン欠落）', tests: ['WH3が部分的に失敗'] },
    ],
  },
  'WH4 エラーハンドリング': {
    items: [
      { id: 'WH4-01', desc: '500エラー', tests: ['WH4が500エラー'] },
      { id: 'WH4-02', desc: 'Shotstack合成失敗', tests: ['WH4がShotstack合成失敗'] },
      { id: 'WH4-03', desc: 'エラー後再合成', tests: ['WH4エラー後に再合成'] },
    ],
  },
  'n8nノード系エラー': {
    items: [
      { id: 'NODE-01', desc: 'クォータチェックエラー', tests: ['WH1クォータチェックエラー'] },
      { id: 'NODE-02', desc: 'Supabase書き込みエラー', tests: ['Supabase書き込みエラー'] },
      { id: 'NODE-03', desc: 'session_id欠落', tests: ['session_idが返ってこない'] },
      { id: 'NODE-04', desc: '空script_candidates', tests: ['script_candidatesが空配列'] },
    ],
  },
  '耐久テスト': {
    items: [
      { id: 'END-01', desc: '3回連続フロー（state汚染なし）', tests: ['ハッピーパスを3回連続'] },
      { id: 'END-02', desc: '繰り返し操作でUI崩れなし', tests: ['台本選択をキャンセルして'] },
      { id: 'END-03', desc: 'リロードで初期化確認', tests: ['ページをリロードすると初期状態'] },
      { id: 'END-04', desc: 'エラー→リカバリ3回繰り返し', tests: ['エラー→リカバリを3回'] },
    ],
  },
  '統合テスト': {
    items: [
      { id: 'INT-01', desc: '実WH1疎通', tests: ['WH1: 実記事URLからスクリプト'] },
      { id: 'INT-02', desc: 'WH1→WH2セッション連携', tests: ['WH1→WH2: 台本選択から'] },
      { id: 'INT-03', desc: 'session_id一貫性', tests: ['セッションIDがWH1〜WH4'] },
      { id: 'INT-04', desc: 'Supabaseレコード確認', tests: ['supabase scriptsテーブル'] },
    ],
  },
  '人間テスト（視覚確認）': {
    items: [
      { id: 'MAN-01', desc: 'STEP1 UIレイアウト・ブランドカラー', tests: ['STEP1: UIレイアウト'] },
      { id: 'MAN-02', desc: 'STEP2 台本カードUI', tests: ['STEP2: 台本カード'] },
      { id: 'MAN-03', desc: 'STEP3 シーン編集UI', tests: ['STEP3: シーン編集UI'] },
      { id: 'MAN-04', desc: 'STEP4 BGM選択UI', tests: ['STEP4: BGM選択UI'] },
      { id: 'MAN-05', desc: 'STEP5 シーン確認画面', tests: ['STEP5: シーン確認画面'] },
      { id: 'MAN-06', desc: 'STEP6 動画プレビュー', tests: ['STEP6: 動画プレビュー'] },
      { id: 'MAN-07', desc: 'STEP7 完成画面', tests: ['STEP7: 完成画面'] },
    ],
  },
};

function loadResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.warn('⚠️  test-results/results.json が見つかりません。npm run test を先に実行してください。');
    return null;
  }
  return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
}

function generateReport(results) {
  const passedTests = new Set();
  const failedTests = new Set();

  if (results) {
    for (const suite of results.suites || []) {
      for (const spec of (suite.specs || [])) {
        for (const test of (spec.tests || [])) {
          const title = spec.title;
          const passed = test.results?.every(r => r.status === 'passed');
          if (passed) passedTests.add(title);
          else failedTests.add(title);
        }
      }
    }
  }

  let totalItems = 0;
  let coveredItems = 0;

  const lines = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  Content-Recycle テストカバレッジレポート');
  lines.push(`  生成日時: ${new Date().toLocaleString('ja-JP')}`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  for (const [category, { items }] of Object.entries(COVERAGE_MAP)) {
    const categoryTotal = items.length;
    const categoryCovered = items.filter(item =>
      item.tests.some(t => passedTests.has(t) || [...passedTests].some(p => p.includes(t)))
    ).length;

    totalItems += categoryTotal;
    coveredItems += categoryCovered;

    const pct = Math.round((categoryCovered / categoryTotal) * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    lines.push(`▶ ${category}`);
    lines.push(`  ${bar} ${pct}% (${categoryCovered}/${categoryTotal})`);

    for (const item of items) {
      const isCovered = item.tests.some(t =>
        passedTests.has(t) || [...passedTests].some(p => p.includes(t))
      );
      const isFailed = item.tests.some(t =>
        failedTests.has(t) || [...failedTests].some(p => p.includes(t))
      );
      const icon = isCovered ? '✅' : isFailed ? '❌' : '⬜';
      lines.push(`    ${icon} [${item.id}] ${item.desc}`);
    }
    lines.push('');
  }

  const totalPct = Math.round((coveredItems / totalItems) * 100);
  const targetMet = totalPct >= COVERAGE_TARGET;

  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`  総合カバレッジ: ${totalPct}% (${coveredItems}/${totalItems})`);
  lines.push(`  目標: ${COVERAGE_TARGET}%  ${targetMet ? '✅ 達成！' : `❌ 未達 (あと ${COVERAGE_TARGET - totalPct}% 必要)`}`);
  lines.push('───────────────────────────────────────────────────────────');

  if (!targetMet) {
    lines.push('');
    lines.push('  ⚠️  未カバー項目（優先対応）:');
    for (const [category, { items }] of Object.entries(COVERAGE_MAP)) {
      const uncovered = items.filter(item =>
        !item.tests.some(t => passedTests.has(t) || [...passedTests].some(p => p.includes(t)))
      );
      if (uncovered.length > 0) {
        lines.push(`     ${category}:`);
        for (const item of uncovered) {
          lines.push(`       - [${item.id}] ${item.desc}`);
        }
      }
    }
  }

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  const report = lines.join('\n');
  console.log(report);

  // レポートファイルに保存
  const reportPath = path.join(process.cwd(), 'test-results', 'coverage-report.txt');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`📄 レポート保存: ${reportPath}`);

  process.exit(targetMet ? 0 : 1);
}

const results = loadResults();
generateReport(results);
