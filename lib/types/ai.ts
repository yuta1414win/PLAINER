import { BaseEntity, TimestampedEntity } from './base';

// プロンプトテンプレートの型定義
export type PromptTemplateCategory =
  | 'ui_improvement'
  | 'accessibility'
  | 'responsive'
  | 'seo'
  | 'performance'
  | 'structure';

export interface PromptTemplate extends BaseEntity {
  name: string;
  description: string;
  category: PromptTemplateCategory;
  prompt: string;
  variables?: string[]; // Variable names that can be replaced in the prompt
  isSystem?: boolean; // System templates cannot be deleted
  tags?: string[];
  usageCount?: number;
  rating?: number; // 1-5 stars
}

// ライブセッションの型定義
export type LiveSessionStatus =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'disconnected'
  | 'error';

export interface LiveSession extends BaseEntity, TimestampedEntity {
  status: LiveSessionStatus;
  startedAt: Date;
  endedAt?: Date;
  lastActivity: Date;
  messages: LiveMessage[];
  ephemeralKey?: string;
  connectionId?: string;
  reconnectCount?: number;
  maxReconnectAttempts?: number;
  timeoutMs?: number;
  metadata?: {
    clientInfo?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

// ライブメッセージの型定義
export type MessageType = 'user' | 'assistant' | 'system' | 'error';

export interface LiveMessage extends BaseEntity {
  type: MessageType;
  content: string;
  timestamp: Date;
  suggestions?: Suggestion[];
  attachments?: MessageAttachment[];
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
    temperature?: number;
  };
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'link';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

// AI提案の型定義
export type SuggestionType =
  | 'html_change'
  | 'style_change'
  | 'structure_change'
  | 'content_change';
export type SuggestionStatus = 'pending' | 'applied' | 'rejected' | 'expired';

export interface Suggestion extends BaseEntity, TimestampedEntity {
  type: SuggestionType;
  status: SuggestionStatus;
  title: string;
  description: string;
  diff: string;
  confidence?: number; // 0-1
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  beforeCode?: string;
  afterCode?: string;
  appliedAt?: Date;
  appliedBy?: string;
  feedback?: {
    helpful?: boolean;
    reason?: string;
    improvedResult?: boolean;
  };
}

// AI生成の設定
export interface GenerationConfig {
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  stopSequences?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface SafetySettings {
  harmBlockThreshold:
    | 'BLOCK_NONE'
    | 'BLOCK_LOW_AND_ABOVE'
    | 'BLOCK_MEDIUM_AND_ABOVE'
    | 'BLOCK_HIGH';
  categories: Array<
    | 'HARM_CATEGORY_HARASSMENT'
    | 'HARM_CATEGORY_HATE_SPEECH'
    | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
    | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  >;
}

// AI生成リクエスト
export interface GenerationRequest {
  prompt: string;
  images?: string[]; // base64 encoded images
  config?: Partial<GenerationConfig>;
  safetySettings?: SafetySettings;
  context?: {
    projectId?: string;
    stepId?: string;
    templateId?: string;
    variables?: Record<string, string>;
  };
}

// AI生成レスポンス
export interface GenerationResponse {
  content: string;
  suggestions?: Suggestion[];
  metadata: {
    model: string;
    tokenCount: {
      input: number;
      output: number;
      total: number;
    };
    processingTime: number;
    timestamp: Date;
  };
  safetyRatings?: Array<{
    category: string;
    probability: string;
    blocked: boolean;
  }>;
  error?: string;
}

// AI分析結果
export interface AnalysisResult {
  type: 'accessibility' | 'performance' | 'seo' | 'usability' | 'design';
  score: number; // 0-100
  issues: AnalysisIssue[];
  recommendations: string[];
  metadata: {
    analyzedAt: Date;
    model: string;
    version: string;
  };
}

export interface AnalysisIssue {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  title: string;
  description: string;
  location?: {
    element?: string;
    line?: number;
    column?: number;
  };
  suggestion?: string;
  fixable: boolean;
}

// チャット履歴とコンテキスト
export interface ChatContext {
  projectId: string;
  sessionId: string;
  messageHistory: LiveMessage[];
  currentStep?: string;
  userPreferences?: {
    language: string;
    verbosity: 'concise' | 'detailed';
    focusAreas: string[];
  };
  systemContext?: {
    version: string;
    features: string[];
    limitations: string[];
  };
}

// AI機能の設定
export interface AIFeatureConfig {
  enabled: boolean;
  autoSuggestions: boolean;
  realTimeAnalysis: boolean;
  batchProcessing: boolean;
  maxConcurrentRequests: number;
  retryAttempts: number;
  timeoutMs: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };
}
