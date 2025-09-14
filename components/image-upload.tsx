'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileImage, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  thumbnail?: string;
  progress: number;
  error?: string;
  processed?: boolean;
}

interface ImageUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onFilesProcessed?: (processedImages: ProcessedImage[]) => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

interface ProcessedImage {
  id: string;
  originalFile: File;
  imageData: string; // base64
  thumbnail: string; // base64
  dimensions: { width: number; height: number };
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 20;
const MAX_DIMENSION = 4096;
const THUMBNAIL_SIZE = 150;

export function ImageUpload({
  onFilesUploaded,
  onFilesProcessed,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className,
}: ImageUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // ファイルタイプチェック
      if (!acceptedTypes.includes(file.type)) {
        return `サポートされていないファイル形式です。${acceptedTypes.join(', ')} のみ使用できます。`;
      }

      // ファイルサイズチェック
      const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `ファイルサイズが${maxFileSizeMB}MBを超えています。`;
      }

      return null;
    },
    [acceptedTypes, maxFileSizeMB]
  );

  const processImage = useCallback(
    async (file: File): Promise<ProcessedImage> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        img.onload = () => {
          try {
            // 元画像の寸法を取得
            let { width, height } = img;

            // EXIF方向補正（簡易版）
            // 実際のプロダクションではより詳細なEXIF処理が必要

            // 最大寸法チェックとリサイズ
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              const ratio = Math.min(
                MAX_DIMENSION / width,
                MAX_DIMENSION / height
              );
              width *= ratio;
              height *= ratio;
            }

            // メイン画像処理
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const imageData = canvas.toDataURL('image/webp', 0.8);

            // サムネイル生成
            const thumbnailRatio = Math.min(
              THUMBNAIL_SIZE / width,
              THUMBNAIL_SIZE / height
            );
            const thumbnailWidth = width * thumbnailRatio;
            const thumbnailHeight = height * thumbnailRatio;

            canvas.width = thumbnailWidth;
            canvas.height = thumbnailHeight;
            ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
            const thumbnail = canvas.toDataURL('image/webp', 0.6);

            resolve({
              id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              originalFile: file,
              imageData,
              thumbnail,
              dimensions: { width, height },
            });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        img.src = URL.createObjectURL(file);
      });
    },
    []
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const filesArray = Array.from(fileList);
      const validFiles: File[] = [];
      const errors: string[] = [];

      // ファイル数制限チェック
      if (files.length + filesArray.length > maxFiles) {
        errors.push(`最大${maxFiles}ファイルまでアップロードできます。`);
        return;
      }

      // ファイルバリデーション
      filesArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        // エラー処理（実際はtoast等で表示）
        console.error('File validation errors:', errors);
        return;
      }

      // 新しいファイルをリストに追加
      const newFiles: UploadedFile[] = validFiles.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      onFilesUploaded?.(newFiles);

      // 画像処理開始
      setIsProcessing(true);
      const processedImages: ProcessedImage[] = [];

      try {
        for (const uploadFile of newFiles) {
          try {
            // 進捗更新
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress: 50 } : f
              )
            );

            const processed = await processImage(uploadFile.file);
            processedImages.push(processed);

            // 完了マーク
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? {
                      ...f,
                      progress: 100,
                      processed: true,
                      thumbnail: processed.thumbnail,
                    }
                  : f
              )
            );
          } catch (error) {
            // エラーマーク
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? {
                      ...f,
                      error:
                        error instanceof Error
                          ? error.message
                          : '処理に失敗しました',
                    }
                  : f
              )
            );
          }
        }

        onFilesProcessed?.(processedImages);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      files,
      maxFiles,
      validateFile,
      processImage,
      onFilesUploaded,
      onFilesProcessed,
    ]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles) {
        handleFiles(selectedFiles);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== fileId);
      // プレビューURLをクリーンアップ
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return newFiles;
    });
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // キーボード対応
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFileDialog();
      }
    },
    [openFileDialog]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* アップロードエリア */}
      <Card
        className={cn(
          'relative border-2 border-dashed transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="画像ファイルをアップロード"
      >
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">画像をドラッグ&ドロップ</h3>
            <p className="text-sm text-muted-foreground">
              または{' '}
              <Button variant="link" className="p-0 h-auto">
                クリックしてファイルを選択
              </Button>
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedTypes.map((type) => type.split('/')[1]).join(', ')} •
              最大{maxFileSizeMB}MB • {maxFiles}ファイルまで
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 非表示のファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
        aria-label="ファイル選択"
      />

      {/* アップロード済みファイル一覧 */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            アップロード済みファイル ({files.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="relative group">
                <CardContent className="p-3 space-y-2">
                  {/* プレビュー画像 */}
                  <div className="aspect-square bg-muted rounded-md overflow-hidden">
                    <img
                      src={file.thumbnail || file.preview}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* ファイル情報 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <FileImage className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate" title={file.file.name}>
                        {file.file.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>

                  {/* 進捗・エラー表示 */}
                  {file.error ? (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="truncate" title={file.error}>
                        エラー
                      </span>
                    </div>
                  ) : file.processed ? (
                    <div className="text-xs text-green-600">完了</div>
                  ) : (
                    <Progress value={file.progress} className="h-1" />
                  )}

                  {/* 削除ボタン */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(file.id);
                    }}
                    aria-label={`${file.file.name}を削除`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type { ProcessedImage };
