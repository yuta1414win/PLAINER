'use client';

import { useCallback } from 'react';
import type { Hotspot, Annotation, Mask } from '@/lib/types';
import type { CanvasState } from './types';

export function useCanvasDrawing() {
  // グリッド描画
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, canvasState: CanvasState) => {
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
    []
  );

  // ホットスポット描画
  const drawHotspot = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      hotspot: Hotspot,
      canvasState: CanvasState
    ) => {
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
          if ('w' in hotspot && 'h' in hotspot && hotspot.w && hotspot.h) {
            const w = (hotspot.w * canvas.width) / scale;
            const h = (hotspot.h * canvas.height) / scale;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
          }
          break;

        case 'circle':
          if ('r' in hotspot && hotspot.r) {
            const r =
              (hotspot.r * Math.min(canvas.width, canvas.height)) / scale;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          break;

        case 'free':
          if (
            'points' in hotspot &&
            hotspot.points &&
            hotspot.points.length > 0
          ) {
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
    []
  );

  // 注釈描画
  const drawAnnotation = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      annotation: Annotation,
      canvasState: CanvasState
    ) => {
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
      ctx.font = `${(annotation.style?.fontSize || 14) / scale}px ${
        annotation.style?.fontWeight || 'normal'
      } system-ui`;

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
    []
  );

  // マスク描画
  const drawMask = useCallback(
    (ctx: CanvasRenderingContext2D, mask: Mask, canvasState: CanvasState) => {
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
        : `rgba(0, 0, 0, ${mask.blur / 200})`;
      ctx.fillRect(x, y, w, h);

      // 枠線
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6b7280';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(x, y, w, h);

      ctx.restore();
    },
    []
  );

  return {
    drawGrid,
    drawHotspot,
    drawAnnotation,
    drawMask,
  };
}
