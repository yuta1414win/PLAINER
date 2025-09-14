export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'url' | 'image' | 'color';
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}

export interface TemplateStep {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  hotspots?: TemplateHotspot[];
  narrationText?: string;
  videoUrl?: string;
  duration?: number;
}

export interface TemplateHotspot {
  id: string;
  type: 'rect' | 'circle' | 'polygon';
  coords: number[];
  label?: string;
  action?: 'next' | 'prev' | 'goto' | 'external';
  target?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  thumbnail?: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  steps: TemplateStep[];
  variables?: TemplateVariable[];
  settings?: TemplateSettings;
  isBuiltin?: boolean;
  isPublic?: boolean;
  usage?: number;
  rating?: number;
}

export interface TemplateSettings {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  borderRadius?: string;
  showProgress?: boolean;
  showNavigation?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

export type TemplateCategory =
  | 'product-demo'
  | 'onboarding'
  | 'tutorial'
  | 'faq'
  | 'saas'
  | 'ecommerce'
  | 'education'
  | 'enterprise'
  | 'custom';

export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private customTemplates: Map<string, Template> = new Map();

  constructor() {
    this.loadBuiltinTemplates();
    this.loadCustomTemplates();
  }

  // ビルトインテンプレートの読み込み
  private loadBuiltinTemplates(): void {
    const builtinTemplates = this.getBuiltinTemplates();
    builtinTemplates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  // カスタムテンプレートの読み込み（LocalStorageから）
  private loadCustomTemplates(): void {
    const stored = localStorage.getItem('custom_templates');
    if (stored) {
      try {
        const templates = JSON.parse(stored) as Template[];
        templates.forEach((template) => {
          this.customTemplates.set(template.id, template);
        });
      } catch (error) {
        console.error('Failed to load custom templates:', error);
      }
    }
  }

  // カスタムテンプレートの保存
  private saveCustomTemplates(): void {
    const templates = Array.from(this.customTemplates.values());
    localStorage.setItem('custom_templates', JSON.stringify(templates));
  }

  // テンプレート取得
  getTemplate(id: string): Template | null {
    return this.templates.get(id) || this.customTemplates.get(id) || null;
  }

  // 全テンプレート取得
  getAllTemplates(): Template[] {
    return [
      ...Array.from(this.templates.values()),
      ...Array.from(this.customTemplates.values()),
    ];
  }

  // カテゴリ別テンプレート取得
  getTemplatesByCategory(category: TemplateCategory): Template[] {
    return this.getAllTemplates().filter((t) => t.category === category);
  }

  // タグでフィルタリング
  getTemplatesByTags(tags: string[]): Template[] {
    return this.getAllTemplates().filter((template) =>
      tags.some((tag) => template.tags.includes(tag))
    );
  }

  // テンプレート検索
  searchTemplates(query: string): Template[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTemplates().filter(
      (template) =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.description.toLowerCase().includes(lowercaseQuery) ||
        template.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // カスタムテンプレート作成
  createCustomTemplate(
    template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
  ): Template {
    const newTemplate: Template = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isBuiltin: false,
    };

    this.customTemplates.set(newTemplate.id, newTemplate);
    this.saveCustomTemplates();
    return newTemplate;
  }

  // テンプレート更新
  updateTemplate(id: string, updates: Partial<Template>): Template | null {
    const template = this.customTemplates.get(id);
    if (!template) return null;

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.customTemplates.set(id, updatedTemplate);
    this.saveCustomTemplates();
    return updatedTemplate;
  }

  // テンプレート削除
  deleteTemplate(id: string): boolean {
    const deleted = this.customTemplates.delete(id);
    if (deleted) {
      this.saveCustomTemplates();
    }
    return deleted;
  }

  // テンプレート複製
  duplicateTemplate(id: string, newName?: string): Template | null {
    const original = this.getTemplate(id);
    if (!original) return null;

    const duplicate = {
      ...original,
      name: newName || `${original.name} (コピー)`,
      isBuiltin: false,
    };

    return this.createCustomTemplate(duplicate);
  }

  // 変数の置換
  applyVariables(template: Template, values: Record<string, string>): Template {
    const processedTemplate = JSON.parse(JSON.stringify(template)) as Template;

    // ステップ内のテキストを変数置換
    processedTemplate.steps = processedTemplate.steps.map((step) => {
      let title = step.title;
      let description = step.description;
      let narrationText = step.narrationText || '';

      Object.entries(values).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), value);
        description = description.replace(new RegExp(placeholder, 'g'), value);
        narrationText = narrationText.replace(
          new RegExp(placeholder, 'g'),
          value
        );
      });

      return {
        ...step,
        title,
        description,
        narrationText: narrationText || undefined,
      };
    });

    return processedTemplate;
  }

  // テンプレートのエクスポート
  exportTemplate(id: string): string | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    return JSON.stringify(template, null, 2);
  }

  // テンプレートのインポート
  importTemplate(jsonString: string): Template | null {
    try {
      const template = JSON.parse(jsonString) as Template;
      template.id = this.generateId();
      template.isBuiltin = false;
      template.createdAt = new Date();
      template.updatedAt = new Date();

      this.customTemplates.set(template.id, template);
      this.saveCustomTemplates();
      return template;
    } catch (error) {
      console.error('Failed to import template:', error);
      return null;
    }
  }

  // ID生成
  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ビルトインテンプレートの定義
  private getBuiltinTemplates(): Template[] {
    return [
      {
        id: 'product-demo-basic',
        name: '製品デモ（基本）',
        description: 'シンプルな5ステップの製品デモテンプレート',
        category: 'product-demo',
        tags: ['デモ', '製品紹介', 'シンプル'],
        thumbnail: '/templates/product-demo.png',
        author: 'PLAINER Team',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltin: true,
        isPublic: true,
        usage: 1250,
        rating: 4.5,
        steps: [
          {
            id: 'step1',
            title: 'ようこそ {{productName}} へ',
            description: '{{productName}} の主要機能をご紹介します',
            narrationText: 'こんにちは。{{productName}} の製品デモへようこそ。',
          },
          {
            id: 'step2',
            title: '主要機能',
            description: '{{feature1}} を使って作業を効率化',
            narrationText: '最初に、{{feature1}} についてご説明します。',
          },
          {
            id: 'step3',
            title: 'ダッシュボード',
            description: '直感的なインターフェースで全体を把握',
            narrationText:
              'ダッシュボードでは、重要な情報を一目で確認できます。',
          },
          {
            id: 'step4',
            title: '分析機能',
            description: 'データを可視化して意思決定をサポート',
            narrationText:
              '強力な分析機能により、データに基づいた判断が可能です。',
          },
          {
            id: 'step5',
            title: '今すぐ始める',
            description: '{{ctaText}}',
            narrationText:
              '準備はできましたか？今すぐ {{productName}} を始めましょう。',
          },
        ],
        variables: [
          {
            key: 'productName',
            label: '製品名',
            type: 'text',
            defaultValue: '製品名',
            required: true,
          },
          {
            key: 'feature1',
            label: '主要機能',
            type: 'text',
            defaultValue: '自動化機能',
            required: true,
          },
          {
            key: 'ctaText',
            label: 'CTA テキスト',
            type: 'text',
            defaultValue: '無料トライアルを開始',
            required: false,
          },
        ],
        settings: {
          primaryColor: '#3B82F6',
          showProgress: true,
          showNavigation: true,
          autoPlay: false,
        },
      },
      {
        id: 'onboarding-saas',
        name: 'SaaSオンボーディング',
        description: '新規ユーザー向けの7ステップオンボーディング',
        category: 'onboarding',
        tags: ['オンボーディング', 'SaaS', '初期設定'],
        thumbnail: '/templates/onboarding.png',
        author: 'PLAINER Team',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltin: true,
        isPublic: true,
        usage: 890,
        rating: 4.7,
        steps: [
          {
            id: 'welcome',
            title: 'アカウント作成完了',
            description: 'ようこそ！セットアップを始めましょう',
          },
          {
            id: 'profile',
            title: 'プロフィール設定',
            description: '基本情報を入力してください',
          },
          {
            id: 'workspace',
            title: 'ワークスペース作成',
            description: 'チーム用のワークスペースを作成',
          },
          {
            id: 'invite',
            title: 'チームメンバーを招待',
            description: '同僚を招待して共同作業を開始',
          },
          {
            id: 'integration',
            title: '外部ツール連携',
            description: '使用中のツールと連携',
          },
          {
            id: 'customize',
            title: 'カスタマイズ',
            description: '好みに合わせて設定を調整',
          },
          {
            id: 'complete',
            title: 'セットアップ完了',
            description: '準備完了！使い始めましょう',
          },
        ],
        settings: {
          primaryColor: '#10B981',
          showProgress: true,
          showNavigation: true,
          autoPlay: true,
        },
      },
      {
        id: 'tutorial-basic',
        name: '操作チュートリアル',
        description: '基本操作を学ぶ10ステップチュートリアル',
        category: 'tutorial',
        tags: ['チュートリアル', '操作説明', '学習'],
        thumbnail: '/templates/tutorial.png',
        author: 'PLAINER Team',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltin: true,
        isPublic: true,
        usage: 650,
        rating: 4.3,
        steps: Array.from({ length: 10 }, (_, i) => ({
          id: `step${i + 1}`,
          title: `ステップ ${i + 1}`,
          description: `操作説明 ${i + 1}`,
        })),
        settings: {
          primaryColor: '#F59E0B',
          showProgress: true,
          showNavigation: true,
          autoPlay: false,
        },
      },
      {
        id: 'faq-support',
        name: 'FAQ/トラブルシューティング',
        description: 'よくある質問と解決方法',
        category: 'faq',
        tags: ['FAQ', 'サポート', 'ヘルプ'],
        thumbnail: '/templates/faq.png',
        author: 'PLAINER Team',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltin: true,
        isPublic: true,
        usage: 430,
        rating: 4.6,
        steps: [
          {
            id: 'q1',
            title: 'ログインできない場合',
            description: 'パスワードリセットの手順',
          },
          {
            id: 'q2',
            title: 'データが表示されない',
            description: '同期設定の確認方法',
          },
          {
            id: 'q3',
            title: 'エラーが発生した場合',
            description: 'エラーレポートの送信方法',
          },
        ],
        settings: {
          primaryColor: '#EF4444',
          showProgress: false,
          showNavigation: true,
          autoPlay: false,
        },
      },
    ];
  }
}
