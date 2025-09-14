'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImagesSelected: (files: File[]) => void;
  multiple?: boolean;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  className?: string;
}

export function ImageUpload({
  onImagesSelected,
  multiple = true,
  maxSizeMB = 10,
  acceptedFormats = ['jpg', 'jpeg', 'png', 'webp'],
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedFormats.includes(extension)) {
      setError(`Invalid file format. Accepted: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }

    return true;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const validFiles: File[] = [];
      setError(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && validateFile(file)) {
          validFiles.push(file);
          if (!multiple) break;
        }
      }

      if (validFiles.length > 0) {
        onImagesSelected(validFiles);
      }
    },
    [onImagesSelected, multiple, maxSizeMB, acceptedFormats]
  );

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
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-input')?.click();
    }
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center p-12',
          'cursor-pointer hover:border-primary/50 hover:bg-muted/50',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-muted-foreground/25',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Upload images"
      >
        <input
          id="file-input"
          type="file"
          accept={acceptedFormats.map((fmt) => `.${fmt}`).join(',')}
          multiple={multiple}
          onChange={handleFileInput}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          {isDragging ? (
            <ImageIcon className="h-12 w-12 text-primary animate-pulse" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragging
                ? 'Drop images here'
                : 'Drop images or click to upload'}
            </p>
            <p className="text-sm text-muted-foreground">
              {multiple ? 'Upload multiple images' : 'Upload an image'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedFormats.join(', ')} • Max size:{' '}
              {maxSizeMB}MB
            </p>
          </div>

          <Button variant="secondary" size="sm" type="button">
            Choose Files
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
