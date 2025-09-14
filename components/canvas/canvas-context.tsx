'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CanvasState, EditorMode, CanvasContextType } from './types';

const CanvasContext = createContext<CanvasContextType | null>(null);

interface CanvasProviderProps {
  children: React.ReactNode;
  initialMode?: EditorMode;
}

const defaultCanvasState: CanvasState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isDrawing: false,
  dragStart: null,
  selectedElement: null,
};

export function CanvasProvider({
  children,
  initialMode = 'select',
}: CanvasProviderProps) {
  const [canvasState, setCanvasState] =
    useState<CanvasState>(defaultCanvasState);
  const [editorMode, setEditorMode] = useState<EditorMode>(initialMode);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(false);

  const toggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const toggleGuides = useCallback(() => {
    setShowGuides((prev) => !prev);
  }, []);

  const contextValue: CanvasContextType = {
    canvasState,
    setCanvasState,
    editorMode,
    setEditorMode,
    showGrid,
    showGuides,
    toggleGrid,
    toggleGuides,
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext(): CanvasContextType {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
}

export { CanvasContext };
