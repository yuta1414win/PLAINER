'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Undo2, Redo2, RotateCcw, Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void;
  className?: string;
  showSave?: boolean;
  compact?: boolean;
}

export function HistoryControls({
  canUndo,
  canRedo,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  onSave,
  className,
  showSave = false,
  compact = false,
}: HistoryControlsProps) {
  const historyStatus = useMemo(() => {
    if (historyLength === 0) return '履歴なし';
    if (historyLength === 1) return '1操作';
    return `${historyIndex + 1}/${historyLength}操作`;
  }, [historyIndex, historyLength]);

  const undoTooltip = canUndo
    ? '元に戻す (Ctrl+Z)'
    : '元に戻せる操作がありません';
  const redoTooltip = canRedo
    ? 'やり直し (Ctrl+Y)'
    : 'やり直せる操作がありません';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <TooltipProvider>
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="h-8 w-8 p-0"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{undoTooltip}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0 -ml-px"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{redoTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {historyLength > 0 && (
            <>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <div className="text-xs text-muted-foreground font-mono">
                {historyStatus}
              </div>
            </>
          )}

          {showSave && onSave && (
            <>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSave}
                    className="h-8 w-8 p-0"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>保存 (Ctrl+S)</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TooltipProvider>
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="flex items-center gap-2"
              >
                <Undo2 className="w-4 h-4" />
                元に戻す
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{undoTooltip}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className="flex items-center gap-2"
              >
                <Redo2 className="w-4 h-4" />
                やり直し
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{redoTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {historyLength > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{historyStatus}</span>
            </div>
          </>
        )}

        {showSave && onSave && (
          <>
            <Separator orientation="vertical" className="h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>保存 (Ctrl+S)</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </TooltipProvider>
    </div>
  );
}
