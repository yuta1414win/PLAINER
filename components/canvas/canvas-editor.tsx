'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store';
import type { Hotspot, Annotation, Mask, Step } from '@/lib/types';
import { CanvasProvider, useCanvasContext } from './canvas-context';
import { CanvasToolbar } from './canvas-toolbar';
import { useCanvasDrawing } from './canvas-drawing';
import { useCanvasViewport } from './canvas-viewport';
import { useDebounce } from '@/hooks/use-performance';

interface CanvasEditorProps {
  step: Step;
  width?: number;
  height?: number;
  className?: string;
}

function CanvasEditorContent({
  step,
  width = 800,
  height = 600,
  className,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { canvasState, setCanvasState, editorMode, setEditorMode, showGrid } =
    useCanvasContext();

  const {
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

  const { drawGrid, drawHotspot, drawAnnotation, drawMask } =
    useCanvasDrawing();
  const { getCanvasCoordinates, handleZoom, resetViewport } = useCanvasViewport(
    {
      canvasRef,
      canvasState,
      width,
      height,
    }
  );

  // 描画をデバウンス
  const debouncedDraw = useDebounce(drawCanvas, 16); // 60fps

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
  function drawCanvas() {
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
      drawGrid(ctx, canvasState);
    }

    // 要素描画
    step.hotspots.forEach((hotspot) => {
      drawHotspot(ctx, hotspot, canvasState);
    });

    step.annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation, canvasState);
    });

    step.masks.forEach((mask) => {
      drawMask(ctx, mask, canvasState);
    });
  }

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
          // 要素選択ロジック（実装省略）
          break;

        case 'hotspot-rect':
          const rectHotspot: Hotspot = {
            id: `hotspot-${Date.now()}` as any,
            shape: 'rect',
            x: coords.x,
            y: coords.y,
            w: 0 as any,
            h: 0 as any,
          };
          addHotspot(step.id, rectHotspot);
          setCanvasState((prev) => ({
            ...prev,
            selectedElement: { type: 'hotspot', id: rectHotspot.id },
          }));
          break;

        case 'hotspot-circle':
          const circleHotspot: Hotspot = {
            id: `hotspot-${Date.now()}` as any,
            shape: 'circle',
            x: coords.x,
            y: coords.y,
            r: 0 as any,
          };
          addHotspot(step.id, circleHotspot);
          setCanvasState((prev) => ({
            ...prev,
            selectedElement: { type: 'hotspot', id: circleHotspot.id },
          }));
          break;

        case 'annotation':
          const annotation: Annotation = {
            id: `annotation-${Date.now()}` as any,
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
            id: `mask-${Date.now()}` as any,
            x: coords.x,
            y: coords.y,
            w: 0 as any,
            h: 0 as any,
            blur: 50,
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
      setCanvasState,
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
              w: Math.abs(coords.x - startCoords.x) as any,
              h: Math.abs(coords.y - startCoords.y) as any,
              x: Math.min(startCoords.x, coords.x),
              y: Math.min(startCoords.y, coords.y),
            });
          } else if (hotspot.shape === 'circle') {
            const distance = Math.sqrt(
              Math.pow(coords.x - startCoords.x, 2) +
                Math.pow(coords.y - startCoords.y, 2)
            );
            updateHotspot(step.id, selectedElement.id, { r: distance as any });
          }
          break;

        case 'mask':
          updateMask(step.id, selectedElement.id, {
            w: Math.abs(coords.x - startCoords.x) as any,
            h: Math.abs(coords.y - startCoords.y) as any,
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

    if (editorMode !== 'select') {
      setEditorMode('select');
    }
  }, [editorMode, setEditorMode, setCanvasState]);

  // ズーム処理
  const handleCanvasZoom = useCallback(
    (delta: number, centerX?: number, centerY?: number) => {
      const updates = handleZoom(delta, centerX, centerY);
      setCanvasState((prev) => ({ ...prev, ...updates }));
    },
    [handleZoom, setCanvasState]
  );

  // リセット処理
  const handleReset = useCallback(() => {
    const updates = resetViewport();
    setCanvasState((prev) => ({ ...prev, ...updates }));
  }, [resetViewport, setCanvasState]);

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
      setCanvasState,
    ]
  );

  // キャンバス再描画
  useEffect(() => {
    if (imageLoaded) {
      debouncedDraw();
    }
  }, [debouncedDraw, imageLoaded, canvasState, step, showGrid]);

  return (
    <div className={cn('flex flex-col space-y-4', className)}>
      {/* ツールバー */}
      <CanvasToolbar
        onZoom={handleCanvasZoom}
        onReset={handleReset}
        scale={canvasState.scale}
      />

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

export function CanvasEditor(props: CanvasEditorProps) {
  return (
    <CanvasProvider>
      <CanvasEditorContent {...props} />
    </CanvasProvider>
  );
}
