'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  Move,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store';
import type { Hotspot, Annotation, Mask, Step } from '@/lib/types';

interface CanvasEditorProps {
  step: Step;
  width?: number;
  height?: number;
  className?: string;
}

interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDrawing: boolean;
  dragStart: { x: number; y: number } | null;
  selectedElement: {
    type: 'hotspot' | 'annotation' | 'mask';
    id: string;
  } | null;
}

export function CanvasEditor({
  step,
  width = 800,
  height = 600,
  className,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDrawing: false,
    dragStart: null,
    selectedElement: null,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const {
    editorMode,
    setEditorMode,
    showGrid,
    showGuides,
    toggleGrid,
    toggleGuides,
    addHotspot,
    updateHotspot,
    deleteHotspot,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addMask,
    updateMask,
    deleteMask,
  } = useEditorStore();

  // 画像読み込み
  useEffect(() => {
    if (!step.image) return;

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      imageRef.current = img;
      drawCanvas();
    };
    img.src = step.image;
  }, [step.image]);

  // キャンバス描画
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !imageLoaded) return;

    // キャンバスクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 画像描画
    const { scale, offsetX, offsetY } = canvasState;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, canvas.width / scale, canvas.height / scale);
    ctx.restore();

    // グリッド描画
    if (showGrid) {
      drawGrid(ctx);
    }

    // ホットスポット描画
    step.hotspots.forEach((hotspot) => {
      drawHotspot(ctx, hotspot);
    });

    // 注釈描画
    step.annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation);
    });

    // マスク描画
    step.masks.forEach((mask) => {
      drawMask(ctx, mask);
    });
  }, [canvasState, step, imageLoaded, showGrid]);

  // グリッド描画
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const { scale, offsetX, offsetY } = canvasState;
      const gridSize = 20 * scale;

      ctx.save();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;

      // 垂直線
      for (let x = offsetX % gridSize; x < ctx.canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ctx.canvas.height);
        ctx.stroke();
      }

      // 水平線
      for (let y = offsetY % gridSize; y < ctx.canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [canvasState]
  );

  // ホットスポット描画
  const drawHotspot = useCallback(
    (ctx: CanvasRenderingContext2D, hotspot: Hotspot) => {
      const { scale, offsetX, offsetY } = canvasState;
      const canvas = ctx.canvas;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const x = (hotspot.x * canvas.width) / scale;
      const y = (hotspot.y * canvas.height) / scale;

      // 選択状態の確認
      const isSelected =
        canvasState.selectedElement?.type === 'hotspot' &&
        canvasState.selectedElement?.id === hotspot.id;

      ctx.strokeStyle = isSelected ? '#3b82f6' : '#ef4444';
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 2 / scale;

      switch (hotspot.shape) {
        case 'rect':
          if (hotspot.w && hotspot.h) {
            const w = (hotspot.w * canvas.width) / scale;
            const h = (hotspot.h * canvas.height) / scale;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
          }
          break;

        case 'circle':
          if (hotspot.r) {
            const r =
              (hotspot.r * Math.min(canvas.width, canvas.height)) / scale;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          break;

        case 'free':
          if (hotspot.points && hotspot.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(
              (hotspot.points[0].x * canvas.width) / scale,
              (hotspot.points[0].y * canvas.height) / scale
            );
            hotspot.points.slice(1).forEach((point) => {
              ctx.lineTo(
                (point.x * canvas.width) / scale,
                (point.y * canvas.height) / scale
              );
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          break;
      }

      ctx.restore();
    },
    [canvasState]
  );

  // 注釈描画
  const drawAnnotation = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
      const { scale, offsetX, offsetY } = canvasState;
      const canvas = ctx.canvas;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const x = (annotation.x * canvas.width) / scale;
      const y = (annotation.y * canvas.height) / scale;

      const isSelected =
        canvasState.selectedElement?.type === 'annotation' &&
        canvasState.selectedElement?.id === annotation.id;

      ctx.fillStyle = annotation.style?.color || '#1f2937';
      ctx.font = `${(annotation.style?.fontSize || 14) / scale}px ${annotation.style?.fontWeight || 'normal'} system-ui`;

      // 背景
      const metrics = ctx.measureText(annotation.text);
      const padding = 8 / scale;
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(
        x - padding,
        y - metrics.actualBoundingBoxAscent - padding,
        metrics.width + padding * 2,
        metrics.actualBoundingBoxAscent +
          metrics.actualBoundingBoxDescent +
          padding * 2
      );

      // テキスト
      ctx.fillStyle = annotation.style?.color || '#1f2937';
      ctx.fillText(annotation.text, x, y);

      ctx.restore();
    },
    [canvasState]
  );

  // マスク描画
  const drawMask = useCallback(
    (ctx: CanvasRenderingContext2D, mask: Mask) => {
      const { scale, offsetX, offsetY } = canvasState;
      const canvas = ctx.canvas;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const x = (mask.x * canvas.width) / scale;
      const y = (mask.y * canvas.height) / scale;
      const w = (mask.w * canvas.width) / scale;
      const h = (mask.h * canvas.height) / scale;

      const isSelected =
        canvasState.selectedElement?.type === 'mask' &&
        canvasState.selectedElement?.id === mask.id;

      // マスク領域（ぼかし効果の代用として半透明矩形）
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.4)'
        : `rgba(0, 0, 0, ${mask.blurIntensity / 200})`;
      ctx.fillRect(x, y, w, h);

      // 枠線
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6b7280';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(x, y, w, h);

      ctx.restore();
    },
    [canvasState]
  );

  // マウス座標を正規化座標に変換
  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = canvasState;

      const canvasX = (clientX - rect.left - offsetX) / scale;
      const canvasY = (clientY - rect.top - offsetY) / scale;

      return {
        x: Math.max(0, Math.min(1, canvasX / (canvas.width / scale))),
        y: Math.max(0, Math.min(1, canvasY / (canvas.height / scale))),
      };
    },
    [canvasState]
  );

  // マウスイベント処理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);

      setCanvasState((prev) => ({
        ...prev,
        isDrawing: true,
        dragStart: { x: e.clientX, y: e.clientY },
      }));

      // エディタモードに応じた処理
      switch (editorMode) {
        case 'select':
          // 要素選択ロジック
          break;

        case 'hotspot-rect':
          const rectHotspot: Hotspot = {
            id: `hotspot-${Date.now()}`,
            shape: 'rect',
            x: coords.x,
            y: coords.y,
            w: 0,
            h: 0,
          };
          addHotspot(step.id, rectHotspot);
          setCanvasState((prev) => ({
            ...prev,
            selectedElement: { type: 'hotspot', id: rectHotspot.id },
          }));
          break;

        case 'hotspot-circle':
          const circleHotspot: Hotspot = {
            id: `hotspot-${Date.now()}`,
            shape: 'circle',
            x: coords.x,
            y: coords.y,
            r: 0,
          };
          addHotspot(step.id, circleHotspot);
          setCanvasState((prev) => ({
            ...prev,
            selectedElement: { type: 'hotspot', id: circleHotspot.id },
          }));
          break;

        case 'annotation':
          const annotation: Annotation = {
            id: `annotation-${Date.now()}`,
            text: '新しい注釈',
            x: coords.x,
            y: coords.y,
          };
          addAnnotation(step.id, annotation);
          setCanvasState((prev) => ({
            ...prev,
            selectedElement: { type: 'annotation', id: annotation.id },
          }));
          break;

        case 'mask':
          const mask: Mask = {
            id: `mask-${Date.now()}`,
            shape: 'rect',
            x: coords.x,
            y: coords.y,
            w: 0,
            h: 0,
            blurIntensity: 50,
          };
          addMask(step.id, mask);
          setCanvasState((prev) => ({
            ...prev,
            selectedElement: { type: 'mask', id: mask.id },
          }));
          break;
      }
    },
    [
      editorMode,
      step.id,
      getCanvasCoordinates,
      addHotspot,
      addAnnotation,
      addMask,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasState.isDrawing || !canvasState.dragStart) return;

      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      const startCoords = getCanvasCoordinates(
        canvasState.dragStart.x,
        canvasState.dragStart.y
      );

      // 描画中の要素を更新
      const { selectedElement } = canvasState;
      if (!selectedElement) return;

      switch (selectedElement.type) {
        case 'hotspot':
          const hotspot = step.hotspots.find(
            (h) => h.id === selectedElement.id
          );
          if (!hotspot) return;

          if (hotspot.shape === 'rect') {
            updateHotspot(step.id, selectedElement.id, {
              w: Math.abs(coords.x - startCoords.x),
              h: Math.abs(coords.y - startCoords.y),
              x: Math.min(startCoords.x, coords.x),
              y: Math.min(startCoords.y, coords.y),
            });
          } else if (hotspot.shape === 'circle') {
            const distance = Math.sqrt(
              Math.pow(coords.x - startCoords.x, 2) +
                Math.pow(coords.y - startCoords.y, 2)
            );
            updateHotspot(step.id, selectedElement.id, { r: distance });
          }
          break;

        case 'mask':
          updateMask(step.id, selectedElement.id, {
            w: Math.abs(coords.x - startCoords.x),
            h: Math.abs(coords.y - startCoords.y),
            x: Math.min(startCoords.x, coords.x),
            y: Math.min(startCoords.y, coords.y),
          });
          break;
      }
    },
    [canvasState, step, getCanvasCoordinates, updateHotspot, updateMask]
  );

  const handleMouseUp = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      isDrawing: false,
      dragStart: null,
    }));

    // 描画完了後、選択モードに戻る
    if (editorMode !== 'select') {
      setEditorMode('select');
    }
  }, [editorMode, setEditorMode]);

  // ズーム処理
  const handleZoom = useCallback(
    (delta: number, centerX?: number, centerY?: number) => {
      setCanvasState((prev) => {
        const newScale = Math.max(0.1, Math.min(5, prev.scale + delta));
        return {
          ...prev,
          scale: newScale,
        };
      });
    },
    []
  );

  // キーボードショートカット
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Delete':
          if (canvasState.selectedElement) {
            const { type, id } = canvasState.selectedElement;
            switch (type) {
              case 'hotspot':
                deleteHotspot(step.id, id);
                break;
              case 'annotation':
                deleteAnnotation(step.id, id);
                break;
              case 'mask':
                deleteMask(step.id, id);
                break;
            }
            setCanvasState((prev) => ({ ...prev, selectedElement: null }));
          }
          break;

        case 'Escape':
          setCanvasState((prev) => ({ ...prev, selectedElement: null }));
          setEditorMode('select');
          break;
      }
    },
    [
      canvasState.selectedElement,
      step.id,
      deleteHotspot,
      deleteAnnotation,
      deleteMask,
      setEditorMode,
    ]
  );

  // キャンバス再描画
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [drawCanvas, imageLoaded]);

  return (
    <div className={cn('flex flex-col space-y-4', className)}>
      {/* ツールバー */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* 選択ツール */}
              <div className="flex items-center space-x-1">
                <Button
                  variant={editorMode === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditorMode('select')}
                >
                  <MousePointer2 className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button
                  variant={
                    editorMode === 'hotspot-rect' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setEditorMode('hotspot-rect')}
                  title="矩形ホットスポット"
                >
                  <Square className="w-4 h-4" />
                </Button>
                <Button
                  variant={
                    editorMode === 'hotspot-circle' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setEditorMode('hotspot-circle')}
                  title="円形ホットスポット"
                >
                  <Circle className="w-4 h-4" />
                </Button>
                <Button
                  variant={
                    editorMode === 'hotspot-free' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setEditorMode('hotspot-free')}
                  title="自由形ホットスポット"
                >
                  <Pen className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button
                  variant={editorMode === 'annotation' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditorMode('annotation')}
                  title="注釈"
                >
                  <Type className="w-4 h-4" />
                </Button>
                <Button
                  variant={editorMode === 'mask' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditorMode('mask')}
                  title="ぼかし"
                >
                  <Filter className="w-4 h-4" />
                </Button>
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(-0.2)}
                title="縮小"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-mono min-w-[4rem] text-center">
                {Math.round(canvasState.scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(0.2)}
                title="拡大"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCanvasState((prev) => ({
                    ...prev,
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0,
                  }))
                }
                title="リセット"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* キャンバス */}
      <Card>
        <CardContent className="p-4">
          <div
            ref={containerRef}
            className="border rounded-lg overflow-hidden"
            style={{ width, height }}
          >
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
