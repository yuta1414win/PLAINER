'use client';

import { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code,
  Eye,
  Download,
  Copy,
  RefreshCw,
  ExternalLink,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Share,
} from 'lucide-react';
import { EmbedCode } from '@/components/embed-code';
import { cn } from '@/lib/utils';
import type { Project, Step } from '@/lib/types';

interface HTMLPreviewProps {
  className?: string;
  showDevicePreview?: boolean;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface PreviewDevice {
  type: DeviceType;
  name: string;
  width: number;
  height: number;
  icon: React.ComponentType<{ className?: string }>;
}

const PREVIEW_DEVICES: PreviewDevice[] = [
  {
    type: 'mobile',
    name: 'Mobile',
    width: 375,
    height: 667,
    icon: Smartphone,
  },
  {
    type: 'tablet',
    name: 'Tablet',
    width: 768,
    height: 1024,
    icon: Tablet,
  },
  {
    type: 'desktop',
    name: 'Desktop',
    width: 1200,
    height: 800,
    icon: Monitor,
  },
];

export function HTMLPreview({
  className,
  showDevicePreview = true,
}: HTMLPreviewProps) {
  const { project, currentStepId, currentPlayStepIndex, isPlaying } =
    useEditorStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'embed'>(
    'preview'
  );
  const [previewMode, setPreviewMode] = useState<'rendered' | 'code'>(
    'rendered'
  );
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('desktop');
  const [generatedHTML, setGeneratedHTML] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 現在のステップを取得
  const currentStep = useMemo(() => {
    if (!project?.steps?.length) return null;

    if (isPlaying) {
      return project.steps[currentPlayStepIndex] || null;
    }

    if (currentStepId) {
      return project.steps.find((step) => step.id === currentStepId) || null;
    }

    return project.steps[0] || null;
  }, [project, currentStepId, currentPlayStepIndex, isPlaying]);

  // HTMLを生成
  const generateHTML = useMemo(() => {
    if (!project || !currentStep) return '';

    const { theme } = project;
    const { title, description, hotspots, annotations, masks } = currentStep;

    // 基本的なHTML構造を生成
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --primary-color: ${theme.primaryColor};
            --secondary-color: ${theme.secondaryColor};
            --background-color: ${theme.backgroundColor};
            --text-color: ${theme.textColor};
            --font-family: ${theme.fontFamily};
            --border-radius: ${theme.borderRadius}px;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: var(--font-family);
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        
        .guide-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .guide-header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .guide-title {
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 16px;
        }
        
        .guide-description {
            font-size: 1.2rem;
            color: var(--text-color);
            opacity: 0.8;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .step-content {
            position: relative;
            background: white;
            border-radius: var(--border-radius);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            margin: 20px 0;
        }
        
        .step-image {
            position: relative;
            width: 100%;
            height: auto;
        }
        
        .step-image img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .hotspot {
            position: absolute;
            border: 3px solid var(--primary-color);
            background: rgba(59, 130, 246, 0.1);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .hotspot:hover {
            background: rgba(59, 130, 246, 0.2);
            transform: scale(1.02);
        }
        
        .hotspot.rect {
            border-radius: var(--border-radius);
        }
        
        .hotspot.circle {
            border-radius: 50%;
        }
        
        .annotation {
            position: absolute;
            background: var(--primary-color);
            color: white;
            padding: 8px 12px;
            border-radius: var(--border-radius);
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 10;
        }
        
        .annotation::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid var(--primary-color);
        }
        
        .mask-overlay {
            position: absolute;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            border-radius: var(--border-radius);
        }
        
        .cta-button {
            display: inline-block;
            background: var(--secondary-color);
            color: white;
            padding: 12px 24px;
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 600;
            margin: 20px auto;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .cta-button:hover {
            background: color-mix(in srgb, var(--secondary-color) 90%, black);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        @media (max-width: 768px) {
            .guide-container {
                padding: 15px;
            }
            
            .guide-title {
                font-size: 2rem;
            }
            
            .guide-description {
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="guide-container">
        <header class="guide-header">
            <h1 class="guide-title">${title}</h1>
            ${description ? `<p class="guide-description">${description}</p>` : ''}
        </header>
        
        <div class="step-content">
            ${
              currentStep.imageUrl
                ? `
                <div class="step-image">
                    <img src="${currentStep.imageUrl}" alt="${title}" />
                    
                    ${hotspots
                      .map(
                        (hotspot) => `
                        <div class="hotspot ${hotspot.shape}" 
                             style="left: ${hotspot.x * 100}%; top: ${hotspot.y * 100}%; width: ${hotspot.width * 100}%; height: ${hotspot.height * 100}%;"
                             title="${hotspot.action?.type === 'tooltip' ? hotspot.action.content : ''}">
                        </div>
                    `
                      )
                      .join('')}
                    
                    ${annotations
                      .map(
                        (annotation) => `
                        <div class="annotation"
                             style="left: ${annotation.x * 100}%; top: ${annotation.y * 100}%; color: ${annotation.textColor}; background-color: ${annotation.backgroundColor};">
                            ${annotation.text}
                        </div>
                    `
                      )
                      .join('')}
                    
                    ${masks
                      .map(
                        (mask) => `
                        <div class="mask-overlay"
                             style="left: ${mask.x * 100}%; top: ${mask.y * 100}%; width: ${mask.width * 100}%; height: ${mask.height * 100}%; backdrop-filter: blur(${mask.intensity}px);">
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `
                : ''
            }
            
            ${
              currentStep.cta?.enabled &&
              currentStep.cta.text &&
              currentStep.cta.url
                ? `
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${currentStep.cta.url}" class="cta-button" target="_blank" rel="noopener noreferrer">
                        ${currentStep.cta.text}
                    </a>
                </div>
            `
                : ''
            }
        </div>
    </div>
    
    <script>
        // インタラクティブ機能
        document.querySelectorAll('.hotspot').forEach(hotspot => {
            hotspot.addEventListener('click', function() {
                const title = this.getAttribute('title');
                if (title) {
                    alert(title);
                }
            });
        });
    </script>
</body>
</html>`;

    return html;
  }, [project, currentStep]);

  // プレビュー生成
  useEffect(() => {
    if (project && currentStep) {
      setGeneratedHTML(generateHTML);
    }
  }, [project, currentStep, generateHTML]);

  // HTMLをコピー
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedHTML);
    } catch (error) {
      console.error('Failed to copy HTML:', error);
    }
  };

  // HTMLをダウンロード
  const downloadHTML = () => {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.title || 'guide'}-step-${currentStep?.order || 1}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // プレビューを更新
  const refreshPreview = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedHTML(generateHTML);
      setIsGenerating(false);
    }, 500);
  };

  if (!project || !currentStep) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" />
            HTMLプレビュー
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          プロジェクトまたはステップが選択されていません
        </CardContent>
      </Card>
    );
  }

  const selectedDeviceInfo = PREVIEW_DEVICES.find(
    (d) => d.type === selectedDevice
  );

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5" />
          HTMLプレビュー & 埋め込み
          <Badge variant="secondary" className="text-xs">
            {currentStep.title}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="h-full flex flex-col"
        >
          <div className="border-b px-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                プレビュー
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                HTMLコード
              </TabsTrigger>
              <TabsTrigger value="embed" className="flex items-center gap-2">
                <Share className="w-4 h-4" />
                埋め込み
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="preview" className="h-full p-0 m-0">
              <div className="h-full flex flex-col">
                {/* デバイス選択と操作ボタン */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        デバイス:
                      </span>
                      {PREVIEW_DEVICES.map((device) => {
                        const Icon = device.icon;
                        return (
                          <Button
                            key={device.type}
                            variant={
                              selectedDevice === device.type
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => setSelectedDevice(device.type)}
                            className="flex items-center gap-2"
                          >
                            <Icon className="w-4 h-4" />
                            {device.name}
                          </Button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshPreview}
                        disabled={isGenerating}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw
                          className={cn(
                            'w-4 h-4',
                            isGenerating && 'animate-spin'
                          )}
                        />
                        更新
                      </Button>
                    </div>
                  </div>
                </div>

                {/* プレビューエリア */}
                <div className="flex-1 flex items-center justify-center p-4">
                  {selectedDeviceInfo && (
                    <div
                      className="border border-border rounded-lg shadow-lg overflow-hidden bg-white"
                      style={{
                        width: Math.min(selectedDeviceInfo.width, 800),
                        height: Math.min(selectedDeviceInfo.height, 600),
                        maxWidth: '100%',
                        maxHeight: '100%',
                      }}
                    >
                      <iframe
                        srcDoc={generatedHTML}
                        className="w-full h-full border-0"
                        title="HTMLプレビュー"
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="h-full p-0 m-0">
              <div className="h-full flex flex-col">
                {/* アクションボタン */}
                <div className="border-b p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      コピー
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadHTML}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      保存
                    </Button>
                  </div>
                </div>

                {/* コード表示エリア */}
                <div className="flex-1 p-4">
                  <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-auto h-full">
                    <code>{generatedHTML}</code>
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="h-full p-0 m-0">
              <div className="h-full">
                <EmbedCode />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
