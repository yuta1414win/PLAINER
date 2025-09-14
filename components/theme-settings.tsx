'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from './ui/color-picker';
import { Palette, Type, Layout, Download, RotateCcw } from 'lucide-react';
import { useEditorStore, defaultTheme } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Theme } from '@/lib/types';

interface ThemeSettingsProps {
  className?: string;
}

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Raleway',
  'PT Sans',
  'Lora',
  'Merriweather',
  'Playfair Display',
  'Oswald',
  'Ubuntu',
  'Nunito',
];

const PRESET_THEMES = {
  default: {
    name: 'デフォルト',
    theme: defaultTheme,
  },
  modern: {
    name: 'モダン',
    theme: {
      ...defaultTheme,
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  warm: {
    name: 'ウォーム',
    theme: {
      ...defaultTheme,
      primaryColor: '#f59e0b',
      secondaryColor: '#ef4444',
      backgroundColor: '#fffbeb',
      textColor: '#451a03',
      fontFamily: 'Lato, system-ui, sans-serif',
    },
  },
  cool: {
    name: 'クール',
    theme: {
      ...defaultTheme,
      primaryColor: '#0ea5e9',
      secondaryColor: '#06b6d4',
      backgroundColor: '#f0f9ff',
      textColor: '#0c4a6e',
      fontFamily: 'Roboto, system-ui, sans-serif',
    },
  },
  dark: {
    name: 'ダーク',
    theme: {
      ...defaultTheme,
      primaryColor: '#60a5fa',
      secondaryColor: '#a78bfa',
      backgroundColor: '#0f172a',
      textColor: '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
} as const;

export function ThemeSettings({ className }: ThemeSettingsProps) {
  const { project, updateTheme } = useEditorStore();
  const [localTheme, setLocalTheme] = useState<Theme>(
    project?.theme || defaultTheme
  );
  const [isDirty, setIsDirty] = useState(false);

  // プロジェクトテーマ変更を監視
  useEffect(() => {
    if (project?.theme) {
      setLocalTheme(project.theme);
      setIsDirty(false);
    }
  }, [project?.theme]);

  // ローカルテーマ更新
  const updateLocalTheme = useCallback((updates: Partial<Theme>) => {
    setLocalTheme((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // テーマ適用
  const applyTheme = useCallback(() => {
    updateTheme(localTheme);
    setIsDirty(false);
  }, [localTheme, updateTheme]);

  // リセット
  const resetTheme = useCallback(() => {
    setLocalTheme(project?.theme || defaultTheme);
    setIsDirty(false);
  }, [project?.theme]);

  // プリセットテーマ適用
  const applyPresetTheme = useCallback(
    (presetKey: keyof typeof PRESET_THEMES) => {
      const preset = PRESET_THEMES[presetKey];
      setLocalTheme(preset.theme);
      setIsDirty(true);
    },
    []
  );

  // テーマエクスポート
  const exportTheme = useCallback(() => {
    const dataStr = JSON.stringify(localTheme, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'plainer-theme.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [localTheme]);

  // CSS変数をプレビュー用に生成
  const previewStyle: React.CSSProperties = {
    '--preview-primary': localTheme.primaryColor,
    '--preview-secondary': localTheme.secondaryColor,
    '--preview-background': localTheme.backgroundColor,
    '--preview-text': localTheme.textColor,
    '--preview-font-family': localTheme.fontFamily,
    '--preview-border-radius': `${localTheme.borderRadius}px`,
  } as React.CSSProperties;

  return (
    <div className={cn('space-y-6', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">テーマ設定</h2>
          <p className="text-muted-foreground">
            ガイドの見た目をカスタマイズしましょう
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetTheme}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              リセット
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={exportTheme}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            エクスポート
          </Button>

          <Button
            onClick={applyTheme}
            disabled={!isDirty}
            className="flex items-center gap-2"
          >
            適用
          </Button>
        </div>
      </div>

      {/* プリセットテーマ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            プリセットテーマ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(PRESET_THEMES).map(([key, preset]) => (
              <button
                key={key}
                onClick={() =>
                  applyPresetTheme(key as keyof typeof PRESET_THEMES)
                }
                className="group relative aspect-square rounded-lg border-2 border-border hover:border-primary transition-colors"
                style={{
                  backgroundColor: preset.theme.backgroundColor,
                  color: preset.theme.textColor,
                }}
              >
                <div className="absolute inset-2 flex flex-col items-center justify-center space-y-1">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: preset.theme.primaryColor }}
                  />
                  <div
                    className="w-4 h-1 rounded"
                    style={{ backgroundColor: preset.theme.secondaryColor }}
                  />
                  <span className="text-xs font-medium">{preset.name}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* カスタマイズ */}
        <Card>
          <CardHeader>
            <CardTitle>カスタマイズ</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="colors">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="colors">カラー</TabsTrigger>
                <TabsTrigger value="typography">フォント</TabsTrigger>
                <TabsTrigger value="layout">レイアウト</TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-4 mt-6">
                <div className="space-y-3">
                  <Label>プライマリカラー</Label>
                  <ColorPicker
                    value={localTheme.primaryColor}
                    onChange={(color) =>
                      updateLocalTheme({ primaryColor: color })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>セカンダリカラー</Label>
                  <ColorPicker
                    value={localTheme.secondaryColor}
                    onChange={(color) =>
                      updateLocalTheme({ secondaryColor: color })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>背景色</Label>
                  <ColorPicker
                    value={localTheme.backgroundColor}
                    onChange={(color) =>
                      updateLocalTheme({ backgroundColor: color })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>テキストカラー</Label>
                  <ColorPicker
                    value={localTheme.textColor}
                    onChange={(color) => updateLocalTheme({ textColor: color })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="typography" className="space-y-4 mt-6">
                <div className="space-y-3">
                  <Label>フォントファミリー</Label>
                  <Select
                    value={localTheme.fontFamily.split(',')[0]}
                    onValueChange={(font) =>
                      updateLocalTheme({
                        fontFamily: `${font}, system-ui, sans-serif`,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOOGLE_FONTS.map((font) => (
                        <SelectItem key={font} value={font}>
                          <span style={{ fontFamily: font }}>{font}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>ロゴテキスト（オプション）</Label>
                  <Input
                    value={localTheme.logoText || ''}
                    onChange={(e) =>
                      updateLocalTheme({ logoText: e.target.value })
                    }
                    placeholder="ロゴテキストを入力"
                  />
                </div>

                <div className="space-y-3">
                  <Label>ロゴURL（オプション）</Label>
                  <Input
                    value={localTheme.logoUrl || ''}
                    onChange={(e) =>
                      updateLocalTheme({ logoUrl: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                    type="url"
                  />
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-4 mt-6">
                <div className="space-y-3">
                  <Label>角丸の大きさ: {localTheme.borderRadius}px</Label>
                  <Slider
                    value={[localTheme.borderRadius]}
                    onValueChange={([value]) =>
                      updateLocalTheme({ borderRadius: value })
                    }
                    max={20}
                    min={0}
                    step={1}
                    className="py-4"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* プレビュー */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              プレビュー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-lg p-6 space-y-4"
              style={previewStyle}
            >
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--preview-background)',
                  color: 'var(--preview-text)',
                  fontFamily: 'var(--preview-font-family)',
                  borderRadius: 'var(--preview-border-radius)',
                }}
              >
                <div className="space-y-4">
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between">
                    {localTheme.logoText ? (
                      <h3
                        className="text-lg font-bold"
                        style={{ color: 'var(--preview-primary)' }}
                      >
                        {localTheme.logoText}
                      </h3>
                    ) : localTheme.logoUrl ? (
                      <img
                        src={localTheme.logoUrl}
                        alt="Logo"
                        className="h-8 w-auto"
                      />
                    ) : (
                      <div
                        className="h-6 w-16 rounded"
                        style={{ backgroundColor: 'var(--preview-primary)' }}
                      />
                    )}
                    <div className="flex space-x-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{
                          backgroundColor: 'var(--preview-primary)',
                          borderRadius: 'var(--preview-border-radius)',
                        }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{
                          backgroundColor: 'var(--preview-secondary)',
                          borderRadius: 'var(--preview-border-radius)',
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* コンテンツ */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">サンプルステップ</h4>
                    <p className="text-sm opacity-80">
                      これはテーマプレビューです。実際のガイドではここにステップの説明が表示されます。
                    </p>
                    <div
                      className="inline-block px-3 py-1 rounded text-sm text-white"
                      style={{
                        backgroundColor: 'var(--preview-primary)',
                        borderRadius: 'var(--preview-border-radius)',
                      }}
                    >
                      次のステップ
                    </div>
                  </div>

                  {/* プログレスバー */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>進捗</span>
                      <span>2/5</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full w-2/5 rounded-full"
                        style={{ backgroundColor: 'var(--preview-primary)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
