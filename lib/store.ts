/**
 * @deprecated This file is kept for backward compatibility.
 * Please use the new modular store system:
 * - `import { useProjectStore } from './stores'` for project data
 * - `import { useUIStore } from './stores'` for UI state
 * - `import { useEditorStore } from './stores'` for legacy compatibility
 */

export {
  useEditorStore,
  useProjectStore,
  useUIStore,
  useProject,
  useSteps,
  useUI,
  useSelection,
  usePlayer,
  useNotifications,
  useLoading,
  defaultTheme,
} from './stores';

export type {
  ProjectStore,
  UIStore,
  EditorMode,
  NotificationType,
  Notification,
} from './stores';
