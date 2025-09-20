'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  HelpCircle,
  MousePointerClick,
  Layers,
  PenTool,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  recordOnboardingMetric,
  createOnboardingSessionId,
} from '@/lib/onboarding/metrics';

export const ONBOARDING_STORAGE_KEY = 'plainer.onboarding.completed';

interface OnboardingStep {
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
  tip?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'PLAINERへようこそ',
    description:
      'スクリーンショットや画像から、分かりやすい操作手順を作成できるエディタです。これから基本の流れを体験しましょう。',
    icon: HelpCircle,
    highlights: [
      '画像をアップロードするとステップが自動生成されます',
      '左側でステップを整理し、中央のキャンバスで編集します',
      '困ったらいつでも右上のガイドメニューを開けます',
    ],
  },
  {
    title: '画像を取り込む',
    description:
      'まずはスクリーンショットをドラッグ＆ドロップするか、「アップロード」タブから選択します。',
    icon: MousePointerClick,
    highlights: [
      '複数枚まとめてアップロード可能',
      '取り込んだ順番がステップ順として並びます',
      '後からドラッグで並べ替えもできます',
    ],
  },
  {
    title: '注釈とホットスポット',
    description:
      '中央のキャンバスではホットスポットや注釈、マスクを使って操作ポイントを強調できます。',
    icon: PenTool,
    highlights: [
      '画面上を選択して説明を追加',
      'オブジェクトは右側のパネルから微調整',
      'ショートカット ? で操作一覧を確認できます',
    ],
    tip: 'ヒント: Shift キーを押しながらドラッグすると、図形を正円や正方形で描けます。',
  },
  {
    title: 'ステップの整理と共有',
    description:
      '左のステップリストで順序を調整し、右上からプレビューやエクスポートが行えます。',
    icon: Layers,
    highlights: [
      'ドラッグ＆ドロップでステップを並べ替え',
      '各ステップに説明文・CTAを追加可能',
      'プロジェクトはブラウザに自動保存されます',
    ],
    tip: 'ヒント: 保存アイコンから手動保存すると、バックアップ用にエクスポートもできます。',
  },
  {
    title: 'AIアシストを活用',
    description:
      '右側のAIアシスタントを使うと説明文の改善やステップの最適化を提案してくれます。',
    icon: Sparkles,
    highlights: [
      'モデルキー未設定でもモックが動作します',
      '生成結果はその場で編集して反映可能',
      '使い方動画やテンプレートも順次追加予定',
    ],
    tip: '次のステップ: 下の「チェックリスト」から、テンプレートや初心者モードも試してみましょう。',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  onRequestFeedback?: () => void;
  launchSource?: 'auto' | 'manual';
}

export function OnboardingTour({
  open,
  onOpenChange,
  onComplete,
  onRequestFeedback,
  launchSource = 'auto',
}: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const sessionFinalizedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      sessionFinalizedRef.current = false;
      sessionIdRef.current = createOnboardingSessionId();
      startedAtRef.current = Date.now();
      recordOnboardingMetric({
        type: 'start',
        sessionId: sessionIdRef.current,
        totalSteps: ONBOARDING_STEPS.length,
        source: launchSource,
      });
    }
  }, [open, launchSource]);

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStep = ONBOARDING_STEPS[stepIndex];

  const progress = useMemo(() => {
    return Math.round(((stepIndex + 1) / totalSteps) * 100);
  }, [stepIndex, totalSteps]);

  useEffect(() => {
    if (!open || !sessionIdRef.current) return;
    recordOnboardingMetric({
      type: 'step',
      sessionId: sessionIdRef.current,
      stepIndex,
      totalSteps,
      stepTitle: currentStep.title,
    });
  }, [open, stepIndex, totalSteps, currentStep.title]);

  const finishSession = useCallback(
    (type: 'complete' | 'skip' | 'abandon') => {
      if (!sessionIdRef.current) return;
      const duration = Date.now() - startedAtRef.current;
      if (type === 'complete') {
        recordOnboardingMetric({
          type,
          sessionId: sessionIdRef.current,
          totalSteps,
          durationMs: duration,
        });
      } else {
        recordOnboardingMetric({
          type,
          sessionId: sessionIdRef.current,
          totalSteps,
          stepIndex,
          durationMs: duration,
        });
      }
      sessionFinalizedRef.current = true;
    },
    [totalSteps, stepIndex]
  );

  const goToPrevious = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToNext = useCallback(() => {
    if (stepIndex === totalSteps - 1) {
      finishSession('complete');
      onComplete?.();
      onOpenChange(false);
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [finishSession, onComplete, onOpenChange, stepIndex, totalSteps]);

  const handleSkip = useCallback(() => {
    finishSession('skip');
    onComplete?.();
    onOpenChange(false);
  }, [finishSession, onComplete, onOpenChange]);

  useEffect(() => {
    if (open) return;
    if (sessionIdRef.current && !sessionFinalizedRef.current) {
      finishSession('abandon');
    }
    sessionIdRef.current = null;
  }, [open, finishSession]);

  const StepIcon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <StepIcon className="h-5 w-5 text-primary" />
            {currentStep.title}
          </DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              ステップ {stepIndex + 1} / {totalSteps}
            </div>
            <Progress value={progress} className="mt-2" />
          </div>

          <Separator />

          <ScrollArea className="max-h-48 pr-3">
            <ul className="space-y-2 text-sm">
              {currentStep.highlights.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          {currentStep.tip ? (
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-primary dark:text-primary-foreground/80">
              {currentStep.tip}
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            スキップ
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={stepIndex === 0}
            >
              戻る
            </Button>
            {stepIndex === totalSteps - 1 && onRequestFeedback ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestFeedback()}
              >
                フィードバック
              </Button>
            ) : null}
            <Button size="sm" onClick={goToNext}>
              {stepIndex === totalSteps - 1 ? '完了' : '次へ'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
