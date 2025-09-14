'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  HardDrive,
  WifiOff,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useAutoSaveStatus } from '@/hooks/use-auto-save';

interface AutoSaveIndicatorProps {
  className?: string;
  showDetails?: boolean;
  onManualSave?: () => void;
}

export function AutoSaveIndicator({
  className,
  showDetails = false,
  onManualSave,
}: AutoSaveIndicatorProps) {
  const { statusText, statusType, isSaving, lastSaved, saveError } =
    useAutoSaveStatus();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }

    switch (statusType) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'saved':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'text-yellow-500';
    }

    switch (statusType) {
      case 'saving':
        return 'text-blue-500';
      case 'saved':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTooltipContent = () => {
    if (!isOnline) {
      return 'オフライン - ローカルストレージに保存中';
    }

    if (saveError) {
      return `保存エラー: ${saveError.message}`;
    }

    if (lastSaved) {
      return `最終保存: ${lastSaved.toLocaleTimeString('ja-JP')}`;
    }

    return statusText;
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-2 text-sm',
                getStatusColor()
              )}
            >
              {getIcon()}
              {showDetails && <span className="text-xs">{statusText}</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>

        {onManualSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onManualSave}
            disabled={isSaving}
            className="h-7 px-2"
          >
            <HardDrive className="w-3 h-3 mr-1" />
            保存
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact version for toolbar
export function AutoSaveIndicatorCompact({
  className,
}: {
  className?: string;
}) {
  const { statusType, isSaving } = useAutoSaveStatus();

  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full',
        isSaving && 'animate-pulse',
        statusType === 'saving' && 'bg-blue-500',
        statusType === 'saved' && 'bg-green-500',
        statusType === 'error' && 'bg-red-500',
        statusType === 'idle' && 'bg-gray-400',
        className
      )}
    />
  );
}
