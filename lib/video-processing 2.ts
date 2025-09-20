export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  codec: string;
  size: number;
  bitrate: number;
}

export interface VideoProcessingOptions {
  maxSize?: number; // MB
  targetFormat?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high';
  generateThumbnail?: boolean;
  thumbnailTime?: number; // seconds
}

export class VideoProcessor {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly SUPPORTED_FORMATS = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];

  static isValidFormat(file: File): boolean {
    return this.SUPPORTED_FORMATS.includes(file.type);
  }

  static isValidSize(file: File): boolean {
    return file.size <= this.MAX_FILE_SIZE;
  }

  static async extractMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          frameRate: 30, // デフォルト値（実際の値はMediaInfoAPIが必要）
          codec: file.type.split('/')[1] || 'unknown',
          size: file.size,
          bitrate: (file.size * 8) / video.duration / 1000, // kbps
        };

        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  static async generateThumbnail(
    file: File,
    time: number = 0
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(time, video.duration);
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
            URL.revokeObjectURL(video.src);
          },
          'image/jpeg',
          0.8
        );
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  static async compressVideo(
    file: File,
    options: VideoProcessingOptions = {}
  ): Promise<Blob> {
    // 実際の圧縮にはFFmpeg.jsなどのライブラリが必要
    // ここでは簡易的に元のファイルを返す
    console.warn('Video compression requires FFmpeg.js or similar library');
    return file;
  }

  static async convertToGif(
    file: File,
    startTime: number,
    duration: number,
    fps: number = 10,
    width: number = 320
  ): Promise<Blob> {
    // GIF変換にはgif.jsなどのライブラリが必要
    console.warn('GIF conversion requires gif.js or similar library');
    return new Blob([], { type: 'image/gif' });
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export class VideoChapterManager {
  private chapters: VideoChapter[] = [];

  constructor(chapters: VideoChapter[] = []) {
    this.chapters = chapters;
  }

  addChapter(chapter: VideoChapter): void {
    this.chapters.push(chapter);
    this.sortChapters();
  }

  removeChapter(id: string): void {
    this.chapters = this.chapters.filter((c) => c.id !== id);
  }

  updateChapter(id: string, updates: Partial<VideoChapter>): void {
    const index = this.chapters.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.chapters[index] = { ...this.chapters[index], ...updates };
      this.sortChapters();
    }
  }

  getChapterAtTime(time: number): VideoChapter | null {
    return (
      this.chapters.find(
        (chapter) => time >= chapter.startTime && time < chapter.endTime
      ) || null
    );
  }

  getChapters(): VideoChapter[] {
    return this.chapters;
  }

  private sortChapters(): void {
    this.chapters.sort((a, b) => a.startTime - b.startTime);
  }
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
}
