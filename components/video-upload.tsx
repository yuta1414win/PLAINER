'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Film, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  VideoProcessor,
  VideoMetadata,
  VideoProcessingOptions,
} from '@/lib/video-processing';

interface VideoUploadProps {
  onUpload: (file: File, metadata: VideoMetadata, thumbnail?: string) => void;
  onCancel?: () => void;
  maxSize?: number; // MB
  acceptedFormats?: string[];
  processingOptions?: VideoProcessingOptions;
  className?: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  file?: File;
  metadata?: VideoMetadata;
  thumbnail?: string;
}

export function VideoUpload({
  onUpload,
  onCancel,
  maxSize = 100,
  acceptedFormats = ['video/mp4', 'video/webm', 'video/quicktime'],
  processingOptions = {
    generateThumbnail: true,
    thumbnailTime: 1,
  },
  className,
}: VideoUploadProps) {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル検証
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!VideoProcessor.isValidFormat(file)) {
        return `サポートされていないファイル形式です。対応形式: ${acceptedFormats.join(', ')}`;
      }

      if (!VideoProcessor.isValidSize(file)) {
        return `ファイルサイズが大きすぎます。最大: ${maxSize}MB`;
      }

      return null;
    },
    [acceptedFormats, maxSize]
  );

  // ファイル処理
  const processFile = useCallback(
    async (file: File) => {
      setState({
        status: 'uploading',
        progress: 0,
        file,
      });

      // ファイル検証
      const error = validateFile(file);
      if (error) {
        setState({
          status: 'error',
          progress: 0,
          error,
        });
        return;
      }

      try {
        // メタデータの抽出
        setState((prev) => ({
          ...prev,
          status: 'processing',
          progress: 30,
        }));

        const metadata = await VideoProcessor.extractMetadata(file);

        setState((prev) => ({
          ...prev,
          progress: 60,
        }));

        // サムネイル生成
        let thumbnail: string | undefined;
        if (processingOptions.generateThumbnail) {
          thumbnail = await VideoProcessor.generateThumbnail(
            file,
            processingOptions.thumbnailTime || 1
          );
        }

        setState((prev) => ({
          ...prev,
          progress: 90,
        }));

        // ビデオ圧縮（オプション）
        let processedFile = file;
        if (
          processingOptions.maxSize &&
          file.size > processingOptions.maxSize * 1024 * 1024
        ) {
          processedFile = (await VideoProcessor.compressVideo(
            file,
            processingOptions
          )) as File;
        }

        setState({
          status: 'success',
          progress: 100,
          file: processedFile,
          metadata,
          thumbnail,
        });

        // 成功時のコールバック
        setTimeout(() => {
          onUpload(processedFile, metadata, thumbnail);
        }, 1000);
      } catch (error) {
        setState({
          status: 'error',
          progress: 0,
          error:
            error instanceof Error
              ? error.message
              : '処理中にエラーが発生しました',
        });
      }
    },
    [validateFile, processingOptions, onUpload]
  );

  // ファイル選択
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // ドラッグ&ドロップ
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        processFile(file);
      }
    },
    [processFile]
  );

  // リセット
  const handleReset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {state.status === 'idle' && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Film className="w-12 h-12 mx-auto mb-4 text-gray-400" />

          <h3 className="text-lg font-medium mb-2">動画をアップロード</h3>
          <p className="text-sm text-gray-500 mb-4">
            ドラッグ&ドロップまたはクリックして選択
          </p>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            ファイルを選択
          </Button>

          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-500">対応形式: MP4, WebM, MOV</p>
            <p className="text-xs text-gray-500">最大サイズ: {maxSize}MB</p>
          </div>
        </div>
      )}

      {(state.status === 'uploading' || state.status === 'processing') && (
        <div className="border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">
                {state.status === 'uploading'
                  ? 'アップロード中...'
                  : '処理中...'}
              </h3>
              {state.file && (
                <p className="text-sm text-gray-500 mb-3">
                  {state.file.name} (
                  {VideoProcessor.formatFileSize(state.file.size)})
                </p>
              )}
              <Progress value={state.progress} className="mb-2" />
              <p className="text-xs text-gray-500">{state.progress}%</p>
            </div>
          </div>
        </div>
      )}

      {state.status === 'success' && state.metadata && (
        <div className="border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {state.thumbnail ? (
                <img
                  src={state.thumbnail}
                  alt="Video thumbnail"
                  className="w-32 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                  <Film className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium">{state.file?.name}</h3>
                  <Badge variant="default" className="mt-1">
                    <Check className="w-3 h-3 mr-1" />
                    アップロード完了
                  </Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">解像度:</span>{' '}
                  {state.metadata.width}x{state.metadata.height}
                </div>
                <div>
                  <span className="font-medium">長さ:</span>{' '}
                  {VideoProcessor.formatDuration(state.metadata.duration)}
                </div>
                <div>
                  <span className="font-medium">サイズ:</span>{' '}
                  {VideoProcessor.formatFileSize(state.metadata.size)}
                </div>
                <div>
                  <span className="font-medium">ビットレート:</span>{' '}
                  {Math.round(state.metadata.bitrate)} kbps
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-1">エラー</h3>
              <p className="text-sm text-red-700">{state.error}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleReset}>
                  もう一度試す
                </Button>
                {onCancel && (
                  <Button size="sm" variant="ghost" onClick={onCancel}>
                    キャンセル
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
