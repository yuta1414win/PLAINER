// ============================================================================
// ストア統合エクスポート
// ============================================================================

export { useProjectStore, defaultTheme } from './project-store';
export { useUIStore } from './ui-store';
export type { ProjectStore } from './project-store';
export type {
  UIStore,
  EditorMode,
  NotificationType,
  Notification,
} from './ui-store';

// ============================================================================
// レガシーサポート（既存コードとの互換性維持）
// ============================================================================

import { useProjectStore } from './project-store';
import { useUIStore } from './ui-store';

/**
 * @deprecated Use useProjectStore and useUIStore separately for better performance
 * This is kept for backward compatibility with existing components
 */
export const useEditorStore = () => {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();

  return {
    // プロジェクト関連
    ...projectStore,

    // UI状態関連
    ...uiStore,

    // 互換性のためのプロパティマッピング
    get currentStepId() {
      return uiStore.currentStepId;
    },
    get selectedHotspotId() {
      return uiStore.selectedHotspotId;
    },
    get selectedAnnotationId() {
      return uiStore.selectedAnnotationId;
    },
    get selectedMaskId() {
      return uiStore.selectedMaskId;
    },
    get editorMode() {
      return uiStore.editorMode;
    },
    get isPlaying() {
      return uiStore.isPlaying;
    },
    get currentPlayStepIndex() {
      return uiStore.currentPlayStepIndex;
    },
    get showGrid() {
      return uiStore.showGrid;
    },
    get showGuides() {
      return uiStore.showGuides;
    },
    get zoom() {
      return uiStore.zoom;
    },
    get isVariableManagerOpen() {
      return uiStore.isVariableManagerOpen;
    },
    get isBranchingManagerOpen() {
      return uiStore.isBranchingManagerOpen;
    },
    get isDOMCloneOpen() {
      return uiStore.isDOMCloneOpen;
    },
    get isLanguageSwitcherOpen() {
      return uiStore.isLanguageSwitcherOpen;
    },

    // 互換性のためのアクションマッピング
    setCurrentStep: uiStore.setCurrentStep,
    setSelectedHotspot: uiStore.setSelectedHotspot,
    setSelectedAnnotation: uiStore.setSelectedAnnotation,
    setSelectedMask: uiStore.setSelectedMask,
    setEditorMode: uiStore.setEditorMode,
    play: uiStore.play,
    pause: uiStore.pause,
    nextStep: uiStore.nextStep,
    previousStep: uiStore.previousStep,
    goToStep: uiStore.goToStep,
    toggleGrid: uiStore.toggleGrid,
    toggleGuides: uiStore.toggleGuides,
    setZoom: uiStore.setZoom,
    openVariableManager: uiStore.openVariableManager,
    closeVariableManager: uiStore.closeVariableManager,
    openBranchingManager: uiStore.openBranchingManager,
    closeBranchingManager: uiStore.closeBranchingManager,
    openDOMClone: uiStore.openDOMClone,
    closeDOMClone: uiStore.closeDOMClone,
    openLanguageSwitcher: uiStore.openLanguageSwitcher,
    closeLanguageSwitcher: uiStore.closeLanguageSwitcher,
  };
};

// ============================================================================
// 型安全なフック
// ============================================================================

/**
 * プロジェクト関連の状態とアクションのみを使用するフック
 * UI状態が不要な場合はこちらを使用してパフォーマンスを向上
 */
export const useProject = () => {
  const store = useProjectStore();
  return {
    project: store.project,
    setProject: store.setProject,
    updateProject: store.updateProject,
    createProject: store.createProject,
  };
};

/**
 * ステップ管理専用フック
 */
export const useSteps = () => {
  const store = useProjectStore();
  return {
    steps: store.project?.steps || [],
    addStep: store.addStep,
    updateStep: store.updateStep,
    deleteStep: store.deleteStep,
    reorderSteps: store.reorderSteps,
    duplicateStep: store.duplicateStep,
  };
};

/**
 * UI状態専用フック
 */
export const useUI = () => {
  const store = useUIStore();
  return {
    editorMode: store.editorMode,
    setEditorMode: store.setEditorMode,
    zoom: store.zoom,
    setZoom: store.setZoom,
    showGrid: store.showGrid,
    toggleGrid: store.toggleGrid,
    showGuides: store.showGuides,
    toggleGuides: store.toggleGuides,
  };
};

/**
 * 選択状態専用フック
 */
export const useSelection = () => {
  const store = useUIStore();
  return {
    currentStepId: store.currentStepId,
    selectedHotspotId: store.selectedHotspotId,
    selectedAnnotationId: store.selectedAnnotationId,
    selectedMaskId: store.selectedMaskId,
    setCurrentStep: store.setCurrentStep,
    setSelectedHotspot: store.setSelectedHotspot,
    setSelectedAnnotation: store.setSelectedAnnotation,
    setSelectedMask: store.setSelectedMask,
    clearAllSelections: store.clearAllSelections,
  };
};

/**
 * プレイヤー関連専用フック
 */
export const usePlayer = () => {
  const store = useUIStore();
  return {
    isPlaying: store.isPlaying,
    currentPlayStepIndex: store.currentPlayStepIndex,
    isFullscreen: store.isFullscreen,
    play: store.play,
    pause: store.pause,
    togglePlayPause: store.togglePlayPause,
    nextStep: store.nextStep,
    previousStep: store.previousStep,
    goToStep: store.goToStep,
    setFullscreen: store.setFullscreen,
    toggleFullscreen: store.toggleFullscreen,
  };
};

/**
 * 通知管理専用フック
 */
export const useNotifications = () => {
  const store = useUIStore();
  return {
    notifications: store.notifications,
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    clearAllNotifications: store.clearAllNotifications,
    showSuccess: store.showSuccess,
    showError: store.showError,
    showWarning: store.showWarning,
    showInfo: store.showInfo,
  };
};

/**
 * ローディング状態専用フック
 */
export const useLoading = () => {
  const store = useUIStore();
  return {
    isLoading: store.isLoading,
    loadingMessage: store.loadingMessage,
    operationInProgress: store.operationInProgress,
    setLoading: store.setLoading,
    startLoading: store.startLoading,
    stopLoading: store.stopLoading,
  };
};
