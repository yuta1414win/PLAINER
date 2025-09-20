'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  Star,
  Users,
  Clock,
  ChevronRight,
  Plus,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Template,
  TemplateCategory,
  TemplateManager,
} from '@/lib/templates/template-manager';

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
  onPreviewTemplate?: (template: Template) => void;
  onCreateCustom?: () => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'usage' | 'rating';

const categoryLabels: Record<TemplateCategory, string> = {
  'product-demo': '製品デモ',
  onboarding: 'オンボーディング',
  tutorial: 'チュートリアル',
  faq: 'FAQ・ヘルプ',
  saas: 'SaaS',
  ecommerce: 'Eコマース',
  education: '教育・研修',
  enterprise: 'エンタープライズ',
  custom: 'カスタム',
};

const categoryColors: Record<TemplateCategory, string> = {
  'product-demo': 'bg-blue-100 text-blue-800',
  onboarding: 'bg-green-100 text-green-800',
  tutorial: 'bg-yellow-100 text-yellow-800',
  faq: 'bg-red-100 text-red-800',
  saas: 'bg-purple-100 text-purple-800',
  ecommerce: 'bg-pink-100 text-pink-800',
  education: 'bg-indigo-100 text-indigo-800',
  enterprise: 'bg-gray-100 text-gray-800',
  custom: 'bg-orange-100 text-orange-800',
};

export function TemplateGallery({
  onSelectTemplate,
  onPreviewTemplate,
  onCreateCustom,
  className,
}: TemplateGalleryProps) {
  const [templateManager] = useState(() => new TemplateManager());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateCategory | 'all'
  >('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('usage');
  const [activeTab, setActiveTab] = useState<'all' | 'builtin' | 'custom'>(
    'all'
  );

  // テンプレート読み込み
  useEffect(() => {
    const allTemplates = templateManager.getAllTemplates();
    setTemplates(allTemplates);
  }, [templateManager]);

  // フィルタリングとソート
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // タブによるフィルタリング
    if (activeTab === 'builtin') {
      filtered = filtered.filter((t) => t.isBuiltin);
    } else if (activeTab === 'custom') {
      filtered = filtered.filter((t) => !t.isBuiltin);
    }

    // カテゴリフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // タグフィルター
    if (selectedTags.length > 0) {
      filtered = filtered.filter((t) =>
        selectedTags.every((tag) => t.tags.includes(tag))
      );
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = templateManager.searchTemplates(searchQuery);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'usage':
          return (b.usage || 0) - (a.usage || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    templates,
    activeTab,
    selectedCategory,
    selectedTags,
    searchQuery,
    sortBy,
    templateManager,
  ]);

  // 全タグ取得
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [templates]);

  // テンプレート操作
  const handleDuplicate = (template: Template) => {
    const duplicated = templateManager.duplicateTemplate(template.id);
    if (duplicated) {
      setTemplates(templateManager.getAllTemplates());
    }
  };

  const handleDelete = (template: Template) => {
    if (!template.isBuiltin && confirm('このテンプレートを削除しますか？')) {
      templateManager.deleteTemplate(template.id);
      setTemplates(templateManager.getAllTemplates());
    }
  };

  const handleExport = (template: Template) => {
    const json = templateManager.exportTemplate(template.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const json = e.target?.result as string;
          const imported = templateManager.importTemplate(json);
          if (imported) {
            setTemplates(templateManager.getAllTemplates());
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // テンプレートカード
  const TemplateCard = ({ template }: { template: Template }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="aspect-video bg-gray-100 rounded-md mb-3 relative overflow-hidden">
          {template.thumbnail ? (
            <img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-gray-400" />
            </div>
          )}
          {template.isBuiltin && (
            <Badge className="absolute top-2 left-2" variant="secondary">
              ビルトイン
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg line-clamp-1">
            {template.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {template.description}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn('text-xs', categoryColors[template.category])}>
            {categoryLabels[template.category]}
          </Badge>
          <span className="text-xs text-gray-500">
            {template.steps.length} ステップ
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {template.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{template.rating.toFixed(1)}</span>
            </div>
          )}
          {template.usage && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{template.usage.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (onPreviewTemplate) onPreviewTemplate(template);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate(template);
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            {!template.isBuiltin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(template);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTemplate(template);
            }}
          >
            使用する
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  // リストアイテム
  const TemplateListItem = ({ template }: { template: Template }) => (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
      <div className="w-24 h-16 bg-gray-100 rounded flex-shrink-0">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{template.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge
                className={cn('text-xs', categoryColors[template.category])}
              >
                {categoryLabels[template.category]}
              </Badge>
              <span className="text-xs text-gray-500">
                {template.steps.length} ステップ
              </span>
              {template.rating && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating.toFixed(1)}</span>
                </div>
              )}
              {template.usage && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{template.usage.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (onPreviewTemplate) onPreviewTemplate(template);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTemplate(template);
              }}
            >
              使用する
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">テンプレートライブラリ</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            インポート
          </Button>
          {onCreateCustom && (
            <Button onClick={onCreateCustom}>
              <Plus className="w-4 h-4 mr-2" />
              カスタム作成
            </Button>
          )}
        </div>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="builtin">ビルトイン</TabsTrigger>
          <TabsTrigger value="custom">カスタム</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* フィルターバー */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="テンプレートを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as any)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリ</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortBy)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">使用数順</SelectItem>
                <SelectItem value="rating">評価順</SelectItem>
                <SelectItem value="date">更新日順</SelectItem>
                <SelectItem value="name">名前順</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* タグフィルター */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">タグ:</span>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.includes(tag)
                          ? prev.filter((t) => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* テンプレート一覧 */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">テンプレートが見つかりません</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <TemplateListItem key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
