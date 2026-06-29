export const URLS = {
  MAIN: process.env.BASE_URL || 'https://chirichiri3720.github.io/Content-Recycle/main.html',
  WH1: process.env.WH1_URL || 'https://weby.app.n8n.cloud/webhook/Content-Recycle',
  WH2: process.env.WH2_URL || 'https://weby.app.n8n.cloud/webhook/Content-Recycle-select',
  WH3: process.env.WH3_URL || 'https://weby.app.n8n.cloud/webhook/Content-Recycle-generate',
  WH4: process.env.WH4_URL || 'https://weby.app.n8n.cloud/webhook/Content-Recycle-compose',
};

export const TEST_ARTICLES = {
  VALID_1: 'https://www.example-legal.jp/debt-consultation/article-1',
  VALID_2: 'https://www.example-legal.jp/debt-consultation/article-2',
  NOT_FOUND: 'https://www.example-legal.jp/not-exist-page-404',
  INVALID_FORMAT: 'not-a-valid-url',
  EMPTY: '',
  TOO_LONG: 'https://' + 'a'.repeat(2000) + '.com',
};

export const TIMEOUTS = {
  WH1_SCRIPT_GEN: 60_000,
  WH2_PROCESSING: 30_000,
  WH3_ASSET_GEN: 120_000,
  WH4_COMPOSE: 180_000,
  UI_TRANSITION: 5_000,
  POLLING_INTERVAL: 5_000,
};

export const SELECTORS = {
  // STEP1: 入力
  URL_INPUT: '#input-url',
  USERNAME_INPUT: '#input-username',
  CONTENT_TYPE_SELECT: '#input-content-type',
  PLATFORM_SELECT: '#input-platform',
  SUBMIT_BTN: 'button[onclick="startGeneration()"]',
  STEP1_CONTAINER: '#step1',

  // ローディング
  LOADING_INDICATOR: '#step-loading',

  // STEP2: 台本
  STEP2_CONTAINER: '#step2',
  SCRIPT_CARDS: '.script-option',
  SCRIPT_SELECT_BTN: '#btn-select-script',
  PROCEED_TO_EDITOR_BTN: 'button[onclick="proceedToEditor()"]',

  // STEP3: 編集
  STEP3_CONTAINER: '#step3',
  EDIT_FIELDS: '.editor-textarea',
  EDIT_NEXT_BTN: 'button[onclick="freezeAndProceed()"]',

  // STEP4: 設定
  STEP4_CONTAINER: '#step4',
  EXPRESSION_GRID: '#expression-grid',
  VOICE_LIST: '#voice-list',
  SETTINGS_NEXT_BTN: '#btn-to-generate',

  // STEP5: 確認
  STEP5_CONTAINER: '#step5',
  SCENE_LIST: '.review-scene',
  BGM_LIST: '#bgm-list',
  SUBTITLE_POSITION_LIST: '#subtitle-position-list',
  COMPOSE_BTN: 'button[onclick="proceedToCompose()"]',

  // STEP6: 合成
  STEP6_CONTAINER: '#step6',
  VIDEO_PREVIEW: '#video-container',
  APPROVE_BTN: 'button[onclick="approveVideo()"]',
  REJECT_BTN: 'button[onclick="rejectVideo()"]',

  // STEP7: 完成
  STEP7_CONTAINER: '#step7',
  DOWNLOAD_BTN: '#btn-download',
  META_PANEL: '#meta-panel',
  META_TITLE_INPUT: '#meta-panel-title',
  META_CONCEPT_INPUT: '#meta-panel-concept',
  RESET_BTN: 'button[onclick="resetAll()"]',

  // STEP2 追加
  BACK_TO_STEP1_BTN: 'button[onclick="goBackToStep1()"]',
  REGEN_SCRIPT_BTN: 'button[onclick="regenerateScript()"]',

  // STEP3 追加
  BACK_TO_STEP2_BTN: 'button[onclick="goBackToStep2()"]',
  EDIT_SUMMARY_BANNER: '#edit-summary-banner',
  TOTAL_DUR: '#total-dur',

  // STEP4 追加
  VT_IMAGE_OPTION: '#vt-option-image',
  VT_VIDEO_OPTION: '#vt-option-video',
  BACK_TO_STEP3_BTN: 'button[onclick="goBackToStep3()"]',

  // STEP5 追加
  BACK_TO_STEP4_BTN: 'button[onclick="goBackToStep4()"]',

  // ナビゲーション / UI
  HAMBURGER_BTN: '#hamburgerBtn',
  DRAWER: '#drawer',

  // 共通
  ERROR_MESSAGE: '#errorToast',
  STEP_INDICATOR: '.progress-step',
};

export const MOCK_RESPONSES = {
  WH1_SUCCESS: {
    session_id: 'test-session-001',
    script_candidates: [
      {
        id: 'script-a',
        script_id: 'script-a',
        title: 'テスト台本A',
        script_title: 'テスト台本A',
        scenes: Array.from({ length: 7 }, (_, i) => ({
          scene: i + 1,
          role: i === 6 ? 'cta' : 'narration',
          narration: `シーン${i + 1}のナレーションテキストです。`,
          subtitle_text: `字幕${i + 1}`,
          duration_sec: 5,
        })),
        mood_profile: { primary_mood: 'reassuring', secondary_mood: 'trustworthy', energy: 2, tone_keywords: ['calm'], genre: 'casestudy' },
        hook_type: 'question',
        concept: 'テスト用コンセプト',
      },
      {
        id: 'script-b',
        script_id: 'script-b',
        title: 'テスト台本B',
        script_title: 'テスト台本B',
        scenes: Array.from({ length: 7 }, (_, i) => ({
          scene: i + 1,
          role: i === 6 ? 'cta' : 'narration',
          narration: `シーン${i + 1}の別ナレーションです。`,
          subtitle_text: `字幕B-${i + 1}`,
          duration_sec: 5,
        })),
        mood_profile: { primary_mood: 'urgent', secondary_mood: 'curious', energy: 4, tone_keywords: ['shocking'], genre: 'casestudy' },
        hook_type: 'shocking_fact',
        concept: 'テスト用コンセプトB',
      },
    ],
  },
  WH1_ERROR_QUOTA: {
    error: 'quota_exceeded',
    message: 'APIクォータが上限に達しました',
  },
  WH1_ERROR_INVALID_URL: {
    error: 'invalid_url',
    message: '記事URLの取得に失敗しました',
  },
  WH2_SUCCESS: {
    status: 'ok',
    session_id: 'test-session-001',
    selected_script_id: 'script-a',
    subtitle_emphasis: [{ scene_no: 1, emphasis_spans: ['重要なポイント'] }],
  },
  WH3_SUCCESS: {
    session_id: 'test-session-001',
    scenes: Array.from({ length: 7 }, (_, i) => ({
      scene: i + 1,
      type: 'image',
      asset_url: `https://storage.googleapis.com/test-bucket/images/scene-${i + 1}.png`,
      audio_url: `https://storage.googleapis.com/test-bucket/tts/scene-${i + 1}.mp3`,
      audio_duration: 5.0,
    })),
  },
  WH4_SUCCESS: {
    session_id: 'test-session-001',
    video_url: 'https://cdn.shotstack.io/test/final-video.mp4',
    video_id: 'video-001',
  },
};
