/**
 * アプリケーション全体で使用される定数定義
 */

// ファイルサイズ制限
export const FILE_SIZE_LIMITS = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  EXPORT_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  IMAGE_MAX_DIMENSION: 4096, // 最大辺の長さ
} as const;

// サポートする画像フォーマット
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

// URL制限
export const URL_LIMITS = {
  MAX_LENGTH: 2048,
  COMPRESSION_THRESHOLD: 800,
  AGGRESSIVE_THRESHOLD: 1500,
} as const;

// デフォルトテーマ
export const DEFAULT_THEME = {
  primaryColor: '#007bff',
  secondaryColor: '#6c757d',
  accentColor: '#28a745',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  borderColor: '#dee2e6',
  fontFamily: 'system-ui',
  fontSize: 14,
  borderRadius: 4,
  spacing: 16,
} as const;

// アニメーション設定
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// 自動保存設定
export const AUTO_SAVE = {
  INTERVAL: 10000, // 10秒
  DEBOUNCE_DELAY: 2000, // 2秒
} as const;

// プレイヤー設定
export const PLAYER_DEFAULTS = {
  AUTO_PLAY_DURATION: 3000, // 3秒
  TRANSITION_DURATION: 300,
  HOTSPOT_ANIMATION_DURATION: 2000,
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます',
  INVALID_FILE_TYPE: '対応していないファイル形式です',
  UPLOAD_FAILED: 'アップロードに失敗しました',
  SAVE_FAILED: '保存に失敗しました',
  LOAD_FAILED: '読み込みに失敗しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  UNKNOWN_ERROR: '不明なエラーが発生しました',
} as const;

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'ファイルをアップロードしました',
  PROJECT_SAVED: 'プロジェクトを保存しました',
  PROJECT_EXPORTED: 'プロジェクトをエクスポートしました',
  PROJECT_IMPORTED: 'プロジェクトをインポートしました',
  COPIED_TO_CLIPBOARD: 'クリップボードにコピーしました',
  SHARE_URL_GENERATED: '共有URLを生成しました',
} as const;

// バリデーション設定
export const VALIDATION = {
  PROJECT_NAME_MIN_LENGTH: 1,
  PROJECT_NAME_MAX_LENGTH: 100,
  STEP_TITLE_MIN_LENGTH: 1,
  STEP_TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 1000,
  ANNOTATION_TEXT_MAX_LENGTH: 500,
  HOTSPOT_LABEL_MAX_LENGTH: 100,
} as const;

// API設定
export const API_CONFIG = {
  TIMEOUT: 30000, // 30秒
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1秒
} as const;

// ローカルストレージキー
export const STORAGE_KEYS = {
  PROJECT: 'plainer_project',
  SETTINGS: 'plainer_settings',
  THEME: 'plainer_theme',
  LANGUAGE: 'plainer_language',
  AUTO_SAVE: 'plainer_auto_save',
} as const;

// イベント名
export const EVENTS = {
  PROJECT_CHANGED: 'project:changed',
  STEP_ADDED: 'step:added',
  STEP_REMOVED: 'step:removed',
  STEP_UPDATED: 'step:updated',
  HOTSPOT_ADDED: 'hotspot:added',
  HOTSPOT_REMOVED: 'hotspot:removed',
  ANNOTATION_ADDED: 'annotation:added',
  ANNOTATION_REMOVED: 'annotation:removed',
} as const;

//正規表現パターン
export const REGEX_PATTERNS = {
  URL: /^https?:\/\/.+/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
} as const;
