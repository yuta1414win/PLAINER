'use client';

import { useState, useMemo } from 'react';
import { useEditorStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Code,
  Copy,
  Share,
  ExternalLink,
  Settings,
  Eye,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Step } from '@/lib/types';

interface EmbedCodeProps {
  className?: string;
}

interface EmbedOptions {
  width: number;
  height: number;
  responsive: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showNavigation: boolean;
  autoPlay: boolean;
  theme: 'light' | 'dark' | 'auto';
  borderRadius: number;
  showBorder: boolean;
}

const DEFAULT_EMBED_OPTIONS: EmbedOptions = {
  width: 800,
  height: 600,
  responsive: true,
  showTitle: true,
  showDescription: true,
  showNavigation: true,
  autoPlay: false,
  theme: 'auto',
  borderRadius: 8,
  showBorder: true,
};

export function EmbedCode({ className }: EmbedCodeProps) {
  const { project, currentStepId } = useEditorStore();
  const [embedOptions, setEmbedOptions] = useState<EmbedOptions>(
    DEFAULT_EMBED_OPTIONS
  );
  const [activeTab, setActiveTab] = useState<
    'iframe' | 'react' | 'vue' | 'vanilla'
  >('iframe');

  // 現在のステップを取得
  const currentStep = useMemo(() => {
    if (!project?.steps?.length) return null;
    if (currentStepId) {
      return project.steps.find((step) => step.id === currentStepId) || null;
    }
    return project.steps[0] || null;
  }, [project, currentStepId]);

  // 埋め込みURL生成
  const embedUrl = useMemo(() => {
    if (!project || !currentStep) return '';

    const params = new URLSearchParams({
      projectId: project.id,
      stepId: currentStep.id,
      theme: embedOptions.theme,
      showTitle: embedOptions.showTitle.toString(),
      showDescription: embedOptions.showDescription.toString(),
      showNavigation: embedOptions.showNavigation.toString(),
      autoPlay: embedOptions.autoPlay.toString(),
      borderRadius: embedOptions.borderRadius.toString(),
      showBorder: embedOptions.showBorder.toString(),
    });

    return `${window.location.origin}/embed/guide?${params.toString()}`;
  }, [project, currentStep, embedOptions]);

  // 埋め込みコード生成
  const embeddedCodes = useMemo(() => {
    if (!embedUrl) return { iframe: '', react: '', vue: '', vanilla: '' };

    const { width, height, responsive } = embedOptions;

    // iframe用コード
    const iframe = `<iframe
  src="${embedUrl}"
  width="${responsive ? '100%' : width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  ${responsive ? 'style="max-width: 100%; aspect-ratio: 4/3;"' : ''}
  title="PLAINERガイド - ${project?.name || ''}"
></iframe>`;

    // React用コード
    const react = `import React from 'react';

const PLAINERGuide = () => {
  return (
    <iframe
      src="${embedUrl}"
      width="${responsive ? '100%' : width}"
      height="${height}"
      frameBorder="0"
      allowFullScreen
      ${responsive ? 'style={{ maxWidth: "100%", aspectRatio: "4/3" }}' : ''}
      title="PLAINERガイド - ${project?.name || ''}"
    />
  );
};

export default PLAINERGuide;`;

    // Vue用コード
    const vue = `<template>
  <iframe
    :src="embedUrl"
    :width="responsive ? '100%' : width"
    :height="height"
    frameborder="0"
    allowfullscreen
    ${responsive ? ":style=\"{ maxWidth: '100%', aspectRatio: '4/3' }\"" : ''}
    title="PLAINERガイド - ${project?.name || ''}"
  />
</template>

<script>
export default {
  name: 'PLAINERGuide',
  data() {
    return {
      embedUrl: '${embedUrl}',
      width: ${width},
      height: ${height},
      responsive: ${responsive}
    }
  }
}
</script>`;

    // JavaScript用コード
    const vanilla = `function createPLAINEREmbed(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const iframe = document.createElement('iframe');
  iframe.src = '${embedUrl}';
  iframe.width = '${responsive ? '100%' : width}';
  iframe.height = '${height}';
  iframe.frameBorder = '0';
  iframe.allowFullScreen = true;
  iframe.title = 'PLAINERガイド - ${project?.name || ''}';
  
  ${responsive ? 'iframe.style.maxWidth = "100%"; iframe.style.aspectRatio = "4/3";' : ''}
  
  container.appendChild(iframe);
}

// 使用例
createPLAINEREmbed('plainer-guide');`;

    return { iframe, react, vue, vanilla };
  }, [embedUrl, embedOptions, project]);

  // オプション更新
  const updateOption = <K extends keyof EmbedOptions>(
    key: K,
    value: EmbedOptions[K]
  ) => {
    setEmbedOptions((prev) => ({ ...prev, [key]: value }));
  };

  // コピー機能
  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // プレビューを新しいタブで開く
  const openPreview = () => {
    if (embedUrl) {
      window.open(embedUrl, '_blank');
    }
  };

  if (!project || !currentStep) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Code className="w-5 h-5" />
            埋め込みコード
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          プロジェクトまたはステップが選択されていません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Code className="w-5 h-5" />
          埋め込みコード
          <Badge variant="secondary" className="text-xs">
            {currentStep.title}
          </Badge>
        </CardTitle>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            このガイドをWebサイトに埋め込むためのコードを生成します
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openPreview}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              プレビュー
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(embedUrl)}
              className="flex items-center gap-2"
            >
              <Share className="w-4 h-4" />
              URL共有
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex gap-6">
        {/* 埋め込み設定 */}
        <div className="w-80 space-y-6">
          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              埋め込み設定
            </h3>

            <div className="space-y-4">
              {/* サイズ設定 */}
              <div>
                <Label className="text-sm font-medium">サイズ</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="responsive" className="text-sm">
                      レスポンシブ
                    </Label>
                    <Switch
                      id="responsive"
                      checked={embedOptions.responsive}
                      onCheckedChange={(checked) =>
                        updateOption('responsive', checked)
                      }
                    />
                  </div>

                  {!embedOptions.responsive && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="width" className="text-xs">
                          幅 (px)
                        </Label>
                        <Input
                          id="width"
                          type="number"
                          value={embedOptions.width}
                          onChange={(e) =>
                            updateOption('width', Number(e.target.value))
                          }
                          className="mt-1"
                          min="200"
                          max="1920"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-xs">
                          高さ (px)
                        </Label>
                        <Input
                          id="height"
                          type="number"
                          value={embedOptions.height}
                          onChange={(e) =>
                            updateOption('height', Number(e.target.value))
                          }
                          className="mt-1"
                          min="150"
                          max="1080"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* 表示設定 */}
              <div>
                <Label className="text-sm font-medium">表示設定</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showTitle" className="text-sm">
                      タイトル表示
                    </Label>
                    <Switch
                      id="showTitle"
                      checked={embedOptions.showTitle}
                      onCheckedChange={(checked) =>
                        updateOption('showTitle', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showDescription" className="text-sm">
                      説明表示
                    </Label>
                    <Switch
                      id="showDescription"
                      checked={embedOptions.showDescription}
                      onCheckedChange={(checked) =>
                        updateOption('showDescription', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showNavigation" className="text-sm">
                      ナビゲーション
                    </Label>
                    <Switch
                      id="showNavigation"
                      checked={embedOptions.showNavigation}
                      onCheckedChange={(checked) =>
                        updateOption('showNavigation', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoPlay" className="text-sm">
                      自動再生
                    </Label>
                    <Switch
                      id="autoPlay"
                      checked={embedOptions.autoPlay}
                      onCheckedChange={(checked) =>
                        updateOption('autoPlay', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* スタイル設定 */}
              <div>
                <Label className="text-sm font-medium">スタイル</Label>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label htmlFor="theme" className="text-xs">
                      テーマ
                    </Label>
                    <select
                      id="theme"
                      value={embedOptions.theme}
                      onChange={(e) =>
                        updateOption(
                          'theme',
                          e.target.value as EmbedOptions['theme']
                        )
                      }
                      className="mt-1 w-full text-sm border border-border rounded px-2 py-1"
                    >
                      <option value="auto">自動</option>
                      <option value="light">ライト</option>
                      <option value="dark">ダーク</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showBorder" className="text-sm">
                      ボーダー表示
                    </Label>
                    <Switch
                      id="showBorder"
                      checked={embedOptions.showBorder}
                      onCheckedChange={(checked) =>
                        updateOption('showBorder', checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="borderRadius" className="text-xs">
                      角丸 (px)
                    </Label>
                    <Input
                      id="borderRadius"
                      type="number"
                      value={embedOptions.borderRadius}
                      onChange={(e) =>
                        updateOption('borderRadius', Number(e.target.value))
                      }
                      className="mt-1"
                      min="0"
                      max="20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 埋め込みコード */}
        <div className="flex-1">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="iframe">iframe</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
              <TabsTrigger value="vue">Vue</TabsTrigger>
              <TabsTrigger value="vanilla">JavaScript</TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="mt-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-3 right-3 z-10"
                  onClick={() => copyToClipboard(embeddedCodes.iframe)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-64">
                  <code>{embeddedCodes.iframe}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="react" className="mt-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-3 right-3 z-10"
                  onClick={() => copyToClipboard(embeddedCodes.react)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-64">
                  <code>{embeddedCodes.react}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="vue" className="mt-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-3 right-3 z-10"
                  onClick={() => copyToClipboard(embeddedCodes.vue)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-64">
                  <code>{embeddedCodes.vue}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="vanilla" className="mt-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-3 right-3 z-10"
                  onClick={() => copyToClipboard(embeddedCodes.vanilla)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-64">
                  <code>{embeddedCodes.vanilla}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
