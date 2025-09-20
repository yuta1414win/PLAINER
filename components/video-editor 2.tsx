'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Scissors,
  Split,
  Camera,
  Film,
  Download,
  Play,
  Pause,
  RotateCcw,
  Save,
  Sliders,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { VideoProcessor } from '@/lib/video-processing';

interface VideoEditorProps {
  videoFile: File;
  onSave?: (editedVideo: Blob, thumbnail?: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface TrimRange {
  start: number;
  end: number;
}

interface SplitPoint {
  time: number;
  id: string;
}

export function VideoEditor({
  videoFile,
  onSave,
  onCancel,
  className,
}: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 0 });
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showGifDialog, setShowGifDialog] = useState(false);
  const [gifSettings, setGifSettings] = useState({
    startTime: 0,
    duration: 3,
    fps: 10,
    width: 320,
  });

  // ビデオメタデータ読み込み
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setTrimRange({ start: 0, end: video.duration });
  }, []);

  // 再生/一時停止
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // 時間更新
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
  }, []);

  // シーク
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  // トリミング範囲設定
  const handleTrimStart = useCallback(
    (value: number[]) => {
      setTrimRange((prev) => ({ ...prev, start: value[0] }));
      handleSeek(value[0]);
    },
    [handleSeek]
  );

  const handleTrimEnd = useCallback(
    (value: number[]) => {
      setTrimRange((prev) => ({ ...prev, end: value[0] }));
      handleSeek(value[0]);
    },
    [handleSeek]
  );

  // 分割ポイント追加
  const addSplitPoint = useCallback(() => {
    const newSplit: SplitPoint = {
      time: currentTime,
      id: `split_${Date.now()}`,
    };
    setSplitPoints((prev) =>
      [...prev, newSplit].sort((a, b) => a.time - b.time)
    );
  }, [currentTime]);

  // 分割ポイント削除
  const removeSplitPoint = useCallback((id: string) => {
    setSplitPoints((prev) => prev.filter((point) => point.id !== id));
  }, []);

  // 静止画キャプチャ
  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `frame_${Math.floor(currentTime * 1000)}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      'image/jpeg',
      0.95
    );
  }, [currentTime]);

  // サムネイル設定
  const setAsThumbnail = useCallback(() => {
    setSelectedThumbnailTime(currentTime);
  }, [currentTime]);

  // トリミング実行
  const executeTrim = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // 実際のトリミングにはFFmpeg.jsなどが必要
      // ここではシミュレーション
      for (let i = 0; i <= 100; i += 10) {
        setProcessingProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // サムネイル生成
      const thumbnail = await VideoProcessor.generateThumbnail(
        videoFile,
        selectedThumbnailTime
      );

      if (onSave) {
        // トリミング済みビデオを返す（実際にはFFmpegで処理）
        onSave(videoFile, thumbnail);
      }
    } catch (error) {
      console.error('Failed to trim video:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [videoFile, selectedThumbnailTime, trimRange, onSave]);

  // 分割実行
  const executeSplit = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // 実際の分割にはFFmpeg.jsなどが必要
      // ここではシミュレーション
      const segments = splitPoints.length + 1;
      for (let i = 0; i < segments; i++) {
        setProcessingProgress((i / segments) * 100);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('Video split into', segments, 'segments');
    } catch (error) {
      console.error('Failed to split video:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [splitPoints]);

  // GIF変換
  const convertToGif = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setShowGifDialog(false);

    try {
      // 実際のGIF変換にはgif.jsなどが必要
      for (let i = 0; i <= 100; i += 5) {
        setProcessingProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const gifBlob = await VideoProcessor.convertToGif(
        videoFile,
        gifSettings.startTime,
        gifSettings.duration,
        gifSettings.fps,
        gifSettings.width
      );

      if (gifBlob.size > 0) {
        const url = URL.createObjectURL(gifBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animation.gif`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to convert to GIF:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [videoFile, gifSettings]);

  // 時間フォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* ビデオプレビュー */}
      <Card>
        <CardHeader>
          <CardTitle>ビデオエディター</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={URL.createObjectURL(videoFile)}
              className="w-full"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* タイムライン上の分割ポイント表示 */}
            {splitPoints.map((point) => (
              <div
                key={point.id}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                style={{ left: `${(point.time / duration) * 100}%` }}
              >
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 -left-4 w-8 h-8 p-0"
                  onClick={() => removeSplitPoint(point.id)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          {/* 再生コントロール */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={togglePlayPause}>
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <div className="flex-1">
              <Slider
                value={[currentTime]}
                onValueChange={([value]) => handleSeek(value)}
                max={duration}
                step={0.01}
              />
            </div>

            <span className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* トリミング */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            トリミング
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>開始時刻: {formatTime(trimRange.start)}</Label>
            <Slider
              value={[trimRange.start]}
              onValueChange={handleTrimStart}
              max={duration}
              step={0.01}
              className="mb-4"
            />
          </div>

          <div className="space-y-2">
            <Label>終了時刻: {formatTime(trimRange.end)}</Label>
            <Slider
              value={[trimRange.end]}
              onValueChange={handleTrimEnd}
              max={duration}
              step={0.01}
            />
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline">
              長さ: {formatTime(trimRange.end - trimRange.start)}
            </Badge>
            <Button onClick={executeTrim} disabled={isProcessing}>
              <Scissors className="w-4 h-4 mr-2" />
              トリミング実行
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 分割 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            分割
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={addSplitPoint} size="sm">
              <Split className="w-4 h-4 mr-2" />
              現在位置で分割
            </Button>
            <span className="text-sm text-gray-600">
              分割ポイント: {splitPoints.length}個
            </span>
          </div>

          {splitPoints.length > 0 && (
            <div className="space-y-2">
              {splitPoints.map((point, index) => (
                <div
                  key={point.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm">
                    分割ポイント {index + 1}: {formatTime(point.time)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSplitPoint(point.id)}
                  >
                    削除
                  </Button>
                </div>
              ))}

              <Button
                onClick={executeSplit}
                disabled={isProcessing}
                className="w-full"
              >
                <Split className="w-4 h-4 mr-2" />
                {splitPoints.length + 1}個のセグメントに分割
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* キャプチャ・GIF変換 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            キャプチャ・変換
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={captureFrame} variant="outline">
              <Camera className="w-4 h-4 mr-2" />
              静止画キャプチャ
            </Button>

            <Button onClick={setAsThumbnail} variant="outline">
              <ImageIcon className="w-4 h-4 mr-2" />
              サムネイルに設定
            </Button>

            <Button onClick={() => setShowGifDialog(true)} variant="outline">
              <Film className="w-4 h-4 mr-2" />
              GIFに変換
            </Button>

            <Button onClick={() => handleSeek(0)} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              最初に戻る
            </Button>
          </div>

          {selectedThumbnailTime > 0 && (
            <Badge variant="secondary">
              サムネイル: {formatTime(selectedThumbnailTime)}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button onClick={executeTrim} disabled={isProcessing}>
          <Save className="w-4 h-4 mr-2" />
          保存
        </Button>
      </div>

      {/* 処理中ダイアログ */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">処理中...</p>
                </div>
                <Progress value={processingProgress} />
                <p className="text-center text-sm">
                  {Math.round(processingProgress)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GIF設定ダイアログ */}
      <Dialog open={showGifDialog} onOpenChange={setShowGifDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GIF変換設定</DialogTitle>
            <DialogDescription>
              GIFに変換する範囲と品質を設定してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>開始時刻（秒）</Label>
              <Input
                type="number"
                value={gifSettings.startTime}
                onChange={(e) =>
                  setGifSettings((prev) => ({
                    ...prev,
                    startTime: parseFloat(e.target.value),
                  }))
                }
                min={0}
                max={duration}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>長さ（秒）</Label>
              <Input
                type="number"
                value={gifSettings.duration}
                onChange={(e) =>
                  setGifSettings((prev) => ({
                    ...prev,
                    duration: parseFloat(e.target.value),
                  }))
                }
                min={0.5}
                max={10}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>フレームレート（FPS）</Label>
              <Slider
                value={[gifSettings.fps]}
                onValueChange={([value]) =>
                  setGifSettings((prev) => ({
                    ...prev,
                    fps: value,
                  }))
                }
                min={5}
                max={30}
                step={5}
              />
              <span className="text-sm text-gray-600">
                {gifSettings.fps} FPS
              </span>
            </div>

            <div className="space-y-2">
              <Label>幅（ピクセル）</Label>
              <Slider
                value={[gifSettings.width]}
                onValueChange={([value]) =>
                  setGifSettings((prev) => ({
                    ...prev,
                    width: value,
                  }))
                }
                min={160}
                max={640}
                step={80}
              />
              <span className="text-sm text-gray-600">
                {gifSettings.width}px
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGifDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={convertToGif}>
              <Film className="w-4 h-4 mr-2" />
              GIFに変換
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
