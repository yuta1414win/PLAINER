import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Project,
  Step,
  Chapter,
  Theme,
  Variable,
  ConditionalStep,
  Hotspot,
  Annotation,
  Mask,
  UUID,
  CreateStepInput,
  Language,
} from '../types';
import { createDefaultVariables } from '../variables';

// ============================================================================
// プロジェクトストア状態定義
// ============================================================================

interface ProjectState {
  readonly project: Project | null;
  readonly history: readonly Project[];
  readonly historyIndex: number;
  readonly maxHistorySize: 50;
}

interface ProjectActions {
  readonly setProject: (project: Project) => void;
  readonly updateProject: (updates: Partial<Project>) => void;
  readonly createProject: (name?: string) => void;
  readonly saveToHistory: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
}

// ============================================================================
// ステップ管理
// ============================================================================

interface StepActions {
  readonly addStep: (step: CreateStepInput) => void;
  readonly updateStep: (stepId: UUID, updates: Partial<Step>) => void;
  readonly deleteStep: (stepId: UUID) => void;
  readonly reorderSteps: (stepIds: readonly UUID[]) => void;
  readonly duplicateStep: (stepId: UUID) => void;
}

// ============================================================================
// ホットスポット管理
// ============================================================================

interface HotspotActions {
  readonly addHotspot: (stepId: UUID, hotspot: Hotspot) => void;
  readonly updateHotspot: (
    stepId: UUID,
    hotspotId: UUID,
    updates: Partial<Hotspot>
  ) => void;
  readonly deleteHotspot: (stepId: UUID, hotspotId: UUID) => void;
}

// ============================================================================
// 注釈管理
// ============================================================================

interface AnnotationActions {
  readonly addAnnotation: (stepId: UUID, annotation: Annotation) => void;
  readonly updateAnnotation: (
    stepId: UUID,
    annotationId: UUID,
    updates: Partial<Annotation>
  ) => void;
  readonly deleteAnnotation: (stepId: UUID, annotationId: UUID) => void;
}

// ============================================================================
// マスク管理
// ============================================================================

interface MaskActions {
  readonly addMask: (stepId: UUID, mask: Mask) => void;
  readonly updateMask: (
    stepId: UUID,
    maskId: UUID,
    updates: Partial<Mask>
  ) => void;
  readonly deleteMask: (stepId: UUID, maskId: UUID) => void;
  readonly duplicateMask: (stepId: UUID, maskId: UUID) => void;
}

// ============================================================================
// チャプター管理
// ============================================================================

interface ChapterActions {
  readonly addChapter: (chapter: Chapter) => void;
  readonly updateChapter: (chapterId: UUID, updates: Partial<Chapter>) => void;
  readonly deleteChapter: (chapterId: UUID) => void;
}

// ============================================================================
// テーマ管理
// ============================================================================

interface ThemeActions {
  readonly updateTheme: (updates: Partial<Theme>) => void;
}

// ============================================================================
// 変数管理
// ============================================================================

interface VariableActions {
  readonly addVariable: (variable: Variable) => void;
  readonly updateVariable: (
    variableId: UUID,
    updates: Partial<Variable>
  ) => void;
  readonly deleteVariable: (variableId: UUID) => void;
  readonly setVariableValue: (variableName: string, value: string) => void;
}

// ============================================================================
// 条件分岐管理
// ============================================================================

interface ConditionalStepActions {
  readonly addConditionalStep: (conditionalStep: ConditionalStep) => void;
  readonly updateConditionalStep: (
    id: UUID,
    updates: Partial<ConditionalStep>
  ) => void;
  readonly deleteConditionalStep: (id: UUID) => void;
}

// ============================================================================
// 言語管理
// ============================================================================

interface LanguageActions {
  readonly setLanguage: (language: Language) => void;
}

// ============================================================================
// 永続化
// ============================================================================

interface PersistenceActions {
  readonly saveToLocalStorage: () => void;
  readonly loadFromLocalStorage: () => void;
  readonly clearLocalStorage: () => void;
}

// ============================================================================
// 統合ストア型
// ============================================================================

export type ProjectStore = ProjectState &
  ProjectActions &
  StepActions &
  HotspotActions &
  AnnotationActions &
  MaskActions &
  ChapterActions &
  ThemeActions &
  VariableActions &
  ConditionalStepActions &
  LanguageActions &
  PersistenceActions;

// ============================================================================
// デフォルト値
// ============================================================================

const defaultTheme: Theme = {
  primaryColor: '#3b82f6' as const,
  secondaryColor: '#8b5cf6' as const,
  accentColor: '#f59e0b' as const,
  backgroundColor: '#ffffff' as const,
  textColor: '#1f2937' as const,
  borderColor: '#e5e7eb' as const,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  borderRadius: 8,
  spacing: 16,
};

const createDefaultProject = (name = 'New Project'): Project => ({
  id: `project-${Date.now()}` as UUID,
  name,
  steps: [],
  chapters: [],
  theme: defaultTheme,
  variables: createDefaultVariables(),
  variableInstances: {},
  conditionalSteps: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: false,
  language: 'en',
});

// ============================================================================
// ストア実装
// ============================================================================

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        project: null,
        history: [],
        historyIndex: -1,
        maxHistorySize: 50,

        // プロジェクト管理
        setProject: (project) => {
          set({ project, history: [project], historyIndex: 0 });
        },

        updateProject: (updates) => {
          const { project } = get();
          if (!project) return;

          const updatedProject: Project = {
            ...project,
            ...updates,
            updatedAt: new Date(),
          };

          set({ project: updatedProject });
          get().saveToHistory();
        },

        createProject: (name) => {
          const project = createDefaultProject(name);
          get().setProject(project);
        },

        // 履歴管理
        saveToHistory: () => {
          const { project, history, historyIndex, maxHistorySize } = get();
          if (!project) return;

          // 現在位置以降の履歴を削除
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(project);

          // 履歴サイズ制限
          if (newHistory.length > maxHistorySize) {
            newHistory.shift();
          }

          set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
          });
        },

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const project = history[newIndex];
            if (project) {
              set({ project, historyIndex: newIndex });
            }
          }
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const project = history[newIndex];
            if (project) {
              set({ project, historyIndex: newIndex });
            }
          }
        },

        canUndo: () => {
          const { historyIndex } = get();
          return historyIndex > 0;
        },

        canRedo: () => {
          const { history, historyIndex } = get();
          return historyIndex < history.length - 1;
        },

        // ステップ管理
        addStep: (stepInput) => {
          const { project } = get();
          if (!project) return;

          const step: Step = {
            id: stepInput.id || (`step-${Date.now()}` as UUID),
            order: stepInput.order ?? project.steps.length,
            ...stepInput,
          };

          get().updateProject({
            steps: [...project.steps, step],
          });
        },

        updateStep: (stepId, updates) => {
          const { project } = get();
          if (!project) return;

          const updatedSteps = project.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          );

          get().updateProject({ steps: updatedSteps });
        },

        deleteStep: (stepId) => {
          const { project } = get();
          if (!project) return;

          const updatedSteps = project.steps.filter(
            (step) => step.id !== stepId
          );

          get().updateProject({ steps: updatedSteps });
        },

        reorderSteps: (stepIds) => {
          const { project } = get();
          if (!project) return;

          const stepsMap = new Map(
            project.steps.map((step) => [step.id, step])
          );

          const reorderedSteps = stepIds
            .map((id) => stepsMap.get(id))
            .filter((step): step is Step => step !== undefined)
            .map((step, index) => ({ ...step, order: index }));

          get().updateProject({ steps: reorderedSteps });
        },

        duplicateStep: (stepId) => {
          const { project } = get();
          if (!project) return;

          const stepToDuplicate = project.steps.find((s) => s.id === stepId);
          if (!stepToDuplicate) return;

          const newStep: CreateStepInput = {
            ...stepToDuplicate,
            id: `step-${Date.now()}` as UUID,
            title: `${stepToDuplicate.title} (Copy)`,
            order: project.steps.length,
          };

          get().addStep(newStep);
        },

        // ホットスポット管理
        addHotspot: (stepId, hotspot) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedStep = {
            ...step,
            hotspots: [...step.hotspots, hotspot],
          };

          get().updateStep(stepId, updatedStep);
        },

        updateHotspot: (stepId, hotspotId, updates) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedHotspots = step.hotspots.map((h) =>
            h.id === hotspotId ? { ...h, ...updates } : h
          );

          get().updateStep(stepId, { hotspots: updatedHotspots });
        },

        deleteHotspot: (stepId, hotspotId) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedHotspots = step.hotspots.filter(
            (h) => h.id !== hotspotId
          );

          get().updateStep(stepId, { hotspots: updatedHotspots });
        },

        // 注釈管理
        addAnnotation: (stepId, annotation) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedStep = {
            ...step,
            annotations: [...step.annotations, annotation],
          };

          get().updateStep(stepId, updatedStep);
        },

        updateAnnotation: (stepId, annotationId, updates) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedAnnotations = step.annotations.map((a) =>
            a.id === annotationId ? { ...a, ...updates } : a
          );

          get().updateStep(stepId, { annotations: updatedAnnotations });
        },

        deleteAnnotation: (stepId, annotationId) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedAnnotations = step.annotations.filter(
            (a) => a.id !== annotationId
          );

          get().updateStep(stepId, { annotations: updatedAnnotations });
        },

        // マスク管理
        addMask: (stepId, mask) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedStep = {
            ...step,
            masks: [...step.masks, mask],
          };

          get().updateStep(stepId, updatedStep);
        },

        updateMask: (stepId, maskId, updates) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedMasks = step.masks.map((m) =>
            m.id === maskId ? { ...m, ...updates } : m
          );

          get().updateStep(stepId, { masks: updatedMasks });
        },

        deleteMask: (stepId, maskId) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const updatedMasks = step.masks.filter((m) => m.id !== maskId);

          get().updateStep(stepId, { masks: updatedMasks });
        },

        duplicateMask: (stepId, maskId) => {
          const { project } = get();
          if (!project) return;

          const step = project.steps.find((s) => s.id === stepId);
          if (!step) return;

          const maskToDuplicate = step.masks.find((m) => m.id === maskId);
          if (!maskToDuplicate) return;

          const newMask: Mask = {
            ...maskToDuplicate,
            id: `mask-${Date.now()}` as UUID,
            x: Math.min(maskToDuplicate.x + 0.05, 0.9) as any,
            y: Math.min(maskToDuplicate.y + 0.05, 0.9) as any,
          };

          get().addMask(stepId, newMask);
        },

        // チャプター管理
        addChapter: (chapter) => {
          const { project } = get();
          if (!project) return;

          get().updateProject({
            chapters: [...project.chapters, chapter],
          });
        },

        updateChapter: (chapterId, updates) => {
          const { project } = get();
          if (!project) return;

          const updatedChapters = project.chapters.map((c) =>
            c.id === chapterId ? { ...c, ...updates } : c
          );

          get().updateProject({ chapters: updatedChapters });
        },

        deleteChapter: (chapterId) => {
          const { project } = get();
          if (!project) return;

          const updatedChapters = project.chapters.filter(
            (c) => c.id !== chapterId
          );

          get().updateProject({ chapters: updatedChapters });
        },

        // テーマ管理
        updateTheme: (updates) => {
          const { project } = get();
          if (!project) return;

          const updatedTheme = { ...project.theme, ...updates };

          get().updateProject({ theme: updatedTheme });
        },

        // 変数管理
        addVariable: (variable) => {
          const { project } = get();
          if (!project) return;

          get().updateProject({
            variables: [...project.variables, variable],
          });
        },

        updateVariable: (variableId, updates) => {
          const { project } = get();
          if (!project) return;

          const updatedVariables = project.variables.map((v) =>
            v.id === variableId ? { ...v, ...updates } : v
          );

          get().updateProject({ variables: updatedVariables });
        },

        deleteVariable: (variableId) => {
          const { project } = get();
          if (!project) return;

          const updatedVariables = project.variables.filter(
            (v) => v.id !== variableId
          );

          // 関連するインスタンスも削除
          const updatedInstances = { ...project.variableInstances };
          delete updatedInstances[variableId];

          get().updateProject({
            variables: updatedVariables,
            variableInstances: updatedInstances,
          });
        },

        setVariableValue: (variableName, value) => {
          const { project } = get();
          if (!project) return;

          const variable = project.variables.find(
            (v) => v.name === variableName
          );
          if (!variable) return;

          const updatedInstances = {
            ...project.variableInstances,
            [variable.id]: value,
          };

          get().updateProject({
            variableInstances: updatedInstances,
          });
        },

        // 条件分岐管理
        addConditionalStep: (conditionalStep) => {
          const { project } = get();
          if (!project) return;

          get().updateProject({
            conditionalSteps: [...project.conditionalSteps, conditionalStep],
          });
        },

        updateConditionalStep: (id, updates) => {
          const { project } = get();
          if (!project) return;

          const updatedConditionalSteps = project.conditionalSteps.map((cs) =>
            cs.id === id ? { ...cs, ...updates } : cs
          );

          get().updateProject({
            conditionalSteps: updatedConditionalSteps,
          });
        },

        deleteConditionalStep: (id) => {
          const { project } = get();
          if (!project) return;

          const updatedConditionalSteps = project.conditionalSteps.filter(
            (cs) => cs.id !== id
          );

          get().updateProject({
            conditionalSteps: updatedConditionalSteps,
          });
        },

        // 言語管理
        setLanguage: (language) => {
          const { project } = get();
          if (!project) return;

          get().updateProject({ language });
        },

        // 永続化
        saveToLocalStorage: () => {
          const { project } = get();
          if (project) {
            localStorage.setItem('plainer-project', JSON.stringify(project));
          }
        },

        loadFromLocalStorage: () => {
          const saved = localStorage.getItem('plainer-project');
          if (saved) {
            try {
              const project = JSON.parse(saved);
              get().setProject(project);
            } catch (error) {
              console.error('Failed to load project from localStorage:', error);
            }
          }
        },

        clearLocalStorage: () => {
          localStorage.removeItem('plainer-project');
          set({ project: null });
        },
      }),
      {
        name: 'plainer-project',
        partialize: (state) => ({ project: state.project }),
      }
    ),
    { name: 'Project Store' }
  )
);

// Export defaultTheme for external use
export { defaultTheme };
