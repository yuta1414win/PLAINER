// 基底型
export * from './base';

// プロジェクト関連の型
export * from './project';

// AI関連の型
export * from './ai';

// 後方互換性のための型エクスポート
export type {
  // 基底型の再エクスポート
  Point,
  NormalizedPoint,
  Size,
  NormalizedSize,
  Bounds,
  ColorScheme,
  Typography,
  Language,
  BaseEntity,
  NamedEntity,
  TimestampedEntity,
} from './base';

export type {
  // プロジェクト型の再エクスポート
  HotspotShape,
  Hotspot,
  Annotation,
  Mask,
  CTA,
  Variable,
  VariableInstance,
  ConditionalStep,
  Step,
  Chapter,
  Theme,
  Project,
} from './project';

export type {
  // AI型の再エクスポート
  PromptTemplate,
  LiveSession,
  LiveMessage,
  Suggestion,
  GenerationRequest,
  GenerationResponse,
} from './ai';
