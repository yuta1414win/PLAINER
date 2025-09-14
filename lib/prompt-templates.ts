import { PromptTemplate } from './types';

// システム既定のプロンプトテンプレート
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'ui-improvement',
    name: 'UI改善提案',
    description: '見た目とユーザビリティを改善する提案を生成します',
    category: 'ui_improvement',
    prompt: `以下の画像のUIについて、見た目とユーザビリティの改善提案をしてください。

改善点について、以下の観点から分析してください：
- レイアウトと視覚的階層
- カラーパレットと一貫性
- タイポグラフィの読みやすさ
- ボタンやリンクの分かりやすさ
- 余白とバランス

提案は具体的で実装可能なHTMLとTailwind CSSのコードで提示してください。`,
    isSystem: true,
  },
  {
    id: 'accessibility',
    name: 'アクセシビリティ改善',
    description: 'WCAG準拠のアクセシブルなWebページを作成します',
    category: 'accessibility',
    prompt: `この画像をもとに、アクセシビリティに配慮したHTMLを生成してください。

以下の要件を満たしてください：
- 適切なセマンティックHTML要素の使用
- ARIAラベルとロールの適切な設定
- キーボードナビゲーションの対応
- スクリーンリーダー対応
- カラーコントラストの確保（WCAG AA準拠）
- フォーカス表示の明確化

実装は HTML + Tailwind CSS で提供してください。`,
    isSystem: true,
  },
  {
    id: 'responsive',
    name: 'レスポンシブ対応',
    description: 'モバイルファーストのレスポンシブデザインを実装します',
    category: 'responsive',
    prompt: `この画像をもとに、レスポンシブデザインに対応したHTMLを作成してください。

要求事項：
- モバイルファーストアプローチ
- Tailwind CSSのレスポンシブユーティリティを活用
- タブレット（md:）とデスクトップ（lg:, xl:）での最適化
- タッチフレンドリーなUI要素（44px以上のタップターゲット）
- 可変グリッドレイアウトの使用
- 画像の適応的表示

実装コードを提供してください。`,
    isSystem: true,
  },
  {
    id: 'seo-optimization',
    name: 'SEO最適化',
    description: '検索エンジン最適化されたHTMLを生成します',
    category: 'seo',
    prompt: `この画像の内容をもとに、SEOに最適化されたHTMLを作成してください。

含める要素：
- 適切なタイトルタグとメタディスクリプション
- 構造化データ（JSON-LD）
- セマンティックなHTML5要素
- 適切な見出し階層（h1-h6）
- alt属性とtitle属性の適切な設定
- OpenGraphタグとTwitterカード対応
- 検索エンジンフレンドリーなURL構造

実装コードを HTML + Tailwind CSS で提供してください。`,
    isSystem: true,
  },
  {
    id: 'performance',
    name: 'パフォーマンス最適化',
    description: '高速化とパフォーマンス向上のための実装を行います',
    category: 'performance',
    prompt: `この画像をもとに、パフォーマンスに最適化されたHTMLを作成してください。

最適化項目：
- 重要コンテンツの優先読み込み
- 画像の遅延読み込み（lazy loading）
- Critical CSS の分離
- 不要なJavaScriptの削除
- ファイルサイズの最小化
- WebP画像の活用
- プリロードとプリフェッチの適切な使用

HTML + Tailwind CSS での実装コードを提供してください。`,
    isSystem: true,
  },
  {
    id: 'semantic-structure',
    name: '構造とセマンティクス',
    description: '意味のある HTML 構造を構築します',
    category: 'structure',
    prompt: `この画像の内容を分析し、セマンティックで意味のあるHTML構造を作成してください。

重視する点：
- 論理的な情報階層
- 適切なHTML5セマンティック要素の選択
- ランドマークとリージョンの明確化
- ナビゲーションとコンテンツの分離
- 文書構造の一貫性
- マイクロデータの適用（可能な場合）

実装を HTML + Tailwind CSS で提供してください。`,
    isSystem: true,
  },
];

// プロンプトテンプレート管理クラス
export class PromptTemplateManager {
  private templates: PromptTemplate[] = [];

  constructor() {
    this.loadTemplates();
  }

  // ローカルストレージからテンプレートを読み込み
  private loadTemplates(): void {
    try {
      const stored = localStorage.getItem('prompt_templates');
      if (stored) {
        const userTemplates = JSON.parse(stored);
        this.templates = [...DEFAULT_PROMPT_TEMPLATES, ...userTemplates];
      } else {
        this.templates = [...DEFAULT_PROMPT_TEMPLATES];
      }
    } catch (error) {
      console.error('Failed to load prompt templates:', error);
      this.templates = [...DEFAULT_PROMPT_TEMPLATES];
    }
  }

  // テンプレートをローカルストレージに保存
  private saveTemplates(): void {
    try {
      const userTemplates = this.templates.filter((t) => !t.isSystem);
      localStorage.setItem('prompt_templates', JSON.stringify(userTemplates));
    } catch (error) {
      console.error('Failed to save prompt templates:', error);
    }
  }

  // 全テンプレートを取得
  getTemplates(): PromptTemplate[] {
    return [...this.templates];
  }

  // カテゴリ別でテンプレートを取得
  getTemplatesByCategory(
    category: PromptTemplate['category']
  ): PromptTemplate[] {
    return this.templates.filter((t) => t.category === category);
  }

  // IDでテンプレートを取得
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  // 新しいテンプレートを追加
  addTemplate(template: Omit<PromptTemplate, 'id'>): PromptTemplate {
    const newTemplate: PromptTemplate = {
      ...template,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isSystem: false,
    };

    this.templates.push(newTemplate);
    this.saveTemplates();
    return newTemplate;
  }

  // テンプレートを更新
  updateTemplate(
    id: string,
    updates: Partial<PromptTemplate>
  ): PromptTemplate | null {
    const index = this.templates.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const template = this.templates[index];
    // システムテンプレートは編集不可
    if (template.isSystem) return null;

    this.templates[index] = { ...template, ...updates, id };
    this.saveTemplates();
    return this.templates[index];
  }

  // テンプレートを削除
  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex((t) => t.id === id);
    if (index === -1) return false;

    const template = this.templates[index];
    // システムテンプレートは削除不可
    if (template.isSystem) return false;

    this.templates.splice(index, 1);
    this.saveTemplates();
    return true;
  }

  // プロンプト内の変数を置換
  processPrompt(templateId: string, variables: Record<string, string>): string {
    const template = this.getTemplate(templateId);
    if (!template) return '';

    let prompt = template.prompt;

    // 変数置換 {{variableName}} -> value
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, value);
    });

    return prompt;
  }

  // テンプレートの変数を抽出
  extractVariables(prompt: string): string[] {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(prompt)) !== null) {
      if (!variables.includes(match[1].trim())) {
        variables.push(match[1].trim());
      }
    }

    return variables;
  }
}

// シングルトンインスタンス
export const promptTemplateManager = new PromptTemplateManager();
