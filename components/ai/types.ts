import type { UUID } from '@/lib/types';

// AIメッセージの型
export interface Message {
  readonly id: UUID;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: Date;
  readonly status?: 'sending' | 'sent' | 'error';
  readonly metadata?: {
    readonly tokens?: number;
    readonly model?: string;
    readonly temperature?: number;
  };
}

// AIアシスタントのプロパティ
export interface AIAssistantProps {
  readonly onSuggestionApply?: (suggestion: string) => void;
  readonly context?: {
    readonly currentStep?: string;
    readonly totalSteps?: number;
    readonly selectedElement?: string;
  };
  readonly className?: string;
}

// AIメッセージのプロパティ
export interface AIMessageProps {
  readonly message: Message;
  readonly onCopy?: (content: string) => void;
  readonly onApply?: (suggestion: string) => void;
  readonly className?: string;
}

// AI入力のプロパティ
export interface AIInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly className?: string;
}

// AIプロンプト提案のプロパティ
export interface AIPromptSuggestionsProps {
  readonly suggestions: readonly string[];
  readonly onSelect: (suggestion: string) => void;
  readonly maxVisible?: number;
  readonly className?: string;
}

// AIコンテキストの型
export interface AIContextType {
  readonly messages: readonly Message[];
  readonly isLoading: boolean;
  readonly sessionId: UUID | null;
  readonly addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  readonly clearMessages: () => void;
  readonly startSession: () => Promise<void>;
  readonly endSession: () => Promise<void>;
}

// AIセッション設定
export interface AISessionConfig {
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly systemPrompt?: string;
}
