'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToolbarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  shortcut?: string;
  group?: string;
}

interface FloatingToolbarProps {
  items: ToolbarItem[];
  isVisible?: boolean;
  position?: { x: number; y: number };
  className?: string;
  isDraggable?: boolean;
  autoPosition?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export function FloatingToolbar({
  items,
  isVisible = true,
  position = { x: 50, y: 50 },
  className,
  isDraggable = true,
  autoPosition = true,
  onPositionChange,
}: FloatingToolbarProps) {
  const [currentPosition, setCurrentPosition] = React.useState(position);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // Auto-position logic to keep toolbar in viewport
  React.useEffect(() => {
    if (!autoPosition || !toolbarRef.current) return;

    const adjustPosition = () => {
      const rect = toolbarRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let newX = currentPosition.x;
      let newY = currentPosition.y;

      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        newX = viewportWidth - rect.width - 20;
      } else if (rect.left < 0) {
        newX = 20;
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 20;
      } else if (rect.top < 0) {
        newY = 20;
      }

      if (newX !== currentPosition.x || newY !== currentPosition.y) {
        setCurrentPosition({ x: newX, y: newY });
        onPositionChange?.({ x: newX, y: newY });
      }
    };

    adjustPosition();
    window.addEventListener('resize', adjustPosition);
    return () => window.removeEventListener('resize', adjustPosition);
  }, [currentPosition, autoPosition, onPositionChange]);

  // Drag handling
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggable) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - currentPosition.x,
        y: e.clientY - currentPosition.y,
      });
    },
    [isDraggable, currentPosition]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setCurrentPosition(newPosition);
      onPositionChange?.(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStart, onPositionChange]);

  // Group items by group property
  const groupedItems = React.useMemo(() => {
    const groups: { [key: string]: ToolbarItem[] } = { default: [] };

    items.forEach((item) => {
      const group = item.group || 'default';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    });

    return groups;
  }, [items]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed z-50 flex items-center gap-1 rounded-lg border bg-background p-1 shadow-lg',
            isDragging && 'cursor-grabbing',
            isDraggable && !isDragging && 'cursor-grab',
            className
          )}
          style={{
            left: `${currentPosition.x}px`,
            top: `${currentPosition.y}px`,
          }}
        >
          {/* Drag handle */}
          {isDraggable && (
            <>
              <div
                className="flex h-8 w-2 cursor-grab items-center justify-center hover:bg-accent rounded"
                onMouseDown={handleMouseDown}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                </div>
              </div>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Toolbar items */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              {Object.entries(groupedItems).map(
                ([group, groupItems], groupIndex) => (
                  <React.Fragment key={group}>
                    {groupIndex > 0 && group !== 'default' && (
                      <Separator orientation="vertical" className="h-6 mx-1" />
                    )}
                    {groupItems.map((item) => (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={item.isActive ? 'default' : 'ghost'}
                            size="sm"
                            className={cn(
                              'h-8 w-8 p-0',
                              item.isActive && 'ring-2 ring-primary'
                            )}
                            onClick={item.onClick}
                            disabled={item.isDisabled}
                          >
                            {item.icon}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="flex items-center gap-2"
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                              {item.shortcut}
                            </kbd>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </React.Fragment>
                )
              )}
            </div>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Quick action toolbar for common operations
export function QuickActionToolbar({
  onAction,
  className,
}: {
  onAction: (action: string) => void;
  className?: string;
}) {
  const [customActions, setCustomActions] = React.useState<ToolbarItem[]>([]);
  const [usageCount, setUsageCount] = React.useState<{ [key: string]: number }>(
    {}
  );

  // Track usage and reorder based on frequency
  const trackUsage = React.useCallback((actionId: string) => {
    setUsageCount((prev) => ({
      ...prev,
      [actionId]: (prev[actionId] || 0) + 1,
    }));
  }, []);

  // Sort actions by usage frequency
  const sortedActions = React.useMemo(() => {
    return [...customActions].sort((a, b) => {
      const countA = usageCount[a.id] || 0;
      const countB = usageCount[b.id] || 0;
      return countB - countA;
    });
  }, [customActions, usageCount]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-background/95 backdrop-blur p-2 shadow-md',
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground px-2">
        Quick Actions
      </span>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1">
        {sortedActions.slice(0, 5).map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              action.onClick();
              trackUsage(action.id);
              onAction(action.id);
            }}
          >
            {action.icon}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
