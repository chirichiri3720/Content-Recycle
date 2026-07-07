// tests/unit/main-logic.spec.ts
// main.html を一切変更せず、そのままのロジックを単体テストする。
// main.html のインラインスクリプトを jsdom (runScripts: 'dangerously') で実際に実行し、
// グローバル関数(トップレベルの function 宣言は window のプロパティになる)を直接呼び出す。
//
// 対象:
//   - validateVideoUrl: 動画URLホワイトリストの検証(セキュリティ上重要)
//   - escapeHtml: XSS対策のエスケープ処理
//   - estDuration: ナレーション文字数からの秒数見積り
//   - scoreAndSort: mood/energy/genre に基づくレコメンドスコアリング

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

let win: any;

beforeAll(() => {
  const mainHtmlPath = path.resolve(__dirname, '../../../main.html');
  const html = fs.readFileSync(mainHtmlPath, 'utf-8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://chirichiri3720.github.io/Content-Recycle/main.html',
  });
  win = dom.window;
});

describe('validateVideoUrl', () => {
  it('許可リストに完全一致するドメインのhttps URLを許可する', () => {
    expect(win.validateVideoUrl('https://cdn.shotstack.io/test/video.mp4')).toBe(
      'https://cdn.shotstack.io/test/video.mp4'
    );
  });

  it('許可リストのサブドメインも許可する', () => {
    const url = 'https://foo.storage.googleapis.com/bucket/video.mp4';
    expect(win.validateVideoUrl(url)).toBe(url);
  });

  it('http（非TLS）は拒否する', () => {
    expect(win.validateVideoUrl('http://cdn.shotstack.io/test/video.mp4')).toBeNull();
  });

  it('許可リストにないドメインは拒否する', () => {
    expect(win.validateVideoUrl('https://evil.example.com/video.mp4')).toBeNull();
  });

  it('似た文字列だがドメインが異なるもの（サブドメインなりすまし）は拒否する', () => {
    expect(win.validateVideoUrl('https://notcdn.shotstack.io.evil.com/video.mp4')).toBeNull();
  });

  it('null/undefined/非文字列/不正なURLは拒否する', () => {
    expect(win.validateVideoUrl(null)).toBeNull();
    expect(win.validateVideoUrl(undefined)).toBeNull();
    expect(win.validateVideoUrl(123)).toBeNull();
    expect(win.validateVideoUrl('not a url')).toBeNull();
    expect(win.validateVideoUrl('')).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('& < > " \' をエスケープする', () => {
    expect(win.escapeHtml(`<script>alert('x')</script> & "quoted"`)).toBe(
      '&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt; &amp; &quot;quoted&quot;'
    );
  });

  it('通常の日本語テキストはそのまま返す', () => {
    expect(win.escapeHtml('こんにちは、世界')).toBe('こんにちは、世界');
  });

  it('数値や非文字列も文字列化してエスケープする', () => {
    expect(win.escapeHtml(123)).toBe('123');
  });
});

describe('estDuration', () => {
  it('空文字は最低2秒を返す', () => {
    expect(win.estDuration('')).toBe(2);
  });

  it('空白のみのテキストは空白を除去して計算する', () => {
    expect(win.estDuration('   ')).toBe(2);
  });

  it('undefined/nullは最低2秒を返す', () => {
    expect(win.estDuration(undefined)).toBe(2);
    expect(win.estDuration(null)).toBe(2);
  });

  it('日本語テキストは約5.5字/秒で見積もる（切り上げ+1秒バッファ）', () => {
    // 20文字 / 5.0 = 4 → round(4) + 1 = 5
    const text = 'あ'.repeat(20);
    expect(win.estDuration(text)).toBe(5);
  });

  it('長文でも比例して長くなる', () => {
    const short = win.estDuration('あ'.repeat(10));
    const long = win.estDuration('あ'.repeat(100));
    expect(long).toBeGreaterThan(short);
  });
});

describe('scoreAndSort', () => {
  const mood = { primary_mood: 'calm', secondary_mood: 'trustworthy', energy: 2, tone_keywords: ['reassuring'], genre: 'faq' };

  it('primary/secondary_mood・tone_keywordsに一致する項目ほど上位に来る', () => {
    const items = [
      { id: 'no-match', reason: ['bright', 'urgent'], energy: 5, genre_affinity: ['ranking'] },
      { id: 'full-match', reason: ['calm', 'trustworthy', 'reassuring'], energy: 2, genre_affinity: ['faq'] },
    ];
    const sorted = win.scoreAndSort(items, mood);
    expect(sorted[0].id).toBe('full-match');
    expect(sorted[1].id).toBe('no-match');
  });

  it('energyの近さがスコアに反映される（同じreason一致度ならenergyが近い方が上位）', () => {
    const items = [
      { id: 'far-energy', reason: ['calm'], energy: 5, genre_affinity: [] },
      { id: 'near-energy', reason: ['calm'], energy: 2, genre_affinity: [] },
    ];
    const sorted = win.scoreAndSort(items, mood);
    expect(sorted[0].id).toBe('near-energy');
  });

  it('元の配列を破壊しない', () => {
    const items = [{ id: 'a', reason: ['calm'], energy: 2, genre_affinity: [] }];
    const before = JSON.stringify(items);
    win.scoreAndSort(items, mood);
    expect(JSON.stringify(items)).toBe(before);
  });
});
