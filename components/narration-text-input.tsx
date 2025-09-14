'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic,
  Type,
  Save,
  X,
  AlertCircle,
  Volume2,
  Clock,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/collaboration/types';
import {
  MentionDropdown,
  filterUsers,
  handleMentionDetect,
  handleMentionKeys,
  insertMentionAtCaret,
} from '@/components/collaboration/mentions';
import {
  VoiceNarrationManager,
  NarrationStore,
  NarrationText,
} from '@/lib/voice-narration';

interface NarrationTextInputProps {
  stepId: string;
  stepTitle?: string;
  initialText?: string;
  maxLength?: number;
  placeholder?: string;
  onSave?: (text: string) => void;
  onCancel?: () => void;
  className?: string;
  mentionUsers?: User[];
}

export function NarrationTextInput({
  stepId,
  stepTitle = 'ステップ',
  initialText = '',
  maxLength = 500,
  placeholder = 'ナレーションテキストを入力してください...',
  onSave,
  onCancel,
  className,
  mentionUsers = [],
}: NarrationTextInputProps) {
  const [text, setText] = useState(initialText);
  const [language, setLanguage] = useState<'ja-JP' | 'en-US'>('ja-JP');
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const storeRef = useRef<NarrationStore>(new NarrationStore());
  const managerRef = useRef<VoiceNarrationManager | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  // 初期化
  useEffect(() => {
    // ナレーションマネージャーの初期化
    managerRef.current = new VoiceNarrationManager({ language });

    // 保存済みテキストの読み込み
    const savedNarration = storeRef.current.getNarration(stepId);
    if (savedNarration && !initialText) {
      setText(savedNarration.text);
      setEstimatedDuration(savedNarration.duration || 0);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
      }
    };
  }, [stepId]);

  // 読み上げ時間の推定
  useEffect(() => {
    if (managerRef.current && text) {
      const duration = managerRef.current.estimateDuration(text);
      setEstimatedDuration(duration);
    } else {
      setEstimatedDuration(0);
    }
  }, [text, language]);

  // テキスト変更の監視
  useEffect(() => {
    const savedNarration = storeRef.current.getNarration(stepId);
    const savedText = savedNarration?.text || '';
    setHasChanges(text !== savedText && text !== initialText);
  }, [text, stepId, initialText]);

  // テキスト保存処理
  const handleSave = useCallback(async () => {
    if (!text.trim()) {
      setError('ナレーションテキストを入力してください');
      return;
    }

    if (text.length > maxLength) {
      setError(`文字数制限を超えています（最大${maxLength}文字）`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // ストアに保存
      storeRef.current.setNarration(stepId, text);

      // コールバック呼び出し
      if (onSave) {
        onSave(text);
      }

      setHasChanges(false);
    } catch (err) {
      setError('保存に失敗しました');
      console.error('Failed to save narration:', err);
    } finally {
      setIsSaving(false);
    }
  }, [text, stepId, maxLength, onSave]);

  // キャンセル処理
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm(
        '変更が保存されていません。本当にキャンセルしますか？'
      );
      if (!confirmed) return;
    }

    // 元のテキストに戻す
    const savedNarration = storeRef.current.getNarration(stepId);
    setText(savedNarration?.text || initialText);
    setHasChanges(false);
    setError(null);

    if (onCancel) {
      onCancel();
    }
  }, [hasChanges, stepId, initialText, onCancel]);

  // プレビュー再生
  const handlePreview = useCallback(async () => {
    if (!managerRef.current || !text.trim()) return;

    try {
      await managerRef.current.speak(text);
    } catch (err) {
      setError('音声プレビューに失敗しました');
      console.error('Preview failed:', err);
    }
  }, [text]);

  // マークダウン記法のヘルプテキスト
  const markdownHelp = `
**太字** で強調
*斜体* で軽い強調
... で間を空ける
「」で会話文
！で感嘆
？で疑問
  `.trim();

  // 文字数に応じた推奨事項
  const getRecommendation = () => {
    const charCount = text.length;
    if (charCount === 0) return null;
    if (charCount < 50) return '短めのナレーションです';
    if (charCount < 200) return '適切な長さです';
    if (charCount < 350) return 'やや長めですが問題ありません';
    return '長いナレーションです。分割を検討してください';
  };

  // 時間のフォーマット
  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          {stepTitle} のナレーション
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">
              <Type className="w-4 h-4 mr-2" />
              編集
            </TabsTrigger>
            <TabsTrigger value="help">
              <AlertCircle className="w-4 h-4 mr-2" />
              ヘルプ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            {/* 言語選択 */}
            <div className="flex items-center gap-4">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                言語
              </Label>
              <select
                id="language"
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as 'ja-JP' | 'en-US')
                }
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="ja-JP">日本語</option>
                <option value="en-US">English</option>
              </select>
            </div>

            {/* テキスト入力エリア */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="narration-text">ナレーションテキスト</Label>
                <div className="flex items-center gap-2">
                  {estimatedDuration > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />約
                      {formatDuration(estimatedDuration)}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      text.length > maxLength ? 'destructive' : 'outline'
                    }
                    className="text-xs"
                  >
                    {text.length} / {maxLength}
                  </Badge>
                </div>
              </div>
              <div className="relative">
              <Textarea
                ref={textareaRef}
                id="narration-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (mentionUsers.length > 0) {
                    handleMentionDetect(
                      e.target as HTMLTextAreaElement,
                      setMentionOpen,
                      setMentionQuery,
                      setMentionIndex
                    );
                  }
                }}
                onKeyDown={(e) => {
                  if (mentionUsers.length > 0) {
                    const filtered = filterUsers(mentionUsers, mentionQuery);
                    if (
                      handleMentionKeys(
                        e,
                        filtered,
                        mentionOpen,
                        mentionIndex,
                        setMentionIndex,
                        (u) => {
                          insertMentionAtCaret(textareaRef, setText, u);
                          setMentionOpen(false);
                          setMentionQuery('');
                        },
                        () => setMentionOpen(false)
                      )
                    ) {
                      e.preventDefault();
                    }
                  }
                }}
                placeholder={placeholder}
                rows={6}
                maxLength={maxLength}
                className={cn(
                  'resize-none font-mono',
                  text.length > maxLength && 'border-red-500'
                )}
              />
              {mentionOpen && mentionUsers.length > 0 && (
                <MentionDropdown
                  users={filterUsers(mentionUsers, mentionQuery)}
                  activeIndex={mentionIndex}
                  onSelect={(u) => {
                    insertMentionAtCaret(textareaRef, setText, u);
                    setMentionOpen(false);
                    setMentionQuery('');
                    setMentionIndex(0);
                  }}
                  onClose={() => setMentionOpen(false)}
                />
              )}
              </div>
              {getRecommendation() && (
                <p className="text-xs text-gray-500">{getRecommendation()}</p>
              )}
            </div>

            {/* プレビューボタン */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!text.trim()}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                プレビュー再生
              </Button>
            </div>

            {/* エラー表示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* アクションボタン */}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges || !text.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="help" className="space-y-4">
            <div className="space-y-4">
              {/* マークダウン記法 */}
              <div>
                <h4 className="font-semibold text-sm mb-2">テキスト装飾</h4>
                <pre className="p-3 bg-gray-50 rounded-md text-xs">
                  {markdownHelp}
                </pre>
              </div>

              {/* 推奨事項 */}
              <div>
                <h4 className="font-semibold text-sm mb-2">推奨事項</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 1ステップあたり200文字以内を推奨</li>
                  <li>• 簡潔で分かりやすい文章を心がける</li>
                  <li>• 専門用語は避けるか、説明を加える</li>
                  <li>• 句読点を適切に使用して読みやすくする</li>
                  <li>• 重要な部分は**太字**で強調</li>
                </ul>
              </div>

              {/* 音声設定のヒント */}
              <div>
                <h4 className="font-semibold text-sm mb-2">音声設定のヒント</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 再生速度は0.8〜1.2倍が聞き取りやすい</li>
                  <li>• 日本語と英語で音声を切り替え可能</li>
                  <li>• ブラウザにより利用可能な音声が異なります</li>
                  <li>• 長いテキストは複数ステップに分割を推奨</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ステップごとのナレーション管理コンポーネント
interface StepNarrationManagerProps {
  steps: Array<{ id: string; title: string }>;
  className?: string;
}

export function StepNarrationManager({
  steps,
  className,
}: StepNarrationManagerProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [narrations, setNarrations] = useState<Map<string, NarrationText>>(
    new Map()
  );
  const storeRef = useRef<NarrationStore>(new NarrationStore());

  // 初期化
  useEffect(() => {
    // 保存済みナレーションの読み込み
    const loadedNarrations = new Map<string, NarrationText>();
    steps.forEach((step) => {
      const narration = storeRef.current.getNarration(step.id);
      if (narration) {
        loadedNarrations.set(step.id, narration);
      }
    });
    setNarrations(loadedNarrations);
  }, [steps]);

  // ナレーションの保存
  const handleSaveNarration = useCallback((stepId: string, text: string) => {
    storeRef.current.setNarration(stepId, text);
    const narration = storeRef.current.getNarration(stepId);
    if (narration) {
      setNarrations((prev) => new Map(prev).set(stepId, narration));
    }
    setSelectedStep(null);
  }, []);

  // ナレーションの削除
  const handleDeleteNarration = useCallback((stepId: string) => {
    storeRef.current.removeNarration(stepId);
    setNarrations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Mic className="w-5 h-5" />
        ステップナレーション管理
      </h3>

      {/* ステップリスト */}
      <div className="space-y-2">
        {steps.map((step) => {
          const narration = narrations.get(step.id);
          const hasNarration = !!narration;

          return (
            <div
              key={step.id}
              className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{step.title}</p>
                  {hasNarration && (
                    <p className="text-sm text-gray-500">
                      {narration.text.substring(0, 50)}
                      {narration.text.length > 50 && '...'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasNarration && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(narration.duration || 0)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNarration(step.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant={hasNarration ? 'outline' : 'default'}
                  onClick={() => setSelectedStep(step.id)}
                >
                  {hasNarration ? '編集' : '追加'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 編集ダイアログ */}
      {selectedStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <NarrationTextInput
              stepId={selectedStep}
              stepTitle={
                steps.find((s) => s.id === selectedStep)?.title || 'ステップ'
              }
              initialText={narrations.get(selectedStep)?.text || ''}
              onSave={(text) => handleSaveNarration(selectedStep, text)}
              onCancel={() => setSelectedStep(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ヘルパー関数
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
}
