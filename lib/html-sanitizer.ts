import { toast } from 'sonner';

// 許可されたHTMLタグのホワイトリスト
const ALLOWED_TAGS = [
  // 基本構造
  'html',
  'head',
  'body',
  'title',
  'meta',
  'link',
  'style',
  // コンテンツセクション
  'article',
  'section',
  'nav',
  'aside',
  'header',
  'footer',
  'main',
  'div',
  'span',
  // テキストコンテンツ
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'blockquote',
  'pre',
  'code',
  // インライン要素
  'a',
  'strong',
  'b',
  'em',
  'i',
  'mark',
  'small',
  'sub',
  'sup',
  'time',
  // リスト
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  // テーブル
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'caption',
  'colgroup',
  'col',
  // フォーム
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'optgroup',
  'label',
  'fieldset',
  'legend',
  // メディア
  'img',
  'picture',
  'source',
  'svg',
  'canvas',
  // その他
  'br',
  'hr',
  'wbr',
] as const;

// 許可されたHTML属性のホワイトリスト
const ALLOWED_ATTRIBUTES = [
  // グローバル属性
  'id',
  'class',
  'style',
  'title',
  'lang',
  'dir',
  'tabindex',
  // アクセシビリティ
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-hidden',
  'aria-expanded',
  'aria-current',
  'aria-live',
  'aria-atomic',
  // データ属性（data-*は別途処理）
  // リンク・メディア
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'width',
  'height',
  'loading',
  'decoding',
  // フォーム
  'type',
  'name',
  'value',
  'placeholder',
  'required',
  'disabled',
  'readonly',
  'checked',
  'selected',
  'for',
  'form',
  'min',
  'max',
  'step',
  // テーブル
  'colspan',
  'rowspan',
  'scope',
  // その他
  'download',
  'media',
  'sizes',
  'srcset',
] as const;

// 危険なプロトコルのブラックリスト
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'ftp:',
] as const;

// 危険なスタイルプロパティのブラックリスト
const DANGEROUS_STYLES = [
  'behavior',
  'expression',
  'binding',
  'moz-binding',
  'javascript',
  'vbscript',
  'livescript',
  'mocha',
  'charset',
  'url(',
] as const;

interface SanitizeOptions {
  allowExternalLinks?: boolean;
  allowInlineStyles?: boolean;
  allowDataAttributes?: boolean;
  allowCustomTags?: string[];
  allowCustomAttributes?: string[];
  removeComments?: boolean;
  maxContentLength?: number;
}

interface SanitizeResult {
  html: string;
  warnings: string[];
  removedElements: string[];
  modifiedAttributes: string[];
}

export class HTMLSanitizer {
  private options: Required<SanitizeOptions>;
  private warnings: string[] = [];
  private removedElements: string[] = [];
  private modifiedAttributes: string[] = [];

  constructor(options: SanitizeOptions = {}) {
    this.options = {
      allowExternalLinks: false,
      allowInlineStyles: true,
      allowDataAttributes: true,
      allowCustomTags: [],
      allowCustomAttributes: [],
      removeComments: true,
      maxContentLength: 100000, // 100KB
      ...options,
    };
  }

  /**
   * HTMLコンテンツをサニタイズする
   */
  sanitize(html: string): SanitizeResult {
    this.resetState();

    try {
      // 基本的な検証
      this.validateInput(html);

      // DOMパーサーを使用してHTMLを解析
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // パースエラーをチェック
      const parseErrors = doc.querySelector('parsererror');
      if (parseErrors) {
        throw new Error('HTMLの構文エラーが検出されました');
      }

      // サニタイズ処理
      this.sanitizeDocument(doc);

      // 結果を取得
      const sanitizedHTML = this.getDocumentHTML(doc);

      return {
        html: sanitizedHTML,
        warnings: this.warnings,
        removedElements: this.removedElements,
        modifiedAttributes: this.modifiedAttributes,
      };
    } catch (error) {
      throw new Error(
        `HTMLサニタイズに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 状態をリセット
   */
  private resetState(): void {
    this.warnings = [];
    this.removedElements = [];
    this.modifiedAttributes = [];
  }

  /**
   * 入力の基本検証
   */
  private validateInput(html: string): void {
    if (typeof html !== 'string') {
      throw new Error('HTMLは文字列である必要があります');
    }

    if (html.length > this.options.maxContentLength) {
      throw new Error(
        `HTMLコンテンツが最大長（${this.options.maxContentLength}文字）を超えています`
      );
    }

    // 危険なパターンの事前チェック
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /<link[^>]*href[^>]*javascript:/i,
      /on\w+\s*=/i, // イベントハンドラ
    ];

    dangerousPatterns.forEach((pattern) => {
      if (pattern.test(html)) {
        this.warnings.push('潜在的に危険なHTMLパターンが検出されました');
      }
    });
  }

  /**
   * ドキュメント全体をサニタイズ
   */
  private sanitizeDocument(doc: Document): void {
    // コメントを削除
    if (this.options.removeComments) {
      this.removeComments(doc);
    }

    // 全要素を再帰的にサニタイズ
    this.sanitizeElement(doc.documentElement);
  }

  /**
   * コメントノードを削除
   */
  private removeComments(doc: Document): void {
    const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT, null);

    const comments: Comment[] = [];
    let node;
    while ((node = walker.nextNode())) {
      comments.push(node as Comment);
    }

    comments.forEach((comment) => {
      comment.parentNode?.removeChild(comment);
    });

    if (comments.length > 0) {
      this.warnings.push(`${comments.length}個のコメントを削除しました`);
    }
  }

  /**
   * 要素を再帰的にサニタイズ
   */
  private sanitizeElement(element: Element): void {
    const tagName = element.tagName.toLowerCase();
    const allowedTags = [...ALLOWED_TAGS, ...this.options.allowCustomTags];

    // タグが許可されていない場合は削除
    if (!allowedTags.includes(tagName as any)) {
      this.removeElement(element, `許可されていないタグ: ${tagName}`);
      return;
    }

    // 属性をサニタイズ
    this.sanitizeAttributes(element);

    // 子要素を再帰的に処理
    const children = Array.from(element.children);
    children.forEach((child) => this.sanitizeElement(child));
  }

  /**
   * 要素の属性をサニタイズ
   */
  private sanitizeAttributes(element: Element): void {
    const attributes = Array.from(element.attributes);
    const allowedAttrs = [
      ...ALLOWED_ATTRIBUTES,
      ...this.options.allowCustomAttributes,
    ];

    attributes.forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      // data-属性の処理
      if (name.startsWith('data-')) {
        if (!this.options.allowDataAttributes) {
          element.removeAttribute(name);
          this.modifiedAttributes.push(`data属性を削除: ${name}`);
        }
        return;
      }

      // 許可されていない属性は削除
      if (!allowedAttrs.includes(name as any)) {
        element.removeAttribute(name);
        this.modifiedAttributes.push(`許可されていない属性を削除: ${name}`);
        return;
      }

      // 属性値をサニタイズ
      const sanitizedValue = this.sanitizeAttributeValue(name, value);
      if (sanitizedValue !== value) {
        element.setAttribute(name, sanitizedValue);
        this.modifiedAttributes.push(`属性値を修正: ${name}`);
      }
    });
  }

  /**
   * 属性値をサニタイズ
   */
  private sanitizeAttributeValue(name: string, value: string): string {
    // URL系属性の処理
    if (['href', 'src', 'action'].includes(name)) {
      return this.sanitizeURL(value, name === 'href');
    }

    // style属性の処理
    if (name === 'style' && this.options.allowInlineStyles) {
      return this.sanitizeStyle(value);
    } else if (name === 'style' && !this.options.allowInlineStyles) {
      return '';
    }

    // イベントハンドラの削除
    if (name.startsWith('on')) {
      this.warnings.push(`イベントハンドラを削除: ${name}`);
      return '';
    }

    // 基本的なエスケープ
    return this.escapeAttributeValue(value);
  }

  /**
   * URLをサニタイズ
   */
  private sanitizeURL(url: string, isLink = false): string {
    if (!url || url.trim() === '') return '';

    const trimmedUrl = url.trim();

    // 危険なプロトコルをチェック
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (trimmedUrl.toLowerCase().startsWith(protocol)) {
        this.warnings.push(`危険なプロトコルを検出: ${protocol}`);
        return '#';
      }
    }

    // 外部リンクの処理
    if (isLink && !this.options.allowExternalLinks) {
      try {
        const parsedUrl = new URL(trimmedUrl, window.location.href);
        if (parsedUrl.origin !== window.location.origin) {
          this.warnings.push('外部リンクを内部リンクに変換');
          return '#';
        }
      } catch {
        // 相対URLの場合はそのまま許可
      }
    }

    return trimmedUrl;
  }

  /**
   * スタイル属性をサニタイズ
   */
  private sanitizeStyle(style: string): string {
    if (!style || style.trim() === '') return '';

    let sanitizedStyle = style.toLowerCase();

    // 危険なスタイルプロパティを削除
    for (const dangerous of DANGEROUS_STYLES) {
      if (sanitizedStyle.includes(dangerous)) {
        this.warnings.push(`危険なスタイルを検出: ${dangerous}`);
        sanitizedStyle = sanitizedStyle.replace(
          new RegExp(dangerous, 'gi'),
          ''
        );
      }
    }

    // URLを含むスタイルの処理
    sanitizedStyle = sanitizedStyle.replace(
      /url\s*\(\s*([^)]+)\s*\)/gi,
      (match, url) => {
        const cleanUrl = url.replace(/['"`]/g, '').trim();
        const sanitizedUrl = this.sanitizeURL(cleanUrl);
        return `url('${sanitizedUrl}')`;
      }
    );

    return sanitizedStyle;
  }

  /**
   * 属性値をエスケープ
   */
  private escapeAttributeValue(value: string): string {
    return value
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * 要素を削除
   */
  private removeElement(element: Element, reason: string): void {
    this.removedElements.push(reason);
    element.parentNode?.removeChild(element);
  }

  /**
   * ドキュメントからHTMLを取得
   */
  private getDocumentHTML(doc: Document): string {
    return doc.documentElement.outerHTML;
  }
}

/**
 * HTMLをサニタイズするユーティリティ関数
 */
export function sanitizeHTML(
  html: string,
  options?: SanitizeOptions
): SanitizeResult {
  const sanitizer = new HTMLSanitizer(options);
  return sanitizer.sanitize(html);
}

/**
 * 安全なHTML生成のためのヘルパー
 */
export function createSafeHTML(
  html: string,
  options?: SanitizeOptions
): string {
  try {
    const result = sanitizeHTML(html, options);

    // 警告がある場合は通知
    if (result.warnings.length > 0) {
      console.warn('HTML サニタイズ警告:', result.warnings);
      toast.warning(`HTMLを安全化しました (${result.warnings.length}件の警告)`);
    }

    // 削除された要素がある場合は通知
    if (result.removedElements.length > 0) {
      console.warn('削除された要素:', result.removedElements);
      toast.info(`${result.removedElements.length}個の要素を削除しました`);
    }

    return result.html;
  } catch (error) {
    console.error('HTMLサニタイズエラー:', error);
    toast.error('HTMLの安全化に失敗しました');
    return '';
  }
}

/**
 * Gemini生成コンテンツ専用のサニタイザ
 */
export function sanitizeGeminiOutput(html: string): SanitizeResult {
  return sanitizeHTML(html, {
    allowExternalLinks: false,
    allowInlineStyles: true,
    allowDataAttributes: false,
    allowCustomTags: [],
    allowCustomAttributes: ['data-testid'], // テスト用のみ許可
    removeComments: true,
    maxContentLength: 50000, // 50KB制限
  });
}

/**
 * プレビュー表示用のサニタイザ
 */
export function sanitizeForPreview(html: string): SanitizeResult {
  return sanitizeHTML(html, {
    allowExternalLinks: true,
    allowInlineStyles: true,
    allowDataAttributes: true,
    allowCustomTags: ['custom-element'],
    allowCustomAttributes: ['data-*'],
    removeComments: false,
    maxContentLength: 200000, // 200KB制限
  });
}
