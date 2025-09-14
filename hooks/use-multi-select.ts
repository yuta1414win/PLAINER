'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface SelectableItem {
  id: string;
  type: 'hotspot' | 'annotation' | 'mask';
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UseMultiSelectOptions {
  items: SelectableItem[];
  onSelectionChange?: (selectedIds: string[]) => void;
  enabled?: boolean;
}

export function useMultiSelect({
  items,
  onSelectionChange,
  enabled = true,
}: UseMultiSelectOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  // Toggle selection of a single item
  const toggleSelection = useCallback(
    (id: string, multiSelect = false) => {
      if (!enabled) return;

      setSelectedIds((prev) => {
        const newSelection = new Set(prev);

        if (!multiSelect) {
          // Single selection mode - clear others
          newSelection.clear();
          newSelection.add(id);
        } else {
          // Multi-selection mode - toggle
          if (newSelection.has(id)) {
            newSelection.delete(id);
          } else {
            newSelection.add(id);
          }
        }

        const selectedArray = Array.from(newSelection);
        onSelectionChange?.(selectedArray);
        return newSelection;
      });

      setLastSelectedId(id);
    },
    [enabled, onSelectionChange]
  );

  // Select range of items (Shift+click)
  const selectRange = useCallback(
    (fromId: string, toId: string) => {
      if (!enabled) return;

      const fromIndex = items.findIndex((item) => item.id === fromId);
      const toIndex = items.findIndex((item) => item.id === toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      setSelectedIds((prev) => {
        const newSelection = new Set(prev);

        for (let i = start; i <= end; i++) {
          newSelection.add(items[i].id);
        }

        const selectedArray = Array.from(newSelection);
        onSelectionChange?.(selectedArray);
        return newSelection;
      });
    },
    [enabled, items, onSelectionChange]
  );

  // Handle click on item
  const handleItemClick = useCallback(
    (id: string, event: MouseEvent | React.MouseEvent) => {
      if (!enabled) return;

      if (event.shiftKey && lastSelectedId) {
        // Shift+click: select range
        selectRange(lastSelectedId, id);
      } else if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+click: toggle selection
        toggleSelection(id, true);
      } else {
        // Regular click: single selection
        toggleSelection(id, false);
      }
    },
    [enabled, lastSelectedId, selectRange, toggleSelection]
  );

  // Start selection box
  const startSelectionBox = useCallback(
    (x: number, y: number) => {
      if (!enabled) return;

      startPointRef.current = { x, y };
      setIsSelecting(true);
      setSelectionBox({
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      });
    },
    [enabled]
  );

  // Update selection box
  const updateSelectionBox = useCallback(
    (x: number, y: number) => {
      if (!isSelecting || !startPointRef.current) return;

      setSelectionBox({
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX: x,
        endY: y,
      });

      // Check which items are within the selection box
      const box = {
        left: Math.min(startPointRef.current.x, x),
        right: Math.max(startPointRef.current.x, x),
        top: Math.min(startPointRef.current.y, y),
        bottom: Math.max(startPointRef.current.y, y),
      };

      const newSelection = new Set<string>();

      items.forEach((item) => {
        const itemBounds = {
          left: item.x,
          right: item.x + (item.width || 0),
          top: item.y,
          bottom: item.y + (item.height || 0),
        };

        // Check if item intersects with selection box
        if (
          itemBounds.left < box.right &&
          itemBounds.right > box.left &&
          itemBounds.top < box.bottom &&
          itemBounds.bottom > box.top
        ) {
          newSelection.add(item.id);
        }
      });

      setSelectedIds(newSelection);
      onSelectionChange?.(Array.from(newSelection));
    },
    [isSelecting, items, onSelectionChange]
  );

  // End selection box
  const endSelectionBox = useCallback(() => {
    setIsSelecting(false);
    setSelectionBox(null);
    startPointRef.current = null;
  }, []);

  // Select all items
  const selectAll = useCallback(() => {
    if (!enabled) return;

    const allIds = new Set(items.map((item) => item.id));
    setSelectedIds(allIds);
    onSelectionChange?.(Array.from(allIds));
  }, [enabled, items, onSelectionChange]);

  // Invert selection
  const invertSelection = useCallback(() => {
    if (!enabled) return;

    setSelectedIds((prev) => {
      const newSelection = new Set<string>();

      items.forEach((item) => {
        if (!prev.has(item.id)) {
          newSelection.add(item.id);
        }
      });

      const selectedArray = Array.from(newSelection);
      onSelectionChange?.(selectedArray);
      return newSelection;
    });
  }, [enabled, items, onSelectionChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Ctrl/Cmd+Shift+A: Deselect all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        clearSelection();
      }

      // Ctrl/Cmd+I: Invert selection
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        invertSelection();
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, selectAll, clearSelection, invertSelection]);

  return {
    selectedIds: Array.from(selectedIds),
    selectionBox,
    isSelecting,
    isSelected: (id: string) => selectedIds.has(id),
    handleItemClick,
    toggleSelection,
    selectRange,
    clearSelection,
    selectAll,
    invertSelection,
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
  };
}
