'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Project } from '@/lib/types';

export interface PostMessageCommand {
  type: 'nextStep' | 'prevStep' | 'goToStep' | 'play' | 'pause' | 'fullscreen';
  data?: {
    stepIndex?: number;
    enabled?: boolean;
  };
}

export interface PostMessageEvent {
  type: 'ready' | 'stepChange' | 'complete' | 'error';
  data?: {
    stepIndex?: number;
    totalSteps?: number;
    currentStep?: {
      id: string;
      title: string;
      description: string;
    };
    project?: {
      id: string;
      name: string;
    };
    error?: string;
  };
}

interface UsePostMessageAPIProps {
  project: Project;
  currentStepIndex: number;
  onCommand?: (command: PostMessageCommand) => void;
}

export function usePostMessageAPI({
  project,
  currentStepIndex,
  onCommand,
}: UsePostMessageAPIProps) {
  const isInIframe = useRef<boolean>(false);
  const parentOrigin = useRef<string>('*');

  // iframe内で実行されているかを検出
  useEffect(() => {
    try {
      isInIframe.current = window.self !== window.top;

      if (isInIframe.current) {
        // 親フレームのオリジンを取得（可能であれば）
        try {
          parentOrigin.current = document.referrer
            ? new URL(document.referrer).origin
            : '*';
        } catch {
          parentOrigin.current = '*';
        }
      }
    } catch {
      // Same-origin制約によりアクセスできない場合はiframe内と判断
      isInIframe.current = true;
    }
  }, []);

  // 親フレームにメッセージを送信
  const sendToParent = useCallback((event: PostMessageEvent) => {
    if (!isInIframe.current) return;

    try {
      window.parent.postMessage(
        {
          source: 'plainer-embed',
          ...event,
        },
        parentOrigin.current
      );
    } catch (error) {
      console.error('Failed to send message to parent:', error);
    }
  }, []);

  // 親フレームからのコマンドを受信
  useEffect(() => {
    if (!isInIframe.current) return;

    const handleMessage = (event: MessageEvent) => {
      // セキュリティチェック - PLAINERからのメッセージのみ受け入れ
      if (!event.data || event.data.source !== 'plainer-parent') {
        return;
      }

      const command: PostMessageCommand = event.data;

      // コマンドの検証
      if (!command.type) {
        sendToParent({
          type: 'error',
          data: { error: 'Invalid command: missing type' },
        });
        return;
      }

      try {
        onCommand?.(command);
      } catch (error) {
        sendToParent({
          type: 'error',
          data: { error: `Command execution failed: ${error}` },
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCommand, sendToParent]);

  // 初期化完了時のready通知
  useEffect(() => {
    if (!isInIframe.current) return;

    const timer = setTimeout(() => {
      sendToParent({
        type: 'ready',
        data: {
          stepIndex: currentStepIndex,
          totalSteps: project.steps.length,
          project: {
            id: project.id,
            name: project.name,
          },
          currentStep: {
            id: project.steps[currentStepIndex]?.id || '',
            title: project.steps[currentStepIndex]?.title || '',
            description: project.steps[currentStepIndex]?.description || '',
          },
        },
      });
    }, 100); // 少し遅らせて確実に初期化を待つ

    return () => clearTimeout(timer);
  }, []); // 初回のみ実行

  // ステップ変更時の通知
  useEffect(() => {
    if (!isInIframe.current) return;

    const currentStep = project.steps[currentStepIndex];
    if (!currentStep) return;

    sendToParent({
      type: 'stepChange',
      data: {
        stepIndex: currentStepIndex,
        totalSteps: project.steps.length,
        currentStep: {
          id: currentStep.id,
          title: currentStep.title,
          description: currentStep.description,
        },
      },
    });
  }, [currentStepIndex, project.steps, sendToParent]);

  // 完了時の通知
  const notifyComplete = useCallback(() => {
    if (!isInIframe.current) return;

    sendToParent({
      type: 'complete',
      data: {
        stepIndex: currentStepIndex,
        totalSteps: project.steps.length,
      },
    });
  }, [currentStepIndex, project.steps.length, sendToParent]);

  // エラー通知
  const notifyError = useCallback(
    (error: string) => {
      if (!isInIframe.current) return;

      sendToParent({
        type: 'error',
        data: { error },
      });
    },
    [sendToParent]
  );

  return {
    isInIframe: isInIframe.current,
    sendToParent,
    notifyComplete,
    notifyError,
  };
}
