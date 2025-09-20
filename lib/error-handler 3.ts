/**
 * 統一されたエラーハンドリングシステム
 */

import { toast } from 'sonner';
import { ERROR_MESSAGES } from './constants';

// エラータイプの定義
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  FILE_OPERATION = 'file_operation',
  API = 'api',
  UNKNOWN = 'unknown',
}

// カスタムエラークラス
export class PLAINERError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PLAINERError';
    this.type = type;
    this.code = code;
    this.metadata = metadata;
  }
}

// バリデーションエラー専用クラス
export class ValidationError extends PLAINERError {
  constructor(message: string, field?: string) {
    super(message, ErrorType.VALIDATION, 'VALIDATION_FAILED', { field });
  }
}

// ネットワークエラー専用クラス
export class NetworkError extends PLAINERError {
  constructor(message: string, status?: number) {
    super(message, ErrorType.NETWORK, 'NETWORK_ERROR', { status });
  }
}

// ファイル操作エラー専用クラス
export class FileOperationError extends PLAINERError {
  constructor(message: string, operation: string, fileName?: string) {
    super(message, ErrorType.FILE_OPERATION, 'FILE_OPERATION_FAILED', {
      operation,
      fileName,
    });
  }
}

// エラーハンドラーのオプション
interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
  fallbackMessage?: string;
}

// エラーメッセージの翻訳マッピング
const ERROR_MESSAGE_MAP: Record<string, string> = {
  'File too large': ERROR_MESSAGES.FILE_TOO_LARGE,
  'Invalid file type': ERROR_MESSAGES.INVALID_FILE_TYPE,
  'Upload failed': ERROR_MESSAGES.UPLOAD_FAILED,
  'Save failed': ERROR_MESSAGES.SAVE_FAILED,
  'Load failed': ERROR_MESSAGES.LOAD_FAILED,
  'Network error': ERROR_MESSAGES.NETWORK_ERROR,
};

// エラーハンドラーのメインクラス
export class ErrorHandler {
  private static instance: ErrorHandler;

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // エラーを処理する
  public handle(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): PLAINERError {
    const {
      showToast = true,
      logToConsole = true,
      reportToService = false,
      fallbackMessage = ERROR_MESSAGES.UNKNOWN_ERROR,
    } = options;

    const processedError = this.processError(error, fallbackMessage);

    if (logToConsole) {
      this.logError(processedError);
    }

    if (showToast) {
      this.showErrorToast(processedError);
    }

    if (reportToService) {
      this.reportError(processedError);
    }

    return processedError;
  }

  // 非同期処理のエラーハンドリング
  public async handleAsync<T>(
    promise: Promise<T>,
    options?: ErrorHandlerOptions
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw this.handle(error, options);
    }
  }

  // エラーの詳細を処理
  private processError(error: unknown, fallbackMessage: string): PLAINERError {
    if (error instanceof PLAINERError) {
      return error;
    }

    if (error instanceof Error) {
      const translatedMessage =
        ERROR_MESSAGE_MAP[error.message] || error.message;

      // ネットワークエラーの判定
      if (this.isNetworkError(error)) {
        return new NetworkError(translatedMessage);
      }

      // ファイル操作エラーの判定
      if (this.isFileError(error)) {
        return new FileOperationError(translatedMessage, 'unknown');
      }

      return new PLAINERError(translatedMessage);
    }

    if (typeof error === 'string') {
      const translatedMessage = ERROR_MESSAGE_MAP[error] || error;
      return new PLAINERError(translatedMessage);
    }

    return new PLAINERError(fallbackMessage);
  }

  // ネットワークエラーかどうかを判定
  private isNetworkError(error: Error): boolean {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.name === 'NetworkError'
    );
  }

  // ファイルエラーかどうかを判定
  private isFileError(error: Error): boolean {
    return (
      error.message.includes('file') ||
      error.message.includes('blob') ||
      error.message.includes('upload') ||
      error.name === 'FileError'
    );
  }

  // コンソールにエラーをログ出力
  private logError(error: PLAINERError): void {
    console.group(`🚨 PLAINER Error [${error.type}]`);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Metadata:', error.metadata);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  // トーストでエラーを表示
  private showErrorToast(error: PLAINERError): void {
    const toastOptions = {
      description: error.code ? `エラーコード: ${error.code}` : undefined,
    };

    switch (error.type) {
      case ErrorType.VALIDATION:
        toast.error(error.message, toastOptions);
        break;
      case ErrorType.NETWORK:
        toast.error(error.message, {
          ...toastOptions,
          action: {
            label: '再試行',
            onClick: () => window.location.reload(),
          },
        });
        break;
      default:
        toast.error(error.message, toastOptions);
    }
  }

  // エラーレポーティングサービスに送信
  private reportError(error: PLAINERError): void {
    // 本番環境では実際のエラーレポーティングサービスに送信
    console.log('📊 Error reported:', {
      message: error.message,
      type: error.type,
      code: error.code,
      metadata: error.metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }
}

// 便利な関数エクスポート
export const errorHandler = ErrorHandler.getInstance();

// よく使われるエラーハンドリング関数
export function handleFileError(
  error: unknown,
  operation: string,
  fileName?: string
): void {
  if (error instanceof Error && error.message.includes('too large')) {
    errorHandler.handle(
      new FileOperationError(ERROR_MESSAGES.FILE_TOO_LARGE, operation, fileName)
    );
  } else if (error instanceof Error && error.message.includes('invalid')) {
    errorHandler.handle(
      new FileOperationError(
        ERROR_MESSAGES.INVALID_FILE_TYPE,
        operation,
        fileName
      )
    );
  } else {
    errorHandler.handle(
      new FileOperationError(ERROR_MESSAGES.UPLOAD_FAILED, operation, fileName)
    );
  }
}

export function handleValidationError(message: string, field?: string): never {
  throw errorHandler.handle(new ValidationError(message, field), {
    showToast: false,
  });
}

export function handleNetworkError(error: unknown, status?: number): void {
  errorHandler.handle(new NetworkError(ERROR_MESSAGES.NETWORK_ERROR, status));
}

// async/await の簡易ラッパー
export async function safeAsync<T>(
  promise: Promise<T>,
  options?: ErrorHandlerOptions
): Promise<[T | null, PLAINERError | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    const processedError = errorHandler.handle(error, options);
    return [null, processedError];
  }
}
