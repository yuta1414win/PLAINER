'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/store';
import { toast } from 'sonner';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onShortcutExecuted?: (shortcut: ShortcutConfig) => void;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, onShortcutExecuted } = options;
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          return;
        }
      }

      const matchedShortcut = shortcutsRef.current.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = (shortcut.ctrl || false) === (e.ctrlKey || e.metaKey);
        const altMatch = (shortcut.alt || false) === e.altKey;
        const shiftMatch = (shortcut.shift || false) === e.shiftKey;
        const metaMatch = (shortcut.meta || false) === e.metaKey;

        return (
          keyMatch &&
          ctrlMatch &&
          altMatch &&
          shiftMatch &&
          (shortcut.meta ? metaMatch : true)
        );
      });

      if (matchedShortcut) {
        if (matchedShortcut.preventDefault !== false) {
          e.preventDefault();
        }

        try {
          matchedShortcut.action();
          onShortcutExecuted?.(matchedShortcut);
        } catch (error) {
          console.error('Error executing shortcut:', error);
          toast.error('ショートカットの実行に失敗しました');
        }
      }
    },
    [enabled, onShortcutExecuted]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

// Default shortcuts
export const defaultShortcuts: ShortcutConfig[] = [
  // File operations
  {
    key: 's',
    ctrl: true,
    description: '保存',
    category: 'ファイル',
    action: () => {
      const store = useEditorStore.getState();
      // 保存先: ローカルストレージ（簡易）
      store.saveToLocalStorage();
      toast.success('ローカルに保存しました');
    },
  },
  {
    key: 'o',
    ctrl: true,
    description: '開く',
    category: 'ファイル',
    action: () => {
      toast.info('ファイルを開く機能は準備中です');
    },
  },
  {
    key: 'n',
    ctrl: true,
    description: '新規作成',
    category: 'ファイル',
    action: () => {
      const store = useEditorStore.getState();
      store.createProject('新しいプロジェクト');
      toast.success('新しいプロジェクトを作成しました');
    },
  },

  // Edit operations
  {
    key: 'z',
    ctrl: true,
    description: '元に戻す',
    category: '編集',
    action: () => {
      const store = useEditorStore.getState();
      store.undo();
    },
  },
  {
    key: 'y',
    ctrl: true,
    description: 'やり直し',
    category: '編集',
    action: () => {
      const store = useEditorStore.getState();
      store.redo();
    },
  },
  {
    key: 'z',
    ctrl: true,
    shift: true,
    description: 'やり直し',
    category: '編集',
    action: () => {
      const store = useEditorStore.getState();
      store.redo();
    },
  },
  {
    key: 'c',
    ctrl: true,
    description: 'コピー',
    category: '編集',
    action: () => {
      toast.info('コピー機能は準備中です');
    },
  },
  {
    key: 'v',
    ctrl: true,
    description: '貼り付け',
    category: '編集',
    action: () => {
      toast.info('貼り付け機能は準備中です');
    },
  },
  {
    key: 'x',
    ctrl: true,
    description: '切り取り',
    category: '編集',
    action: () => {
      toast.info('切り取り機能は準備中です');
    },
  },
  {
    key: 'a',
    ctrl: true,
    description: 'すべて選択',
    category: '編集',
    action: () => {
      toast.info('すべて選択機能は準備中です');
    },
  },
  {
    key: 'd',
    ctrl: true,
    description: '複製',
    category: '編集',
    action: () => {
      toast.info('複製機能は準備中です');
    },
  },
  {
    key: 'Delete',
    description: '削除',
    category: '編集',
    action: () => {
      toast.info('削除機能は準備中です');
    },
  },

  // View operations
  {
    key: '=',
    ctrl: true,
    description: 'ズームイン',
    category: '表示',
    action: () => {
      toast.info('ズームイン');
    },
  },
  {
    key: '-',
    ctrl: true,
    description: 'ズームアウト',
    category: '表示',
    action: () => {
      toast.info('ズームアウト');
    },
  },
  {
    key: '0',
    ctrl: true,
    description: 'ズームリセット',
    category: '表示',
    action: () => {
      toast.info('ズームリセット');
    },
  },
  {
    key: '9',
    ctrl: true,
    description: '画面に合わせる',
    category: '表示',
    action: () => {
      toast.info('画面に合わせる');
    },
  },
  {
    key: 'g',
    ctrl: true,
    description: 'グリッド表示切替',
    category: '表示',
    action: () => {
      const store = useEditorStore.getState();
      store.toggleGrid();
      toast.success(store.showGrid ? 'グリッドを表示' : 'グリッドを非表示');
    },
  },
  {
    key: 'r',
    ctrl: true,
    description: 'ルーラー表示切替',
    category: '表示',
    action: () => {
      const store = useEditorStore.getState();
      store.toggleGuides();
      toast.success(store.showGuides ? 'ガイドを表示' : 'ガイドを非表示');
    },
  },
  {
    key: 'F11',
    description: 'フルスクリーン',
    category: '表示',
    action: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    },
    preventDefault: false,
  },

  // Navigation
  {
    key: 'ArrowRight',
    description: '次のステップ',
    category: 'ナビゲーション',
    action: () => {
      const store = useEditorStore.getState();
      const project = store.project;
      if (!project || project.steps.length === 0) return;
      const idx = project.steps.findIndex((s) => s.id === store.currentStepId);
      const next = idx >= 0 ? idx + 1 : 0;
      if (next < project.steps.length) store.setCurrentStep(project.steps[next].id);
    },
  },
  {
    key: 'ArrowLeft',
    description: '前のステップ',
    category: 'ナビゲーション',
    action: () => {
      const store = useEditorStore.getState();
      const project = store.project;
      if (!project || project.steps.length === 0) return;
      const idx = project.steps.findIndex((s) => s.id === store.currentStepId);
      const prev = idx > 0 ? idx - 1 : 0;
      store.setCurrentStep(project.steps[prev].id);
    },
  },
  {
    key: 'Home',
    description: '最初のステップ',
    category: 'ナビゲーション',
    action: () => {
      const store = useEditorStore.getState();
      const project = store.project;
      if (!project || project.steps.length === 0) return;
      store.setCurrentStep(project.steps[0].id);
    },
  },
  {
    key: 'End',
    description: '最後のステップ',
    category: 'ナビゲーション',
    action: () => {
      const store = useEditorStore.getState();
      const project = store.project;
      if (!project || project.steps.length === 0) return;
      store.setCurrentStep(project.steps[project.steps.length - 1].id);
    },
  },
  {
    key: 'f',
    ctrl: true,
    description: '検索',
    category: 'ナビゲーション',
    action: () => {
      toast.info('検索機能は準備中です');
    },
  },

  // Tools
  {
    key: 'v',
    description: '選択ツール',
    category: 'ツール',
    action: () => {
      const store = useEditorStore.getState();
      store.setEditorMode('select');
      toast.success('選択ツール');
    },
  },
  {
    key: 'h',
    description: 'ホットスポットツール',
    category: 'ツール',
    action: () => {
      const store = useEditorStore.getState();
      store.setEditorMode('hotspot');
      toast.success('ホットスポットツール');
    },
  },
  {
    key: 'a',
    description: '注釈ツール',
    category: 'ツール',
    action: () => {
      const store = useEditorStore.getState();
      store.setEditorMode('annotation');
      toast.success('注釈ツール');
    },
  },
  {
    key: 'm',
    description: 'マスクツール',
    category: 'ツール',
    action: () => {
      const store = useEditorStore.getState();
      store.setEditorMode('mask');
      toast.success('マスクツール');
    },
  },
  {
    key: 't',
    description: 'テキストツール',
    category: 'ツール',
    action: () => {
      const store = useEditorStore.getState();
      store.setEditorMode('text');
      toast.success('テキストツール');
    },
  },

  // Help
  {
    key: '?',
    shift: true,
    description: 'ヘルプ',
    category: 'ヘルプ',
    action: () => {
      toast.info('ヘルプを表示');
    },
  },
  {
    key: 'F1',
    description: 'ヘルプ',
    category: 'ヘルプ',
    action: () => {
      toast.info('ヘルプを表示');
    },
    preventDefault: false,
  },
];
