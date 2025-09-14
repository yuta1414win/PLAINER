import type { Step, UUID } from '@/lib/types';

// ステップリストのプロパティ
export interface StepListProps {
  readonly steps: readonly Step[];
  readonly currentStepId: UUID | null;
  readonly onStepSelect: (stepId: UUID) => void;
  readonly onStepsReorder: (stepIds: readonly UUID[]) => void;
  readonly onStepDuplicate: (stepId: UUID) => void;
  readonly onStepDelete: (stepId: UUID) => void;
  readonly onAddStep: () => void;
  readonly className?: string;
}

// ソート可能なステップアイテムのプロパティ
export interface SortableStepItemProps {
  readonly step: Step;
  readonly isSelected: boolean;
  readonly onSelect: (stepId: UUID) => void;
  readonly onDuplicate: (stepId: UUID) => void;
  readonly onDelete: (stepId: UUID) => void;
}

// ステップアイテムのプロパティ
export interface StepItemProps {
  readonly step: Step;
  readonly isSelected: boolean;
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly onDuplicate?: () => void;
  readonly className?: string;
}

// ステッププレイヤーのプロパティ
export interface StepPlayerProps {
  readonly steps: readonly Step[];
  readonly currentStepIndex: number;
  readonly autoPlay?: boolean;
  readonly autoPlayDuration?: number;
  readonly showControls?: boolean;
  readonly showProgress?: boolean;
  readonly onStepChange: (stepIndex: number) => void;
  readonly onPlay?: () => void;
  readonly onPause?: () => void;
  readonly onStop?: () => void;
  readonly className?: string;
}

// ステップコントロールのプロパティ
export interface StepControlsProps {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly isPlaying: boolean;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStop: () => void;
  readonly className?: string;
}

// ステップナビゲーションのプロパティ
export interface StepNavigationProps {
  readonly steps: readonly Step[];
  readonly currentStepIndex: number;
  readonly onStepSelect: (stepIndex: number) => void;
  readonly showThumbnails?: boolean;
  readonly showLabels?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly className?: string;
}
