'use client';

import { useCallback } from 'react';
import type { NormalizedCoordinate } from '@/lib/types';
import type { CanvasState, CanvasCoordinates } from './types';

interface CanvasViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasState: CanvasState;
}

export function useCanvasViewport({
  canvasRef,
  canvasState,
}: CanvasViewportProps) {
  // マウス座標を正規化座標に変換
  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number): CanvasCoordinates => {
      const canvas = canvasRef.current;
      if (!canvas)
        return { x: 0 as NormalizedCoordinate, y: 0 as NormalizedCoordinate };

      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = canvasState;

      const canvasX = (clientX - rect.left - offsetX) / scale;
      const canvasY = (clientY - rect.top - offsetY) / scale;

      return {
        x: Math.max(
          0,
          Math.min(1, canvasX / (canvas.width / scale))
        ) as NormalizedCoordinate,
        y: Math.max(
          0,
          Math.min(1, canvasY / (canvas.height / scale))
        ) as NormalizedCoordinate,
      };
    },
    [canvasRef, canvasState]
  );

  // ズーム処理
  const handleZoom = useCallback(
    (delta: number, centerX?: number, centerY?: number) => {
      const newScale = Math.max(0.1, Math.min(5, canvasState.scale + delta));

      // ズーム中心点を考慮したオフセット調整
      let newOffsetX = canvasState.offsetX;
      let newOffsetY = canvasState.offsetY;

      if (centerX !== undefined && centerY !== undefined) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = centerX - rect.left;
          const mouseY = centerY - rect.top;

          const scaleRatio = newScale / canvasState.scale;
          newOffsetX = mouseX - (mouseX - canvasState.offsetX) * scaleRatio;
          newOffsetY = mouseY - (mouseY - canvasState.offsetY) * scaleRatio;
        }
      }

      return {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    },
    [canvasRef, canvasState]
  );

  // パン処理
  const handlePan = useCallback(
    (deltaX: number, deltaY: number) => {
      return {
        offsetX: canvasState.offsetX + deltaX,
        offsetY: canvasState.offsetY + deltaY,
      };
    },
    [canvasState]
  );

  // ビューポートリセット
  const resetViewport = useCallback(() => {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }, []);

  // 要素をビューポート内に収める
  const fitToViewport = useCallback(
    (elementBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      const canvas = canvasRef.current;
      if (!canvas) return {};

      const padding = 50;
      const scaleX = (canvas.width - padding * 2) / elementBounds.width;
      const scaleY = (canvas.height - padding * 2) / elementBounds.height;
      const scale = Math.min(scaleX, scaleY, 1);

      const offsetX =
        (canvas.width - elementBounds.width * scale) / 2 -
        elementBounds.x * scale;
      const offsetY =
        (canvas.height - elementBounds.height * scale) / 2 -
        elementBounds.y * scale;

      return {
        scale,
        offsetX,
        offsetY,
      };
    },
    [canvasRef]
  );

  return {
    getCanvasCoordinates,
    handleZoom,
    handlePan,
    resetViewport,
    fitToViewport,
  };
}
