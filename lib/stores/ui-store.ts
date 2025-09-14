import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UUID } from '../types';

// ============================================================================
// エディタモード定義
// ============================================================================

export type EditorMode =
  | 'select'
  | 'hotspot-rect'
  | 'hotspot-circle'
  | 'hotspot-free'
  | 'annotation'
  | 'mask';

// ============================================================================
// 選択状態
// ============================================================================

interface SelectionState {
  readonly currentStepId: UUID | null;
  readonly selectedHotspotId: UUID | null;
  readonly selectedAnnotationId: UUID | null;
  readonly selectedMaskId: UUID | null;
}

interface SelectionActions {
  readonly setCurrentStep: (stepId: UUID | null) => void;
  readonly setSelectedHotspot: (hotspotId: UUID | null) => void;
  readonly setSelectedAnnotation: (annotationId: UUID | null) => void;
  readonly setSelectedMask: (maskId: UUID | null) => void;
  readonly clearAllSelections: () => void;
}

// ============================================================================
// エディタモード
// ============================================================================

interface EditorModeState {
  readonly editorMode: EditorMode;
}

interface EditorModeActions {
  readonly setEditorMode: (mode: EditorMode) => void;
  readonly resetEditorMode: () => void;
}

// ============================================================================
// プレイヤー状態
// ============================================================================

interface PlayerState {
  readonly isPlaying: boolean;
  readonly currentPlayStepIndex: number;
  readonly isFullscreen: boolean;
}

interface PlayerActions {
  readonly play: () => void;
  readonly pause: () => void;
  readonly togglePlayPause: () => void;
  readonly nextStep: () => void;
  readonly previousStep: () => void;
  readonly goToStep: (index: number) => void;
  readonly setFullscreen: (isFullscreen: boolean) => void;
  readonly toggleFullscreen: () => void;
}

// ============================================================================
// UI表示状態
// ============================================================================

interface UIDisplayState {
  readonly showGrid: boolean;
  readonly showGuides: boolean;
  readonly zoom: number;
  readonly sidebarWidth: number;
  readonly panelHeight: number;
}

interface UIDisplayActions {
  readonly toggleGrid: () => void;
  readonly toggleGuides: () => void;
  readonly setZoom: (zoom: number) => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly resetZoom: () => void;
  readonly setSidebarWidth: (width: number) => void;
  readonly setPanelHeight: (height: number) => void;
}

// ============================================================================
// ダイアログ状態
// ============================================================================

interface DialogState {
  readonly isVariableManagerOpen: boolean;
  readonly isBranchingManagerOpen: boolean;
  readonly isDOMCloneOpen: boolean;
  readonly isLanguageSwitcherOpen: boolean;
  readonly isThemeSettingsOpen: boolean;
  readonly isSharingDialogOpen: boolean;
  readonly isExportDialogOpen: boolean;
  readonly isHelpDialogOpen: boolean;
}

interface DialogActions {
  readonly openVariableManager: () => void;
  readonly closeVariableManager: () => void;
  readonly openBranchingManager: () => void;
  readonly closeBranchingManager: () => void;
  readonly openDOMClone: () => void;
  readonly closeDOMClone: () => void;
  readonly openLanguageSwitcher: () => void;
  readonly closeLanguageSwitcher: () => void;
  readonly openThemeSettings: () => void;
  readonly closeThemeSettings: () => void;
  readonly openSharingDialog: () => void;
  readonly closeSharingDialog: () => void;
  readonly openExportDialog: () => void;
  readonly closeExportDialog: () => void;
  readonly openHelpDialog: () => void;
  readonly closeHelpDialog: () => void;
  readonly closeAllDialogs: () => void;
}

// ============================================================================
// 通知状態
// ============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  readonly id: UUID;
  readonly type: NotificationType;
  readonly title: string;
  readonly message?: string;
  readonly duration?: number; // ミリ秒、undefinedの場合は自動で閉じない
  readonly timestamp: Date;
}

interface NotificationState {
  readonly notifications: readonly Notification[];
}

interface NotificationActions {
  readonly addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => void;
  readonly removeNotification: (id: UUID) => void;
  readonly clearAllNotifications: () => void;
  readonly showSuccess: (title: string, message?: string) => void;
  readonly showError: (title: string, message?: string) => void;
  readonly showWarning: (title: string, message?: string) => void;
  readonly showInfo: (title: string, message?: string) => void;
}

// ============================================================================
// ローディング状態
// ============================================================================

interface LoadingState {
  readonly isLoading: boolean;
  readonly loadingMessage: string | null;
  readonly operationInProgress: string | null;
}

interface LoadingActions {
  readonly setLoading: (
    isLoading: boolean,
    message?: string,
    operation?: string
  ) => void;
  readonly startLoading: (message?: string, operation?: string) => void;
  readonly stopLoading: () => void;
}

// ============================================================================
// 統合UIストア型
// ============================================================================

export type UIStore = SelectionState &
  SelectionActions &
  EditorModeState &
  EditorModeActions &
  PlayerState &
  PlayerActions &
  UIDisplayState &
  UIDisplayActions &
  DialogState &
  DialogActions &
  NotificationState &
  NotificationActions &
  LoadingState &
  LoadingActions;

// ============================================================================
// デフォルト値
// ============================================================================

const DEFAULT_ZOOM = 1;
const DEFAULT_SIDEBAR_WIDTH = 300;
const DEFAULT_PANEL_HEIGHT = 200;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// ============================================================================
// UIストア実装
// ============================================================================

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // 選択状態
      currentStepId: null,
      selectedHotspotId: null,
      selectedAnnotationId: null,
      selectedMaskId: null,

      // エディタモード
      editorMode: 'select',

      // プレイヤー状態
      isPlaying: false,
      currentPlayStepIndex: 0,
      isFullscreen: false,

      // UI表示状態
      showGrid: false,
      showGuides: false,
      zoom: DEFAULT_ZOOM,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      panelHeight: DEFAULT_PANEL_HEIGHT,

      // ダイアログ状態
      isVariableManagerOpen: false,
      isBranchingManagerOpen: false,
      isDOMCloneOpen: false,
      isLanguageSwitcherOpen: false,
      isThemeSettingsOpen: false,
      isSharingDialogOpen: false,
      isExportDialogOpen: false,
      isHelpDialogOpen: false,

      // 通知状態
      notifications: [],

      // ローディング状態
      isLoading: false,
      loadingMessage: null,
      operationInProgress: null,

      // 選択アクション
      setCurrentStep: (stepId) => set({ currentStepId: stepId }),
      setSelectedHotspot: (hotspotId) => set({ selectedHotspotId: hotspotId }),
      setSelectedAnnotation: (annotationId) =>
        set({ selectedAnnotationId: annotationId }),
      setSelectedMask: (maskId) => set({ selectedMaskId: maskId }),
      clearAllSelections: () =>
        set({
          selectedHotspotId: null,
          selectedAnnotationId: null,
          selectedMaskId: null,
        }),

      // エディタモードアクション
      setEditorMode: (mode) => {
        set({ editorMode: mode });
        // モード変更時に選択状態をクリア
        get().clearAllSelections();
      },
      resetEditorMode: () => get().setEditorMode('select'),

      // プレイヤーアクション
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

      nextStep: () => {
        // プロジェクトストアから最大ステップ数を取得する必要がある
        // ここでは簡略化
        set((state) => ({
          currentPlayStepIndex: state.currentPlayStepIndex + 1,
        }));
      },

      previousStep: () => {
        set((state) => ({
          currentPlayStepIndex: Math.max(0, state.currentPlayStepIndex - 1),
        }));
      },

      goToStep: (index) => {
        const validIndex = Math.max(0, index);
        set({ currentPlayStepIndex: validIndex });
      },

      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      toggleFullscreen: () =>
        set((state) => ({ isFullscreen: !state.isFullscreen })),

      // UI表示アクション
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),

      setZoom: (zoom) => {
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        set({ zoom: clampedZoom });
      },

      zoomIn: () => {
        const { zoom } = get();
        get().setZoom(zoom + ZOOM_STEP);
      },

      zoomOut: () => {
        const { zoom } = get();
        get().setZoom(zoom - ZOOM_STEP);
      },

      resetZoom: () => get().setZoom(DEFAULT_ZOOM),

      setSidebarWidth: (width) => {
        const clampedWidth = Math.max(200, Math.min(600, width));
        set({ sidebarWidth: clampedWidth });
      },

      setPanelHeight: (height) => {
        const clampedHeight = Math.max(100, Math.min(500, height));
        set({ panelHeight: clampedHeight });
      },

      // ダイアログアクション
      openVariableManager: () => {
        get().closeAllDialogs();
        set({ isVariableManagerOpen: true });
      },
      closeVariableManager: () => set({ isVariableManagerOpen: false }),

      openBranchingManager: () => {
        get().closeAllDialogs();
        set({ isBranchingManagerOpen: true });
      },
      closeBranchingManager: () => set({ isBranchingManagerOpen: false }),

      openDOMClone: () => {
        get().closeAllDialogs();
        set({ isDOMCloneOpen: true });
      },
      closeDOMClone: () => set({ isDOMCloneOpen: false }),

      openLanguageSwitcher: () => {
        get().closeAllDialogs();
        set({ isLanguageSwitcherOpen: true });
      },
      closeLanguageSwitcher: () => set({ isLanguageSwitcherOpen: false }),

      openThemeSettings: () => {
        get().closeAllDialogs();
        set({ isThemeSettingsOpen: true });
      },
      closeThemeSettings: () => set({ isThemeSettingsOpen: false }),

      openSharingDialog: () => {
        get().closeAllDialogs();
        set({ isSharingDialogOpen: true });
      },
      closeSharingDialog: () => set({ isSharingDialogOpen: false }),

      openExportDialog: () => {
        get().closeAllDialogs();
        set({ isExportDialogOpen: true });
      },
      closeExportDialog: () => set({ isExportDialogOpen: false }),

      openHelpDialog: () => {
        get().closeAllDialogs();
        set({ isHelpDialogOpen: true });
      },
      closeHelpDialog: () => set({ isHelpDialogOpen: false }),

      closeAllDialogs: () =>
        set({
          isVariableManagerOpen: false,
          isBranchingManagerOpen: false,
          isDOMCloneOpen: false,
          isLanguageSwitcherOpen: false,
          isThemeSettingsOpen: false,
          isSharingDialogOpen: false,
          isExportDialogOpen: false,
          isHelpDialogOpen: false,
        }),

      // 通知アクション
      addNotification: (notification) => {
        const id = `notification-${Date.now()}` as UUID;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // 自動削除のタイマー設定
        if (notification.duration) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAllNotifications: () => set({ notifications: [] }),

      showSuccess: (title, message) => {
        get().addNotification({
          type: 'success',
          title,
          message,
          duration: 3000,
        });
      },

      showError: (title, message) => {
        get().addNotification({
          type: 'error',
          title,
          message,
          duration: 5000,
        });
      },

      showWarning: (title, message) => {
        get().addNotification({
          type: 'warning',
          title,
          message,
          duration: 4000,
        });
      },

      showInfo: (title, message) => {
        get().addNotification({
          type: 'info',
          title,
          message,
          duration: 3000,
        });
      },

      // ローディングアクション
      setLoading: (isLoading, message, operation) => {
        set({
          isLoading,
          loadingMessage: message || null,
          operationInProgress: operation || null,
        });
      },

      startLoading: (message, operation) => {
        get().setLoading(true, message, operation);
      },

      stopLoading: () => {
        get().setLoading(false);
      },
    }),
    { name: 'UI Store' }
  )
);
