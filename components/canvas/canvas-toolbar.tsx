'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  MousePointer2,
  Square,
  Circle,
  Pen,
  Type,
  Filter,
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useCanvasContext } from './canvas-context';
import type { DrawingTool, EditorMode } from './types';

const DRAWING_TOOLS: DrawingTool[] = [
  { id: 'select', name: '選択', icon: MousePointer2, mode: 'select' },
  {
    id: 'hotspot-rect',
    name: '矩形ホットスポット',
    icon: Square,
    mode: 'hotspot-rect',
  },
  {
    id: 'hotspot-circle',
    name: '円形ホットスポット',
    icon: Circle,
    mode: 'hotspot-circle',
  },
  {
    id: 'hotspot-free',
    name: '自由形ホットスポット',
    icon: Pen,
    mode: 'hotspot-free',
  },
  { id: 'annotation', name: '注釈', icon: Type, mode: 'annotation' },
  { id: 'mask', name: 'ぼかし', icon: Filter, mode: 'mask' },
];

interface CanvasToolbarProps {
  onZoom?: (delta: number) => void;
  onReset?: () => void;
  scale?: number;
  className?: string;
}

export function CanvasToolbar({
  onZoom,
  onReset,
  scale = 1,
  className,
}: CanvasToolbarProps) {
  const { editorMode, setEditorMode, showGrid, toggleGrid } =
    useCanvasContext();

  const handleToolSelect = (mode: EditorMode) => {
    setEditorMode(mode);
  };

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* 描画ツール */}
            <div className="flex items-center space-x-1">
              {DRAWING_TOOLS.map((tool, index) => (
                <div key={tool.id} className="flex items-center">
                  {index === 1 && (
                    <Separator orientation="vertical" className="h-6 mx-1" />
                  )}
                  {index === 4 && (
                    <Separator orientation="vertical" className="h-6 mx-1" />
                  )}

                  <Button
                    variant={editorMode === tool.mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToolSelect(tool.mode)}
                    title={tool.name}
                  >
                    <tool.icon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ビューコントロール */}
            <Button
              variant={showGrid ? 'default' : 'outline'}
              size="sm"
              onClick={toggleGrid}
              title="グリッド表示"
            >
              <Grid className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* ズームコントロール */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onZoom?.(-0.2)}
              title="縮小"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-mono min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onZoom?.(0.2)}
              title="拡大"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              title="リセット"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
