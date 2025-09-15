'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  X,
  Eye,
  Undo2,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Suggestion, LiveMessage } from '@/lib/types';
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
} as const;

const SUGGESTION_TYPE_COLORS = {
  html_change: 'bg-blue-100 text-blue-800',
  style_change: 'bg-purple-100 text-purple-800',
  structure_change: 'bg-orange-100 text-orange-800',
} as const;

export function SuggestionManager({
  suggestions,
  onApplySuggestion,
  onRevertSuggestion,
  onPreviewSuggestion,
  className = '',
}: SuggestionManagerProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['html_change', 'style_change', 'structure_change'])
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
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>提案管理</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              適用済み: {appliedCount}
            </Badge>
            <Badge variant="outline" className="text-xs">
              未適用: {pendingCount}
            </Badge>
          </div>
        </CardTitle>

        {/* バッチ操作 */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedSuggestions.size > 0}
                onCheckedChange={toggleSelectAll}
                className="mr-2"
              />
              <span className="text-sm text-muted-foreground">
                {selectedSuggestions.size > 0
                  ? `${selectedSuggestions.size}件選択中`
                  : '全て選択'}
              </span>
            </div>

            {selectedSuggestions.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleApplySelected}
                  disabled={isApplying}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isApplying ? '適用中...' : '選択項目を適用'}
                </Button>
              </div>
            )}
          </div>
        )}

        <Separator />
      </CardHeader>

      <CardContent className="flex-1 space-y-4 overflow-y-auto">
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
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer"
                  onClick={() => toggleGroupExpansion(groupType)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <Badge
                      className={
                        SUGGESTION_TYPE_COLORS[
                          groupType as keyof typeof SUGGESTION_TYPE_COLORS
                        ]
                      }
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
                  <div className="space-y-3 ml-6">
                    {groupSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={cn(
                          'border rounded-lg p-4 transition-colors',
                          suggestion.applied
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-border',
                          previewingSuggestion === suggestion.id &&
                            'ring-2 ring-blue-500'
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
                              <div className="bg-gray-50 rounded-md p-3 mb-3">
                                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  変更内容
                                </p>
                                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
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
                                    <Check className="w-4 h-4" />
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
