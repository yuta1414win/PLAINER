'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  ImageIcon,
  Layers,
  Upload,
  Zap,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  variant:
    | 'no-project'
    | 'no-steps'
    | 'no-suggestions'
    | 'generating'
    | 'error'
    | 'offline';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
    disabled?: boolean;
  }>;
  className?: string;
}

const EMPTY_STATE_CONFIG = {
  'no-project': {
    icon: <FileText className="w-12 h-12 text-muted-foreground" />,
    title: 'プロジェクトがありません',
    description:
      '新しいプロジェクトを作成するか、既存のプロジェクトを開いてください。',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  'no-steps': {
    icon: <ImageIcon className="w-12 h-12 text-muted-foreground" />,
    title: 'ステップがありません',
    description: '画像をアップロードして最初のステップを作成しましょう。',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  'no-suggestions': {
    icon: <Layers className="w-12 h-12 text-muted-foreground" />,
    title: 'AI提案がありません',
    description: 'Liveアシスタントに質問して、改善提案を受け取りましょう。',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
  generating: {
    icon: <Zap className="w-12 h-12 text-muted-foreground animate-pulse" />,
    title: '生成中...',
    description: 'AIがコンテンツを生成しています。しばらくお待ちください。',
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
  },
  error: {
    icon: <AlertTriangle className="w-12 h-12 text-muted-foreground" />,
    title: 'エラーが発生しました',
    description:
      '操作を完了できませんでした。再試行するか、サポートにお問い合わせください。',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
  },
  offline: {
    icon: <WifiOff className="w-12 h-12 text-muted-foreground" />,
    title: 'オフラインです',
    description: 'インターネット接続を確認して、再試行してください。',
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-500',
  },
} as const;

export function EmptyState({
  variant,
  title,
  description,
  icon,
  actions,
  className,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[variant];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  return (
    <Card className={cn('border-none shadow-none', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className={cn('rounded-full p-6 mb-6', config.bgColor)}>
          <div className={config.iconColor}>{displayIcon}</div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {displayTitle}
        </h3>

        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {displayDescription}
        </p>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                onClick={action.onClick}
                disabled={action.disabled}
                className="min-w-[120px]"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 特定のケース用のプリセット EmptyState コンポーネント

interface NoProjectStateProps {
  onCreateProject?: () => void;
  onOpenProject?: () => void;
  className?: string;
}

export function NoProjectState({
  onCreateProject,
  onOpenProject,
  className,
}: NoProjectStateProps) {
  const actions = [];

  if (onCreateProject) {
    actions.push({
      label: '新規プロジェクト作成',
      onClick: onCreateProject,
      variant: 'default' as const,
    });
  }

  if (onOpenProject) {
    actions.push({
      label: 'プロジェクトを開く',
      onClick: onOpenProject,
      variant: 'outline' as const,
    });
  }

  return (
    <EmptyState variant="no-project" actions={actions} className={className} />
  );
}

interface NoStepsStateProps {
  onUploadImage?: () => void;
  onCreateStep?: () => void;
  className?: string;
}

export function NoStepsState({
  onUploadImage,
  onCreateStep,
  className,
}: NoStepsStateProps) {
  const actions = [];

  if (onUploadImage) {
    actions.push({
      label: '画像をアップロード',
      onClick: onUploadImage,
      variant: 'default' as const,
    });
  }

  if (onCreateStep) {
    actions.push({
      label: 'ステップを作成',
      onClick: onCreateStep,
      variant: 'outline' as const,
    });
  }

  return (
    <EmptyState
      variant="no-steps"
      icon={<Upload className="w-12 h-12 text-muted-foreground" />}
      actions={actions}
      className={className}
    />
  );
}

interface ErrorStateProps {
  error?: Error | string;
  onRetry?: () => void;
  onReport?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  onReport,
  className,
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  const actions = [];

  if (onRetry) {
    actions.push({
      label: '再試行',
      onClick: onRetry,
      variant: 'default' as const,
    });
  }

  if (onReport) {
    actions.push({
      label: 'エラーを報告',
      onClick: onReport,
      variant: 'outline' as const,
    });
  }

  return (
    <EmptyState
      variant="error"
      description={errorMessage || EMPTY_STATE_CONFIG.error.description}
      actions={actions}
      className={className}
    />
  );
}

interface GeneratingStateProps {
  progress?: number;
  stage?: string;
  onCancel?: () => void;
  className?: string;
}

export function GeneratingState({
  progress,
  stage,
  onCancel,
  className,
}: GeneratingStateProps) {
  let description = EMPTY_STATE_CONFIG.generating.description;

  if (stage) {
    description = `${stage}...`;
  }

  if (progress !== undefined) {
    description += ` (${Math.round(progress)}%)`;
  }

  const actions = [];

  if (onCancel) {
    actions.push({
      label: 'キャンセル',
      onClick: onCancel,
      variant: 'outline' as const,
    });
  }

  return (
    <EmptyState
      variant="generating"
      description={description}
      actions={actions}
      className={className}
    />
  );
}

interface OfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({ onRetry, className }: OfflineStateProps) {
  const actions = [];

  if (onRetry) {
    actions.push({
      label: '再接続を試行',
      onClick: onRetry,
      variant: 'default' as const,
    });
  }

  return (
    <EmptyState variant="offline" actions={actions} className={className} />
  );
}

interface NoSuggestionsStateProps {
  onStartChat?: () => void;
  onUseTemplate?: () => void;
  className?: string;
}

export function NoSuggestionsState({
  onStartChat,
  onUseTemplate,
  className,
}: NoSuggestionsStateProps) {
  const actions = [];

  if (onStartChat) {
    actions.push({
      label: 'チャットを開始',
      onClick: onStartChat,
      variant: 'default' as const,
    });
  }

  if (onUseTemplate) {
    actions.push({
      label: 'テンプレートを使用',
      onClick: onUseTemplate,
      variant: 'outline' as const,
    });
  }

  return (
    <EmptyState
      variant="no-suggestions"
      actions={actions}
      className={className}
    />
  );
}
