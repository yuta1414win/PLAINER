import type { NormalizedCoordinate, UUID } from '@/lib/types';

// キャンバスの状態管理
export interface CanvasState {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly isDrawing: boolean;
  readonly dragStart: { x: number; y: number } | null;
  readonly selectedElement: {
    type: 'hotspot' | 'annotation' | 'mask';
    id: UUID;
  } | null;
}

// エディタモード
export type EditorMode =
  | 'select'
  | 'hotspot-rect'
  | 'hotspot-circle'
  | 'hotspot-free'
  | 'annotation'
  | 'mask'
  | 'pan'
  | 'zoom';

// キャンバス座標
export interface CanvasCoordinates {
  readonly x: NormalizedCoordinate;
  readonly y: NormalizedCoordinate;
}

// 描画ツール
export interface DrawingTool {
  readonly id: string;
  readonly name: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly mode: EditorMode;
  readonly shortcut?: string;
}

// キャンバスコンテキスト
export interface CanvasContextType {
  readonly canvasState: CanvasState;
  readonly setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  readonly editorMode: EditorMode;
  readonly setEditorMode: (mode: EditorMode) => void;
  readonly showGrid: boolean;
  readonly showGuides: boolean;
  readonly toggleGrid: () => void;
  readonly toggleGuides: () => void;
}

// イベント型
export interface CanvasMouseEvent {
  readonly clientX: number;
  readonly clientY: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export interface CanvasWheelEvent extends CanvasMouseEvent {
  readonly deltaY: number;
}
