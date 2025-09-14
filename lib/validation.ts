/**
 * 統一バリデーションシステム
 */

import {
  FILE_SIZE_LIMITS,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_IMAGE_EXTENSIONS,
  VALIDATION,
  REGEX_PATTERNS,
} from './constants';
import { ValidationError } from './error-handler';

// バリデーション結果の型
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ファイルバリデーション
export class FileValidator {
  static validateImage(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ファイルサイズチェック
    if (file.size > FILE_SIZE_LIMITS.IMAGE_MAX_SIZE) {
      errors.push(
        `ファイルサイズが${FILE_SIZE_LIMITS.IMAGE_MAX_SIZE / 1024 / 1024}MBを超えています`
      );
    }

    // ファイル形式チェック
    if (!SUPPORTED_IMAGE_FORMATS.includes(file.type as any)) {
      errors.push('サポートされていない画像形式です');
    }

    // ファイル拡張子チェック
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(extension as any)) {
      warnings.push('ファイル拡張子が一般的でない可能性があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateExportFile(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ファイルサイズチェック
    if (file.size > FILE_SIZE_LIMITS.EXPORT_MAX_SIZE) {
      errors.push(
        `ファイルサイズが${FILE_SIZE_LIMITS.EXPORT_MAX_SIZE / 1024 / 1024}MBを超えています`
      );
    }

    // JSON形式チェック
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      errors.push('JSONファイルを選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// テキストバリデーション
export class TextValidator {
  static validateProjectName(name: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name || name.trim().length < VALIDATION.PROJECT_NAME_MIN_LENGTH) {
      errors.push('プロジェクト名を入力してください');
    }

    if (name.length > VALIDATION.PROJECT_NAME_MAX_LENGTH) {
      errors.push(
        `プロジェクト名は${VALIDATION.PROJECT_NAME_MAX_LENGTH}文字以内で入力してください`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateStepTitle(title: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!title || title.trim().length < VALIDATION.STEP_TITLE_MIN_LENGTH) {
      errors.push('ステップタイトルを入力してください');
    }

    if (title.length > VALIDATION.STEP_TITLE_MAX_LENGTH) {
      errors.push(
        `ステップタイトルは${VALIDATION.STEP_TITLE_MAX_LENGTH}文字以内で入力してください`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateDescription(description: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (description.length > VALIDATION.DESCRIPTION_MAX_LENGTH) {
      errors.push(
        `説明は${VALIDATION.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateAnnotationText(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (text.length > VALIDATION.ANNOTATION_TEXT_MAX_LENGTH) {
      errors.push(
        `注釈テキストは${VALIDATION.ANNOTATION_TEXT_MAX_LENGTH}文字以内で入力してください`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateHotspotLabel(label: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (label.length > VALIDATION.HOTSPOT_LABEL_MAX_LENGTH) {
      errors.push(
        `ホットスポットラベルは${VALIDATION.HOTSPOT_LABEL_MAX_LENGTH}文字以内で入力してください`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// URLバリデーション
export class URLValidator {
  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!url) {
      errors.push('URLを入力してください');
      return { isValid: false, errors, warnings };
    }

    if (!REGEX_PATTERNS.URL.test(url)) {
      errors.push(
        '有効なURLを入力してください（http://またはhttps://で始まる必要があります）'
      );
    }

    try {
      new URL(url);
    } catch {
      errors.push('URLの形式が正しくありません');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// 色バリデーション
export class ColorValidator {
  static validateHexColor(color: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!color) {
      errors.push('色を指定してください');
      return { isValid: false, errors, warnings };
    }

    if (!REGEX_PATTERNS.HEX_COLOR.test(color)) {
      errors.push('有効な16進数カラーコードを入力してください（例: #FF0000）');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// 座標バリデーション
export class CoordinateValidator {
  static validateNormalizedCoordinate(
    value: number,
    fieldName: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName}は数値である必要があります`);
      return { isValid: false, errors, warnings };
    }

    if (value < 0 || value > 1) {
      errors.push(`${fieldName}は0から1の間の値である必要があります`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateDimensions(width: number, height: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (width <= 0 || height <= 0) {
      errors.push('幅と高さは0より大きい値である必要があります');
    }

    if (
      width > FILE_SIZE_LIMITS.IMAGE_MAX_DIMENSION ||
      height > FILE_SIZE_LIMITS.IMAGE_MAX_DIMENSION
    ) {
      warnings.push(
        `画像サイズが${FILE_SIZE_LIMITS.IMAGE_MAX_DIMENSION}pxを超えています。パフォーマンスに影響する可能性があります`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// メールバリデーション
export class EmailValidator {
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!email) {
      errors.push('メールアドレスを入力してください');
      return { isValid: false, errors, warnings };
    }

    if (!REGEX_PATTERNS.EMAIL.test(email)) {
      errors.push('有効なメールアドレスを入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// ファイル名バリデーション
export class FilenameValidator {
  static validateSafeFilename(filename: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!filename) {
      errors.push('ファイル名を入力してください');
      return { isValid: false, errors, warnings };
    }

    if (!REGEX_PATTERNS.SAFE_FILENAME.test(filename)) {
      errors.push(
        'ファイル名に使用できない文字が含まれています（英数字、ピリオド、ハイフン、アンダースコアのみ使用可能）'
      );
    }

    if (filename.length > 255) {
      errors.push('ファイル名は255文字以内である必要があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// 統合バリデーター
export class Validator {
  static validate(value: unknown, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const result = rule(value);
      if (!result.isValid) {
        errors.push(...result.errors);
      }
      warnings.push(...result.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static assertValid(
    value: unknown,
    rules: ValidationRule[],
    fieldName?: string
  ): void {
    const result = this.validate(value, rules);
    if (!result.isValid) {
      throw new ValidationError(result.errors[0], fieldName);
    }
  }
}

// バリデーションルールの型
export type ValidationRule = (value: unknown) => ValidationResult;

// よく使用されるバリデーションルール
export const ValidationRules = {
  required:
    (fieldName: string): ValidationRule =>
    (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return {
          isValid: false,
          errors: [`${fieldName}は必須項目です`],
          warnings: [],
        };
      }
      return { isValid: true, errors: [], warnings: [] };
    },

  minLength:
    (min: number, fieldName: string): ValidationRule =>
    (value: unknown) => {
      const str = String(value || '');
      if (str.length < min) {
        return {
          isValid: false,
          errors: [`${fieldName}は${min}文字以上入力してください`],
          warnings: [],
        };
      }
      return { isValid: true, errors: [], warnings: [] };
    },

  maxLength:
    (max: number, fieldName: string): ValidationRule =>
    (value: unknown) => {
      const str = String(value || '');
      if (str.length > max) {
        return {
          isValid: false,
          errors: [`${fieldName}は${max}文字以内で入力してください`],
          warnings: [],
        };
      }
      return { isValid: true, errors: [], warnings: [] };
    },

  pattern:
    (regex: RegExp, fieldName: string, errorMessage: string): ValidationRule =>
    (value: unknown) => {
      const str = String(value || '');
      if (!regex.test(str)) {
        return {
          isValid: false,
          errors: [`${fieldName}: ${errorMessage}`],
          warnings: [],
        };
      }
      return { isValid: true, errors: [], warnings: [] };
    },
};
