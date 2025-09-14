// 基底型定義
export interface BaseEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NamedEntity extends BaseEntity {
  name: string;
  description?: string;
}

export interface TimestampedEntity extends BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

// 座標系の型定義
export interface Point {
  x: number;
  y: number;
}

export interface NormalizedPoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

export interface Size {
  width: number;
  height: number;
}

export interface NormalizedSize {
  w: number; // 0-1 normalized width
  h: number; // 0-1 normalized height
}

export interface Bounds extends NormalizedPoint, NormalizedSize {}

// 図形の基底型
export interface Shape {
  id: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

// 色とスタイルの型定義
export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent?: string;
}

export interface Typography {
  fontFamily: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface Spacing {
  padding: number | string;
  margin: number | string;
  gap?: number | string;
}

// ユーザーインタラクションの型定義
export interface ClickableEntity {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface KeyboardNavigable {
  tabIndex?: number;
  onKeyDown?: (event: KeyboardEvent) => void;
  'aria-label'?: string;
}

// 状態管理の型定義
export type EntityStatus = 'idle' | 'loading' | 'success' | 'error';

export interface StatefulEntity {
  status: EntityStatus;
  error?: string;
}

// 検索とフィルタの型定義
export interface Searchable {
  searchTerm?: string;
  searchFields: string[];
}

export interface Filterable<T = string> {
  filters: Record<string, T | T[]>;
}

export interface Sortable {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

// API レスポンスの型定義
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ユーティリティ型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// 列挙型の共通パターン
export type Language = 'ja' | 'en';
export type Environment = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// リソース管理の型定義
export interface Resource {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size?: number;
  mimeType?: string;
}

export interface ImageResource extends Resource {
  type: 'image';
  width?: number;
  height?: number;
  alt?: string;
  thumbnail?: string;
}
