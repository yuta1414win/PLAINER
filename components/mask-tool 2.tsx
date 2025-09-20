'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Filter,
  Square,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Move,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mask } from '@/lib/types';

interface MaskToolProps {
  masks: Mask[];
  selectedMaskId: string | null;
  onMaskCreate: (mask: Omit<Mask, 'id'>) => void;
  onMaskUpdate: (maskId: string, updates: Partial<Mask>) => void;
  onMaskDelete: (maskId: string) => void;
  onMaskSelect: (maskId: string | null) => void;
  onMaskDuplicate: (maskId: string) => void;
  className?: string;
}

const BLUR_INTENSITIES = [
  { label: '軽微', value: 20 },
  { label: '標準', value: 50 },
  { label: '強', value: 80 },
  { label: '最強', value: 100 },
];

export function MaskTool({
  masks,
  selectedMaskId,
  onMaskCreate,
  onMaskUpdate,
  onMaskDelete,
  onMaskSelect,
  onMaskDuplicate,
  className,
}: MaskToolProps) {
  const [isCreating, setIsCreating] = useState(false);

  const selectedMask = useMemo(() => {
    return masks.find((mask) => mask.id === selectedMaskId) || null;
  }, [masks, selectedMaskId]);

  const handleCreateMask = useCallback(() => {
    const newMask: Omit<Mask, 'id'> = {
      shape: 'rect',
      x: 0.25, // Center area
      y: 0.25,
      w: 0.5,
      h: 0.5,
      blurIntensity: 50,
    };
    onMaskCreate(newMask);
    setIsCreating(false);
  }, [onMaskCreate]);

  const handleBlurIntensityChange = useCallback(
    (intensity: number) => {
      if (selectedMask) {
        onMaskUpdate(selectedMask.id, { blurIntensity: intensity });
      }
    },
    [selectedMask, onMaskUpdate]
  );

  const handleQuickIntensity = useCallback(
    (intensity: number) => {
      if (selectedMask) {
        onMaskUpdate(selectedMask.id, { blurIntensity: intensity });
      }
    },
    [selectedMask, onMaskUpdate]
  );

  const handleDeleteMask = useCallback(() => {
    if (selectedMask) {
      onMaskDelete(selectedMask.id);
      onMaskSelect(null);
    }
  }, [selectedMask, onMaskDelete, onMaskSelect]);

  const handleDuplicateMask = useCallback(() => {
    if (selectedMask) {
      onMaskDuplicate(selectedMask.id);
    }
  }, [selectedMask, onMaskDuplicate]);

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            ぼかしマスク
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* マスク作成ボタン */}
          <Button
            onClick={handleCreateMask}
            className="w-full"
            disabled={isCreating}
          >
            <Plus className="w-4 h-4 mr-2" />
            新しいマスクを作成
          </Button>

          {masks.length > 0 && (
            <>
              <Separator />

              {/* マスク一覧 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  マスク一覧 ({masks.length}個)
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {masks.map((mask, index) => (
                    <div
                      key={mask.id}
                      className={cn(
                        'p-2 border rounded-md cursor-pointer transition-colors hover:bg-accent',
                        selectedMaskId === mask.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => onMaskSelect(mask.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Square className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">マスク {index + 1}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(mask.w * 100)}×
                            {Math.round(mask.h * 100)}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {mask.blurIntensity}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 選択されたマスクの設定 */}
          {selectedMask && (
            <>
              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    マスク設定: マスク{' '}
                    {masks.findIndex((m) => m.id === selectedMask.id) + 1}
                  </Label>
                </div>

                {/* ぼかし強度スライダー */}
                <div className="space-y-3">
                  <Label className="text-sm">ぼかし強度</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[selectedMask.blurIntensity]}
                      onValueChange={([value]) =>
                        handleBlurIntensityChange(value)
                      }
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span className="font-mono">
                        {selectedMask.blurIntensity}%
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* クイック設定ボタン */}
                <div className="space-y-2">
                  <Label className="text-sm">クイック設定</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BLUR_INTENSITIES.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={
                          selectedMask.blurIntensity === preset.value
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => handleQuickIntensity(preset.value)}
                        className="text-xs"
                      >
                        {preset.label}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({preset.value}%)
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 位置とサイズ */}
                <div className="space-y-2">
                  <Label className="text-sm">位置とサイズ</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">X: </span>
                      <span className="font-mono">
                        {Math.round(selectedMask.x * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Y: </span>
                      <span className="font-mono">
                        {Math.round(selectedMask.y * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">幅: </span>
                      <span className="font-mono">
                        {Math.round(selectedMask.w * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">高さ: </span>
                      <span className="font-mono">
                        {Math.round(selectedMask.h * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* アクションボタン */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicateMask}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    複製
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteMask}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    削除
                  </Button>
                </div>

                {/* 使用のヒント */}
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• キャンバス上で矩形を描画してマスクを作成</p>
                    <p>• マスクをクリックして選択・編集</p>
                    <p>• Deleteキーでマスクを削除</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* マスクがない場合の案内 */}
          {masks.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <Filter className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                マスクが作成されていません
              </p>
              <p className="text-xs text-muted-foreground">
                「新しいマスクを作成」ボタンでマスクを追加できます
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
