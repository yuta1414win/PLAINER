'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ParallelCompareProps {
  leftTitle: string;
  rightTitle: string;
  left: any;
  right: any;
  className?: string;
}

function stringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export const ParallelCompare: React.FC<ParallelCompareProps> = ({
  leftTitle,
  rightTitle,
  left,
  right,
  className,
}) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-base">並列比較ビュー</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded">
            <div className="px-3 py-2 text-sm font-medium bg-muted/50 border-b">{leftTitle}</div>
            <pre className="p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
              {stringify(left)}
            </pre>
          </div>
          <div className="border rounded">
            <div className="px-3 py-2 text-sm font-medium bg-muted/50 border-b">{rightTitle}</div>
            <pre className="p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
              {stringify(right)}
            </pre>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="text-xs text-muted-foreground">
          差分のハイライトは簡易表示です。詳細な差分は「差分プレビュー」と併用してください。
        </div>
      </CardContent>
    </Card>
  );
};

export default ParallelCompare;

