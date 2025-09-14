'use client';

import { useState, useCallback, useMemo } from 'react';

export interface GuideItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'hotspot' | 'annotation' | 'mask';
}

export interface Guide {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  color?: string;
  temporary?: boolean;
}

export interface SnapInfo {
  x?: number;
  y?: number;
  guides: Guide[];
}

interface UseSmartGuidesOptions {
  items: GuideItem[];
  snapThreshold?: number;
  showGuides?: boolean;
  customGuides?: Guide[];
}

export function useSmartGuides({
  items,
  snapThreshold = 5,
  showGuides = true,
  customGuides = [],
}: UseSmartGuidesOptions) {
  const [temporaryGuides, setTemporaryGuides] = useState<Guide[]>([]);

  // Generate automatic guides from existing items
  const automaticGuides = useMemo(() => {
    const guides: Guide[] = [];

    items.forEach((item) => {
      const { x, y, width, height } = item;

      // Vertical guides (left, center, right edges)
      guides.push({
        id: `${item.id}-left`,
        type: 'vertical',
        position: x,
        start: y,
        end: y + height,
        color: 'rgba(59, 130, 246, 0.5)',
      });

      guides.push({
        id: `${item.id}-center-v`,
        type: 'vertical',
        position: x + width / 2,
        start: y,
        end: y + height,
        color: 'rgba(59, 130, 246, 0.3)',
      });

      guides.push({
        id: `${item.id}-right`,
        type: 'vertical',
        position: x + width,
        start: y,
        end: y + height,
        color: 'rgba(59, 130, 246, 0.5)',
      });

      // Horizontal guides (top, center, bottom edges)
      guides.push({
        id: `${item.id}-top`,
        type: 'horizontal',
        position: y,
        start: x,
        end: x + width,
        color: 'rgba(59, 130, 246, 0.5)',
      });

      guides.push({
        id: `${item.id}-center-h`,
        type: 'horizontal',
        position: y + height / 2,
        start: x,
        end: x + width,
        color: 'rgba(59, 130, 246, 0.3)',
      });

      guides.push({
        id: `${item.id}-bottom`,
        type: 'horizontal',
        position: y + height,
        start: x,
        end: x + width,
        color: 'rgba(59, 130, 246, 0.5)',
      });
    });

    return guides;
  }, [items]);

  // Combine all guides
  const allGuides = useMemo(() => {
    return [...automaticGuides, ...customGuides, ...temporaryGuides];
  }, [automaticGuides, customGuides, temporaryGuides]);

  // Find snap position for an item
  const findSnapPosition = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      excludeId?: string
    ): SnapInfo => {
      if (!showGuides) {
        return { guides: [] };
      }

      const snapInfo: SnapInfo = { guides: [] };
      const activeGuides: Guide[] = [];

      // Filter out guides from the item being moved
      const relevantGuides = allGuides.filter(
        (guide) => !excludeId || !guide.id.startsWith(excludeId)
      );

      // Check vertical snapping
      const leftEdge = x;
      const centerX = x + width / 2;
      const rightEdge = x + width;

      for (const guide of relevantGuides) {
        if (guide.type === 'vertical') {
          // Snap left edge to guide
          if (Math.abs(leftEdge - guide.position) <= snapThreshold) {
            snapInfo.x = guide.position;
            activeGuides.push({
              ...guide,
              start: Math.min(guide.start, y),
              end: Math.max(guide.end, y + height),
              temporary: true,
            });
          }
          // Snap center to guide
          else if (Math.abs(centerX - guide.position) <= snapThreshold) {
            snapInfo.x = guide.position - width / 2;
            activeGuides.push({
              ...guide,
              start: Math.min(guide.start, y),
              end: Math.max(guide.end, y + height),
              temporary: true,
            });
          }
          // Snap right edge to guide
          else if (Math.abs(rightEdge - guide.position) <= snapThreshold) {
            snapInfo.x = guide.position - width;
            activeGuides.push({
              ...guide,
              start: Math.min(guide.start, y),
              end: Math.max(guide.end, y + height),
              temporary: true,
            });
          }
        }
      }

      // Check horizontal snapping
      const topEdge = y;
      const centerY = y + height / 2;
      const bottomEdge = y + height;

      for (const guide of relevantGuides) {
        if (guide.type === 'horizontal') {
          // Snap top edge to guide
          if (Math.abs(topEdge - guide.position) <= snapThreshold) {
            snapInfo.y = guide.position;
            activeGuides.push({
              ...guide,
              start: Math.min(guide.start, x),
              end: Math.max(guide.end, x + width),
              temporary: true,
            });
          }
          // Snap center to guide
          else if (Math.abs(centerY - guide.position) <= snapThreshold) {
            snapInfo.y = guide.position - height / 2;
            activeGuides.push({
              ...guide,
              start: Math.min(guide.start, x),
              end: Math.max(guide.end, x + width),
              temporary: true,
            });
          }
          // Snap bottom edge to guide
          else if (Math.abs(bottomEdge - guide.position) <= snapThreshold) {
            snapInfo.y = guide.position - height;
            activeGuides.push({
              ...guide,
              start: Math.min(guide.start, x),
              end: Math.max(guide.end, x + width),
              temporary: true,
            });
          }
        }
      }

      snapInfo.guides = activeGuides;
      return snapInfo;
    },
    [allGuides, showGuides, snapThreshold]
  );

  // Show temporary guides during drag
  const showTemporaryGuides = useCallback((guides: Guide[]) => {
    setTemporaryGuides(guides);
  }, []);

  // Clear temporary guides
  const clearTemporaryGuides = useCallback(() => {
    setTemporaryGuides([]);
  }, []);

  // Calculate equal spacing between items
  const calculateEqualSpacing = useCallback(
    (selectedItems: GuideItem[], direction: 'horizontal' | 'vertical') => {
      if (selectedItems.length < 3) return [];

      const sortedItems = [...selectedItems].sort((a, b) => {
        return direction === 'horizontal' ? a.x - b.x : a.y - b.y;
      });

      const first = sortedItems[0];
      const last = sortedItems[sortedItems.length - 1];

      const totalSpace =
        direction === 'horizontal'
          ? last.x + last.width - first.x
          : last.y + last.height - first.y;

      const totalItemSize = sortedItems.reduce((sum, item) => {
        return sum + (direction === 'horizontal' ? item.width : item.height);
      }, 0);

      const spacing = (totalSpace - totalItemSize) / (sortedItems.length - 1);

      const guides: Guide[] = [];
      let currentPos =
        direction === 'horizontal'
          ? first.x + first.width
          : first.y + first.height;

      for (let i = 1; i < sortedItems.length - 1; i++) {
        currentPos += spacing;

        guides.push({
          id: `spacing-${i}`,
          type: direction === 'horizontal' ? 'vertical' : 'horizontal',
          position: currentPos,
          start:
            direction === 'horizontal'
              ? Math.min(...sortedItems.map((item) => item.y))
              : Math.min(...sortedItems.map((item) => item.x)),
          end:
            direction === 'horizontal'
              ? Math.max(...sortedItems.map((item) => item.y + item.height))
              : Math.max(...sortedItems.map((item) => item.x + item.width)),
          color: 'rgba(34, 197, 94, 0.7)',
          temporary: true,
        });

        currentPos +=
          direction === 'horizontal'
            ? sortedItems[i].width
            : sortedItems[i].height;
      }

      return guides;
    },
    []
  );

  // Calculate alignment guides for selected items
  const calculateAlignmentGuides = useCallback(
    (
      selectedItems: GuideItem[],
      alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
    ) => {
      if (selectedItems.length < 2) return [];

      const guides: Guide[] = [];
      let position: number;
      let guideType: 'vertical' | 'horizontal';

      switch (alignment) {
        case 'left':
          position = Math.min(...selectedItems.map((item) => item.x));
          guideType = 'vertical';
          break;
        case 'center':
          position =
            selectedItems.reduce(
              (sum, item) => sum + item.x + item.width / 2,
              0
            ) / selectedItems.length;
          guideType = 'vertical';
          break;
        case 'right':
          position = Math.max(
            ...selectedItems.map((item) => item.x + item.width)
          );
          guideType = 'vertical';
          break;
        case 'top':
          position = Math.min(...selectedItems.map((item) => item.y));
          guideType = 'horizontal';
          break;
        case 'middle':
          position =
            selectedItems.reduce(
              (sum, item) => sum + item.y + item.height / 2,
              0
            ) / selectedItems.length;
          guideType = 'horizontal';
          break;
        case 'bottom':
          position = Math.max(
            ...selectedItems.map((item) => item.y + item.height)
          );
          guideType = 'horizontal';
          break;
        default:
          return [];
      }

      guides.push({
        id: `align-${alignment}`,
        type: guideType,
        position,
        start:
          guideType === 'vertical'
            ? Math.min(...selectedItems.map((item) => item.y))
            : Math.min(...selectedItems.map((item) => item.x)),
        end:
          guideType === 'vertical'
            ? Math.max(...selectedItems.map((item) => item.y + item.height))
            : Math.max(...selectedItems.map((item) => item.x + item.width)),
        color: 'rgba(168, 85, 247, 0.7)',
        temporary: true,
      });

      return guides;
    },
    []
  );

  return {
    guides: showGuides ? allGuides : [],
    findSnapPosition,
    showTemporaryGuides,
    clearTemporaryGuides,
    calculateEqualSpacing,
    calculateAlignmentGuides,
  };
}
