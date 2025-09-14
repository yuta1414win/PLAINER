export type Language = 'ja' | 'en';

export interface TranslationStrings {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    next: string;
    previous: string;
    done: string;
    preview: string;
    settings: string;
  };

  // Navigation
  navigation: {
    home: string;
    editor: string;
    player: string;
    help: string;
  };

  // Editor
  editor: {
    title: string;
    uploadImages: string;
    dragAndDrop: string;
    selectFiles: string;
    supportedFormats: string;
    maxFileSize: string;
    steps: string;
    addStep: string;
    editStep: string;
    deleteStep: string;
    duplicateStep: string;
    reorderSteps: string;
    noSteps: string;

    // Tools
    tools: {
      select: string;
      hotspot: string;
      annotation: string;
      mask: string;
      rectangle: string;
      circle: string;
      freehand: string;
    };

    // Properties
    properties: {
      general: string;
      style: string;
      accessibility: string;
      stepTitle: string;
      stepDescription: string;
      hotspotLabel: string;
      tooltipText: string;
      ctaLabel: string;
      ctaUrl: string;
      ctaTarget: string;
      blurIntensity: string;
    };

    // Variables
    variables: {
      title: string;
      description: string;
      noVariables: string;
      createVariable: string;
      editVariable: string;
      variableName: string;
      variableType: string;
      defaultValue: string;
      currentValue: string;
      usedInPlaces: string;
      validationErrors: string;
    };

    // Branching
    branching: {
      title: string;
      description: string;
      addCondition: string;
      editCondition: string;
      condition: string;
      targetStep: string;
      ifCondition: string;
      thenShow: string;
      elseShow: string;
    };
  };

  // Player
  player: {
    title: string;
    stepOf: string;
    progress: string;
    fullscreen: string;
    exitFullscreen: string;
    chapters: string;
    noChapters: string;
    skipToStep: string;
    zoomIn: string;
    zoomOut: string;
    fitToScreen: string;
    actualSize: string;
  };

  // Theme
  theme: {
    title: string;
    lightMode: string;
    darkMode: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: string;
    logo: string;
    logoText: string;
    logoImage: string;
    uploadLogo: string;
  };

  // Sharing
  sharing: {
    title: string;
    shareUrl: string;
    embedCode: string;
    copyUrl: string;
    copyEmbed: string;
    socialShare: string;
    email: string;
    twitter: string;
    facebook: string;
    linkedin: string;
    publicSettings: string;
    makePublic: string;
    makePrivate: string;
    linkOnly: string;
  };

  // DOM Clone (Experimental)
  domClone: {
    title: string;
    description: string;
    captureUrl: string;
    sameOriginWarning: string;
    captureButton: string;
    reconstructing: string;
    selectElements: string;
    createHotspots: string;
    processingError: string;
    unsupportedBrowser: string;
  };

  // Error Messages
  errors: {
    fileUploadFailed: string;
    fileTooLarge: string;
    unsupportedFileType: string;
    networkError: string;
    saveProjectFailed: string;
    loadProjectFailed: string;
    generateHtmlFailed: string;
    invalidUrl: string;
    domCaptureBlocked: string;
    missingVariable: string;
    invalidCondition: string;
    exportFailed: string;
    importFailed: string;
  };

  // Success Messages
  success: {
    projectSaved: string;
    projectLoaded: string;
    stepAdded: string;
    stepDeleted: string;
    stepDuplicated: string;
    variableCreated: string;
    variableUpdated: string;
    variableDeleted: string;
    urlCopied: string;
    embedCopied: string;
    imageProcessed: string;
    htmlGenerated: string;
    domCaptured: string;
  };

  // Tooltips
  tooltips: {
    undo: string;
    redo: string;
    zoomIn: string;
    zoomOut: string;
    toggleGrid: string;
    toggleGuides: string;
    fullscreen: string;
    help: string;
    settings: string;
    variables: string;
    branching: string;
    language: string;
    export: string;
    import: string;
    share: string;
    preview: string;
    domClone: string;
  };
}

// Japanese translations
const ja: TranslationStrings = {
  common: {
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    cancel: 'キャンセル',
    save: '保存',
    delete: '削除',
    edit: '編集',
    add: '追加',
    close: '閉じる',
    next: '次へ',
    previous: '前へ',
    done: '完了',
    preview: 'プレビュー',
    settings: '設定',
  },

  navigation: {
    home: 'ホーム',
    editor: 'エディタ',
    player: 'プレイヤー',
    help: 'ヘルプ',
  },

  editor: {
    title: 'PLAINER エディタ',
    uploadImages: '画像をアップロード',
    dragAndDrop: 'ここに画像をドラッグ&ドロップ',
    selectFiles: 'ファイルを選択',
    supportedFormats: 'サポート形式: JPG, PNG, WebP',
    maxFileSize: '最大ファイルサイズ: 10MB',
    steps: 'ステップ',
    addStep: 'ステップを追加',
    editStep: 'ステップを編集',
    deleteStep: 'ステップを削除',
    duplicateStep: 'ステップを複製',
    reorderSteps: 'ステップを並び替え',
    noSteps: 'ステップがありません',

    tools: {
      select: '選択',
      hotspot: 'ホットスポット',
      annotation: '注釈',
      mask: 'ぼかし',
      rectangle: '矩形',
      circle: '円形',
      freehand: '自由描画',
    },

    properties: {
      general: '一般',
      style: 'スタイル',
      accessibility: 'アクセシビリティ',
      stepTitle: 'ステップタイトル',
      stepDescription: 'ステップの説明',
      hotspotLabel: 'ホットスポットラベル',
      tooltipText: 'ツールチップテキスト',
      ctaLabel: 'CTAラベル',
      ctaUrl: 'CTA URL',
      ctaTarget: 'CTAターゲット',
      blurIntensity: 'ぼかしの強さ',
    },

    variables: {
      title: '変数管理',
      description: '変数を使用して動的なコンテンツを作成できます',
      noVariables: '変数が定義されていません',
      createVariable: '変数を作成',
      editVariable: '変数を編集',
      variableName: '変数名',
      variableType: '変数の型',
      defaultValue: 'デフォルト値',
      currentValue: '現在の値',
      usedInPlaces: '箇所で使用中',
      validationErrors: '検証エラー',
    },

    branching: {
      title: '分岐管理',
      description: '条件に応じてステップの表示を制御できます',
      addCondition: '条件を追加',
      editCondition: '条件を編集',
      condition: '条件',
      targetStep: '対象ステップ',
      ifCondition: 'もし',
      thenShow: 'なら表示',
      elseShow: 'そうでなければ表示',
    },
  },

  player: {
    title: 'PLAINER プレイヤー',
    stepOf: 'ステップ',
    progress: '進捗',
    fullscreen: 'フルスクリーン',
    exitFullscreen: 'フルスクリーンを終了',
    chapters: 'チャプター',
    noChapters: 'チャプターがありません',
    skipToStep: 'ステップにスキップ',
    zoomIn: '拡大',
    zoomOut: '縮小',
    fitToScreen: '画面に合わせる',
    actualSize: '実際のサイズ',
  },

  theme: {
    title: 'テーマ設定',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    primaryColor: 'プライマリカラー',
    secondaryColor: 'セカンダリカラー',
    backgroundColor: '背景色',
    textColor: 'テキストカラー',
    fontFamily: 'フォントファミリー',
    borderRadius: '角丸',
    logo: 'ロゴ',
    logoText: 'ロゴテキスト',
    logoImage: 'ロゴ画像',
    uploadLogo: 'ロゴをアップロード',
  },

  sharing: {
    title: '共有設定',
    shareUrl: '共有URL',
    embedCode: '埋め込みコード',
    copyUrl: 'URLをコピー',
    copyEmbed: '埋め込みコードをコピー',
    socialShare: 'SNS共有',
    email: 'メール',
    twitter: 'Twitter',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    publicSettings: '公開設定',
    makePublic: '公開する',
    makePrivate: '非公開にする',
    linkOnly: 'リンクを知っている人のみ',
  },

  domClone: {
    title: 'DOMクローン（実験的機能）',
    description: 'Webページから直接ステップを作成します',
    captureUrl: 'キャプチャするURL',
    sameOriginWarning: '同一オリジンのページのみサポートしています',
    captureButton: 'ページをキャプチャ',
    reconstructing: '再構成中...',
    selectElements: '要素を選択',
    createHotspots: 'ホットスポットを作成',
    processingError: '処理エラー',
    unsupportedBrowser: 'サポートされていないブラウザです',
  },

  errors: {
    fileUploadFailed: 'ファイルのアップロードに失敗しました',
    fileTooLarge: 'ファイルサイズが大きすぎます',
    unsupportedFileType: 'サポートされていないファイル形式です',
    networkError: 'ネットワークエラーが発生しました',
    saveProjectFailed: 'プロジェクトの保存に失敗しました',
    loadProjectFailed: 'プロジェクトの読み込みに失敗しました',
    generateHtmlFailed: 'HTMLの生成に失敗しました',
    invalidUrl: '無効なURLです',
    domCaptureBlocked: 'DOMキャプチャがブロックされました',
    missingVariable: '変数が見つかりません',
    invalidCondition: '無効な条件です',
    exportFailed: 'エクスポートに失敗しました',
    importFailed: 'インポートに失敗しました',
  },

  success: {
    projectSaved: 'プロジェクトが保存されました',
    projectLoaded: 'プロジェクトが読み込まれました',
    stepAdded: 'ステップが追加されました',
    stepDeleted: 'ステップが削除されました',
    stepDuplicated: 'ステップが複製されました',
    variableCreated: '変数が作成されました',
    variableUpdated: '変数が更新されました',
    variableDeleted: '変数が削除されました',
    urlCopied: 'URLがコピーされました',
    embedCopied: '埋め込みコードがコピーされました',
    imageProcessed: '画像が処理されました',
    htmlGenerated: 'HTMLが生成されました',
    domCaptured: 'DOMがキャプチャされました',
  },

  tooltips: {
    undo: '元に戻す',
    redo: 'やり直し',
    zoomIn: '拡大',
    zoomOut: '縮小',
    toggleGrid: 'グリッド表示切り替え',
    toggleGuides: 'ガイド表示切り替え',
    fullscreen: 'フルスクリーン',
    help: 'ヘルプ',
    settings: '設定',
    variables: '変数',
    branching: '分岐',
    language: '言語',
    export: 'エクスポート',
    import: 'インポート',
    share: '共有',
    preview: 'プレビュー',
    domClone: 'DOMクローン',
  },
};

// English translations
const en: TranslationStrings = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
    done: 'Done',
    preview: 'Preview',
    settings: 'Settings',
  },

  navigation: {
    home: 'Home',
    editor: 'Editor',
    player: 'Player',
    help: 'Help',
  },

  editor: {
    title: 'PLAINER Editor',
    uploadImages: 'Upload Images',
    dragAndDrop: 'Drag & drop images here',
    selectFiles: 'Select Files',
    supportedFormats: 'Supported formats: JPG, PNG, WebP',
    maxFileSize: 'Max file size: 10MB',
    steps: 'Steps',
    addStep: 'Add Step',
    editStep: 'Edit Step',
    deleteStep: 'Delete Step',
    duplicateStep: 'Duplicate Step',
    reorderSteps: 'Reorder Steps',
    noSteps: 'No steps available',

    tools: {
      select: 'Select',
      hotspot: 'Hotspot',
      annotation: 'Annotation',
      mask: 'Blur',
      rectangle: 'Rectangle',
      circle: 'Circle',
      freehand: 'Freehand',
    },

    properties: {
      general: 'General',
      style: 'Style',
      accessibility: 'Accessibility',
      stepTitle: 'Step Title',
      stepDescription: 'Step Description',
      hotspotLabel: 'Hotspot Label',
      tooltipText: 'Tooltip Text',
      ctaLabel: 'CTA Label',
      ctaUrl: 'CTA URL',
      ctaTarget: 'CTA Target',
      blurIntensity: 'Blur Intensity',
    },

    variables: {
      title: 'Variable Manager',
      description: 'Use variables to create dynamic content',
      noVariables: 'No variables defined',
      createVariable: 'Create Variable',
      editVariable: 'Edit Variable',
      variableName: 'Variable Name',
      variableType: 'Variable Type',
      defaultValue: 'Default Value',
      currentValue: 'Current Value',
      usedInPlaces: 'used in places',
      validationErrors: 'Validation Errors',
    },

    branching: {
      title: 'Branching Logic',
      description: 'Control step visibility based on conditions',
      addCondition: 'Add Condition',
      editCondition: 'Edit Condition',
      condition: 'Condition',
      targetStep: 'Target Step',
      ifCondition: 'If',
      thenShow: 'then show',
      elseShow: 'else show',
    },
  },

  player: {
    title: 'PLAINER Player',
    stepOf: 'Step',
    progress: 'Progress',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    chapters: 'Chapters',
    noChapters: 'No chapters',
    skipToStep: 'Skip to Step',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fitToScreen: 'Fit to Screen',
    actualSize: 'Actual Size',
  },

  theme: {
    title: 'Theme Settings',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    primaryColor: 'Primary Color',
    secondaryColor: 'Secondary Color',
    backgroundColor: 'Background Color',
    textColor: 'Text Color',
    fontFamily: 'Font Family',
    borderRadius: 'Border Radius',
    logo: 'Logo',
    logoText: 'Logo Text',
    logoImage: 'Logo Image',
    uploadLogo: 'Upload Logo',
  },

  sharing: {
    title: 'Sharing Options',
    shareUrl: 'Share URL',
    embedCode: 'Embed Code',
    copyUrl: 'Copy URL',
    copyEmbed: 'Copy Embed Code',
    socialShare: 'Social Share',
    email: 'Email',
    twitter: 'Twitter',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    publicSettings: 'Privacy Settings',
    makePublic: 'Make Public',
    makePrivate: 'Make Private',
    linkOnly: 'Anyone with the link',
  },

  domClone: {
    title: 'DOM Clone (Experimental)',
    description: 'Create steps directly from web pages',
    captureUrl: 'URL to Capture',
    sameOriginWarning: 'Only same-origin pages are supported',
    captureButton: 'Capture Page',
    reconstructing: 'Reconstructing...',
    selectElements: 'Select Elements',
    createHotspots: 'Create Hotspots',
    processingError: 'Processing Error',
    unsupportedBrowser: 'Unsupported Browser',
  },

  errors: {
    fileUploadFailed: 'File upload failed',
    fileTooLarge: 'File is too large',
    unsupportedFileType: 'Unsupported file type',
    networkError: 'Network error occurred',
    saveProjectFailed: 'Failed to save project',
    loadProjectFailed: 'Failed to load project',
    generateHtmlFailed: 'Failed to generate HTML',
    invalidUrl: 'Invalid URL',
    domCaptureBlocked: 'DOM capture was blocked',
    missingVariable: 'Variable not found',
    invalidCondition: 'Invalid condition',
    exportFailed: 'Export failed',
    importFailed: 'Import failed',
  },

  success: {
    projectSaved: 'Project saved successfully',
    projectLoaded: 'Project loaded successfully',
    stepAdded: 'Step added successfully',
    stepDeleted: 'Step deleted successfully',
    stepDuplicated: 'Step duplicated successfully',
    variableCreated: 'Variable created successfully',
    variableUpdated: 'Variable updated successfully',
    variableDeleted: 'Variable deleted successfully',
    urlCopied: 'URL copied to clipboard',
    embedCopied: 'Embed code copied to clipboard',
    imageProcessed: 'Image processed successfully',
    htmlGenerated: 'HTML generated successfully',
    domCaptured: 'DOM captured successfully',
  },

  tooltips: {
    undo: 'Undo',
    redo: 'Redo',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleGrid: 'Toggle Grid',
    toggleGuides: 'Toggle Guides',
    fullscreen: 'Fullscreen',
    help: 'Help',
    settings: 'Settings',
    variables: 'Variables',
    branching: 'Branching',
    language: 'Language',
    export: 'Export',
    import: 'Import',
    share: 'Share',
    preview: 'Preview',
    domClone: 'DOM Clone',
  },
};

export const translations: Record<Language, TranslationStrings> = {
  ja,
  en,
};

export function getTranslation(language: Language): TranslationStrings {
  return translations[language] || translations.en;
}

export function detectBrowserLanguage(): Language {
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ja')) {
      return 'ja';
    }
  }
  return 'en';
}
