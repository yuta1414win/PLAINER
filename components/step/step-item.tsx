'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepItemProps } from './types';

export function StepItem({
  step,
  isSelected,
  isActive,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  className,
}: StepItemProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md group',
        isSelected && 'ring-2 ring-primary shadow-md',
        isActive && 'bg-primary/5',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          {/* サムネイル */}
          <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
            {step.thumbnail && (
              <img
                src={step.thumbnail}
                alt={step.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{step.title}</p>
            <p className="text-xs text-muted-foreground">
              {step.hotspots.length} ホットスポット
              {step.annotations.length > 0 &&
                ` • ${step.annotations.length} 注釈`}
              {step.masks.length > 0 && ` • ${step.masks.length} マスク`}
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-7 w-7 p-0"
                title="編集"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="h-7 w-7 p-0"
                title="複製"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                title="削除"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
