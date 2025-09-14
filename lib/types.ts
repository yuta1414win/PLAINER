// ============================================================================
// 基本型定義
// ============================================================================

/** 正規化された座標（0-1の範囲） */
export type NormalizedCoordinate = number & {
  readonly __brand: 'NormalizedCoordinate';
};

/** HEX カラーコード（#付き） */
export type HexColor = string & { readonly __brand: 'HexColor' };

/** UUID v4 形式の文字列 */
export type UUID = string & { readonly __brand: 'UUID' };

/** URL 文字列 */
export type URLString = string & { readonly __brand: 'URLString' };

/** ファイル名として安全な文字列 */
export type SafeFilename = string & { readonly __brand: 'SafeFilename' };

/** ISO 8601 形式の日時文字列 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

// ============================================================================
// テーマ関連
// ============================================================================

export interface Theme {
  readonly primaryColor: HexColor;
  readonly secondaryColor: HexColor;
  readonly accentColor: HexColor;
  readonly backgroundColor: HexColor;
  readonly textColor: HexColor;
  readonly borderColor: HexColor;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly borderRadius: number;
  readonly spacing: number;
}

// ============================================================================
// ジオメトリ関連
// ============================================================================

export interface Point {
  readonly x: NormalizedCoordinate;
  readonly y: NormalizedCoordinate;
}

export interface Size {
  readonly width: NormalizedCoordinate;
  readonly height: NormalizedCoordinate;
}

export interface Rectangle extends Point, Size {}

export interface Circle extends Point {
  readonly radius: NormalizedCoordinate;
}

export type HotspotShape = 'rect' | 'circle' | 'free';

export interface HotspotStyle {
  readonly color?: HexColor;
  readonly borderWidth?: number;
  readonly borderStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface BaseHotspot {
  readonly id: UUID;
  readonly shape: HotspotShape;
  readonly x: NormalizedCoordinate;
  readonly y: NormalizedCoordinate;
  readonly label?: string;
  readonly tooltipText?: string;
  readonly url?: URLString;
  readonly targetStep?: UUID;
  readonly style?: HotspotStyle;
}

export interface RectHotspot extends BaseHotspot {
  readonly shape: 'rect';
  readonly w: NormalizedCoordinate;
  readonly h: NormalizedCoordinate;
}

export interface CircleHotspot extends BaseHotspot {
  readonly shape: 'circle';
  readonly r: NormalizedCoordinate;
}

export interface FreeHotspot extends BaseHotspot {
  readonly shape: 'free';
  readonly points: readonly Point[];
}

export type Hotspot = RectHotspot | CircleHotspot | FreeHotspot;

// ============================================================================
// 注釈関連
// ============================================================================

export interface AnnotationStyle {
  readonly color?: HexColor;
  readonly fontSize?: number;
  readonly fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  readonly backgroundColor?: HexColor;
}

export interface Annotation {
  readonly id: UUID;
  readonly text: string;
  readonly x: NormalizedCoordinate;
  readonly y: NormalizedCoordinate;
  readonly style?: AnnotationStyle;
  readonly variables?: readonly string[];
}

// ============================================================================
// CTA（Call to Action）関連
// ============================================================================

export type LinkTarget = '_blank' | '_self' | '_parent' | '_top';

export interface CTAStyle {
  readonly backgroundColor?: HexColor;
  readonly color?: HexColor;
  readonly borderRadius?: number;
  readonly padding?: string;
}

export interface CTA {
  readonly label: string;
  readonly url: URLString;
  readonly target?: LinkTarget;
  readonly style?: CTAStyle;
}

// ============================================================================
// マスク関連
// ============================================================================

export interface MaskStyle {
  readonly backgroundColor?: HexColor;
  readonly opacity?: number; // 0-1の範囲
}

export interface Mask {
  readonly id: UUID;
  readonly x: NormalizedCoordinate;
  readonly y: NormalizedCoordinate;
  readonly w: NormalizedCoordinate;
  readonly h: NormalizedCoordinate;
  readonly blur: number; // ピクセル値
  readonly style?: MaskStyle;
}

// ============================================================================
// ステップ関連
// ============================================================================

export interface Step {
  readonly id: UUID;
  readonly title: string;
  readonly description: string;
  readonly image: URLString; // 画像URL
  readonly thumbnail: URLString; // サムネイル画像URL
  readonly hotspots: readonly Hotspot[];
  readonly annotations: readonly Annotation[];
  readonly cta?: CTA;
  readonly masks: readonly Mask[];
  readonly order: number;
  readonly variables?: readonly string[];
  readonly conditions?: readonly string[];
  readonly isVisible?: boolean;
}

// ============================================================================
// チャプター関連
// ============================================================================

export interface Chapter {
  readonly id: UUID;
  readonly title: string;
  readonly description?: string;
  readonly stepIds: readonly UUID[];
  readonly order: number;
  readonly isCollapsed?: boolean;
}

// ============================================================================
// 変数関連
// ============================================================================

export type VariableType = 'text' | 'number' | 'url' | 'image';

export interface Variable {
  readonly id: UUID;
  readonly name: string;
  readonly type: VariableType;
  readonly defaultValue?: string;
  readonly description?: string;
}

export type VariableInstance = Readonly<Record<string, string>>;

// ============================================================================
// 条件分岐関連
// ============================================================================

export type ConditionType = 'variable' | 'previous_step' | 'user_action';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'exists';

export type ConditionalAction = 'show' | 'hide' | 'redirect';

export interface Condition {
  readonly type: ConditionType;
  readonly operator: ConditionOperator;
  readonly value: string;
  readonly variable?: string;
}

export interface ConditionalStep {
  readonly id: UUID;
  readonly stepId: UUID;
  readonly conditions: readonly Condition[];
  readonly action: ConditionalAction;
  readonly redirectStepId?: UUID;
}

// ============================================================================
// 言語関連
// ============================================================================

export type Language = 'ja' | 'en';

// ============================================================================
// プロジェクト関連
// ============================================================================

export interface Project {
  readonly id: UUID;
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly Step[];
  readonly chapters: readonly Chapter[];
  readonly theme: Theme;
  readonly variables: readonly Variable[];
  readonly variableInstances: VariableInstance;
  readonly conditionalSteps: readonly ConditionalStep[];
  readonly language: Language;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;
  readonly shareUrl?: URLString;
}

// ============================================================================
// プロンプトテンプレート関連
// ============================================================================

export type PromptTemplateCategory =
  | 'ui_improvement'
  | 'accessibility'
  | 'responsive'
  | 'seo'
  | 'performance'
  | 'structure';

export interface PromptTemplate {
  readonly id: UUID;
  readonly name: string;
  readonly description?: string;
  readonly category: PromptTemplateCategory;
  readonly prompt: string;
  readonly variables?: readonly string[];
  readonly isSystem?: boolean;
}

// ============================================================================
// 型ガード関数
// ============================================================================

export function isHotspotRect(hotspot: Hotspot): hotspot is RectHotspot {
  return hotspot.shape === 'rect';
}

export function isHotspotCircle(hotspot: Hotspot): hotspot is CircleHotspot {
  return hotspot.shape === 'circle';
}

export function isHotspotFree(hotspot: Hotspot): hotspot is FreeHotspot {
  return hotspot.shape === 'free';
}

// ============================================================================
// ユーティリティ型
// ============================================================================

/** プロジェクトから読み取り専用部分を除いた作成用の型 */
export type CreateProjectInput = Omit<
  Project,
  'id' | 'createdAt' | 'updatedAt' | 'shareUrl'
> & {
  id?: UUID;
};

/** プロジェクトの更新用の型 */
export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'createdAt'>> & {
  readonly id: UUID;
  readonly updatedAt: Date;
};

/** ステップの作成用の型 */
export type CreateStepInput = Omit<Step, 'id' | 'order'> & {
  id?: UUID;
  order?: number;
};

/** 型安全なブランド型作成ヘルパー */
export function createBrandedType<T extends string>(value: string): T {
  return value as T;
}
