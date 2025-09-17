'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Type,
  Highlighter,
  Palette,
  Move,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Annotation, NormalizedCoordinate } from '@/lib/types';
import type { User } from '@/lib/collaboration/types';
import {
  MentionDropdown,
  filterUsers,
  handleMentionDetect,
  handleMentionKeys,
  insertMentionAtCaret,
  renderContentWithMentions,
} from '@/components/collaboration/mentions';

interface AnnotationToolProps {
  selectedAnnotation: Annotation | null;
  onAnnotationUpdate: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onAnnotationCreate: (annotation: Omit<Annotation, 'id'>) => void;
  onCancel: () => void;
  canvasWidth: number;
  canvasHeight: number;
  className?: string;
  mentionUsers?: User[]; // for @ mention suggestions
}

type AnnotationMode = 'text' | 'highlight' | 'edit';

const FONT_SIZES = [
  { label: '小', value: 12 },
  { label: '標準', value: 14 },
  { label: '中', value: 16 },
  { label: '大', value: 18 },
  { label: '特大', value: 24 },
];

const FONT_WEIGHTS = [
  { label: '標準', value: 'normal' },
  { label: '太字', value: 'bold' },
];

const TEXT_COLORS = [
  { label: '黒', value: '#000000' },
  { label: '白', value: '#ffffff' },
  { label: '赤', value: '#ef4444' },
  { label: '青', value: '#3b82f6' },
  { label: '緑', value: '#10b981' },
  { label: '黄', value: '#f59e0b' },
  { label: '紫', value: '#8b5cf6' },
];

const HIGHLIGHT_COLORS = [
  { label: '黄', value: '#fef08a' },
  { label: '緑', value: '#bbf7d0' },
  { label: '青', value: '#bae6fd' },
  { label: '紫', value: '#e9d5ff' },
  { label: '赤', value: '#fecaca' },
  { label: 'オレンジ', value: '#fed7aa' },
];

export function AnnotationTool({
  selectedAnnotation,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationCreate,
  onCancel,
  canvasWidth,
  canvasHeight,
  className,
  mentionUsers = [],
}: AnnotationToolProps) {
  const [mode, setMode] = useState<AnnotationMode>('text');
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<
    Annotation,
    'id'
  > | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  // Current annotation state
  const annotation = selectedAnnotation || pendingAnnotation;
  const fontSize = annotation?.style?.fontSize || 14;
  const fontWeight = annotation?.style?.fontWeight || 'normal';
  const color = annotation?.style?.color || '#000000';

  const handleModeChange = useCallback((newMode: AnnotationMode) => {
    setMode(newMode);
    if (newMode !== 'edit') {
      setIsEditing(false);
    }
  }, []);

  const handleTextUpdate = useCallback(
    (text: string) => {
      if (selectedAnnotation) {
        onAnnotationUpdate(selectedAnnotation.id, { text });
      } else if (pendingAnnotation) {
        setPendingAnnotation({ ...pendingAnnotation, text });
      }
    },
    [selectedAnnotation, pendingAnnotation, onAnnotationUpdate]
  );

  const handleStyleUpdate = useCallback(
    (styleUpdates: Partial<Annotation['style']>) => {
      if (selectedAnnotation) {
        const newStyle = { ...selectedAnnotation.style, ...styleUpdates };
        onAnnotationUpdate(selectedAnnotation.id, { style: newStyle });
      } else if (pendingAnnotation) {
        const newStyle = { ...pendingAnnotation.style, ...styleUpdates };
        setPendingAnnotation({ ...pendingAnnotation, style: newStyle });
      }
    },
    [selectedAnnotation, pendingAnnotation, onAnnotationUpdate]
  );

  const handleCreateAnnotation = useCallback(() => {
    if (mode === 'text') {
      const newAnnotation: Omit<Annotation, 'id'> = {
        text: 'テキスト注釈',
        x: 0.5 as NormalizedCoordinate, // Center of canvas
        y: 0.5 as NormalizedCoordinate,
        style: {
          color: '#000000' as any,
          fontSize: 14,
          fontWeight: 'normal',
        },
      };
      setPendingAnnotation(newAnnotation);
      setIsEditing(true);
      setEditingText(newAnnotation.text);
    } else if (mode === 'highlight') {
      // Highlight mode would be implemented with canvas interaction
      // For now, create a text-based highlight
      const newAnnotation: Omit<Annotation, 'id'> = {
        text: 'ハイライト',
        x: 0.5 as NormalizedCoordinate,
        y: 0.5 as NormalizedCoordinate,
        style: {
          color: '#000000' as any,
          fontSize: 14,
          fontWeight: 'normal',
          backgroundColor: '#fef08a' as any,
        },
      };
      setPendingAnnotation(newAnnotation);
      setIsEditing(true);
      setEditingText(newAnnotation.text);
    }
  }, [mode]);

  const handleSaveAnnotation = useCallback(() => {
    if (pendingAnnotation) {
      onAnnotationCreate(pendingAnnotation);
      setPendingAnnotation(null);
    }
    setIsEditing(false);
    setEditingText('');
  }, [pendingAnnotation, onAnnotationCreate]);

  const handleCancelAnnotation = useCallback(() => {
    setPendingAnnotation(null);
    setIsEditing(false);
    setEditingText('');
    onCancel();
  }, [onCancel]);

  const handleEditStart = useCallback(() => {
    if (annotation) {
      setIsEditing(true);
      setEditingText(annotation.text);
    }
  }, [annotation]);

  const handleEditSave = useCallback(() => {
    if (selectedAnnotation && editingText.trim()) {
      onAnnotationUpdate(selectedAnnotation.id, { text: editingText.trim() });
    } else if (pendingAnnotation && editingText.trim()) {
      const updated = { ...pendingAnnotation, text: editingText.trim() };
      setPendingAnnotation(updated);
    }
    setIsEditing(false);
    setEditingText('');
  }, [selectedAnnotation, pendingAnnotation, editingText, onAnnotationUpdate]);

  const handleDelete = useCallback(() => {
    if (selectedAnnotation) {
      onAnnotationDelete(selectedAnnotation.id);
    } else if (pendingAnnotation) {
      setPendingAnnotation(null);
    }
    setIsEditing(false);
    setEditingText('');
  }, [selectedAnnotation, pendingAnnotation, onAnnotationDelete]);

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="w-5 h-5" />
            注釈ツール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>モード</Label>
            <div className="flex gap-2">
              <Button
                variant={mode === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('text')}
                className="flex-1"
              >
                <Type className="w-4 h-4 mr-1" />
                テキスト
              </Button>
              <Button
                variant={mode === 'highlight' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('highlight')}
                className="flex-1"
              >
                <Highlighter className="w-4 h-4 mr-1" />
                ハイライト
              </Button>
            </div>
          </div>

          <Separator />

          {/* Create New Annotation */}
          {!annotation && (
            <Button
              onClick={handleCreateAnnotation}
              className="w-full"
              disabled={isEditing}
            >
              {mode === 'text' ? (
                <>
                  <Type className="w-4 h-4 mr-2" />
                  テキスト注釈を追加
                </>
              ) : (
                <>
                  <Highlighter className="w-4 h-4 mr-2" />
                  ハイライトを追加
                </>
              )}
            </Button>
          )}

          {/* Edit Existing Annotation */}
          {annotation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>テキスト</Label>
                {isEditing ? (
                  <div className="space-y-2 relative">
                    <Input
                      ref={editInputRef}
                      value={editingText}
                      onChange={(e) => {
                        setEditingText(e.target.value);
                        if (mentionUsers.length > 0) {
                          handleMentionDetect(
                            e.target as HTMLInputElement,
                            setMentionOpen,
                            setMentionQuery,
                            setMentionIndex
                          );
                        }
                      }}
                      placeholder="注釈テキストを入力（@でメンション）"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditSave();
                          return;
                        } else if (e.key === 'Escape') {
                          setIsEditing(false);
                          setEditingText('');
                          return;
                        }
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
                                insertMentionAtCaret(editInputRef, setEditingText, u);
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
                      autoFocus
                    />
                    {mentionOpen && mentionUsers.length > 0 && (
                      <MentionDropdown
                        users={filterUsers(mentionUsers, mentionQuery)}
                        activeIndex={mentionIndex}
                        onSelect={(u) => {
                          insertMentionAtCaret(editInputRef, setEditingText, u);
                          setMentionOpen(false);
                          setMentionQuery('');
                          setMentionIndex(0);
                        }}
                        onClose={() => setMentionOpen(false)}
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleEditSave}
                        disabled={!editingText.trim()}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditingText('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-2 border rounded-md cursor-pointer hover:bg-accent"
                    onClick={handleEditStart}
                  >
                    {mentionUsers.length > 0
                      ? renderContentWithMentions(annotation.text || 'テキストを入力...', mentionUsers)
                      : (annotation.text || 'テキストを入力...')}
                  </div>
                )}
              </div>

              <Separator />

              {/* Style Controls */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">フォントサイズ</Label>
                  <div className="mt-2">
                    <Slider
                      value={[fontSize]}
                      onValueChange={([value]) =>
                        handleStyleUpdate({ fontSize: value ?? 14 })
                      }
                      max={32}
                      min={8}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>8px</span>
                      <span>{fontSize}px</span>
                      <span>32px</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>フォントウェイト</Label>
                  <Select
                    value={fontWeight}
                    onValueChange={(value) =>
                      handleStyleUpdate({ fontWeight: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((weight) => (
                        <SelectItem key={weight.value} value={weight.value}>
                          {weight.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>テキスト色</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {TEXT_COLORS.map((textColor) => (
                      <button
                        key={textColor.value}
                        className={cn(
                          'w-8 h-8 rounded border-2 transition-colors',
                          color === textColor.value
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-accent-foreground'
                        )}
                        style={{ backgroundColor: textColor.value }}
                        onClick={() =>
                          handleStyleUpdate({ color: textColor.value as any })
                        }
                        title={textColor.label}
                      />
                    ))}
                  </div>
                </div>

                {mode === 'highlight' && (
                  <div className="space-y-2">
                    <Label>ハイライト色</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {HIGHLIGHT_COLORS.map((highlightColor) => (
                        <button
                          key={highlightColor.value}
                          className={cn(
                            'w-8 h-8 rounded border-2 transition-colors',
                            annotation.style?.backgroundColor ===
                              highlightColor.value
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-accent-foreground'
                          )}
                          style={{ backgroundColor: highlightColor.value }}
                          onClick={() =>
                            handleStyleUpdate({
                              backgroundColor: highlightColor.value as any,
                            })
                          }
                          title={highlightColor.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                {pendingAnnotation ? (
                  <>
                    <Button
                      onClick={handleSaveAnnotation}
                      className="flex-1"
                      disabled={!pendingAnnotation.text.trim()}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelAnnotation}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      キャンセル
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleEditStart}
                      className="flex-1"
                      disabled={isEditing}
                    >
                      <Move className="w-4 h-4 mr-2" />
                      移動
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      削除
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
