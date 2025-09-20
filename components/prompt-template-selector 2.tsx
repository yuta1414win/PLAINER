'use client';

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { PromptTemplate } from '@/lib/types';
import { promptTemplateManager } from '@/lib/prompt-templates';
import { toast } from 'sonner';

interface PromptTemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string, processedPrompt: string) => void;
  variables?: Record<string, string>;
  className?: string;
}

const CATEGORY_LABELS = {
  ui_improvement: 'UI改善',
  accessibility: 'アクセシビリティ',
  responsive: 'レスポンシブ',
  seo: 'SEO最適化',
  performance: 'パフォーマンス',
  structure: '構造・セマンティクス',
} as const;

const CATEGORY_COLORS = {
  ui_improvement: 'bg-blue-100 text-blue-800',
  accessibility: 'bg-green-100 text-green-800',
  responsive: 'bg-purple-100 text-purple-800',
  seo: 'bg-orange-100 text-orange-800',
  performance: 'bg-red-100 text-red-800',
  structure: 'bg-gray-100 text-gray-800',
} as const;

export function PromptTemplateSelector({
  selectedTemplateId,
  onTemplateSelect,
  variables = {},
  className = '',
}: PromptTemplateSelectorProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<PromptTemplate>>({
    name: '',
    description: '',
    category: 'ui_improvement',
    prompt: '',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setTemplates(promptTemplateManager.getTemplates());
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = promptTemplateManager.getTemplate(templateId);
    if (!template) return;

    const processedPrompt = promptTemplateManager.processPrompt(
      templateId,
      variables
    );
    onTemplateSelect(templateId, processedPrompt);
    setSelectedTemplate(template);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.prompt) {
      toast.error('名前とプロンプトは必須です');
      return;
    }

    try {
      const created = promptTemplateManager.addTemplate(
        newTemplate as Omit<PromptTemplate, 'id'>
      );
      setTemplates(promptTemplateManager.getTemplates());
      setIsCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'ui_improvement',
        prompt: '',
      });
      toast.success('プロンプトテンプレートを作成しました');
    } catch (error) {
      toast.error('テンプレートの作成に失敗しました');
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (promptTemplateManager.deleteTemplate(templateId)) {
      setTemplates(promptTemplateManager.getTemplates());
      toast.success('テンプレートを削除しました');
    } else {
      toast.error('システムテンプレートは削除できません');
    }
  };

  const extractedVariables = selectedTemplate
    ? promptTemplateManager.extractVariables(selectedTemplate.prompt)
    : [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* テンプレート選択 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">プロンプトテンプレート</label>
        <div className="flex gap-2">
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="テンプレートを選択..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                const categoryTemplates = templates.filter(
                  (t) => t.category === category
                );
                if (categoryTemplates.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                      {label}
                    </div>
                    {categoryTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          {template.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              システム
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>

          {/* カスタムテンプレート作成ダイアログ */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>カスタムプロンプトテンプレート作成</DialogTitle>
                <DialogDescription>
                  独自のプロンプトテンプレートを作成できます。変数は {'{'}
                  variableName{'}'} の形式で指定できます。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">名前</label>
                    <Input
                      value={newTemplate.name || ''}
                      onChange={(e) =>
                        setNewTemplate((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="テンプレート名"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">カテゴリ</label>
                    <Select
                      value={newTemplate.category}
                      onValueChange={(value) =>
                        setNewTemplate((prev) => ({
                          ...prev,
                          category: value as PromptTemplate['category'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">説明</label>
                  <Input
                    value={newTemplate.description || ''}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="テンプレートの説明"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">プロンプト</label>
                  <Textarea
                    value={newTemplate.prompt || ''}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        prompt: e.target.value,
                      }))
                    }
                    placeholder="プロンプトを入力してください..."
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    変数は {'{'}variableName{'}'} の形式で指定できます
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={handleCreateTemplate}>作成</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 選択されたテンプレートの詳細表示 */}
      {selectedTemplate && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {selectedTemplate.name}
                </CardTitle>
                <Badge className={CATEGORY_COLORS[selectedTemplate.category]}>
                  {CATEGORY_LABELS[selectedTemplate.category]}
                </Badge>
                {selectedTemplate.isSystem && (
                  <Badge variant="secondary">システム</Badge>
                )}
              </div>
              {!selectedTemplate.isSystem && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {selectedTemplate.description && (
              <CardDescription>{selectedTemplate.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {/* 変数表示 */}
            {extractedVariables.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">使用可能な変数:</p>
                <div className="flex flex-wrap gap-1">
                  {extractedVariables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {'{' + variable + '}'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* プロンプトプレビュー */}
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                プロンプトプレビュー
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {promptTemplateManager.processPrompt(
                  selectedTemplate.id,
                  variables
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
