'use client';

import { useState, useMemo } from 'react';
import { useEditorStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  GitCompare,
  Plus,
  Minus,
  Edit,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step, Hotspot, Annotation, Mask } from '@/lib/types';

interface DiffPreviewProps {
  className?: string;
  compareWithPrevious?: boolean;
}

interface StepDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  field: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

interface ChangesSummary {
  hotspots: {
    added: number;
    removed: number;
    modified: number;
  };
  annotations: {
    added: number;
    removed: number;
    modified: number;
  };
  masks: {
    added: number;
    removed: number;
    modified: number;
  };
  properties: {
    added: number;
    removed: number;
    modified: number;
  };
}

export function DiffPreview({
  className,
  compareWithPrevious = true,
}: DiffPreviewProps) {
  const { project, currentStepId, history, historyIndex } = useEditorStore();
  const [comparisonMode, setComparisonMode] = useState<'previous' | 'history'>(
    'previous'
  );
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number>(0);

  // 現在のステップと比較対象ステップを取得
  const { currentStep, compareStep, comparisonLabel } = useMemo(() => {
    if (!project?.steps?.length) {
      return { currentStep: null, compareStep: null, comparisonLabel: '' };
    }

    const current = currentStepId
      ? project.steps.find((step) => step.id === currentStepId)
      : project.steps[0];

    let compare: Step | null = null;
    let label = '';

    if (comparisonMode === 'previous') {
      if (current) {
        const currentIndex = project.steps.findIndex(
          (step) => step.id === current.id
        );
        if (currentIndex > 0) {
          compare = project.steps[currentIndex - 1];
          label = `前のステップ (${compare.title})`;
        }
      }
    } else if (comparisonMode === 'history') {
      if (history.length > selectedHistoryIndex) {
        const historicalProject = history[selectedHistoryIndex];
        if (historicalProject && current) {
          compare =
            historicalProject.steps.find((step) => step.id === current.id) ||
            null;
          label = `履歴 #${selectedHistoryIndex + 1}`;
        }
      }
    }

    return {
      currentStep: current || null,
      compareStep: compare,
      comparisonLabel: label,
    };
  }, [project, currentStepId, comparisonMode, selectedHistoryIndex, history]);

  // 差分を計算
  const stepDiff = useMemo((): StepDiff[] => {
    if (!currentStep || !compareStep) return [];

    const diffs: StepDiff[] = [];

    // タイトルの比較
    if (currentStep.title !== compareStep.title) {
      diffs.push({
        type: 'modified',
        field: 'title',
        oldValue: compareStep.title,
        newValue: currentStep.title,
        description: 'ステップタイトルが変更されました',
      });
    }

    // 説明の比較
    if (currentStep.description !== compareStep.description) {
      diffs.push({
        type: 'modified',
        field: 'description',
        oldValue: compareStep.description,
        newValue: currentStep.description,
        description: 'ステップ説明が変更されました',
      });
    }

    // 画像URLの比較
    if (currentStep.imageUrl !== compareStep.imageUrl) {
      diffs.push({
        type: 'modified',
        field: 'imageUrl',
        oldValue: compareStep.imageUrl,
        newValue: currentStep.imageUrl,
        description: '背景画像が変更されました',
      });
    }

    // ホットスポットの比較
    const currentHotspots = new Map(currentStep.hotspots.map((h) => [h.id, h]));
    const compareHotspots = new Map(compareStep.hotspots.map((h) => [h.id, h]));

    // 追加されたホットスポット
    currentHotspots.forEach((hotspot, id) => {
      if (!compareHotspots.has(id)) {
        diffs.push({
          type: 'added',
          field: 'hotspots',
          newValue: hotspot,
          description: `ホットスポット「${hotspot.action?.content || 'Untitled'}」が追加されました`,
        });
      }
    });

    // 削除されたホットスポット
    compareHotspots.forEach((hotspot, id) => {
      if (!currentHotspots.has(id)) {
        diffs.push({
          type: 'removed',
          field: 'hotspots',
          oldValue: hotspot,
          description: `ホットスポット「${hotspot.action?.content || 'Untitled'}」が削除されました`,
        });
      }
    });

    // 変更されたホットスポット
    currentHotspots.forEach((current, id) => {
      const compare = compareHotspots.get(id);
      if (compare && JSON.stringify(current) !== JSON.stringify(compare)) {
        diffs.push({
          type: 'modified',
          field: 'hotspots',
          oldValue: compare,
          newValue: current,
          description: `ホットスポット「${current.action?.content || 'Untitled'}」が変更されました`,
        });
      }
    });

    // 注釈の比較
    const currentAnnotations = new Map(
      currentStep.annotations.map((a) => [a.id, a])
    );
    const compareAnnotations = new Map(
      compareStep.annotations.map((a) => [a.id, a])
    );

    currentAnnotations.forEach((annotation, id) => {
      if (!compareAnnotations.has(id)) {
        diffs.push({
          type: 'added',
          field: 'annotations',
          newValue: annotation,
          description: `注釈「${annotation.text}」が追加されました`,
        });
      }
    });

    compareAnnotations.forEach((annotation, id) => {
      if (!currentAnnotations.has(id)) {
        diffs.push({
          type: 'removed',
          field: 'annotations',
          oldValue: annotation,
          description: `注釈「${annotation.text}」が削除されました`,
        });
      }
    });

    currentAnnotations.forEach((current, id) => {
      const compare = compareAnnotations.get(id);
      if (compare && JSON.stringify(current) !== JSON.stringify(compare)) {
        diffs.push({
          type: 'modified',
          field: 'annotations',
          oldValue: compare,
          newValue: current,
          description: `注釈「${current.text}」が変更されました`,
        });
      }
    });

    // マスクの比較
    const currentMasks = new Map(currentStep.masks.map((m) => [m.id, m]));
    const compareMasks = new Map(compareStep.masks.map((m) => [m.id, m]));

    currentMasks.forEach((mask, id) => {
      if (!compareMasks.has(id)) {
        diffs.push({
          type: 'added',
          field: 'masks',
          newValue: mask,
          description: 'ぼかしマスクが追加されました',
        });
      }
    });

    compareMasks.forEach((mask, id) => {
      if (!currentMasks.has(id)) {
        diffs.push({
          type: 'removed',
          field: 'masks',
          oldValue: mask,
          description: 'ぼかしマスクが削除されました',
        });
      }
    });

    currentMasks.forEach((current, id) => {
      const compare = compareMasks.get(id);
      if (compare && JSON.stringify(current) !== JSON.stringify(compare)) {
        diffs.push({
          type: 'modified',
          field: 'masks',
          oldValue: compare,
          newValue: current,
          description: 'ぼかしマスクが変更されました',
        });
      }
    });

    // CTAの比較
    if (JSON.stringify(currentStep.cta) !== JSON.stringify(compareStep.cta)) {
      diffs.push({
        type: 'modified',
        field: 'cta',
        oldValue: compareStep.cta,
        newValue: currentStep.cta,
        description: 'CTA設定が変更されました',
      });
    }

    return diffs;
  }, [currentStep, compareStep]);

  // 変更サマリーを計算
  const changesSummary = useMemo((): ChangesSummary => {
    const summary: ChangesSummary = {
      hotspots: { added: 0, removed: 0, modified: 0 },
      annotations: { added: 0, removed: 0, modified: 0 },
      masks: { added: 0, removed: 0, modified: 0 },
      properties: { added: 0, removed: 0, modified: 0 },
    };

    stepDiff.forEach((diff) => {
      if (diff.field === 'hotspots') {
        summary.hotspots[diff.type as keyof typeof summary.hotspots]++;
      } else if (diff.field === 'annotations') {
        summary.annotations[diff.type as keyof typeof summary.annotations]++;
      } else if (diff.field === 'masks') {
        summary.masks[diff.type as keyof typeof summary.masks]++;
      } else {
        summary.properties[diff.type as keyof typeof summary.properties]++;
      }
    });

    return summary;
  }, [stepDiff]);

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'removed':
        return <Minus className="w-4 h-4 text-red-600" />;
      case 'modified':
        return <Edit className="w-4 h-4 text-orange-600" />;
      default:
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDiffTypeBadge = (type: string) => {
    switch (type) {
      case 'added':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            追加
          </Badge>
        );
      case 'removed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            削除
          </Badge>
        );
      case 'modified':
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            変更
          </Badge>
        );
      default:
        return <Badge variant="secondary">不明</Badge>;
    }
  };

  if (!project || !currentStep) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            差分プレビュー
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          プロジェクトまたはステップが選択されていません
        </CardContent>
      </Card>
    );
  }

  if (!compareStep) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            差分プレビュー
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          比較対象がありません
        </CardContent>
      </Card>
    );
  }

  const totalChanges = stepDiff.length;

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCompare className="w-5 h-5" />
          差分プレビュー
          {totalChanges > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalChanges}件の変更
            </Badge>
          )}
        </CardTitle>

        <div className="flex items-center justify-between pt-4">
          {/* 比較モード */}
          <div className="flex items-center gap-2">
            <Button
              variant={comparisonMode === 'previous' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode('previous')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              前のステップ
            </Button>
            <Button
              variant={comparisonMode === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode('history')}
              className="flex items-center gap-2"
              disabled={history.length === 0}
            >
              <RotateCcw className="w-4 h-4" />
              履歴
            </Button>
          </div>

          {/* 履歴選択 */}
          {comparisonMode === 'history' && history.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">履歴:</span>
              <select
                value={selectedHistoryIndex}
                onChange={(e) =>
                  setSelectedHistoryIndex(Number(e.target.value))
                }
                className="text-sm border border-border rounded px-2 py-1"
              >
                {history.map((_, index) => (
                  <option key={index} value={index}>
                    #{index + 1}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Separator />

        {/* 比較情報 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Badge variant="outline">{compareStep.title}</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="outline">{currentStep.title}</Badge>
          </span>
          <span>{comparisonLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {totalChanges === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            変更はありません
          </div>
        ) : (
          <>
            {/* 変更サマリー */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium text-sm mb-2">ホットスポット</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">追加</span>
                    <span>{changesSummary.hotspots.added}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">削除</span>
                    <span>{changesSummary.hotspots.removed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-600">変更</span>
                    <span>{changesSummary.hotspots.modified}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">注釈・マスク</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">注釈追加</span>
                    <span>{changesSummary.annotations.added}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">マスク追加</span>
                    <span>{changesSummary.masks.added}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-600">設定変更</span>
                    <span>{changesSummary.properties.modified}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 詳細な差分一覧 */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stepDiff.map((diff, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border border-border rounded-lg"
                >
                  {getDiffTypeIcon(diff.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getDiffTypeBadge(diff.type)}
                      <span className="text-sm font-medium">{diff.field}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {diff.description}
                    </p>

                    {(diff.oldValue || diff.newValue) && (
                      <div className="space-y-1 text-xs">
                        {diff.oldValue && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <span className="text-red-600 font-medium">
                              変更前:{' '}
                            </span>
                            <span className="text-red-800">
                              {typeof diff.oldValue === 'string'
                                ? diff.oldValue
                                : JSON.stringify(diff.oldValue, null, 2)}
                            </span>
                          </div>
                        )}
                        {diff.newValue && (
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <span className="text-green-600 font-medium">
                              変更後:{' '}
                            </span>
                            <span className="text-green-800">
                              {typeof diff.newValue === 'string'
                                ? diff.newValue
                                : JSON.stringify(diff.newValue, null, 2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
