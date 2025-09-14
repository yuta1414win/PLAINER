'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  Settings,
  Mic,
  MicOff,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  VoiceNarrationManager,
  VoiceSettings,
  NarrationStore,
} from '@/lib/voice-narration';

interface VoiceNarrationProps {
  stepId: string;
  text?: string;
  autoPlay?: boolean;
  onEnd?: () => void;
  className?: string;
}

export function VoiceNarration({
  stepId,
  text: initialText = '',
  autoPlay = false,
  onEnd,
  className,
}: VoiceNarrationProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState<VoiceSettings>({
    enabled: true,
    autoPlay,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: null,
    language: 'ja-JP',
  });
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [narrationText, setNarrationText] = useState(initialText);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [currentWord, setCurrentWord] = useState('');
  const [subtitlePosition, setSubtitlePosition] = useState<'top' | 'bottom'>(
    'bottom'
  );
  const [subtitleSize, setSubtitleSize] = useState<
    'small' | 'medium' | 'large'
  >('medium');
  const [subtitleColor, setSubtitleColor] = useState('#ffffff');
  const [subtitleBackground, setSubtitleBackground] = useState('#000000');
  const [subtitleOpacity, setSubtitleOpacity] = useState(80);

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

    // 利用可能な音声の取得
    const loadVoices = () => {
      if (managerRef.current) {
        const voices = managerRef.current.getAvailableVoices();
        setAvailableVoices(voices);
      }
    };

    // 音声リストの読み込み
    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    // イベントハンドラーの設定
    if (managerRef.current) {
      managerRef.current.onEnd(() => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        if (onEnd) onEnd();
      });

      managerRef.current.onError((error) => {
        console.error('Voice narration error:', error);
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
      });

      managerRef.current.onBoundary((charIndex, charLength) => {
        // 現在読み上げ中の単語を表示
        const word = narrationText.substring(charIndex, charIndex + charLength);
        setCurrentWord(word);

        // プログレスを更新
        const progressPercentage = (charIndex / narrationText.length) * 100;
        setProgress(progressPercentage);
      });
    }

    // ナレーションテキストの復元
    const savedNarration = storeRef.current.getNarration(stepId);
    if (savedNarration) {
      setNarrationText(savedNarration.text);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  // 自動再生
  useEffect(() => {
    if (settings.autoPlay && narrationText && !isPlaying) {
      handlePlay();
    }
  }, [stepId, settings.autoPlay]);

  // 再生処理
  const handlePlay = useCallback(async () => {
    if (!managerRef.current || !narrationText) return;

    try {
      setIsPlaying(true);
      setIsPaused(false);

      // プログレスの更新を開始
      const duration = managerRef.current.estimateDuration(narrationText);
      const updateInterval = 100; // 100ms毎に更新
      let elapsed = 0;

      progressIntervalRef.current = setInterval(() => {
        elapsed += updateInterval;
        const progressPercentage = Math.min((elapsed / duration) * 100, 100);
        setProgress(progressPercentage);
      }, updateInterval);

      await managerRef.current.speak(narrationText);
    } catch (error) {
      console.error('Failed to play narration:', error);
      setIsPlaying(false);
      setIsPaused(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [narrationText]);

  // 一時停止処理
  const handlePause = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.pause();
    setIsPaused(true);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  // 再開処理
  const handleResume = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.resume();
    setIsPaused(false);

    // プログレスの更新を再開
    const remainingDuration =
      managerRef.current.estimateDuration(narrationText) * (1 - progress / 100);
    const updateInterval = 100;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += updateInterval;
      const progressPercentage =
        progress + (elapsed / remainingDuration) * (100 - progress);
      setProgress(Math.min(progressPercentage, 100));
    }, updateInterval);
  }, [narrationText, progress]);

  // 停止処理
  const handleStop = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentWord('');

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
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

  // テキストの保存
  // TODO: テキスト入力UIコンポーネントで使用予定
  // const saveNarrationText = useCallback(
  //   (text: string) => {
  //     setNarrationText(text);
  //     storeRef.current.setNarration(stepId, text);
  //   },
  //   [stepId]
  // );

  if (!isSupported) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 bg-yellow-50 rounded-md',
          className
        )}
      >
        <MicOff className="w-4 h-4 text-yellow-600" />
        <span className="text-sm text-yellow-700">
          音声ナレーションはこのブラウザではサポートされていません
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* コントロールバー */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        {/* 再生コントロール */}
        <div className="flex items-center gap-1">
          {!isPlaying ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlay}
              disabled={!narrationText}
              title="再生"
            >
              <Play className="w-4 h-4" />
            </Button>
          ) : isPaused ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResume}
              title="再開"
            >
              <Play className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePause}
              title="一時停止"
            >
              <Pause className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            title="停止"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>

        {/* プログレスバー */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 min-w-[40px]">
            {Math.round(progress)}%
          </span>
        </div>

        {/* 音量コントロール */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" title="音量">
              <Volume2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <Label className="text-xs">音量</Label>
              <Slider
                value={[settings.volume * 100]}
                onValueChange={([value]) =>
                  updateSettings({ volume: (value ?? 100) / 100 })
                }
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* 設定メニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" title="設定">
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>音声設定</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* 再生速度 */}
            <div className="px-2 py-2">
              <Label className="text-xs">再生速度: {settings.rate}x</Label>
              <Slider
                value={[settings.rate * 100]}
                onValueChange={([value]) =>
                  updateSettings({ rate: (value ?? 100) / 100 })
                }
                min={50}
                max={200}
                step={10}
                className="mt-1"
              />
            </div>

            {/* ピッチ */}
            <div className="px-2 py-2">
              <Label className="text-xs">ピッチ: {settings.pitch}</Label>
              <Slider
                value={[settings.pitch * 100]}
                onValueChange={([value]) =>
                  updateSettings({ pitch: (value ?? 100) / 100 })
                }
                min={50}
                max={200}
                step={10}
                className="mt-1"
              />
            </div>

            {/* 言語選択 */}
            <div className="px-2 py-2">
              <Label className="text-xs">言語</Label>
              <select
                value={settings.language}
                onChange={(e) =>
                  updateSettings({
                    language: e.target.value as 'ja-JP' | 'en-US',
                  })
                }
                className="mt-1 w-full px-2 py-1 text-sm border rounded"
              >
                <option value="ja-JP">日本語</option>
                <option value="en-US">English</option>
              </select>
            </div>

            {/* 音声選択 */}
            {availableVoices.length > 0 && (
              <div className="px-2 py-2">
                <Label className="text-xs">音声</Label>
                <select
                  value={settings.voice || ''}
                  onChange={(e) =>
                    updateSettings({ voice: e.target.value || null })
                  }
                  className="mt-1 w-full px-2 py-1 text-sm border rounded"
                >
                  <option value="">自動選択</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} {voice.localService && '(ローカル)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DropdownMenuSeparator />

            {/* 自動再生 */}
            <div className="px-2 py-2 flex items-center justify-between">
              <Label htmlFor="auto-play" className="text-xs">
                自動再生
              </Label>
              <Switch
                id="auto-play"
                checked={settings.autoPlay}
                onCheckedChange={(checked) =>
                  updateSettings({ autoPlay: checked })
                }
              />
            </div>

            {/* 字幕表示 */}
            <div className="px-2 py-2 flex items-center justify-between">
              <Label htmlFor="show-subtitle" className="text-xs">
                字幕表示
              </Label>
              <Switch
                id="show-subtitle"
                checked={showSubtitle}
                onCheckedChange={setShowSubtitle}
              />
            </div>

            {showSubtitle && (
              <>
                {/* 字幕位置 */}
                <div className="px-2 py-2">
                  <Label className="text-xs">字幕位置</Label>
                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={() => setSubtitlePosition('top')}
                      className={cn(
                        'flex-1 px-2 py-1 text-xs rounded',
                        subtitlePosition === 'top'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      )}
                    >
                      上部
                    </button>
                    <button
                      onClick={() => setSubtitlePosition('bottom')}
                      className={cn(
                        'flex-1 px-2 py-1 text-xs rounded',
                        subtitlePosition === 'bottom'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      )}
                    >
                      下部
                    </button>
                  </div>
                </div>

                {/* 字幕サイズ */}
                <div className="px-2 py-2">
                  <Label className="text-xs">字幕サイズ</Label>
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => setSubtitleSize('small')}
                      className={cn(
                        'flex-1 px-2 py-1 text-xs rounded',
                        subtitleSize === 'small'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      )}
                    >
                      小
                    </button>
                    <button
                      onClick={() => setSubtitleSize('medium')}
                      className={cn(
                        'flex-1 px-2 py-1 text-xs rounded',
                        subtitleSize === 'medium'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      )}
                    >
                      中
                    </button>
                    <button
                      onClick={() => setSubtitleSize('large')}
                      className={cn(
                        'flex-1 px-2 py-1 text-xs rounded',
                        subtitleSize === 'large'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      )}
                    >
                      大
                    </button>
                  </div>
                </div>

                {/* 字幕色 */}
                <div className="px-2 py-2">
                  <Label className="text-xs">字幕色</Label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={subtitleColor}
                      onChange={(e) => setSubtitleColor(e.target.value)}
                      className="w-12 h-8 border rounded cursor-pointer"
                      title="文字色"
                    />
                    <input
                      type="color"
                      value={subtitleBackground}
                      onChange={(e) => setSubtitleBackground(e.target.value)}
                      className="w-12 h-8 border rounded cursor-pointer"
                      title="背景色"
                    />
                    <div className="flex-1">
                      <Label className="text-xs">
                        透明度: {subtitleOpacity}%
                      </Label>
                      <Slider
                        value={[subtitleOpacity]}
                        onValueChange={([value]) =>
                          setSubtitleOpacity(value || 80)
                        }
                        min={0}
                        max={100}
                        step={10}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 字幕表示エリア */}
      {showSubtitle && isPlaying && currentWord && (
        <div
          className={cn(
            'fixed left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-md transition-all',
            subtitlePosition === 'top' ? 'top-20' : 'bottom-20'
          )}
          style={{
            backgroundColor: `${subtitleBackground}${Math.round(
              (subtitleOpacity / 100) * 255
            )
              .toString(16)
              .padStart(2, '0')}`,
          }}
        >
          <p
            className={cn(
              'text-center font-medium',
              subtitleSize === 'small' && 'text-sm',
              subtitleSize === 'medium' && 'text-base',
              subtitleSize === 'large' && 'text-lg'
            )}
            style={{ color: subtitleColor }}
          >
            {currentWord}
          </p>
        </div>
      )}

      {/* ステータス表示 */}
      <div className="flex items-center gap-2">
        {isPlaying && !isPaused && (
          <Badge variant="default" className="text-xs">
            <Mic className="w-3 h-3 mr-1" />
            再生中
          </Badge>
        )}
        {isPaused && (
          <Badge variant="secondary" className="text-xs">
            <Pause className="w-3 h-3 mr-1" />
            一時停止
          </Badge>
        )}
        {settings.autoPlay && (
          <Badge variant="outline" className="text-xs">
            自動再生ON
          </Badge>
        )}
      </div>
    </div>
  );
}
