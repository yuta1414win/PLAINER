/**
 * useVoiceNarration Hook
 * 音声ナレーション機能をステップ遷移と同期させるカスタムフック
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceNarrationManager,
  VoiceSettings,
  NarrationStore,
  NarrationText,
} from '@/lib/voice-narration';

export interface UseVoiceNarrationOptions {
  autoPlay?: boolean;
  autoStop?: boolean;
  autoAdvance?: boolean;
  defaultSettings?: Partial<VoiceSettings>;
  onStart?: (stepId: string) => void;
  onEnd?: (stepId: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceNarrationReturn {
  // 状態
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  currentStepId: string | null;
  progress: number;
  currentWord: string;

  // 設定
  settings: VoiceSettings;
  updateSettings: (settings: Partial<VoiceSettings>) => void;

  // ナレーション管理
  narrations: Map<string, NarrationText>;
  setNarration: (stepId: string, text: string) => void;
  getNarration: (stepId: string) => NarrationText | undefined;
  removeNarration: (stepId: string) => void;

  // 再生制御
  play: (stepId: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;

  // ステップ連携
  playStep: (stepId: string) => Promise<void>;
  stopStep: () => void;
}

export function useVoiceNarration(
  options: UseVoiceNarrationOptions = {}
): UseVoiceNarrationReturn {
  const {
    autoPlay = false,
    autoStop = true,
    autoAdvance = false,
    defaultSettings = {},
    onStart,
    onEnd,
    onError,
  } = options;

  // 状態管理
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [narrations, setNarrations] = useState<Map<string, NarrationText>>(
    new Map()
  );
  const [settings, setSettings] = useState<VoiceSettings>({
    enabled: true,
    autoPlay,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: null,
    language: 'ja-JP',
    ...defaultSettings,
  });

  // Ref
  const managerRef = useRef<VoiceNarrationManager | null>(null);
  const storeRef = useRef<NarrationStore>(new NarrationStore());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初期化
  useEffect(() => {
    const supported = VoiceNarrationManager.isSupported();
    setIsSupported(supported);

    if (!supported) {
      console.warn('Voice narration is not supported in this browser');
      return;
    }

    // マネージャーの初期化
    managerRef.current = new VoiceNarrationManager(settings);

    // イベントリスナーの設定
    managerRef.current.onEnd(() => {
      const stepId = currentStepId;
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      setCurrentWord('');

      if (stepId && onEnd) {
        onEnd(stepId);
      }

      // 自動進行
      if (autoAdvance && stepId) {
        // 次のステップへの自動進行をトリガー
        // これは親コンポーネントで処理される
      }
    });

    managerRef.current.onError((error) => {
      console.error('Voice narration error:', error);
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      setCurrentWord('');

      if (onError) {
        onError(error);
      }
    });

    managerRef.current.onBoundary((charIndex, charLength) => {
      const narration = currentStepId
        ? storeRef.current.getNarration(currentStepId)
        : null;

      if (narration) {
        const word = narration.text.substr(charIndex, charLength);
        setCurrentWord(word);

        const progressPercentage = (charIndex / narration.text.length) * 100;
        setProgress(progressPercentage);
      }
    });

    // 保存済みナレーションの読み込み
    const loadedNarrations = storeRef.current.getAllNarrations();
    const narrationMap = new Map<string, NarrationText>();
    loadedNarrations.forEach((narration) => {
      narrationMap.set(narration.stepId, narration);
    });
    setNarrations(narrationMap);

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // 設定の更新
  const updateSettings = useCallback(
    (newSettings: Partial<VoiceSettings>) => {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      if (managerRef.current) {
        managerRef.current.updateSettings(updatedSettings);
      }
    },
    [settings]
  );

  // ナレーションの設定
  const setNarration = useCallback((stepId: string, text: string) => {
    storeRef.current.setNarration(stepId, text);
    const narration = storeRef.current.getNarration(stepId);

    if (narration) {
      setNarrations((prev) => new Map(prev).set(stepId, narration));
    }
  }, []);

  // ナレーションの取得
  const getNarration = useCallback(
    (stepId: string): NarrationText | undefined => {
      return narrations.get(stepId);
    },
    [narrations]
  );

  // ナレーションの削除
  const removeNarration = useCallback((stepId: string) => {
    storeRef.current.removeNarration(stepId);
    setNarrations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });
  }, []);

  // 再生
  const play = useCallback(
    async (stepId: string) => {
      if (!managerRef.current || !settings.enabled) {
        throw new Error('Voice narration is not available');
      }

      const narration = getNarration(stepId);
      if (!narration) {
        throw new Error(`No narration found for step: ${stepId}`);
      }

      setCurrentStepId(stepId);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(0);

      if (onStart) {
        onStart(stepId);
      }

      // プログレスの更新を開始
      const duration = managerRef.current.estimateDuration(narration.text);
      const updateInterval = 100;
      let elapsed = 0;

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      progressIntervalRef.current = setInterval(() => {
        elapsed += updateInterval;
        const progressPercentage = Math.min((elapsed / duration) * 100, 100);
        setProgress(progressPercentage);
      }, updateInterval);

      try {
        await managerRef.current.speak(narration.text);
      } catch (error) {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        setCurrentStepId(null);

        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        throw error;
      }
    },
    [settings.enabled, getNarration, onStart]
  );

  // 一時停止
  const pause = useCallback(() => {
    if (!managerRef.current || !isPlaying) return;

    managerRef.current.pause();
    setIsPaused(true);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, [isPlaying]);

  // 再開
  const resume = useCallback(() => {
    if (!managerRef.current || !isPaused) return;

    managerRef.current.resume();
    setIsPaused(false);

    // プログレスの更新を再開
    if (currentStepId) {
      const narration = getNarration(currentStepId);
      if (narration) {
        const remainingDuration =
          managerRef.current.estimateDuration(narration.text) *
          (1 - progress / 100);
        const updateInterval = 100;
        let elapsed = 0;

        progressIntervalRef.current = setInterval(() => {
          elapsed += updateInterval;
          const progressPercentage =
            progress + (elapsed / remainingDuration) * (100 - progress);
          setProgress(Math.min(progressPercentage, 100));
        }, updateInterval);
      }
    }
  }, [isPaused, currentStepId, progress, getNarration]);

  // 停止
  const stop = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentWord('');
    setCurrentStepId(null);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  // ステップ再生（自動停止付き）
  const playStep = useCallback(
    async (stepId: string) => {
      // 現在の再生を停止
      if (autoStop && isPlaying) {
        stop();
      }

      // 新しいステップを再生
      await play(stepId);
    },
    [autoStop, isPlaying, stop, play]
  );

  // ステップ停止
  const stopStep = useCallback(() => {
    stop();
  }, [stop]);

  return {
    // 状態
    isPlaying,
    isPaused,
    isSupported,
    currentStepId,
    progress,
    currentWord,

    // 設定
    settings,
    updateSettings,

    // ナレーション管理
    narrations,
    setNarration,
    getNarration,
    removeNarration,

    // 再生制御
    play,
    pause,
    resume,
    stop,

    // ステップ連携
    playStep,
    stopStep,
  };
}
