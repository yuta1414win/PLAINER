'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Layers,
  Square,
  Circle,
  Type,
  Filter,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LayerItem {
  id: string;
  type: 'hotspot' | 'annotation' | 'mask';
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  selected?: boolean;
}

interface LayerManagerProps {
  layers: LayerItem[];
  selectedLayers: string[];
  onLayersReorder: (layers: LayerItem[]) => void;
  onLayerVisibilityToggle: (id: string) => void;
  onLayerLockToggle: (id: string) => void;
  onLayerSelect: (id: string, multiSelect?: boolean) => void;
  onLayerDelete: (id: string) => void;
  onLayerDuplicate: (id: string) => void;
  onLayerMoveUp: (id: string) => void;
  onLayerMoveDown: (id: string) => void;
  className?: string;
}

interface SortableLayerItemProps {
  layer: LayerItem;
  isSelected: boolean;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
  onSelect: (multiSelect?: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableLayerItem({
  layer,
  isSelected,
  onVisibilityToggle,
  onLockToggle,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: SortableLayerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getLayerIcon = (type: LayerItem['type']) => {
    switch (type) {
      case 'hotspot':
        return <Square className="w-4 h-4" />;
      case 'annotation':
        return <Type className="w-4 h-4" />;
      case 'mask':
        return <Filter className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getLayerColor = (type: LayerItem['type']) => {
    switch (type) {
      case 'hotspot':
        return 'text-red-500';
      case 'annotation':
        return 'text-green-500';
      case 'mask':
        return 'text-purple-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary/50'
          : 'bg-background hover:bg-muted/50',
        isDragging && 'opacity-50',
        !layer.visible && 'opacity-60'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Layer Icon */}
      <div className={cn('flex-shrink-0', getLayerColor(layer.type))}>
        {getLayerIcon(layer.type)}
      </div>

      {/* Layer Name */}
      <div
        className="flex-1 text-sm cursor-pointer"
        onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
      >
        {layer.name}
      </div>

      {/* Layer Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onMoveUp}
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onMoveDown}
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onVisibilityToggle}
        >
          {layer.visible ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onLockToggle}
        >
          {layer.locked ? (
            <Lock className="w-3 h-3" />
          ) : (
            <Unlock className="w-3 h-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onDuplicate}
        >
          <Copy className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function LayerManager({
  layers,
  selectedLayers,
  onLayersReorder,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerSelect,
  onLayerDelete,
  onLayerDuplicate,
  onLayerMoveUp,
  onLayerMoveDown,
  className,
}: LayerManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex((layer) => layer.id === active.id);
      const newIndex = layers.findIndex((layer) => layer.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedLayers = arrayMove(layers, oldIndex, newIndex);
        onLayersReorder(reorderedLayers);
      }
    }
  };

  // Sort layers by z-index (highest first)
  const sortedLayers = React.useMemo(() => {
    return [...layers].sort((a, b) => b.zIndex - a.zIndex);
  }, [layers]);

  const visibleLayersCount = layers.filter((layer) => layer.visible).length;
  const lockedLayersCount = layers.filter((layer) => layer.locked).length;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers ({layers.length})
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {visibleLayersCount} visible, {lockedLayersCount} locked
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedLayers.map((layer) => layer.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {sortedLayers.map((layer) => (
                    <SortableLayerItem
                      key={layer.id}
                      layer={layer}
                      isSelected={selectedLayers.includes(layer.id)}
                      onVisibilityToggle={() =>
                        onLayerVisibilityToggle(layer.id)
                      }
                      onLockToggle={() => onLayerLockToggle(layer.id)}
                      onSelect={(multiSelect) =>
                        onLayerSelect(layer.id, multiSelect)
                      }
                      onDelete={() => onLayerDelete(layer.id)}
                      onDuplicate={() => onLayerDuplicate(layer.id)}
                      onMoveUp={() => onLayerMoveUp(layer.id)}
                      onMoveDown={() => onLayerMoveDown(layer.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {layers.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No layers yet</p>
                <p className="text-xs">Add elements to see them here</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {layers.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    layers.forEach((layer) => {
                      if (!layer.visible) {
                        onLayerVisibilityToggle(layer.id);
                      }
                    });
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Show All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    layers.forEach((layer) => {
                      if (layer.visible) {
                        onLayerVisibilityToggle(layer.id);
                      }
                    });
                  }}
                >
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hide All
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
