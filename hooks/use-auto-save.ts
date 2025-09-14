'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';
import { indexedDBStorage } from '@/lib/storage/indexed-db';
import { toast } from 'sonner';
// Lightweight debounce to avoid external dependency
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  (debounced as any).cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced as T & { cancel: () => void };
}

interface AutoSaveOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  debounceDelay?: number; // milliseconds
  onSave?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoSave(options: AutoSaveOptions = {}) {
  const {
    enabled = true,
    interval = 30000, // 30 seconds
    debounceDelay = 5000, // 5 seconds
    onSave,
    onError,
  } = options;

  const { project, saveProject } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const projectRef = useRef(project);

  // Update project ref when project changes
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Auto-save function
  const performSave = useCallback(async () => {
    if (!projectRef.current || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Save to IndexedDB
      await indexedDBStorage.saveProject(projectRef.current);

      // Also save as autosave for recovery
      await indexedDBStorage.saveAutoSave(projectRef.current);

      // Update store
      await saveProject();

      setLastSaved(new Date());
      onSave?.();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('保存に失敗しました');
      setSaveError(err);
      onError?.(err);
      console.error('Auto-save failed:', error);
      toast.error('自動保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, saveProject, onSave, onError]);

  // Debounced save for immediate changes
  const debouncedSave = useRef(
    debounce(() => {
      performSave();
    }, debounceDelay)
  ).current;

  // Trigger save on project changes
  useEffect(() => {
    if (!enabled || !project) return;

    debouncedSave();
  }, [project, enabled, debouncedSave]);

  // Periodic auto-save
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, performSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (projectRef.current && enabled) {
        // Try to save synchronously (not recommended but useful for emergency)
        const projectData = JSON.stringify(projectRef.current);
        localStorage.setItem('plainer_emergency_save', projectData);

        // Show warning if there are unsaved changes
        if (isSaving) {
          e.preventDefault();
          e.returnValue =
            '保存中です。このページを離れると変更が失われる可能性があります。';
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isSaving]);

  // Manual save trigger
  const saveNow = useCallback(async () => {
    debouncedSave.cancel();
    await performSave();
  }, [debouncedSave, performSave]);

  // Recover from emergency save
  const recoverEmergencySave = useCallback(async () => {
    const emergencyData = localStorage.getItem('plainer_emergency_save');
    if (emergencyData) {
      try {
        const project = JSON.parse(emergencyData);
        await indexedDBStorage.saveProject(project);
        localStorage.removeItem('plainer_emergency_save');
        toast.success('緊急保存データを復元しました');
        return project;
      } catch (error) {
        console.error('Failed to recover emergency save:', error);
        toast.error('緊急保存データの復元に失敗しました');
      }
    }
    return null;
  }, []);

  // Check for crash recovery on mount
  useEffect(() => {
    recoverEmergencySave();
  }, [recoverEmergencySave]);

  return {
    isSaving,
    lastSaved,
    saveError,
    saveNow,
    recoverEmergencySave,
  };
}

// Auto-save status indicator hook
export function useAutoSaveStatus() {
  const { isSaving, lastSaved, saveError } = useAutoSave();
  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  useEffect(() => {
    if (isSaving) {
      setStatusText('保存中...');
      setStatusType('saving');
    } else if (saveError) {
      setStatusText('保存エラー');
      setStatusType('error');
    } else if (lastSaved) {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();

      if (diff < 5000) {
        setStatusText('保存しました');
        setStatusType('saved');
      } else if (diff < 60000) {
        setStatusText('数秒前に保存');
        setStatusType('saved');
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        setStatusText(`${minutes}分前に保存`);
        setStatusType('saved');
      } else {
        const hours = Math.floor(diff / 3600000);
        setStatusText(`${hours}時間前に保存`);
        setStatusType('saved');
      }
    } else {
      setStatusText('未保存');
      setStatusType('idle');
    }
  }, [isSaving, lastSaved, saveError]);

  // Update time display every minute
  useEffect(() => {
    if (!lastSaved || isSaving || saveError) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();

      if (diff < 60000) {
        setStatusText('数秒前に保存');
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        setStatusText(`${minutes}分前に保存`);
      } else {
        const hours = Math.floor(diff / 3600000);
        setStatusText(`${hours}時間前に保存`);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSaved, isSaving, saveError]);

  return {
    statusText,
    statusType,
    isSaving,
    lastSaved,
    saveError,
  };
}
