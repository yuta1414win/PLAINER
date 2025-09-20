'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Grid, ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Sparkles, Maximize2 } from 'lucide-react';
import { FloatingToolbar, type ToolType } from '@/components/floating-toolbar';
import { CanvasContextMenu } from '@/components/canvas-context-menu';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store';
import { useKeyboardFocus } from '@/hooks/use-keyboard-focus';
import type {
  Hotspot,
  Annotation,
  Mask,
  Step,
  NormalizedCoordinate,
} from '@/lib/types';
import type { UserCursor } from '@/lib/collaboration/types';
import { UserCursors } from '@/components/collaboration/user-cursors';
import { useIntelligentFeatures } from '@/hooks/use-intelligent-features';
import { nanoid } from 'nanoid';
import { useNotifications } from '@/lib/stores';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const POSITION_EPSILON = 0.0005;

const ANNOTATION_PADDING_X = 8;
const ANNOTATION_PADDING_Y = 6;
const ANNOTATION_FONT_FALLBACK =
  'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif';

interface CanvasEditorProps {
  step: Step;
  width?: number;
  height?: number;
  className?: string;
  // リアルタイム共同編集: 他ユーザーのカーソル表示
  remoteCursors?: UserCursor[];
  // 親コンポーネントにコンテナ要素を通知（カーソルトラッキング用）
  onContainerRef?: (el: HTMLDivElement | null) => void;
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
  selectedTool: ToolType;
  showFloatingToolbar: boolean;
  clipboard: any | null;
  draggingElement:
    | {
        type: 'annotation';
        id: string;
      }
    | null;
  dragOffsetNormalized: { x: number; y: number } | null;
}

export function CanvasEditorModern({
  step,
  width = 800,
  height = 600,
  className,
  remoteCursors,
  onContainerRef,
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
    selectedTool: 'select',
    showFloatingToolbar: true,
    clipboard: null,
    draggingElement: null,
    dragOffsetNormalized: null,
  });
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(
    null
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const { suggestHotspots, checkAccessibility } = useIntelligentFeatures();
  const { showSuccess, showInfo, showWarning } = useNotifications();

  // キーボードフォーカス管理
  const { registerZone, currentZone, focusZone } = useKeyboardFocus({
    defaultZone: 'canvas',
    onZoneChange: (zone) => {
      console.log(`Focus zone changed to: ${zone}`);
    },
  });

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

  // フォーカスゾーン登録
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = registerZone('canvas', containerRef.current);
      return cleanup;
    }
  }, [registerZone]);

  // 親へコンテナ参照を通知（カーソルトラッキングに使用）
  useEffect(() => {
    if (!onContainerRef) return;
    onContainerRef(containerRef.current);
    return () => {
      onContainerRef(null);
    };
  }, [onContainerRef]);

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

  const runAISuggestions = useCallback(async () => {
    const img = imageRef.current;
    if (!img) return;
    try {
      const candidates = await suggestHotspots(img);
      if (!candidates.length) {
        showInfo?.('AI候補は見つかりませんでした');
        return;
      }
      const limit = Math.min(5, candidates.length);
      for (let i = 0; i < limit; i++) {
        const c = candidates[i];
        if (!c) continue;
        const nx = Math.max(0, Math.min(1, c.x / img.width));
        const ny = Math.max(0, Math.min(1, c.y / img.height));
        const nw = Math.max(0, Math.min(1, c.width / img.width));
        const nh = Math.max(0, Math.min(1, c.height / img.height));

        // Basic a11y evaluation
        const issues = checkAccessibility({
          hotspotWidthPx: c.width,
          hotspotHeightPx: c.height,
        });
        if (issues.find((x: any) => x.type === 'size')) {
          // Skip too-small targets
          continue;
        }

        // Add hotspot
        addHotspot?.(step.id, {
          id: (`hotspot-${nanoid(8)}`) as any,
          shape: 'rect',
          x: nx as any,
          y: ny as any,
          w: nw as any,
          h: nh as any,
          label: `${c.label}`,
        });
      }
      showSuccess?.(`AI候補を${Math.min(5, candidates.length)}件追加しました`);
    } catch (e) {
      console.error(e);
      showWarning?.('AI候補の生成に失敗しました');
    }
  }, [suggestHotspots, addHotspot, step.id, checkAccessibility, showSuccess, showWarning, showInfo]);

  const getNormalizedPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return {
          x: 0 as NormalizedCoordinate,
          y: 0 as NormalizedCoordinate,
        };
      }

      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      const normalizedX = clamp01((localX - canvasState.offsetX) / canvas.width) as NormalizedCoordinate;
      const normalizedY = clamp01((localY - canvasState.offsetY) / canvas.height) as NormalizedCoordinate;

      return { x: normalizedX, y: normalizedY };
    },
    [canvasState.offsetX, canvasState.offsetY]
  );

  const getAnnotationBoundingBox = useCallback(
    (annotation: Annotation) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const text = annotation.text || '';
      const fontSize = annotation.style?.fontSize ?? 14;
      const fontWeight = annotation.style?.fontWeight ?? 'normal';

      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${ANNOTATION_FONT_FALLBACK}`;
      const metrics = ctx.measureText(text);
      ctx.restore();

      const ascent = metrics.actualBoundingBoxAscent || fontSize;
      const descent =
        metrics.actualBoundingBoxDescent || Math.max(2, fontSize * 0.25);
      const width = metrics.width + ANNOTATION_PADDING_X * 2;
      const height = ascent + descent + ANNOTATION_PADDING_Y * 2;

      const annotationX = Number(annotation.x ?? 0);
      const annotationY = Number(annotation.y ?? 0);

      const baseX = annotationX * canvas.width;
      const baseY = annotationY * canvas.height;

      return {
        x: canvasState.offsetX + baseX - ANNOTATION_PADDING_X,
        y: canvasState.offsetY + (baseY - ascent - ANNOTATION_PADDING_Y),
        width,
        height,
      };
    },
    [canvasState.offsetX, canvasState.offsetY]
  );

  const hitTestAnnotation = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      for (let i = step.annotations.length - 1; i >= 0; i -= 1) {
        const annotation = step.annotations[i];
        if (!annotation) continue;
        const box = getAnnotationBoundingBox(annotation);
        if (!box) continue;

        if (
          localX >= box.x &&
          localX <= box.x + box.width &&
          localY >= box.y &&
          localY <= box.y + box.height
        ) {
          return { annotation, box };
        }
      }

      return null;
    },
    [step.annotations, getAnnotationBoundingBox]
  );

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

      const x = ((hotspot.x || 0) * canvas.width) / scale;
      const y = ((hotspot.y || 0) * canvas.height) / scale;

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
          } else {
            // デフォルトサイズの矩形を描画
            const defaultSize = 50 / scale;
            ctx.fillRect(
              x - defaultSize / 2,
              y - defaultSize / 2,
              defaultSize,
              defaultSize
            );
            ctx.strokeRect(
              x - defaultSize / 2,
              y - defaultSize / 2,
              defaultSize,
              defaultSize
            );
          }
          break;

        case 'circle':
          if (hotspot.r) {
            const r = (hotspot.r * canvas.width) / scale;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            // デフォルトサイズの円を描画
            const defaultRadius = 25 / scale;
            ctx.beginPath();
            ctx.arc(x, y, defaultRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          break;

        case 'free':
          if (hotspot.points && hotspot.points.length > 0) {
            ctx.beginPath();
            hotspot.points.forEach((point, index) => {
              if (
                point &&
                typeof point.x === 'number' &&
                typeof point.y === 'number'
              ) {
                const px = (point.x * canvas.width) / scale;
                const py = (point.y * canvas.height) / scale;
                if (index === 0) {
                  ctx.moveTo(px, py);
                } else {
                  ctx.lineTo(px, py);
                }
              }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // デフォルトの円を描画
            const defaultRadius = 25 / scale;
            ctx.beginPath();
            ctx.arc(x, y, defaultRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          break;

        default:
          // デフォルトの円を描画
          const defaultRadius = 25 / scale;
          ctx.beginPath();
          ctx.arc(x, y, defaultRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
      }

      ctx.restore();
    },
    [canvasState]
  );

  // 注釈描画（テキストバッジ）
  const drawAnnotation = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
      const { scale, offsetX, offsetY } = canvasState;
      const canvas = ctx.canvas;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const x = ((annotation.x || 0) * canvas.width) / scale;
      const y = ((annotation.y || 0) * canvas.height) / scale;

      // 選択状態の確認
      const isSelected =
        canvasState.selectedElement?.type === 'annotation' &&
        canvasState.selectedElement?.id === annotation.id;

      // フォント設定
      const fontSize = (annotation.style?.fontSize ?? 14) / scale;
      const fontWeight = annotation.style?.fontWeight ?? 'normal';
      const textColor = annotation.style?.color ?? '#1f2937';
      const background =
        annotation.style?.backgroundColor ??
        (isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.9)');

      ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';

      const text = annotation.text || '';
      const metrics = ctx.measureText(text);
      const paddingX = 8 / scale;
      const paddingY = 6 / scale;

      // 背景バッジ
      ctx.fillStyle = background;
      const bgX = x - paddingX;
      const bgY = y - metrics.actualBoundingBoxAscent - paddingY;
      const bgW = metrics.width + paddingX * 2;
      const bgH =
        metrics.actualBoundingBoxAscent +
        metrics.actualBoundingBoxDescent +
        paddingY * 2;
      ctx.fillRect(bgX, bgY, bgW, bgH);

      // テキスト
      ctx.fillStyle = textColor;
      ctx.fillText(text, x, y);

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

      const x = (mask.x || 0) * (canvas.width / scale);
      const y = (mask.y || 0) * (canvas.height / scale);
      const w = (mask.w || 0.1) * (canvas.width / scale);
      const h = (mask.h || 0.1) * (canvas.height / scale);

      // 選択状態の確認
      const isSelected =
        canvasState.selectedElement?.type === 'mask' &&
        canvasState.selectedElement?.id === mask.id;

      // マスク描画
      const opacity = mask.style?.opacity ?? 0.5;
      ctx.fillStyle = isSelected
        ? `rgba(0, 0, 0, ${opacity * 0.8})`
        : `rgba(0, 0, 0, ${opacity})`;
      ctx.fillRect(x, y, w, h);

      // 選択時の枠線
      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / scale;
        ctx.strokeRect(x, y, w, h);
      }

      ctx.restore();
    },
    [canvasState]
  );

  // Tool and element handlers
  const handleToolChange = useCallback(
    (tool: ToolType) => {
      setCanvasState((prev) => ({ ...prev, selectedTool: tool }));
      // Map tool to editor mode
      switch (tool) {
        case 'select':
          setEditorMode('select');
          break;
        case 'hotspot':
          setEditorMode('hotspot-rect');
          break;
        case 'annotation':
          setEditorMode('annotation');
          break;
        case 'mask':
          setEditorMode('mask');
          break;
        default:
          setEditorMode('select');
      }
    },
    [setEditorMode]
  );

  // Context menu handlers
  const handleCopy = useCallback(() => {
    if (canvasState.selectedElement) {
      setCanvasState((prev) => ({
        ...prev,
        clipboard: { ...canvasState.selectedElement },
      }));
    }
  }, [canvasState.selectedElement]);

  const handlePaste = useCallback(() => {
    if (canvasState.clipboard) {
      // Implementation for paste
      console.log('Pasting:', canvasState.clipboard);
    }
  }, [canvasState.clipboard]);

  const handleDelete = useCallback(() => {
    if (canvasState.selectedElement) {
      const { type, id } = canvasState.selectedElement;
      switch (type) {
        case 'hotspot':
          deleteHotspot(step.id as any, id as any);
          break;
        case 'annotation':
          deleteAnnotation(step.id as any, id as any);
          break;
        case 'mask':
          deleteMask(step.id as any, id as any);
          break;
      }
      setCanvasState((prev) => ({ ...prev, selectedElement: null }));
    }
  }, [
    canvasState.selectedElement,
    deleteHotspot,
    deleteAnnotation,
    deleteMask,
    step.id,
  ]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const hit = hitTestAnnotation(e.clientX, e.clientY);
      if (hit) {
        const { annotation } = hit;
        const { x: normalizedX, y: normalizedY } = getNormalizedPoint(
          e.clientX,
          e.clientY
        );
        const annotationX = annotation.x ?? (0 as NormalizedCoordinate);
        const annotationY = annotation.y ?? (0 as NormalizedCoordinate);

        setCanvasState((prev) => ({
          ...prev,
          selectedElement: { type: 'annotation', id: annotation.id },
          draggingElement: { type: 'annotation', id: annotation.id },
          dragOffsetNormalized: {
            x: normalizedX - annotationX,
            y: normalizedY - annotationY,
          },
          isDrawing: false,
          dragStart: null,
        }));
        setHoveredAnnotationId(annotation.id);
        return;
      }

      if (editorMode === 'annotation') {
        const { x: normalizedX, y: normalizedY } = getNormalizedPoint(
          e.clientX,
          e.clientY
        );

        const newAnnotation: Annotation = {
          id: (`annotation-${Date.now()}`) as any,
          text: '新しい注釈',
          x: normalizedX,
          y: normalizedY,
          style: {
            color: '#1f2937' as any,
            fontSize: 14,
            fontWeight: 'normal',
          },
        };
        addAnnotation(step.id, newAnnotation);
        setCanvasState((prev) => ({
          ...prev,
          selectedElement: { type: 'annotation', id: newAnnotation.id },
          draggingElement: { type: 'annotation', id: newAnnotation.id },
          dragOffsetNormalized: { x: 0, y: 0 },
          isDrawing: false,
          dragStart: null,
        }));
        setHoveredAnnotationId(newAnnotation.id);
        return;
      }

      setCanvasState((prev) => ({
        ...prev,
        isDrawing: true,
        dragStart: { x: clientX, y: clientY },
        draggingElement: null,
        dragOffsetNormalized: null,
      }));
    },
    [
      getNormalizedPoint,
      hitTestAnnotation,
      editorMode,
      addAnnotation,
      step.id,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (canvasState.draggingElement?.type === 'annotation') {
        const annotationId = canvasState.draggingElement.id;
        const annotation = step.annotations.find(
          (item) => item.id === annotationId
        );
        if (!annotation) return;

        const { x: normalizedX, y: normalizedY } = getNormalizedPoint(
          e.clientX,
          e.clientY
        );
        const offset = canvasState.dragOffsetNormalized ?? { x: 0, y: 0 };

        const targetX = clamp01(normalizedX - offset.x) as NormalizedCoordinate;
        const targetY = clamp01(normalizedY - offset.y) as NormalizedCoordinate;

        const currentX = Number(annotation.x ?? 0);
        const currentY = Number(annotation.y ?? 0);

        if (
          Math.abs(currentX - Number(targetX)) > POSITION_EPSILON ||
          Math.abs(currentY - Number(targetY)) > POSITION_EPSILON
        ) {
          updateAnnotation(step.id, annotationId as any, {
            x: targetX,
            y: targetY,
          });
        }
        return;
      }

      if (canvasState.isDrawing && canvasState.dragStart) {
        const deltaX = clientX - canvasState.dragStart.x;
        const deltaY = clientY - canvasState.dragStart.y;

        if (editorMode === 'select') {
          setCanvasState((prev) => ({
            ...prev,
            offsetX: prev.offsetX + deltaX,
            offsetY: prev.offsetY + deltaY,
            dragStart: { x: clientX, y: clientY },
          }));
        }
        return;
      }

      const hit = hitTestAnnotation(e.clientX, e.clientY);
      const hoveredId = hit?.annotation.id ?? null;
      if (hoveredAnnotationId !== hoveredId) {
        setHoveredAnnotationId(hoveredId);
      }
    },
    [
      canvasState.draggingElement,
      canvasState.dragOffsetNormalized,
      canvasState.isDrawing,
      canvasState.dragStart,
      editorMode,
      getNormalizedPoint,
      hitTestAnnotation,
      hoveredAnnotationId,
      step.annotations,
      step.id,
      updateAnnotation,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      isDrawing: false,
      dragStart: null,
      draggingElement: null,
      dragOffsetNormalized: null,
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredAnnotationId(null);
    setCanvasState((prev) => ({
      ...prev,
      isDrawing: false,
      dragStart: null,
      draggingElement: null,
      dragOffsetNormalized: null,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvasState.draggingElement) {
      canvas.style.cursor = 'grabbing';
    } else if (hoveredAnnotationId) {
      canvas.style.cursor = 'grab';
    } else if (canvasState.isDrawing && editorMode === 'select') {
      canvas.style.cursor = 'grabbing';
    } else if (editorMode === 'annotation') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'default';
    }
  }, [
    canvasState.draggingElement,
    canvasState.isDrawing,
    hoveredAnnotationId,
    editorMode,
  ]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);

    setCanvasState((prev) => {
      const newScale = Math.max(0.1, Math.min(5, prev.scale * zoom));
      return {
        ...prev,
        scale: newScale,
      };
    });
  }, []);

  // Zoom handler
  const handleZoom = useCallback((delta: number) => {
    setCanvasState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + delta)),
    }));
  }, []);

  // Zoom to specific level
  const handleZoomTo = useCallback((scale: number) => {
    setCanvasState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, scale)),
    }));
  }, []);

  // Zoom to fit
  const handleZoomToFit = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;

    if (!canvas || !container || !img) return;

    const containerRect = container.getBoundingClientRect();
    const imgAspect = img.width / img.height;
    const containerAspect = containerRect.width / containerRect.height;

    let scale;
    if (imgAspect > containerAspect) {
      // Image is wider than container
      scale = (containerRect.width - 40) / img.width; // 40px padding
    } else {
      // Image is taller than container
      scale = (containerRect.height - 40) / img.height; // 40px padding
    }

    setCanvasState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, scale)),
      offsetX: 0,
      offsetY: 0,
    }));
  }, []);

  // Reset view
  const handleReset = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    }));
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoom(0.1);
            break;
          case '-':
            e.preventDefault();
            handleZoom(-0.1);
            break;
          case '0':
            e.preventDefault();
            handleReset();
            break;
          case '9':
            e.preventDefault();
            handleZoomToFit();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleZoom, handleReset, handleZoomToFit]);

  // Update canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* Floating Toolbar */}
        <FloatingToolbar
          selectedTool={canvasState.selectedTool}
          onToolChange={handleToolChange}
          isVisible={canvasState.showFloatingToolbar}
          showLayerControls={!!canvasState.selectedElement}
          onDuplicate={() => console.log('Duplicate')}
          onDelete={handleDelete}
          onLayerToggle={() => console.log('Toggle layers')}
          onVisibilityToggle={() => console.log('Toggle visibility')}
          onLockToggle={() => console.log('Toggle lock')}
        />

        {/* Canvas with Context Menu */}
        <CanvasContextMenu
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDelete={handleDelete}
          onDuplicate={() => console.log('Duplicate')}
          selectedItems={canvasState.selectedElement ? 1 : 0}
          canPaste={!!canvasState.clipboard}
          elementType={canvasState.selectedElement?.type || null}
          onBringToFront={() => console.log('Bring to front')}
          onSendToBack={() => console.log('Send to back')}
          onAlignLeft={() => console.log('Align left')}
          onAlignCenter={() => console.log('Align center')}
          onAlignRight={() => console.log('Align right')}
        >
          <div
            ref={containerRef}
            className={cn(
              'relative w-full h-full overflow-hidden bg-muted/20',
              'focus:outline-none transition-all duration-200',
              currentZone === 'canvas' && 'ring-2 ring-blue-500 ring-opacity-50'
            )}
            role="application"
            aria-label="画像編集キャンバス"
            tabIndex={0}
          >
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className={cn(
                'border-2 border-dashed border-muted-foreground/20',
                canvasState.isDrawing && 'cursor-crosshair'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              role="img"
              aria-label="編集中の画像"
            />

            {/* 他ユーザーのカーソルオーバーレイ */}
            {remoteCursors && remoteCursors.length > 0 && (
              <div className="pointer-events-none absolute inset-0">
                <UserCursors cursors={remoteCursors} />
              </div>
            )}
          </div>
        </CanvasContextMenu>

        {/* Zoom Controls - Left Bottom */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-background/95 border rounded-lg p-1 shadow-lg backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom(0.1)}
            className="h-8 w-8 p-0"
            title="ズームイン"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom(-0.1)}
            className="h-8 w-8 p-0"
            title="ズームアウト"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomToFit}
            className="h-8 w-8 p-0"
            title="画像に合わせる"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <span className="text-xs text-muted-foreground px-1 min-w-[40px] text-center">
            {Math.round(canvasState.scale * 100)}%
          </span>
        </div>

        {/* View Controls - Right Bottom */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/95 border rounded-lg p-1 shadow-lg backdrop-blur-sm">
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleGrid}
            className="h-8 w-8 p-0"
            title="グリッド表示"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={showGuides ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleGuides}
            className="h-8 w-8 p-0"
            title="ガイド表示"
          >
            {showGuides ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 w-8 p-0"
            title="表示をリセット"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Suggestion - Top Right */}
        <div className="absolute top-4 right-4">
          <Button
            variant="default"
            size="sm"
            className="flex items-center gap-2 shadow"
            onClick={runAISuggestions}
            title="画像からホットスポット候補を提案"
          >
            <Sparkles className="w-4 h-4" />
            候補を提案
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
