'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResizableContextValue {
  isDragging: boolean;
  startDragging: () => void;
  stopDragging: () => void;
}

const ResizableContext = React.createContext<ResizableContextValue>({
  isDragging: false,
  startDragging: () => {},
  stopDragging: () => {},
});

interface ResizableProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  direction?: 'horizontal' | 'vertical';
  onResize?: (size: number) => void;
  persistKey?: string;
  className?: string;
  children: React.ReactNode;
}

export function ResizablePanel({
  defaultSize = 300,
  minSize = 200,
  maxSize = 600,
  direction = 'horizontal',
  onResize,
  persistKey,
  className,
  children,
}: ResizableProps) {
  const [size, setSize] = React.useState<number>(() => {
    if (persistKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`resizable-${persistKey}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minSize && parsed <= maxSize) {
          return parsed;
        }
      }
    }
    return defaultSize;
  });

  const [isDragging, setIsDragging] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === 'horizontal') {
        newSize = e.clientX - rect.left;
      } else {
        newSize = e.clientY - rect.top;
      }

      newSize = Math.min(Math.max(newSize, minSize), maxSize);
      setSize(newSize);
      onResize?.(newSize);

      if (persistKey) {
        localStorage.setItem(`resizable-${persistKey}`, String(newSize));
      }
    },
    [isDragging, direction, minSize, maxSize, onResize, persistKey]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor =
        direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const contextValue = React.useMemo(
    () => ({
      isDragging,
      startDragging: () => setIsDragging(true),
      stopDragging: () => setIsDragging(false),
    }),
    [isDragging]
  );

  return (
    <ResizableContext.Provider value={contextValue}>
      <div
        ref={panelRef}
        className={cn(
          'relative flex',
          direction === 'horizontal' ? 'flex-row' : 'flex-col',
          className
        )}
        style={{
          [direction === 'horizontal' ? 'width' : 'height']: `${size}px`,
        }}
      >
        {children}
        <ResizableHandle
          direction={direction}
          onMouseDown={handleMouseDown}
          isDragging={isDragging}
        />
      </div>
    </ResizableContext.Provider>
  );
}

interface ResizableHandleProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

function ResizableHandle({
  direction,
  onMouseDown,
  isDragging,
}: ResizableHandleProps) {
  return (
    <div
      className={cn(
        'absolute z-20 transition-all',
        direction === 'horizontal'
          ? 'top-0 right-0 w-1 h-full cursor-col-resize hover:w-1.5'
          : 'bottom-0 left-0 h-1 w-full cursor-row-resize hover:h-1.5',
        isDragging ? 'bg-primary' : 'bg-border hover:bg-primary/50',
        'group'
      )}
      onMouseDown={onMouseDown}
    >
      <div
        className={cn(
          'absolute',
          direction === 'horizontal'
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-8',
          'flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
        )}
      >
        <div
          className={cn(
            'rounded-full bg-primary/20',
            direction === 'horizontal' ? 'w-1 h-6' : 'w-6 h-1'
          )}
        />
      </div>
    </div>
  );
}

export function useResizable() {
  const context = React.useContext(ResizableContext);
  if (!context) {
    throw new Error('useResizable must be used within ResizablePanel');
  }
  return context;
}
