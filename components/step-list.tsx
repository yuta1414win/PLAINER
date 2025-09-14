'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
  SortableContext as SortableContextType,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, GripVertical, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step } from '@/lib/types';

interface SortableStepItemProps {
  step: Step;
  isSelected: boolean;
  onSelect: (stepId: string) => void;
  onDuplicate: (stepId: string) => void;
  onDelete: (stepId: string) => void;
}

function SortableStepItem({
  step,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative', isDragging && 'z-50 opacity-50')}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md',
          isSelected && 'ring-2 ring-primary shadow-md',
          isDragging && 'shadow-lg'
        )}
        onClick={() => onSelect(step.id)}
      >
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className={cn(
                'flex items-center justify-center w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
                isDragging && 'opacity-100'
              )}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Thumbnail */}
            <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
              {step.thumbnail && (
                <img
                  src={step.thumbnail}
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{step.title}</p>
              <p className="text-xs text-muted-foreground">
                {step.hotspots.length} ホットスポット
                {step.annotations.length > 0 &&
                  ` • ${step.annotations.length} 注釈`}
                {step.masks.length > 0 && ` • ${step.masks.length} マスク`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(step.id);
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(step.id);
                }}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StepListProps {
  steps: Step[];
  currentStepId: string | null;
  onStepSelect: (stepId: string) => void;
  onStepsReorder: (stepIds: string[]) => void;
  onStepDuplicate: (stepId: string) => void;
  onStepDelete: (stepId: string) => void;
  onAddStep: () => void;
  className?: string;
}

export function StepList({
  steps,
  currentStepId,
  onStepSelect,
  onStepsReorder,
  onStepDuplicate,
  onStepDelete,
  onAddStep,
  className,
}: StepListProps) {
  // Sort steps by order
  const sortedSteps = useMemo(() => {
    return [...steps].sort((a, b) => a.order - b.order);
  }, [steps]);

  const stepIds = useMemo(
    () => sortedSteps.map((step) => step.id),
    [sortedSteps]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stepIds.indexOf(active.id as string);
      const newIndex = stepIds.indexOf(over.id as string);
      const newStepIds = arrayMove(stepIds, oldIndex, newIndex);
      onStepsReorder(newStepIds);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium mb-3">ステップ ({steps.length})</h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stepIds}
              strategy={verticalListSortingStrategy}
            >
              {sortedSteps.map((step) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  isSelected={currentStepId === step.id}
                  onSelect={onStepSelect}
                  onDuplicate={onStepDuplicate}
                  onDelete={onStepDelete}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Step Button */}
          <Button
            variant="dashed"
            className="w-full h-20 border-dashed mt-4"
            onClick={onAddStep}
          >
            <Plus className="w-5 h-5 mb-1" />
            ステップを追加
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
