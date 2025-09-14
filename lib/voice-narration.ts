/**
 * Voice Narration System for PLAINER
 * Web Speech API を使用した音声ナレーション機能
 */

export interface VoiceSettings {
  enabled: boolean;
  autoPlay: boolean;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0 - 2
  volume: number; // 0 - 1
  voice: string | null; // 音声ID
  language: 'ja-JP' | 'en-US';
}

export interface NarrationText {
  stepId: string;
  text: string;
  duration?: number; // 推定読み上げ時間（ミリ秒）
}

export class VoiceNarrationManager {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private settings: VoiceSettings;
  private isPaused: boolean = false;
  private onEndCallback?: () => void;
  private onErrorCallback?: (error: string) => void;
  private onBoundaryCallback?: (char: number, length: number) => void;

  constructor(settings?: Partial<VoiceSettings>) {
    this.settings = {
      enabled: true,
      autoPlay: false,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null,
      language: 'ja-JP',
      ...settings,
    };

    this.initializeSpeechSynthesis();
  }

  /**
   * ブラウザのSpeech Synthesis APIサポートをチェック
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    );
  }

  /**
   * Speech Synthesis APIの初期化
   */
  private initializeSpeechSynthesis(): void {
    if (!VoiceNarrationManager.isSupported()) {
      console.warn('Web Speech API is not supported in this browser');
      return;
    }

    this.synthesis = window.speechSynthesis;

    // 音声リストの読み込み
    const loadVoices = () => {
      this.voices = this.synthesis!.getVoices();

      // デフォルト音声の設定
      if (!this.settings.voice && this.voices.length > 0) {
        const preferredVoice = this.findPreferredVoice();
        if (preferredVoice) {
          this.settings.voice = preferredVoice.voiceURI;
        }
      }
    };

    // 音声リストの読み込み（ブラウザによってタイミングが異なる）
    if (this.synthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synthesis.addEventListener('voiceschanged', loadVoices);
    }
  }

  /**
   * 言語設定に基づいて推奨音声を見つける
   */
  private findPreferredVoice(): SpeechSynthesisVoice | null {
    const languageVoices = this.voices.filter((voice) =>
      voice.lang.startsWith(this.settings.language.split('-')[0])
    );

    // ローカル音声を優先
    const localVoice = languageVoices.find((voice) => voice.localService);
    if (localVoice) return localVoice;

    // デフォルト音声を選択
    const defaultVoice = languageVoices.find((voice) => voice.default);
    if (defaultVoice) return defaultVoice;

    // 最初の音声を選択
    return languageVoices[0] || this.voices[0] || null;
  }

  /**
   * 利用可能な音声のリストを取得
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter((voice) =>
      voice.lang.startsWith(this.settings.language.split('-')[0])
    );
  }

  /**
   * テキストを音声で読み上げる
   */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis || !this.settings.enabled) {
        reject(new Error('Voice narration is not available or disabled'));
        return;
      }

      // 既存の読み上げを停止
      this.stop();

      // 新しい発話を作成
      this.currentUtterance = new SpeechSynthesisUtterance(text);

      // 設定を適用
      this.currentUtterance.rate = this.settings.rate;
      this.currentUtterance.pitch = this.settings.pitch;
      this.currentUtterance.volume = this.settings.volume;
      this.currentUtterance.lang = this.settings.language;

      // 音声を設定
      if (this.settings.voice) {
        const selectedVoice = this.voices.find(
          (voice) => voice.voiceURI === this.settings.voice
        );
        if (selectedVoice) {
          this.currentUtterance.voice = selectedVoice;
        }
      }

      // イベントハンドラーの設定
      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
        this.isPaused = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
        resolve();
      };

      this.currentUtterance.onerror = (event) => {
        const errorMessage = `Speech synthesis error: ${event.error}`;
        console.error(errorMessage);
        this.currentUtterance = null;
        this.isPaused = false;
        if (this.onErrorCallback) {
          this.onErrorCallback(errorMessage);
        }
        reject(new Error(errorMessage));
      };

      this.currentUtterance.onboundary = (event) => {
        if (this.onBoundaryCallback) {
          this.onBoundaryCallback(event.charIndex, event.charLength);
        }
      };

      // 読み上げ開始
      this.synthesis.speak(this.currentUtterance);
    });
  }

  /**
   * 読み上げを一時停止
   */
  pause(): void {
    if (this.synthesis && this.currentUtterance && !this.isPaused) {
      this.synthesis.pause();
      this.isPaused = true;
    }
  }

  /**
   * 読み上げを再開
   */
  resume(): void {
    if (this.synthesis && this.currentUtterance && this.isPaused) {
      this.synthesis.resume();
      this.isPaused = false;
    }
  }

  /**
   * 読み上げを停止
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
      this.isPaused = false;
    }
  }

  /**
   * 読み上げ中かどうかを確認
   */
  isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking && !this.isPaused : false;
  }

  /**
   * 一時停止中かどうかを確認
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * 設定を更新
   */
  updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // 現在読み上げ中の場合、新しい設定を適用
    if (this.currentUtterance) {
      this.currentUtterance.rate = this.settings.rate;
      this.currentUtterance.pitch = this.settings.pitch;
      this.currentUtterance.volume = this.settings.volume;
    }
  }

  /**
   * 現在の設定を取得
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * テキストの読み上げ時間を推定（ミリ秒）
   */
  estimateDuration(text: string): number {
    // 日本語と英語で異なる計算
    const isJapanese = this.settings.language === 'ja-JP';
    const charactersPerSecond = isJapanese ? 5 : 3; // 日本語：5文字/秒、英語：3単語/秒

    const textLength = isJapanese
      ? text.replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '').length
      : text.split(/\s+/).length;

    const baseDuration = (textLength / charactersPerSecond) * 1000;
    return Math.round(baseDuration / this.settings.rate);
  }

  /**
   * イベントリスナーの設定
   */
  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onBoundary(callback: (char: number, length: number) => void): void {
    this.onBoundaryCallback = callback;
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.stop();
    this.onEndCallback = undefined;
    this.onErrorCallback = undefined;
    this.onBoundaryCallback = undefined;
  }
}

// ナレーションテキストを管理するストア
export class NarrationStore {
  private narrations: Map<string, NarrationText> = new Map();

  /**
   * ナレーションテキストを設定
   */
  setNarration(stepId: string, text: string): void {
    const manager = new VoiceNarrationManager();
    const duration = manager.estimateDuration(text);
    manager.dispose();

    this.narrations.set(stepId, {
      stepId,
      text,
      duration,
    });
  }

  /**
   * ナレーションテキストを取得
   */
  getNarration(stepId: string): NarrationText | undefined {
    return this.narrations.get(stepId);
  }

  /**
   * すべてのナレーションを取得
   */
  getAllNarrations(): NarrationText[] {
    return Array.from(this.narrations.values());
  }

  /**
   * ナレーションを削除
   */
  removeNarration(stepId: string): void {
    this.narrations.delete(stepId);
  }

  /**
   * すべてのナレーションをクリア
   */
  clear(): void {
    this.narrations.clear();
  }

  /**
   * JSONとしてエクスポート
   */
  export(): string {
    return JSON.stringify(this.getAllNarrations());
  }

  /**
   * JSONからインポート
   */
  import(json: string): void {
    try {
      const narrations = JSON.parse(json) as NarrationText[];
      this.clear();
      narrations.forEach((narration) => {
        this.narrations.set(narration.stepId, narration);
      });
    } catch (error) {
      console.error('Failed to import narrations:', error);
    }
  }
}
