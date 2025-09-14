import {
  BaseEntity,
  NamedEntity,
  TimestampedEntity,
  Shape,
  NormalizedPoint,
  ColorScheme,
  Typography,
  Language,
} from './base';

// ホットスポットの型定義
export type HotspotShape = 'rect' | 'circle' | 'free';

export interface Hotspot extends Shape {
  shape: HotspotShape;
  w?: number; // width for rect (0-1 normalized)
  h?: number; // height for rect (0-1 normalized)
  r?: number; // radius for circle (0-1 normalized)
  points?: NormalizedPoint[]; // points for free shape
  label?: string;
  tooltipText?: string;
  interactive?: boolean;
  zIndex?: number;
}

// 注釈の型定義
export interface AnnotationStyle extends Partial<Typography> {
  color?: string;
  backgroundColor?: string;
  border?: string;
  borderRadius?: number;
  padding?: string;
}

export interface Annotation extends Shape {
  text: string;
  style?: AnnotationStyle;
  variables?: string[]; // Variable references in text (e.g., {{variableName}})
  maxWidth?: number;
  autoPosition?: boolean;
}

// マスクの型定義
export interface Mask extends Shape {
  shape: 'rect' | 'circle'; // 拡張可能
  w: number; // 0-1 normalized
  h: number; // 0-1 normalized
  blurIntensity: number; // 0-100
  opacity?: number; // 0-1
  borderRadius?: number;
}

// CTAの型定義
export interface CTA {
  label: string;
  url: string;
  target?: '_blank' | '_self';
  style?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
}

// 変数の型定義
export type VariableType =
  | 'text'
  | 'number'
  | 'url'
  | 'image'
  | 'boolean'
  | 'select';

export interface Variable extends NamedEntity {
  type: VariableType;
  defaultValue?: string;
  options?: string[]; // For select type
  validation?: {
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface VariableInstance extends BaseEntity {
  variableId: string;
  value: string;
  context?: 'global' | 'step' | 'chapter';
}

// 条件分岐の型定義
export interface ConditionalStep extends BaseEntity {
  condition: string; // Simple condition like "variable === 'value'"
  stepId: string;
  operator?:
    | '==='
    | '!=='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'contains'
    | 'startsWith'
    | 'endsWith';
  value?: string;
}

// ステップの型定義
export interface Step extends NamedEntity, TimestampedEntity {
  title: string;
  description?: string;
  image: string; // base64 or URL
  thumbnail?: string; // base64 or URL
  hotspots: Hotspot[];
  annotations: Annotation[];
  masks: Mask[];
  cta?: CTA;
  order: number;
  variables?: Variable[]; // Step-specific variables
  conditions?: ConditionalStep[]; // Conditions for showing/hiding steps
  isVisible?: boolean; // Dynamic visibility based on conditions
  duration?: number; // Auto-advance duration in seconds
  skipable?: boolean;
  metadata?: Record<string, unknown>;
}

// チャプターの型定義
export interface Chapter extends NamedEntity {
  title: string;
  stepIds: string[];
  collapsed?: boolean;
  color?: string;
  icon?: string;
  order: number;
}

// テーマの型定義
export interface Theme extends BaseEntity {
  name: string;
  colors: ColorScheme;
  typography: Typography;
  spacing: {
    borderRadius: number;
    padding: string;
    margin: string;
  };
  logo?: {
    url?: string;
    text?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  customCss?: string;
}

// プロジェクト設定の型定義
export interface ProjectSettings {
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  defaultTransition: string;
  enableAnalytics: boolean;
  enableComments: boolean;
}

// プロジェクトの型定義
export interface Project extends NamedEntity, TimestampedEntity {
  steps: Step[];
  chapters: Chapter[];
  theme: Theme;
  variables: Variable[];
  variableInstances: VariableInstance[];
  conditionalSteps: ConditionalStep[];
  isPublic: boolean;
  shareUrl?: string;
  language: Language;
  settings: ProjectSettings;
  tags?: string[];
  category?: string;
  version: string;
  lastModifiedBy?: string;
  collaborators?: string[];
  metadata?: Record<string, unknown>;
}
