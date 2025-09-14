'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  Menu,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Step, Hotspot, Annotation } from '@/lib/types';
import {
  usePostMessageAPI,
  type PostMessageCommand,
} from '@/hooks/use-postmessage-api';

interface StepPlayerProps {
  project: Project;
  initialStepIndex?: number;
  autoPlay?: boolean;
  showNavigation?: boolean;
  showProgress?: boolean;
  className?: string;
  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;
}

interface PlayerState {
  currentStepIndex: number;
  isPlaying: boolean;
  isFullscreen: boolean;
  showNavigation: boolean;
  focusedHotspotId: string | null;
  preferReducedMotion: boolean;
  volume: boolean;
}

export function StepPlayer({
  project,
  initialStepIndex = 0,
  autoPlay = false,
  showNavigation = true,
  showProgress = true,
  className,
  onStepChange,
  onComplete,
}: StepPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const notifyCompleteRef = useRef<(() => void) | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentStepIndex: Math.max(
      0,
      Math.min(initialStepIndex, project.steps.length - 1)
    ),
    isPlaying: autoPlay,
    isFullscreen: false,
    showNavigation,
    focusedHotspotId: null,
    preferReducedMotion: false,
    volume: true,
  });

  // 派生値
  const currentStep = useMemo(
    () => project.steps[playerState.currentStepIndex],
    [project.steps, playerState.currentStepIndex]
  );
  const progress = useMemo(
    () => ((playerState.currentStepIndex + 1) / project.steps.length) * 100,
    [playerState.currentStepIndex, project.steps.length]
  );
  const isFirstStep = playerState.currentStepIndex === 0;
  const isLastStep = playerState.currentStepIndex === project.steps.length - 1;

  // メディアクエリ対応
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlayerState((prev) => ({
      ...prev,
      preferReducedMotion: mediaQuery.matches,
    }));

    const handleChange = (e: MediaQueryListEvent) => {
      setPlayerState((prev) => ({
        ...prev,
        preferReducedMotion: e.matches,
      }));
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // キーボードナビゲーション（安定したハンドラに依存）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return; // 入力フィールドでは無視
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'Home':
          e.preventDefault();
          handleGoToStep(0);
          break;
        case 'End':
          e.preventDefault();
          handleGoToStep(project.steps.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          if (playerState.isFullscreen) {
            handleToggleFullscreen();
          }
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleToggleFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleGoToStep, handleToggleFullscreen]);

  // フルスクリーン制御
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!playerState.isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [playerState.isFullscreen]);

  // ステップ変更時のコールバック
  useEffect(() => {
    onStepChange?.(playerState.currentStepIndex);
  }, [playerState.currentStepIndex, onStepChange]);

  // ナビゲーション制御
  const handleNext = useCallback(() => {
    if (playerState.currentStepIndex < project.steps.length - 1) {
      setPlayerState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        focusedHotspotId: null,
      }));
    } else {
      // 最後のステップに到達
      notifyCompleteRef.current?.();
      onComplete?.();
    }
  }, [playerState.currentStepIndex, project.steps.length, onComplete]);

  const handlePrevious = useCallback(() => {
    if (playerState.currentStepIndex > 0) {
      setPlayerState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
        focusedHotspotId: null,
      }));
    }
  }, [playerState.currentStepIndex]);

  const handleGoToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < project.steps.length) {
        setPlayerState((prev) => ({
          ...prev,
          currentStepIndex: stepIndex,
          focusedHotspotId: null,
        }));
      }
    },
    [project.steps.length]
  );

  // PostMessage API統合（ハンドラ定義後に依存させる）
  const handlePostMessageCommand = useCallback(
    (command: PostMessageCommand) => {
      switch (command.type) {
        case 'nextStep':
          handleNext();
          break;
        case 'prevStep':
          handlePrevious();
          break;
        case 'goToStep':
          if (command.data?.stepIndex !== undefined) {
            handleGoToStep(command.data.stepIndex);
          }
          break;
        case 'play':
          setPlayerState((prev) => ({ ...prev, isPlaying: true }));
          break;
        case 'pause':
          setPlayerState((prev) => ({ ...prev, isPlaying: false }));
          break;
        case 'fullscreen':
          if (command.data?.enabled !== undefined) {
            if (command.data.enabled !== playerState.isFullscreen) {
              handleToggleFullscreen();
            }
          } else {
            handleToggleFullscreen();
          }
          break;
      }
    },
    [
      handleNext,
      handlePrevious,
      handleGoToStep,
      handleToggleFullscreen,
      playerState.isFullscreen,
    ]
  );

  const { isInIframe, notifyComplete, notifyError } = usePostMessageAPI({
    project,
    currentStepIndex: playerState.currentStepIndex,
    onCommand: handlePostMessageCommand,
  });

  // 最新のnotifyCompleteを参照に反映
  useEffect(() => {
    notifyCompleteRef.current = notifyComplete;
  }, [notifyComplete]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setPlayerState((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 以降は既存のロジック

  // ホットスポットイベント
  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    setPlayerState((prev) => ({
      ...prev,
      focusedHotspotId: hotspot.id,
    }));

    // ツールチップ表示やアクション実行
    if (hotspot.tooltipText) {
      // TODO: ツールチップ表示ロジック
    }
  }, []);

  const handleHotspotKeyDown = useCallback(
    (e: React.KeyboardEvent, hotspot: Hotspot) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleHotspotClick(hotspot);
      }
    },
    [handleHotspotClick]
  );

  // 自動再生
  useEffect(() => {
    if (!playerState.isPlaying) return;
    const timer = setTimeout(() => {
      handleNext();
    }, 3000); // 3秒後に次のステップ
    return () => clearTimeout(timer);
  }, [playerState.isPlaying, handleNext]);

  const togglePlay = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const toggleNavigation = useCallback(() => {
    setPlayerState((prev) => ({
      ...prev,
      showNavigation: !prev.showNavigation,
    }));
  }, []);

  // ホットスポット座標変換
  const getHotspotStyle = useCallback(
    (hotspot: Hotspot) => {
      if (!imageRef.current) return {};

      const img = imageRef.current;
      const rect = img.getBoundingClientRect();

      const x = hotspot.x * rect.width;
      const y = hotspot.y * rect.height;

      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'all',
        cursor: 'pointer',
        transition: playerState.preferReducedMotion ? 'none' : 'all 0.2s ease',
        zIndex: 10,
      };

      switch (hotspot.shape) {
        case 'rect':
          return {
            ...baseStyle,
            width: `${(hotspot.w || 0) * rect.width}px`,
            height: `${(hotspot.h || 0) * rect.height}px`,
            borderRadius: '4px',
          };
        case 'circle':
          const radius = (hotspot.r || 0) * Math.min(rect.width, rect.height);
          return {
            ...baseStyle,
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          };
        default:
          return baseStyle;
      }
    },
    [playerState.preferReducedMotion]
  );

  // メモ化コンポーネント: 画像オーバーレイ（ホットスポット / 注釈）
  const ImageOverlay = useMemo(() =>
    memo(function ImageOverlay({
      image,
      alt,
      hotspots,
      annotations,
      focusedHotspotId,
      preferReducedMotion,
      imageRef,
      getHotspotStyle,
      onHotspotClick,
    }: {
      image: string;
      alt: string;
      hotspots: readonly Hotspot[];
      annotations: readonly Annotation[];
      focusedHotspotId: string | null;
      preferReducedMotion: boolean;
      imageRef: React.RefObject<HTMLImageElement>;
      getHotspotStyle: (h: Hotspot) => React.CSSProperties;
      onHotspotClick: (h: Hotspot) => void;
    }) {
      const hotspotNodes = useMemo(
        () =>
          hotspots.map((hotspot) => (
            <div
              key={hotspot.id}
              className={cn(
                'border-2 border-red-500 bg-red-500/20 hover:bg-red-500/30',
                focusedHotspotId === hotspot.id && 'ring-2 ring-blue-500',
                preferReducedMotion ? '' : 'animate-pulse'
              )}
              style={getHotspotStyle(hotspot)}
              onClick={() => onHotspotClick(hotspot)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onHotspotClick(hotspot);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={hotspot.label || `ホットスポット ${hotspot.id}`}
              title={hotspot.tooltipText}
            >
              {hotspot.label && (
                <div className="absolute -top-8 left-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {hotspot.label}
                </div>
              )}
            </div>
          )),
        [hotspots, focusedHotspotId, preferReducedMotion, getHotspotStyle, onHotspotClick]
      );

      const annotationNodes = useMemo(
        () =>
          annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="absolute bg-white/90 px-2 py-1 rounded shadow-sm text-sm pointer-events-none"
              style={{
                left: `${annotation.x * 100}%`,
                top: `${annotation.y * 100}%`,
                color: annotation.style?.color || 'inherit',
                fontSize: annotation.style?.fontSize || 14,
                fontWeight: annotation.style?.fontWeight || 'normal',
              }}
            >
              {annotation.text}
            </div>
          )),
        [annotations]
      );

      return (
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          <img
            ref={imageRef}
            src={image}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            style={{ userSelect: 'none' }}
          />
          {hotspotNodes}
          {annotationNodes}
        </div>
      );
    }),
  []);

  // メモ化コンポーネント: コントロールバー
  const ControlsBar = useMemo(() =>
    memo(function ControlsBar({
      isPlaying,
      onTogglePlay,
      onGoFirst,
      onPrev,
      onNext,
      onGoLast,
      isFirst,
      isLast,
      showProgress,
      progress,
      currentTitle,
      currentIndex,
      totalSteps,
      isNavigationShown,
      onToggleNavigation,
      isFullscreen,
      onToggleFullscreen,
    }: {
      isPlaying: boolean;
      onTogglePlay: () => void;
      onGoFirst: () => void;
      onPrev: () => void;
      onNext: () => void;
      onGoLast: () => void;
      isFirst: boolean;
      isLast: boolean;
      showProgress: boolean;
      progress: number;
      currentTitle: string;
      currentIndex: number;
      totalSteps: number;
      isNavigationShown: boolean;
      onToggleNavigation: () => void;
      isFullscreen: boolean;
      onToggleFullscreen: () => void;
    }) {
      return (
        <div className={cn('flex items-center justify-between p-4 border-t bg-background/95 backdrop-blur-sm')}>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onTogglePlay} aria-label={isPlaying ? '一時停止' : '再生'}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" onClick={onGoFirst} disabled={isFirst} aria-label="最初のステップへ">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onPrev} disabled={isFirst} aria-label="前のステップ">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={isLast} aria-label="次のステップ">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onGoLast} disabled={isLast} aria-label="最後のステップへ">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 mx-6 space-y-2">
            {showProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{currentTitle}</span>
                  <span className="text-muted-foreground">{currentIndex + 1} / {totalSteps}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onToggleNavigation} aria-label="ナビゲーション表示切替">
              {isNavigationShown ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleFullscreen} aria-label="フルスクリーン切替">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      );
    }),
  []);

  // メモ化コンポーネント: ナビゲーションサイドバー
  const NavigationSidebar = useMemo(() =>
    memo(function NavigationSidebar({
      projectName,
      steps,
      currentIndex,
      onSelect,
      isFullscreen,
    }: {
      projectName: string;
      steps: readonly Step[];
      currentIndex: number;
      onSelect: (idx: number) => void;
      isFullscreen: boolean;
    }) {
      const items = useMemo(
        () =>
          steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => onSelect(index)}
              className={cn(
                'w-full text-left p-3 rounded-md transition-colors hover:bg-accent',
                index === currentIndex && 'bg-accent border border-primary'
              )}
              aria-current={index === currentIndex ? 'step' : undefined}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                  {step.thumbnail && (
                    <img src={step.thumbnail} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{index + 1}. {step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.hotspots.length} 個のホットスポット</div>
                </div>
              </div>
            </button>
          )),
        [steps, currentIndex, onSelect]
      );

      return (
        <div
          className={cn(
            'absolute top-0 right-0 w-80 h-full bg-background/95 backdrop-blur-sm border-l overflow-hidden',
            isFullscreen ? 'h-screen' : 'h-full'
          )}
        >
          <div className="p-4 border-b">
            <h3 className="font-medium">{projectName}</h3>
            <p className="text-sm text-muted-foreground">{steps.length} ステップ</p>
          </div>
          <ScrollArea className="h-full pb-20">
            <div className="p-2 space-y-1">{items}</div>
          </ScrollArea>
        </div>
      );
    }),
  []);

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">ステップが見つかりません</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-background',
        playerState.isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      role="region"
      aria-label="インタラクティブガイドプレイヤー"
    >
      {/* メインコンテンツ */}
      <div
        className={cn(
          'relative',
          playerState.isFullscreen ? 'h-screen flex flex-col' : 'min-h-[400px]'
        )}
      >
        {/* ステップ画像とホットスポット */}
        <div className={cn('relative flex-1', !playerState.isFullscreen && 'border rounded-lg')}>
          <ImageOverlay
            image={currentStep.image}
            alt={currentStep.title}
            hotspots={currentStep.hotspots}
            annotations={currentStep.annotations}
            focusedHotspotId={playerState.focusedHotspotId}
            preferReducedMotion={playerState.preferReducedMotion}
            imageRef={imageRef}
            getHotspotStyle={getHotspotStyle}
            onHotspotClick={handleHotspotClick}
          />
        </div>

        {/* コントロールバー */}
        <div className={cn(playerState.isFullscreen && 'absolute bottom-0 left-0 right-0')}>
          <ControlsBar
            isPlaying={playerState.isPlaying}
            onTogglePlay={togglePlay}
            onGoFirst={() => handleGoToStep(0)}
            onPrev={handlePrevious}
            onNext={handleNext}
            onGoLast={() => handleGoToStep(project.steps.length - 1)}
            isFirst={playerState.currentStepIndex === 0}
            isLast={playerState.currentStepIndex === project.steps.length - 1}
            showProgress={showProgress}
            progress={progress}
            currentTitle={currentStep.title}
            currentIndex={playerState.currentStepIndex}
            totalSteps={project.steps.length}
            isNavigationShown={playerState.showNavigation}
            onToggleNavigation={toggleNavigation}
            isFullscreen={playerState.isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        </div>

        {/* ナビゲーションサイドバー */}
        {playerState.showNavigation && (
          <NavigationSidebar
            projectName={project.name}
            steps={project.steps}
            currentIndex={playerState.currentStepIndex}
            onSelect={handleGoToStep}
            isFullscreen={playerState.isFullscreen}
          />
        )}
      </div>

      {/* スクリーンリーダー用の状態通知 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        ステップ {playerState.currentStepIndex + 1} / {project.steps.length}:{' '}
        {currentStep.title}
        {playerState.isPlaying && '再生中'}
      </div>
    </div>
  );
}
