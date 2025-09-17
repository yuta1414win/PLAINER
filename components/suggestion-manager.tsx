'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Check,
  Eye,
  Undo2,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Suggestion } from '@/lib/types';
import { toast } from 'sonner';

interface SuggestionManagerProps {
  suggestions: Suggestion[];
  onApplySuggestion: (suggestionId: string, partial?: boolean) => Promise<void>;
  onRevertSuggestion: (suggestionId: string) => Promise<void>;
  onPreviewSuggestion: (suggestionId: string) => void;
  className?: string;
}

interface GroupedSuggestions {
  [key: string]: Suggestion[];
}

const SUGGESTION_TYPE_LABELS = {
  html_change: 'HTML変更',
  style_change: 'スタイル変更',
  structure_change: '構造変更',
  content_change: 'コンテンツ調整',
} as const;

const SUGGESTION_TYPE_COLORS = {
  html_change:
    'bg-gradient-to-r from-sky-500/20 via-sky-400/10 to-transparent text-sky-800 dark:text-sky-200 border border-sky-500/40',
  style_change:
    'bg-gradient-to-r from-fuchsia-500/20 via-violet-500/10 to-transparent text-fuchsia-800 dark:text-fuchsia-200 border border-fuchsia-500/40',
  structure_change:
    'bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent text-amber-800 dark:text-amber-200 border border-amber-500/40',
  content_change:
    'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-800 dark:text-emerald-200 border border-emerald-500/40',
} as const;

export function SuggestionManager({
  suggestions,
  onApplySuggestion,
  onRevertSuggestion,
  onPreviewSuggestion,
  className = '',
}: SuggestionManagerProps) {
  const totalSuggestions = suggestions.length;
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['html_change', 'style_change', 'structure_change', 'content_change'])
  );
  const [isApplying, setIsApplying] = useState(false);
  const [previewingSuggestion, setPreviewingSuggestion] = useState<
    string | null
  >(null);

  // 提案をタイプ別にグループ化
  const groupedSuggestions: GroupedSuggestions = suggestions.reduce(
    (acc, suggestion) => {
      const type = suggestion.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(suggestion);
      return acc;
    },
    {} as GroupedSuggestions
  );

  const appliedCount = suggestions.filter((s) => s.applied).length;
  const pendingCount = suggestions.filter((s) => !s.applied).length;
  const adoptionRate = totalSuggestions
    ? Math.round((appliedCount / totalSuggestions) * 100)
    : 0;
  const highImpactCount = suggestions.filter((s) =>
    ['high', 'critical'].includes(s.priority || '')
  ).length;
  const latestUpdatedAt = suggestions.reduce<Date | null>((latest, suggestion) => {
    if (!suggestion.updatedAt) return latest;
    const nextDate =
      suggestion.updatedAt instanceof Date
        ? suggestion.updatedAt
        : new Date(suggestion.updatedAt);
    if (Number.isNaN(nextDate.getTime())) {
      return latest;
    }
    if (!latest || nextDate > latest) {
      return nextDate;
    }
    return latest;
  }, null);
  const formattedLastUpdated = latestUpdatedAt
    ? new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(latestUpdatedAt)
    : null;

  // 選択された提案を切り替え
  const toggleSuggestionSelection = useCallback((suggestionId: string) => {
    setSelectedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  }, []);

  // 全選択/全解除
  const toggleSelectAll = useCallback(() => {
    const pendingSuggestions = suggestions.filter((s) => !s.applied);
    if (selectedSuggestions.size === pendingSuggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(pendingSuggestions.map((s) => s.id)));
    }
  }, [suggestions, selectedSuggestions.size]);

  // グループの展開状態を切り替え
  const toggleGroupExpansion = useCallback((groupType: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupType)) {
        newSet.delete(groupType);
      } else {
        newSet.add(groupType);
      }
      return newSet;
    });
  }, []);

  // 個別提案の適用
  const handleApplySuggestion = async (
    suggestionId: string,
    partial = false
  ) => {
    setIsApplying(true);
    try {
      await onApplySuggestion(suggestionId, partial);
      toast.success('提案を適用しました');
      setSelectedSuggestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    } catch (error) {
      toast.error('提案の適用に失敗しました');
      console.error('Failed to apply suggestion:', error);
    } finally {
      setIsApplying(false);
    }
  };

  // 複数提案の一括適用
  const handleApplySelected = async () => {
    if (selectedSuggestions.size === 0) return;

    setIsApplying(true);
    try {
      const promises = Array.from(selectedSuggestions).map((id) =>
        onApplySuggestion(id, false)
      );
      await Promise.all(promises);
      toast.success(`${selectedSuggestions.size}件の提案を適用しました`);
      setSelectedSuggestions(new Set());
    } catch (error) {
      toast.error('一括適用に失敗しました');
      console.error('Failed to apply suggestions:', error);
    } finally {
      setIsApplying(false);
    }
  };

  // 提案の取り消し
  const handleRevertSuggestion = async (suggestionId: string) => {
    setIsApplying(true);
    try {
      await onRevertSuggestion(suggestionId);
      toast.success('提案を取り消しました');
    } catch (error) {
      toast.error('提案の取り消しに失敗しました');
      console.error('Failed to revert suggestion:', error);
    } finally {
      setIsApplying(false);
    }
  };

  // 提案のプレビュー
  const handlePreviewSuggestion = (suggestionId: string) => {
    setPreviewingSuggestion(suggestionId);
    onPreviewSuggestion(suggestionId);
  };

  if (suggestions.length === 0) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg">提案管理</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          AI提案がありません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col overflow-hidden', className)}>
      <CardHeader className="flex-shrink-0 space-y-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white border-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span>AI提案コントロールセンター</span>
            </div>
            <p className="text-sm text-slate-300">
              自動生成された改善案を一元管理し、洗練されたエクスペリエンスを素早く適用できます。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
              適用済み {appliedCount}/{totalSuggestions}
            </Badge>
            <Badge variant="outline" className="border-white/30 text-white/80">
              未適用 {pendingCount}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 border border-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-300">
              採用率
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{adoptionRate}%</span>
              <span className="text-xs text-slate-300">AI改善が実装済み</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-300">
              ハイインパクト
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{highImpactCount}</span>
              <span className="text-xs text-slate-300">優先度高の提案</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-300">
              最終更新
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-200">
              <Palette className="h-4 w-4" />
              {formattedLastUpdated ?? '履歴がありません'}
            </div>
          </div>
        </div>

        {/* バッチ操作 */}
        {pendingCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedSuggestions.size > 0}
                onCheckedChange={toggleSelectAll}
                className="border-white/40"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {selectedSuggestions.size > 0
                    ? `${selectedSuggestions.size}件選択中`
                    : '全て選択'}
                </span>
                <span className="text-xs text-slate-300">
                  モダンUIの調整をまとめて適用
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedSuggestions.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleApplySelected}
                  disabled={isApplying}
                  className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/40"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isApplying ? '適用中...' : '選択を一括適用'}
                </Button>
              )}
              <Badge variant="outline" className="border-white/30 text-white/70">
                未適用 {pendingCount}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950/60 p-6">
        {Object.entries(groupedSuggestions).map(
          ([groupType, groupSuggestions]) => {
            const isExpanded = expandedGroups.has(groupType);
            const groupAppliedCount = groupSuggestions.filter(
              (s) => s.applied
            ).length;
            const groupPendingCount = groupSuggestions.filter(
              (s) => !s.applied
            ).length;

            return (
              <div key={groupType} className="space-y-2">
                {/* グループヘッダー */}
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  onClick={() => toggleGroupExpansion(groupType)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <Badge
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                        SUGGESTION_TYPE_COLORS[
                          groupType as keyof typeof SUGGESTION_TYPE_COLORS
                        ]
                      )}
                    >
                      {
                        SUGGESTION_TYPE_LABELS[
                          groupType as keyof typeof SUGGESTION_TYPE_LABELS
                        ]
                      }
                    </Badge>
                    <span className="text-sm font-medium">
                      {groupSuggestions.length}件
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>適用済み: {groupAppliedCount}</span>
                    <span>未適用: {groupPendingCount}</span>
                  </div>
                </div>

                {/* グループ内容 */}
                {isExpanded && (
                  <div className="space-y-4 border-l border-dashed border-slate-200 pl-6 dark:border-slate-700">
                    {groupSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={cn(
                          'rounded-2xl border p-4 shadow-sm transition-all hover:shadow-lg',
                          suggestion.applied
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80',
                          previewingSuggestion === suggestion.id &&
                            'ring-2 ring-offset-2 ring-blue-500'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* 選択チェックボックス（未適用のみ） */}
                          {!suggestion.applied && (
                            <Checkbox
                              checked={selectedSuggestions.has(suggestion.id)}
                              onCheckedChange={() =>
                                toggleSuggestionSelection(suggestion.id)
                              }
                              className="mt-1"
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-sm">
                                {suggestion.title}
                              </h4>
                              {suggestion.applied && (
                                <Badge className="bg-green-100 text-green-800">
                                  適用済み
                                </Badge>
                              )}
                            </div>

                            {suggestion.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {suggestion.description}
                              </p>
                            )}

                            {/* 差分表示 */}
                            {suggestion.diff && (
                              <div className="mb-4 overflow-hidden rounded-xl bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner">
                                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                                  <FileText className="h-3 w-3" /> 変更内容
                                </p>
                                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs font-mono leading-relaxed text-slate-100/90">
                                  {suggestion.diff}
                                </pre>
                              </div>
                            )}

                            {/* アクションボタン */}
                            <div className="flex items-center gap-2">
                              {!suggestion.applied ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleApplySuggestion(suggestion.id)
                                    }
                                    disabled={isApplying}
                                    className="flex items-center gap-2"
                                  >
                                    <Check className="w-4 h-4" />
                                    適用
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleApplySuggestion(suggestion.id, true)
                                    }
                                    disabled={isApplying}
                                    className="flex items-center gap-2"
                                  >
                                    <Palette className="w-4 h-4" />
                                    部分適用
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handlePreviewSuggestion(suggestion.id)
                                    }
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    プレビュー
                                  </Button>
                                </>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex items-center gap-2"
                                    >
                                      <Undo2 className="w-4 h-4" />
                                      取り消し
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                        提案の取り消し確認
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        「{suggestion.title}
                                        」の適用を取り消しますか？
                                        この操作により、適用された変更が元に戻されます。
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        キャンセル
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleRevertSuggestion(suggestion.id)
                                        }
                                        disabled={isApplying}
                                      >
                                        {isApplying
                                          ? '取り消し中...'
                                          : '取り消し'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        )}
      </CardContent>
    </Card>
  );
}
