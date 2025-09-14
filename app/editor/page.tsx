'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Save,
  Play,
  Upload,
  Settings,
  Eye,
  Download,
  Share,
  FolderOpen,
} from 'lucide-react';
import { ImageUpload, type ProcessedImage } from '@/components/image-upload';
import { CanvasEditorModern } from '@/components/canvas-editor-modern';
import { StepList } from '@/components/step-list';
import { ResizablePanel } from '@/components/ui/resizable';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile, useIsTablet } from '@/hooks/use-media-query';
import { Menu } from 'lucide-react';
import { AnnotationTool } from '@/components/annotation-tool';
import { CTASettings } from '@/components/cta-settings';
import { MaskTool } from '@/components/mask-tool';
import { HistoryControls } from '@/components/history-controls';
import { HTMLPreview } from '@/components/html-preview';
import { DiffPreview } from '@/components/diff-preview';
import { AIAssistant } from '@/components/ai-assistant';
import { VoiceToSteps } from '@/components/voice-to-steps';
import { VariableManager } from '@/components/variable-manager';
import { BranchingManager } from '@/components/branching-manager';
import { DOMClone } from '@/components/dom-clone';
import { LanguageSwitcher } from '@/components/language-switcher';
import { KeyboardFocusHelp } from '@/components/keyboard-focus-help';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { ProjectManager } from '@/components/project-manager';
import { AutoSaveIndicator } from '@/components/auto-save-indicator';
import { useEditorStore, defaultTheme } from '@/lib/store';
import { useKeyboardFocus } from '@/hooks/use-keyboard-focus';
import {
  useKeyboardShortcuts,
  defaultShortcuts,
} from '@/hooks/use-keyboard-shortcuts';
import { useAutoSave } from '@/hooks/use-auto-save';
import type { Project, Step, Theme, Annotation, CTA, Mask } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCollaboration } from '@/hooks/use-collaboration';
import { CompactPresenceIndicator, CommentsPanel, LockIndicator } from '@/components/collaboration';
import type { ContentChange } from '@/lib/collaboration/types';

export default function EditorPage() {
  const {
    project,
    setProject,
    updateProject,
    addStep,
    currentStepId,
    setCurrentStep,
    updateStep,
    reorderSteps,
    duplicateStep,
    deleteStep,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectedAnnotationId,
    setSelectedAnnotation,
    addMask,
    updateMask,
    deleteMask,
    selectedMaskId,
    setSelectedMask,
    duplicateMask,
    history,
    historyIndex,
    undo,
    redo,
    saveToLocalStorage,
    loadFromLocalStorage,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<
    'upload' | 'edit' | 'preview' | 'assistant'
  >('upload');
  const [newProjectName, setNewProjectName] = useState('新しいプロジェクト');

  // Dialog states for Phase 4 features
  const [isVariableManagerOpen, setIsVariableManagerOpen] = useState(false);
  const [isBranchingManagerOpen, setIsBranchingManagerOpen] = useState(false);
  const [isDOMCloneOpen, setIsDOMCloneOpen] = useState(false);
  const [isLanguageSwitcherOpen, setIsLanguageSwitcherOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobilePropertiesOpen, setIsMobilePropertiesOpen] = useState(false);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // --- リアルタイム共同編集（プレゼンス＋カーソル） ---
  const [userName, setUserName] = useState<string>('ゲスト');
  const [userId, setUserId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');

  const collaboration = useCollaboration(
    {
      enabled: true,
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
      enableCursors: true,
      enablePresence: true,
      enableContentSync: true,
      autoReconnect: true,
    },
    {
      onContentChange: (change) => {
        // 受信したテキスト変更をプロジェクト／ステップに反映
        applyRemoteContentChange(change);
      },
    }
  );

  // ユーザーID/名前の初期化
  useEffect(() => {
    const storedId = localStorage.getItem('plainerUserId');
    const storedName = localStorage.getItem('plainerUserName');
    if (storedId) setUserId(storedId);
    else {
      const uid = `user_${Math.random().toString(36).slice(2, 10)}`;
      setUserId(uid);
      localStorage.setItem('plainerUserId', uid);
    }
    if (storedName) setUserName(storedName);
  }, []);

  // ルームID（プロジェクトIDを使用）
  useEffect(() => {
    if (project?.id) setRoomId(project.id);
  }, [project?.id]);

  // 名前の永続化
  useEffect(() => {
    if (userName) localStorage.setItem('plainerUserName', userName);
  }, [userName]);

  // キーボードフォーカス管理
  const { registerZone, currentZone, focusZone } = useKeyboardFocus({
    defaultZone: 'main',
    onZoneChange: (zone) => {
      console.log(`Editor focus zone changed to: ${zone}`);
    },
  });

  // キーボードショートカット
  useKeyboardShortcuts(defaultShortcuts, {
    enabled: true,
    onShortcutExecuted: (shortcut) => {
      console.log(`Shortcut executed: ${shortcut.description}`);
    },
  });

  // 自動保存
  const { saveNow } = useAutoSave({
    enabled: true,
    interval: 30000, // 30秒
    debounceDelay: 5000, // 5秒
    onSave: () => {
      console.log('Auto-saved project');
    },
    onError: (error) => {
      console.error('Auto-save error:', error);
    },
  });

  // Dialog close handlers
  const closeVariableManager = () => setIsVariableManagerOpen(false);
  const closeBranchingManager = () => setIsBranchingManagerOpen(false);
  const closeDOMClone = () => setIsDOMCloneOpen(false);
  const closeLanguageSwitcher = () => setIsLanguageSwitcherOpen(false);

  // プロジェクト作成
  const createNewProject = useCallback(() => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName,
      steps: [],
      chapters: [],
      theme: defaultTheme,
      variables: [],
      variableInstances: {},
      conditionalSteps: [],
      language: 'ja',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
    };
    setProject(newProject);
    setActiveTab('upload');
  }, [newProjectName, setProject]);

  // 画像処理完了時の処理
  const handleImagesProcessed = useCallback(
    (processedImages: ProcessedImage[]) => {
      if (!project) {
        // プロジェクトがない場合は新規作成
        createNewProject();
      }

      // 各画像をステップとして追加
      processedImages.forEach((processedImage, index) => {
        const step: Step = {
          id: `step-${Date.now()}-${index}`,
          title: `ステップ ${project ? project.steps.length + index + 1 : index + 1}`,
          description: '',
          image: processedImage.imageData,
          thumbnail: processedImage.thumbnail,
          hotspots: [],
          annotations: [],
          masks: [],
          order: project ? project.steps.length + index : index,
        };
        addStep(step);
      });

      // 最初のステップを選択してエディタータブに移動
      if (processedImages.length > 0 && !currentStepId) {
        const firstStep = processedImages[0];
        setCurrentStep(`step-${Date.now()}-0`);
      }

      setActiveTab('edit');
    },
    [project, addStep, currentStepId, setCurrentStep, createNewProject]
  );

  // ステップ選択
  const handleStepSelect = useCallback(
    (stepId: string) => {
      setCurrentStep(stepId);
    },
    [setCurrentStep]
  );

  // プロジェクト保存
  const handleSaveProject = useCallback(() => {
    if (project) {
      updateProject({ updatedAt: new Date() });
      saveToLocalStorage();
      // TODO: サーバーへの保存実装
    }
  }, [project, updateProject, saveToLocalStorage]);

  // プレビュー開始
  const handlePreview = useCallback(() => {
    if (project && project.steps.length > 0) {
      setActiveTab('preview');
      // TODO: プレビューモード実装
    }
  }, [project]);

  const currentStep = project?.steps.find((step) => step.id === currentStepId);
  const selectedAnnotation = currentStep?.annotations.find(
    (annotation) => annotation.id === selectedAnnotationId
  );

  // 注釈操作ハンドラー
  const handleAnnotationCreate = useCallback(
    (annotation: Omit<Annotation, 'id'>) => {
      if (currentStep) {
        const newAnnotation = {
          ...annotation,
          id: `annotation-${Date.now()}`,
        };
        addAnnotation(currentStep.id, newAnnotation);
      }
    },
    [currentStep, addAnnotation]
  );

  const handleAnnotationUpdate = useCallback(
    (annotationId: string, updates: Partial<Annotation>) => {
      if (currentStep) {
        updateAnnotation(currentStep.id, annotationId, updates);
      }
    },
    [currentStep, updateAnnotation]
  );

  const handleAnnotationDelete = useCallback(
    (annotationId: string) => {
      if (currentStep) {
        deleteAnnotation(currentStep.id, annotationId);
        if (selectedAnnotationId === annotationId) {
          setSelectedAnnotation(null);
        }
      }
    },
    [currentStep, deleteAnnotation, selectedAnnotationId, setSelectedAnnotation]
  );

  const handleAnnotationCancel = useCallback(() => {
    setSelectedAnnotation(null);
  }, [setSelectedAnnotation]);

  // CTA操作ハンドラー
  const handleCTAUpdate = useCallback(
    (cta: CTA | null) => {
      if (currentStep) {
        updateStep(currentStep.id, { cta });
      }
    },
    [currentStep, updateStep]
  );

  // マスク操作ハンドラー
  const handleMaskCreate = useCallback(
    (mask: Omit<Mask, 'id'>) => {
      if (currentStep) {
        const newMask = {
          ...mask,
          id: `mask-${Date.now()}`,
        };
        addMask(currentStep.id, newMask);
      }
    },
    [currentStep, addMask]
  );

  const handleMaskUpdate = useCallback(
    (maskId: string, updates: Partial<Mask>) => {
      if (currentStep) {
        updateMask(currentStep.id, maskId, updates);
      }
    },
    [currentStep, updateMask]
  );

  const handleMaskDelete = useCallback(
    (maskId: string) => {
      if (currentStep) {
        deleteMask(currentStep.id, maskId);
        if (selectedMaskId === maskId) {
          setSelectedMask(null);
        }
      }
    },
    [currentStep, deleteMask, selectedMaskId, setSelectedMask]
  );

  const handleMaskSelect = useCallback(
    (maskId: string | null) => {
      setSelectedMask(maskId);
    },
    [setSelectedMask]
  );

  const handleMaskDuplicate = useCallback(
    (maskId: string) => {
      if (currentStep) {
        duplicateMask(maskId);
      }
    },
    [currentStep, duplicateMask]
  );

  // --- プロパティ入力の同期（テキストフィールドを追跡） ---
  const projectNameRef = useRef<HTMLInputElement | null>(null);
  const stepTitleRef = useRef<HTMLInputElement | null>(null);
  const stepDescRef = useRef<HTMLTextAreaElement | null>(null);

  // 要素追跡のアタッチ/デタッチ
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (collaboration.manager && collaboration.isConnected) {
      if (projectNameRef.current) {
        cleanups.push(collaboration.trackTextInput(projectNameRef.current));
      }
      if (stepTitleRef.current) {
        cleanups.push(collaboration.trackTextInput(stepTitleRef.current));
      }
      if (stepDescRef.current) {
        cleanups.push(collaboration.trackTextInput(stepDescRef.current));
      }
    }
    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [collaboration.manager, collaboration.isConnected, currentStepId]);

  // リモート変更を適用するユーティリティ
  const applyTextChange = useCallback((text: string, change: ContentChange) => {
    const pos = Math.max(0, Math.min(change.position, text.length));
    switch (change.type) {
      case 'insert': {
        return text.slice(0, pos) + change.content + text.slice(pos);
      }
      case 'delete': {
        // content長ぶん削除（端を超えないように）
        const deleteLen = Math.min(change.content.length, text.length - pos);
        return text.slice(0, pos) + text.slice(pos + deleteLen);
      }
      case 'replace': {
        // 簡易版: content長ぶん置換
        const replaceLen = Math.min(change.content.length, text.length - pos);
        return text.slice(0, pos) + change.content + text.slice(pos + replaceLen);
      }
      default:
        return text;
    }
  }, []);

  const applyRemoteContentChange = useCallback(
    (change: ContentChange) => {
      if (!change.elementId) return;
      // プロジェクト名
      if (change.elementId === 'project-name' && project) {
        const base = project.name || '';
        const next = applyTextChange(base, change);
        updateProject({ name: next });
        return;
      }

      // ステップタイトル／説明
      const titlePrefix = 'step-title-';
      const descPrefix = 'step-desc-';
      if (change.elementId.startsWith(titlePrefix) && project) {
        const sid = change.elementId.slice(titlePrefix.length);
        const step = project.steps.find((s) => s.id === sid);
        if (step) {
          const base = step.title || '';
          const next = applyTextChange(base, change);
          updateStep(step.id, { title: next });
        }
        return;
      }
      if (change.elementId.startsWith(descPrefix) && project) {
        const sid = change.elementId.slice(descPrefix.length);
        const step = project.steps.find((s) => s.id === sid);
        if (step) {
          const base = step.description || '';
          const next = applyTextChange(base, change);
          updateStep(step.id, { description: next });
        }
        return;
      }
    },
    [project, updateProject, updateStep, applyTextChange]
  );

  // キャンバス用：カーソルトラッキング
  const cursorCleanupRef = useRef<null | (() => void)>(null);
  const canvasContainerRefForCollab = useRef<HTMLDivElement | null>(null);
  const handleCanvasContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      // 既存のリスナーをクリーンアップ
      if (cursorCleanupRef.current) {
        cursorCleanupRef.current();
        cursorCleanupRef.current = null;
      }
      // 接続中のみアタッチ
      canvasContainerRefForCollab.current = el;
      if (el && collaboration.manager && collaboration.isConnected) {
        cursorCleanupRef.current = collaboration.trackCursor(el);
      }
    },
    [collaboration.manager, collaboration.isConnected]
  );

  // 接続状態の変化に応じてカーソルトラッキングを再アタッチ
  useEffect(() => {
    const el = canvasContainerRefForCollab.current;
    if (!el || !collaboration.manager) return;
    // いったん外す
    if (cursorCleanupRef.current) {
      cursorCleanupRef.current();
      cursorCleanupRef.current = null;
    }
    if (collaboration.isConnected) {
      cursorCleanupRef.current = collaboration.trackCursor(el);
    }
    return () => {
      if (cursorCleanupRef.current) {
        cursorCleanupRef.current();
        cursorCleanupRef.current = null;
      }
    };
  }, [collaboration.manager, collaboration.isConnected]);

  // フォーカスゾーン登録
  const sidebarRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    if (sidebarRef.current) {
      const cleanup = registerZone('steps', sidebarRef.current);
      if (cleanup) cleanupFunctions.push(cleanup);
    }

    if (propertiesRef.current) {
      const cleanup = registerZone('properties', propertiesRef.current);
      if (cleanup) cleanupFunctions.push(cleanup);
    }

    if (toolbarRef.current) {
      const cleanup = registerZone('toolbar', toolbarRef.current);
      if (cleanup) cleanupFunctions.push(cleanup);
    }

    if (mainRef.current) {
      const cleanup = registerZone('main', mainRef.current);
      if (cleanup) cleanupFunctions.push(cleanup);
    }

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup?.());
    };
  }, [registerZone, project]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') {
        return; // 入力フィールドでは無視
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSaveProject]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        {/* ヘッダー */}
        <header className="border-b">
          <div
            ref={toolbarRef}
            className={cn(
              'flex items-center justify-between p-4',
              'focus:outline-none transition-all duration-200',
              currentZone === 'toolbar' &&
                'ring-2 ring-blue-500 ring-opacity-50'
            )}
            role="toolbar"
            aria-label="エディターツールバー"
            tabIndex={0}
          >
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">PLAINER Editor</h1>
              {project && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="project-name" className="text-sm">
                      プロジェクト名:
                    </Label>
                    <Input
                      id="project-name"
                      ref={projectNameRef}
                      value={project.name}
                      onChange={(e) => updateProject({ name: e.target.value })}
                      className="w-48"
                      disabled={
                        !!collaboration.locks.find(
                          (l) => l.resourceId === 'project-name' && l.ownerId !== collaboration.currentUser?.id
                        )
                      }
                    />
                    <LockIndicator
                      resourceId="project-name"
                      locks={collaboration.locks}
                      currentUserId={collaboration.currentUser?.id}
                      onAcquire={(rid) => collaboration.acquireLock(rid)}
                      onRelease={(rid) => collaboration.releaseLock(rid)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* 参加UI（プレゼンス + 名前 + 参加/退出） */}
              <div className="flex items-center gap-2 pr-2">
                <CompactPresenceIndicator
                  users={collaboration.users}
                  currentUserId={collaboration.currentUser?.id}
                  isConnected={collaboration.isConnected}
                  isReconnecting={collaboration.isReconnecting}
                  className="mr-2"
                />
                <Input
                  placeholder="名前"
                  className="w-28"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                {collaboration.isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => collaboration.disconnect()}
                  >
                    退出
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (roomId && userId && userName) {
                        collaboration.connect(roomId, userId, userName);
                      }
                    }}
                    disabled={!project}
                  >
                    参加
                  </Button>
                )}
              </div>
              {project && (
                <>
                  <HistoryControls
                    canUndo={historyIndex > 0}
                    canRedo={historyIndex < history.length - 1}
                    historyIndex={historyIndex}
                    historyLength={history.length}
                    onUndo={undo}
                    onRedo={redo}
                    onSave={handleSaveProject}
                    showSave
                    compact
                  />

                  <Separator orientation="vertical" className="h-6" />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={!project.steps.length}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    プレビュー
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Share className="w-4 h-4" />
                    共有
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    エクスポート
                  </Button>

                  {/* Voice to Steps (Intelligent feature) */}
                  <VoiceToSteps />
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setIsProjectManagerOpen(true)}
              >
                <FolderOpen className="w-4 h-4" />
                プロジェクト
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setIsShortcutsDialogOpen(true)}
              >
                <Settings className="w-4 h-4" />
                設定
              </Button>

              <AutoSaveIndicator showDetails={true} onManualSave={saveNow} />

              <KeyboardFocusHelp />
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <div className="flex-1 flex">
          {/* デスクトップサイドバー */}
          {project && !isMobile && !isTablet && (
            <ResizablePanel
              defaultSize={256}
              minSize={200}
              maxSize={400}
              direction="horizontal"
              persistKey="editor-sidebar"
              className={cn(
                'border-r bg-muted/30',
                'focus:outline-none transition-all duration-200',
                currentZone === 'steps' &&
                  'ring-2 ring-blue-500 ring-opacity-50'
              )}
            >
              <div
                ref={sidebarRef}
                className="h-full focus:outline-none"
                role="navigation"
                aria-label="ステップナビゲーション"
                tabIndex={0}
              >
                <StepList
                  steps={project.steps}
                  currentStepId={currentStepId}
                  onStepSelect={handleStepSelect}
                  onStepsReorder={reorderSteps}
                  onStepDuplicate={duplicateStep}
                  onStepDelete={deleteStep}
                  onAddStep={() => setActiveTab('upload')}
                />
              </div>

              <div className="p-4 border-t">
                <div>
                  <h3 className="text-sm font-medium mb-2">章</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    章を追加
                  </Button>
                </div>
              </div>
            </ResizablePanel>
          )}

          {/* モバイル・タブレットサイドバー */}
          {project && (isMobile || isTablet) && (
            <Drawer
              open={isMobileSidebarOpen}
              onOpenChange={setIsMobileSidebarOpen}
            >
              <DrawerContent side="left">
                <DrawerHeader>
                  <DrawerTitle>ステップ一覧</DrawerTitle>
                </DrawerHeader>
                <div className="flex-1 overflow-auto">
                  <StepList
                    steps={project.steps}
                    currentStepId={currentStepId}
                    onStepSelect={(stepId) => {
                      handleStepSelect(stepId);
                      setIsMobileSidebarOpen(false);
                    }}
                    onStepsReorder={reorderSteps}
                    onStepDuplicate={duplicateStep}
                    onStepDelete={deleteStep}
                    onAddStep={() => {
                      setActiveTab('upload');
                      setIsMobileSidebarOpen(false);
                    }}
                  />
                  <div className="p-4 border-t">
                    <div>
                      <h3 className="text-sm font-medium mb-2">章</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        章を追加
                      </Button>
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          )}

          {/* メインエリア */}
          <main
            ref={mainRef}
            className={cn(
              'flex-1 flex flex-col',
              'focus:outline-none transition-all duration-200',
              currentZone === 'main' && 'ring-2 ring-blue-500 ring-opacity-50'
            )}
            role="main"
            aria-label="メインコンテンツ"
            tabIndex={0}
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <div className="border-b">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger
                    value="upload"
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    アップロード
                  </TabsTrigger>
                  <TabsTrigger
                    value="edit"
                    disabled={!project}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    編集
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    disabled={!project?.steps.length}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    プレビュー
                  </TabsTrigger>
                  <TabsTrigger
                    value="assistant"
                    disabled={!project}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    アシスタント
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                {/* モバイル用メニューボタン */}
                {(isMobile || isTablet) && project && (
                  <div className="flex gap-2 p-2 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMobileSidebarOpen(true)}
                    >
                      <Menu className="w-4 h-4 mr-2" />
                      ステップ
                    </Button>
                    {currentStep && activeTab === 'edit' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMobilePropertiesOpen(true)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        プロパティ
                      </Button>
                    )}
                  </div>
                )}

                <TabsContent value="upload" className="h-full p-6">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center space-y-4">
                      <h2 className="text-2xl font-bold">新しいガイドを作成</h2>
                      <p className="text-muted-foreground">
                        スクリーンショットをアップロードして、インタラクティブなガイドを作成しましょう
                      </p>
                    </div>

                    {!project && (
                      <Card>
                        <CardHeader>
                          <CardTitle>プロジェクト設定</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-project-name">
                              プロジェクト名
                            </Label>
                            <Input
                              id="new-project-name"
                              value={newProjectName}
                              onChange={(e) =>
                                setNewProjectName(e.target.value)
                              }
                              placeholder="プロジェクト名を入力してください"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <ImageUpload
                      onFilesProcessed={handleImagesProcessed}
                      maxFiles={50}
                      maxFileSizeMB={10}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="edit" className="h-full">
                  {currentStep ? (
                    <div className="flex h-full">
                      <div className="flex-1 p-4">
                        <CanvasEditorModern
                          step={currentStep}
                          width={isMobile ? 320 : isTablet ? 600 : 800}
                          height={isMobile ? 480 : 600}
                          remoteCursors={collaboration.cursors}
                          onContainerRef={handleCanvasContainerRef}
                        />
                      </div>

                      {/* デスクトッププロパティパネル */}
                      {!isMobile && !isTablet && (
                        <ResizablePanel
                          defaultSize={320}
                          minSize={280}
                          maxSize={480}
                          direction="horizontal"
                          persistKey="editor-properties"
                          className={cn(
                            'border-l bg-muted/30',
                            'focus:outline-none transition-all duration-200',
                            currentZone === 'properties' &&
                              'ring-2 ring-blue-500 ring-opacity-50'
                          )}
                        >
                          <div
                            ref={propertiesRef}
                            className="p-4 w-full h-full focus:outline-none"
                            role="complementary"
                            aria-label="プロパティパネル"
                            tabIndex={0}
                          >
                            <ScrollArea className="h-full">
                              <div className="space-y-6">
                                <div>
                                  <h3 className="text-lg font-medium mb-3">
                                    ステップ設定
                                  </h3>
                                  <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>タイトル</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id={`step-title-${currentStep.id}`}
                                        ref={stepTitleRef}
                                        value={currentStep.title}
                                        onChange={(e) => {
                                          updateStep(currentStep.id, {
                                            title: e.target.value,
                                          });
                                        }}
                                        disabled={
                                          !!collaboration.locks.find(
                                            (l) => l.resourceId === `step-title-${currentStep.id}` && l.ownerId !== collaboration.currentUser?.id
                                          )
                                        }
                                      />
                                      <LockIndicator
                                        resourceId={`step-title-${currentStep.id}`}
                                        locks={collaboration.locks}
                                        currentUserId={collaboration.currentUser?.id}
                                        onAcquire={(rid) => collaboration.acquireLock(rid)}
                                        onRelease={(rid) => collaboration.releaseLock(rid)}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>説明</Label>
                                    <div className="flex items-start gap-2">
                                      <textarea
                                        id={`step-desc-${currentStep.id}`}
                                        ref={stepDescRef}
                                        className="w-full p-2 border rounded-md resize-none"
                                        rows={3}
                                        value={currentStep.description || ''}
                                        onChange={(e) => {
                                          updateStep(currentStep.id, {
                                            description: e.target.value,
                                          });
                                        }}
                                        disabled={
                                          !!collaboration.locks.find(
                                            (l) => l.resourceId === `step-desc-${currentStep.id}` && l.ownerId !== collaboration.currentUser?.id
                                          )
                                        }
                                      />
                                      <LockIndicator
                                        resourceId={`step-desc-${currentStep.id}`}
                                        locks={collaboration.locks}
                                        currentUserId={collaboration.currentUser?.id}
                                        onAcquire={(rid) => collaboration.acquireLock(rid)}
                                        onRelease={(rid) => collaboration.releaseLock(rid)}
                                        className="mt-1"
                                      />
                                    </div>
                                  </div>
                                  </div>
                                </div>

                                <Separator />

                                <div>
                                  <h3 className="text-lg font-medium mb-3">
                                    要素
                                  </h3>
                                  <div className="space-y-3">
                                    <div className="text-sm">
                                      <div className="flex justify-between">
                                        <span>ホットスポット</span>
                                        <span className="text-muted-foreground">
                                          {currentStep.hotspots.length}個
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-sm">
                                      <div className="flex justify-between">
                                        <span>注釈</span>
                                        <span className="text-muted-foreground">
                                          {currentStep.annotations.length}個
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-sm">
                                      <div className="flex justify-between">
                                        <span>マスク</span>
                                        <span className="text-muted-foreground">
                                          {currentStep.masks.length}個
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* 注釈ツール */}
                                <AnnotationTool
                                  selectedAnnotation={
                                    selectedAnnotation || null
                                  }
                                  onAnnotationUpdate={handleAnnotationUpdate}
                                  onAnnotationDelete={handleAnnotationDelete}
                                  onAnnotationCreate={handleAnnotationCreate}
                                  onCancel={handleAnnotationCancel}
                                  canvasWidth={800}
                                  canvasHeight={600}
                                  mentionUsers={collaboration.users}
                                />

                                <Separator />

                                {/* マスクツール */}
                                <MaskTool
                                  masks={currentStep.masks}
                                  selectedMaskId={selectedMaskId}
                                  onMaskCreate={handleMaskCreate}
                                  onMaskUpdate={handleMaskUpdate}
                                  onMaskDelete={handleMaskDelete}
                                  onMaskSelect={handleMaskSelect}
                                  onMaskDuplicate={handleMaskDuplicate}
                                />

                                <Separator />

                                {/* CTA設定 */}
                                <CTASettings
                                  cta={currentStep.cta}
                                  onCTAUpdate={handleCTAUpdate}
                                />

                                <Separator />

                                {/* コメントパネル（ステップ別） */}
                                <CommentsPanel
                                  stepId={currentStep.id}
                                  users={collaboration.users}
                                  currentUser={collaboration.currentUser}
                                  getComments={collaboration.getComments}
                                  addComment={collaboration.addComment}
                                  updateComment={collaboration.updateComment}
                                  deleteComment={collaboration.deleteComment}
                                  resolveComment={collaboration.resolveComment}
                                />
                              </div>
                            </ScrollArea>
                          </div>
                        </ResizablePanel>
                      )}

                      {/* モバイル・タブレットプロパティパネル */}
                      {(isMobile || isTablet) && (
                        <Drawer
                          open={isMobilePropertiesOpen}
                          onOpenChange={setIsMobilePropertiesOpen}
                        >
                          <DrawerContent side="right">
                            <DrawerHeader>
                              <DrawerTitle>ステップ設定</DrawerTitle>
                            </DrawerHeader>
                            <div className="flex-1 overflow-auto p-4">
                              <div className="space-y-6">
                                <div>
                                  <h3 className="text-lg font-medium mb-3">
                                    ステップ設定
                                  </h3>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>タイトル</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          id={`step-title-${currentStep.id}`}
                                          ref={stepTitleRef}
                                          value={currentStep.title}
                                          onChange={(e) => {
                                            updateStep(currentStep.id, {
                                              title: e.target.value,
                                            });
                                          }}
                                          disabled={
                                            !!collaboration.locks.find(
                                              (l) => l.resourceId === `step-title-${currentStep.id}` && l.ownerId !== collaboration.currentUser?.id
                                            )
                                          }
                                        />
                                        <LockIndicator
                                          resourceId={`step-title-${currentStep.id}`}
                                          locks={collaboration.locks}
                                          currentUserId={collaboration.currentUser?.id}
                                          onAcquire={(rid) => collaboration.acquireLock(rid)}
                                          onRelease={(rid) => collaboration.releaseLock(rid)}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>説明</Label>
                                      <div className="flex items-start gap-2">
                                        <textarea
                                          id={`step-desc-${currentStep.id}`}
                                          ref={stepDescRef}
                                          className="w-full p-2 border rounded-md resize-none"
                                          rows={3}
                                          value={currentStep.description || ''}
                                          onChange={(e) => {
                                            updateStep(currentStep.id, {
                                              description: e.target.value,
                                            });
                                          }}
                                          disabled={
                                            !!collaboration.locks.find(
                                              (l) => l.resourceId === `step-desc-${currentStep.id}` && l.ownerId !== collaboration.currentUser?.id
                                            )
                                          }
                                        />
                                        <LockIndicator
                                          resourceId={`step-desc-${currentStep.id}`}
                                          locks={collaboration.locks}
                                          currentUserId={collaboration.currentUser?.id}
                                          onAcquire={(rid) => collaboration.acquireLock(rid)}
                                          onRelease={(rid) => collaboration.releaseLock(rid)}
                                          className="mt-1"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* 注釈ツール */}
                                <AnnotationTool
                                  selectedAnnotation={
                                    selectedAnnotation || null
                                  }
                                  onAnnotationUpdate={handleAnnotationUpdate}
                                  onAnnotationDelete={handleAnnotationDelete}
                                  onAnnotationCreate={handleAnnotationCreate}
                                  onCancel={handleAnnotationCancel}
                                  canvasWidth={isMobile ? 320 : 600}
                                  canvasHeight={isMobile ? 480 : 600}
                                  mentionUsers={collaboration.users}
                                />

                                <Separator />

                                {/* マスクツール */}
                                <MaskTool
                                  masks={currentStep.masks}
                                  selectedMaskId={selectedMaskId}
                                  onMaskCreate={handleMaskCreate}
                                  onMaskUpdate={handleMaskUpdate}
                                  onMaskDelete={handleMaskDelete}
                                  onMaskSelect={handleMaskSelect}
                                  onMaskDuplicate={handleMaskDuplicate}
                                />

                                <Separator />

                                {/* CTA設定 */}
                                <CTASettings
                                  cta={currentStep.cta}
                                  onCTAUpdate={handleCTAUpdate}
                                />

                                <Separator />

                                {/* コメントパネル（ステップ別） */}
                                <CommentsPanel
                                  stepId={currentStep.id}
                                  users={collaboration.users}
                                  currentUser={collaboration.currentUser}
                                  getComments={collaboration.getComments}
                                  addComment={collaboration.addComment}
                                  updateComment={collaboration.updateComment}
                                  deleteComment={collaboration.deleteComment}
                                  resolveComment={collaboration.resolveComment}
                                />
                              </div>
                            </div>
                          </DrawerContent>
                        </Drawer>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <h3 className="text-lg font-medium">
                          ステップを選択してください
                        </h3>
                        <p className="text-muted-foreground">
                          左のサイドバーからステップを選択するか、新しい画像をアップロードしてください。
                        </p>
                        <Button onClick={() => setActiveTab('upload')}>
                          画像をアップロード
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="h-full">
                  {project && project.steps.length > 0 ? (
                    <div className="h-full flex gap-4 p-4">
                      {/* HTMLプレビュー */}
                      <div className="flex-1">
                        <HTMLPreview />
                      </div>

                      {/* 差分プレビュー */}
                      <div className="w-80">
                        <DiffPreview />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <h3 className="text-lg font-medium">
                          プレビューするステップがありません
                        </h3>
                        <p className="text-muted-foreground">
                          まず画像をアップロードしてステップを作成してください。
                        </p>
                        <Button onClick={() => setActiveTab('upload')}>
                          画像をアップロード
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="assistant" className="h-full">
                  {project ? (
                    <div className="h-full p-4">
                      <AIAssistant
                        onSuggestionApply={(suggestion) => {
                          console.log('Applying suggestion:', suggestion);
                          // TODO: 提案の適用ロジック実装
                        }}
                        context={{
                          currentStep: currentStepId || undefined,
                          totalSteps: project.steps.length,
                          selectedElement:
                            selectedAnnotationId || selectedMaskId || undefined,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <h3 className="text-lg font-medium">
                          プロジェクトが選択されていません
                        </h3>
                        <p className="text-muted-foreground">
                          まずプロジェクトを作成してください。
                        </p>
                        <Button onClick={() => setActiveTab('upload')}>
                          新しいプロジェクトを作成
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Phase 4 Dialog Components */}
      <VariableManager
        isOpen={isVariableManagerOpen}
        onClose={closeVariableManager}
      />

      <BranchingManager
        isOpen={isBranchingManagerOpen}
        onClose={closeBranchingManager}
      />

      <DOMClone isOpen={isDOMCloneOpen} onClose={closeDOMClone} />

      <LanguageSwitcher
        isOpen={isLanguageSwitcherOpen}
        onClose={closeLanguageSwitcher}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={isShortcutsDialogOpen}
        onOpenChange={setIsShortcutsDialogOpen}
      />

      {/* Project Manager Dialog */}
      <ProjectManager
        open={isProjectManagerOpen}
        onOpenChange={setIsProjectManagerOpen}
        onProjectSelect={(project) => {
          setProject(project);
          setActiveTab('edit');
        }}
      />
    </div>
  );
}
