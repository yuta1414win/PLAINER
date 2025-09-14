// ============================================================================
// エラーハンドリング統一化システム
// ============================================================================

import type { UUID } from './types';

// ============================================================================
// エラー型定義
// ============================================================================

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  STORAGE = 'storage',
  PERMISSION = 'permission',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  DOM_MANIPULATION = 'dom_manipulation',
  FILE_PROCESSING = 'file_processing',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  readonly userId?: string;
  readonly projectId?: UUID;
  readonly stepId?: UUID;
  readonly componentName?: string;
  readonly action?: string;
  readonly additionalData?: Record<string, unknown>;
}

export interface PLAINERError {
  readonly id: UUID;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly code: string;
  readonly message: string;
  readonly originalError?: Error;
  readonly context?: ErrorContext;
  readonly timestamp: Date;
  readonly userMessage?: string;
  readonly recoveryAction?: string;
  readonly documentationUrl?: string;
}

// ============================================================================
// エラーコード定義
// ============================================================================

export const ERROR_CODES = {
  // 検証エラー
  VALIDATION_REQUIRED_FIELD: 'VAL_001',
  VALIDATION_INVALID_FORMAT: 'VAL_002',
  VALIDATION_OUT_OF_RANGE: 'VAL_003',
  VALIDATION_DUPLICATE_NAME: 'VAL_004',

  // ネットワークエラー
  NETWORK_CONNECTION_FAILED: 'NET_001',
  NETWORK_TIMEOUT: 'NET_002',
  NETWORK_UNAUTHORIZED: 'NET_003',
  NETWORK_RATE_LIMIT: 'NET_004',

  // ストレージエラー
  STORAGE_QUOTA_EXCEEDED: 'STO_001',
  STORAGE_ACCESS_DENIED: 'STO_002',
  STORAGE_CORRUPTION: 'STO_003',
  STORAGE_SERIALIZATION_FAILED: 'STO_004',

  // ファイル処理エラー
  FILE_TOO_LARGE: 'FILE_001',
  FILE_UNSUPPORTED_FORMAT: 'FILE_002',
  FILE_PROCESSING_FAILED: 'FILE_003',
  FILE_UPLOAD_FAILED: 'FILE_004',

  // DOM操作エラー
  DOM_ELEMENT_NOT_FOUND: 'DOM_001',
  DOM_PERMISSION_DENIED: 'DOM_002',
  DOM_SAME_ORIGIN_VIOLATION: 'DOM_003',
  DOM_CAPTURE_FAILED: 'DOM_004',

  // システムエラー
  SYSTEM_UNKNOWN: 'SYS_001',
  SYSTEM_BROWSER_UNSUPPORTED: 'SYS_002',
  SYSTEM_MEMORY_INSUFFICIENT: 'SYS_003',
  SYSTEM_FEATURE_UNAVAILABLE: 'SYS_004',

  // ユーザー入力エラー
  USER_INVALID_URL: 'USER_001',
  USER_INVALID_VARIABLE: 'USER_002',
  USER_INVALID_CONDITION: 'USER_003',
  USER_OPERATION_CANCELLED: 'USER_004',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================================
// エラーファクトリー
// ============================================================================

class PLAINERErrorFactory {
  private generateId(): UUID {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as UUID;
  }

  create(
    category: ErrorCategory,
    severity: ErrorSeverity,
    code: ErrorCode,
    message: string,
    options: {
      originalError?: Error;
      context?: ErrorContext;
      userMessage?: string;
      recoveryAction?: string;
      documentationUrl?: string;
    } = {}
  ): PLAINERError {
    return {
      id: this.generateId(),
      category,
      severity,
      code,
      message,
      timestamp: new Date(),
      ...options,
    };
  }

  // 便利メソッド
  validation(
    code: ErrorCode,
    message: string,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      code,
      message,
      {
        ...options,
        userMessage:
          options.userMessage || 'Please check your input and try again.',
      }
    );
  }

  network(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      code,
      message,
      {
        originalError,
        ...options,
        userMessage:
          options.userMessage ||
          'Network error occurred. Please check your connection.',
      }
    );
  }

  storage(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.STORAGE,
      ErrorSeverity.HIGH,
      code,
      message,
      {
        originalError,
        ...options,
        userMessage:
          options.userMessage ||
          'Storage error occurred. Your data may not be saved.',
      }
    );
  }

  fileProcessing(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.FILE_PROCESSING,
      ErrorSeverity.MEDIUM,
      code,
      message,
      {
        originalError,
        ...options,
        userMessage:
          options.userMessage || 'File processing failed. Please try again.',
      }
    );
  }

  domManipulation(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.DOM_MANIPULATION,
      ErrorSeverity.MEDIUM,
      code,
      message,
      {
        originalError,
        ...options,
        userMessage:
          options.userMessage ||
          'DOM operation failed due to browser restrictions.',
      }
    );
  }

  system(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      code,
      message,
      {
        originalError,
        ...options,
        userMessage:
          options.userMessage ||
          'A system error occurred. Please refresh the page.',
      }
    );
  }

  userInput(
    code: ErrorCode,
    message: string,
    options: { context?: ErrorContext; userMessage?: string } = {}
  ): PLAINERError {
    return this.create(
      ErrorCategory.USER_INPUT,
      ErrorSeverity.LOW,
      code,
      message,
      {
        ...options,
        userMessage:
          options.userMessage || 'Invalid input. Please check your entry.',
      }
    );
  }
}

export const ErrorFactory = new PLAINERErrorFactory();

// ============================================================================
// エラーハンドラー
// ============================================================================

export type ErrorHandler = (error: PLAINERError) => void;

class ErrorHandlerManager {
  private handlers: Set<ErrorHandler> = new Set();
  private errorHistory: PLAINERError[] = [];
  private maxHistorySize = 100;

  addHandler(handler: ErrorHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  handle(error: PLAINERError): void {
    // エラー履歴に追加
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // ログ出力
    this.logError(error);

    // 全ハンドラーに通知
    this.handlers.forEach((handler) => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    });
  }

  private logError(error: PLAINERError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.category}:${error.code}] ${error.message}`;

    console.groupCollapsed(`${logLevel} ${logMessage}`);
    console.log('Error Details:', {
      id: error.id,
      category: error.category,
      severity: error.severity,
      code: error.code,
      timestamp: error.timestamp,
      context: error.context,
    });

    if (error.originalError) {
      console.log('Original Error:', error.originalError);
    }

    console.groupEnd();
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return '📝';
      case ErrorSeverity.MEDIUM:
        return '⚠️';
      case ErrorSeverity.HIGH:
        return '🚨';
      case ErrorSeverity.CRITICAL:
        return '💥';
      default:
        return '❓';
    }
  }

  getErrorHistory(): readonly PLAINERError[] {
    return [...this.errorHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  getErrorsByCategory(category: ErrorCategory): readonly PLAINERError[] {
    return this.errorHistory.filter((error) => error.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): readonly PLAINERError[] {
    return this.errorHistory.filter((error) => error.severity === severity);
  }
}

export const errorHandler = new ErrorHandlerManager();

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 安全な非同期実行ヘルパー
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<{ data?: T; error?: PLAINERError }> {
  try {
    const data = await operation();
    return { data };
  } catch (originalError) {
    const error = ErrorFactory.system(
      ERROR_CODES.SYSTEM_UNKNOWN,
      'Async operation failed',
      originalError as Error,
      { context }
    );
    errorHandler.handle(error);
    return { error };
  }
}

/**
 * 安全な同期実行ヘルパー
 */
export function safeSync<T>(
  operation: () => T,
  context?: ErrorContext
): { data?: T; error?: PLAINERError } {
  try {
    const data = operation();
    return { data };
  } catch (originalError) {
    const error = ErrorFactory.system(
      ERROR_CODES.SYSTEM_UNKNOWN,
      'Sync operation failed',
      originalError as Error,
      { context }
    );
    errorHandler.handle(error);
    return { error };
  }
}

/**
 * エラー境界HOC用のエラー変換
 */
export function convertToSystemError(
  error: Error,
  context?: ErrorContext
): PLAINERError {
  // 既にPLAINERErrorの場合はそのまま返す
  if ('category' in error && 'severity' in error) {
    return error as PLAINERError;
  }

  return ErrorFactory.system(
    ERROR_CODES.SYSTEM_UNKNOWN,
    error.message || 'Unknown system error',
    error,
    { context }
  );
}

/**
 * コンポーネント用エラーハンドリングフック
 */
export function useErrorHandler() {
  const handleError = (error: PLAINERError | Error, context?: ErrorContext) => {
    const plainError =
      error instanceof Error ? convertToSystemError(error, context) : error;

    errorHandler.handle(plainError);
  };

  return { handleError, errorHistory: errorHandler.getErrorHistory() };
}

// ============================================================================
// バリデーションヘルパー
// ============================================================================

export const Validators = {
  required: (value: any, fieldName: string): PLAINERError | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return ErrorFactory.validation(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD,
        `${fieldName} is required`,
        { userMessage: `Please enter a ${fieldName.toLowerCase()}.` }
      );
    }
    return null;
  },

  url: (value: string, fieldName: string = 'URL'): PLAINERError | null => {
    try {
      new URL(value);
      return null;
    } catch {
      return ErrorFactory.userInput(
        ERROR_CODES.USER_INVALID_URL,
        `Invalid URL format: ${value}`,
        { userMessage: `Please enter a valid ${fieldName.toLowerCase()}.` }
      );
    }
  },

  range: (
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): PLAINERError | null => {
    if (value < min || value > max) {
      return ErrorFactory.validation(
        ERROR_CODES.VALIDATION_OUT_OF_RANGE,
        `${fieldName} must be between ${min} and ${max}`,
        { userMessage: `${fieldName} must be between ${min} and ${max}.` }
      );
    }
    return null;
  },

  fileSize: (file: File, maxSizeBytes: number): PLAINERError | null => {
    if (file.size > maxSizeBytes) {
      const maxSizeMB = maxSizeBytes / (1024 * 1024);
      return ErrorFactory.fileProcessing(
        ERROR_CODES.FILE_TOO_LARGE,
        `File size ${file.size} exceeds limit ${maxSizeBytes}`,
        undefined,
        { userMessage: `File is too large. Maximum size is ${maxSizeMB}MB.` }
      );
    }
    return null;
  },

  fileType: (file: File, allowedTypes: string[]): PLAINERError | null => {
    if (!allowedTypes.includes(file.type)) {
      return ErrorFactory.fileProcessing(
        ERROR_CODES.FILE_UNSUPPORTED_FORMAT,
        `Unsupported file type: ${file.type}`,
        undefined,
        {
          userMessage: `File type not supported. Allowed types: ${allowedTypes.join(', ')}.`,
        }
      );
    }
    return null;
  },
};
