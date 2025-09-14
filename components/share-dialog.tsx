'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Share2,
  Link,
  Mail,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Copy,
  Check,
  Download,
  QrCode,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/lib/types';
import { toast } from 'sonner';

interface ShareDialogProps {
  project: Project;
  shareUrl?: string;
  onGenerateShareUrl?: () => Promise<string>;
  onUpdateVisibility?: (isPublic: boolean) => Promise<void>;
  children: React.ReactNode;
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  shareUrl: (url: string, title: string, description?: string) => string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: <Twitter className="w-4 h-4" />,
    color: 'bg-blue-500',
    shareUrl: (url, title, description) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-4 h-4" />,
    color: 'bg-blue-600',
    shareUrl: (url, title, description) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="w-4 h-4" />,
    color: 'bg-blue-700',
    shareUrl: (url, title, description) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'line',
    name: 'LINE',
    icon: <MessageCircle className="w-4 h-4" />,
    color: 'bg-green-500',
    shareUrl: (url, title, description) =>
      `https://line.me/R/msg/text/?${encodeURIComponent(title + ' ' + url)}`,
  },
];

export function ShareDialog({
  project,
  shareUrl,
  onGenerateShareUrl,
  onUpdateVisibility,
  children,
}: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(shareUrl || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [emailData, setEmailData] = useState({
    subject: `${project.name} - PLAINERで作成`,
    body: `${project.name}のステップバイステップガイドをPLAINERで作成しました。\n\nこちらから確認してください：\n${currentUrl}`,
  });

  // 共有URLの生成
  const handleGenerateUrl = useCallback(async () => {
    if (!onGenerateShareUrl) return;

    setIsGenerating(true);
    try {
      const newUrl = await onGenerateShareUrl();
      setCurrentUrl(newUrl);
      setEmailData((prev) => ({
        ...prev,
        body: prev.body.replace(currentUrl || '', newUrl),
      }));
      toast.success('共有URLを生成しました');
    } catch (error) {
      toast.error('共有URLの生成に失敗しました');
      console.error('Failed to generate share URL:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerateShareUrl, currentUrl]);

  // クリップボードにコピー
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      toast.success('クリップボードにコピーしました');

      // 2秒後にチェックマークを元に戻す
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      toast.error('コピーに失敗しました');
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  // ソーシャルメディアで共有
  const shareToSocial = useCallback(
    (platform: SocialPlatform) => {
      if (!currentUrl) {
        toast.error('まず共有URLを生成してください');
        return;
      }

      const shareUrl = platform.shareUrl(
        currentUrl,
        project.name,
        `PLAINERで作成したステップバイステップガイド`
      );

      window.open(shareUrl, '_blank', 'width=600,height=400');
    },
    [currentUrl, project.name]
  );

  // メール送信
  const sendEmail = useCallback(() => {
    if (!currentUrl) {
      toast.error('まず共有URLを生成してください');
      return;
    }

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
    window.location.href = mailtoUrl;
  }, [currentUrl, emailData]);

  // QRコード生成URL
  const qrCodeUrl = useMemo(() => {
    if (!currentUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
  }, [currentUrl]);

  // 埋め込みコード生成
  const embedCodes = useMemo(() => {
    if (!currentUrl) return {};

    const iframeCode = `<iframe src="${currentUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

    const reactCode = `import React from 'react';

const PLAINEREmbed = () => {
  return (
    <iframe
      src="${currentUrl}"
      width="100%"
      height="600"
      frameBorder="0"
      allowFullScreen
      title="${project.name}"
    />
  );
};

export default PLAINEREmbed;`;

    const vueCode = `<template>
  <iframe
    :src="embedUrl"
    width="100%"
    height="600"
    frameborder="0"
    allowfullscreen
    :title="projectName"
  />
</template>

<script>
export default {
  name: 'PLAINEREmbed',
  data() {
    return {
      embedUrl: '${currentUrl}',
      projectName: '${project.name}'
    }
  }
}
</script>`;

    const javascriptCode = `// PLAINER埋め込み用JavaScript API
class PLAINEREmbed {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(\`Container '\${containerId}' not found\`);
    
    this.iframe = document.createElement('iframe');
    this.iframe.src = '${currentUrl}';
    this.iframe.width = options.width || '100%';
    this.iframe.height = options.height || '600px';
    this.iframe.frameBorder = '0';
    this.iframe.allowFullscreen = true;
    this.iframe.title = '${project.name}';
    
    this.setupEventListeners();
    this.container.appendChild(this.iframe);
  }
  
  setupEventListeners() {
    window.addEventListener('message', (event) => {
      if (event.source !== this.iframe.contentWindow) return;
      if (!event.data || event.data.source !== 'plainer-embed') return;
      
      const { type, data } = event.data;
      this.onEvent?.(type, data);
      
      switch (type) {
        case 'ready':
          this.onReady?.(data);
          break;
        case 'stepChange':
          this.onStepChange?.(data.stepIndex, data.currentStep);
          break;
        case 'complete':
          this.onComplete?.(data);
          break;
        case 'error':
          this.onError?.(data.error);
          break;
      }
    });
  }
  
  sendCommand(type, data = {}) {
    this.iframe.contentWindow.postMessage({
      source: 'plainer-parent',
      type,
      data
    }, '*');
  }
  
  nextStep() { this.sendCommand('nextStep'); }
  prevStep() { this.sendCommand('prevStep'); }
  goToStep(index) { this.sendCommand('goToStep', { stepIndex: index }); }
  play() { this.sendCommand('play'); }
  pause() { this.sendCommand('pause'); }
  fullscreen(enabled) { this.sendCommand('fullscreen', { enabled }); }
}

// 使用例:
const embed = new PLAINEREmbed('plainer-container');
embed.onReady = (data) => console.log('Ready:', data);
embed.onStepChange = (index, step) => console.log('Step:', index, step);
embed.onComplete = () => console.log('Completed!');`;

    return {
      iframe: iframeCode,
      react: reactCode,
      vue: vueCode,
      javascript: javascriptCode,
    };
  }, [currentUrl, project.name]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            プロジェクトを共有
          </DialogTitle>
          <DialogDescription>
            {project.name}を他の人と共有しましょう
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              リンク
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Twitter className="w-4 h-4" />
              SNS
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              メール
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              埋込み
            </TabsTrigger>
          </TabsList>

          {/* リンク共有 */}
          <TabsContent value="link" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">共有リンク</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentUrl ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      共有可能なURLを生成してください
                    </p>
                    <Button
                      onClick={handleGenerateUrl}
                      disabled={isGenerating || !onGenerateShareUrl}
                    >
                      {isGenerating ? '生成中...' : 'URLを生成'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Input value={currentUrl} readOnly className="flex-1" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(currentUrl, 'url')}
                      >
                        {copiedStates.url ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {project.isPublic ? (
                          <Badge className="bg-green-100 text-green-800">
                            🌐 公開中
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            🔒 リンクを知っている人のみ
                          </Badge>
                        )}
                        {onUpdateVisibility && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onUpdateVisibility(!project.isPublic)
                            }
                            className="flex items-center gap-1"
                          >
                            <Settings className="w-3 h-3" />
                            変更
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {project.isPublic ? (
                          <span>
                            検索エンジンでインデックスされ、誰でもアクセス可能
                          </span>
                        ) : (
                          <span>
                            検索エンジンからは除外され、URLを知る人のみアクセス可能
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SNS共有 */}
          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ソーシャルメディア</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <Button
                      key={platform.id}
                      variant="outline"
                      className="h-12 justify-start"
                      onClick={() => shareToSocial(platform)}
                      disabled={!currentUrl}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded flex items-center justify-center text-white mr-3',
                          platform.color
                        )}
                      >
                        {platform.icon}
                      </div>
                      {platform.name}で共有
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* メール共有 */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">メール送信</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">件名</label>
                  <Input
                    value={emailData.subject}
                    onChange={(e) =>
                      setEmailData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">本文</label>
                  <Textarea
                    value={emailData.body}
                    onChange={(e) =>
                      setEmailData((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    className="min-h-[120px]"
                  />
                </div>
                <Button
                  onClick={sendEmail}
                  disabled={!currentUrl}
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  メールアプリで送信
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 埋め込み */}
          <TabsContent value="embed" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* QRコード */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QRコード</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {currentUrl ? (
                    <>
                      <div className="bg-white p-4 rounded-lg border inline-block mb-4">
                        <img
                          src={qrCodeUrl}
                          alt="QRコード"
                          className="w-32 h-32"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = qrCodeUrl;
                          link.download = `${project.name}-qr.png`;
                          link.click();
                        }}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        QRコードをダウンロード
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8">
                      共有URLを生成してください
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 埋め込みコード */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">埋め込みコード</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentUrl ? (
                    <div className="space-y-4">
                      <Tabs defaultValue="iframe" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="iframe">HTML</TabsTrigger>
                          <TabsTrigger value="react">React</TabsTrigger>
                          <TabsTrigger value="vue">Vue</TabsTrigger>
                          <TabsTrigger value="javascript">JS</TabsTrigger>
                        </TabsList>

                        <TabsContent value="iframe" className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded border text-xs font-mono whitespace-pre-wrap">
                            {embedCodes.iframe}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(embedCodes.iframe, 'iframe')
                            }
                            className="w-full"
                          >
                            {copiedStates.iframe ? (
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            HTMLコードをコピー
                          </Button>
                        </TabsContent>

                        <TabsContent value="react" className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {embedCodes.react}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(embedCodes.react, 'react')
                            }
                            className="w-full"
                          >
                            {copiedStates.react ? (
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            Reactコンポーネントをコピー
                          </Button>
                        </TabsContent>

                        <TabsContent value="vue" className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {embedCodes.vue}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(embedCodes.vue, 'vue')
                            }
                            className="w-full"
                          >
                            {copiedStates.vue ? (
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            Vueコンポーネントをコピー
                          </Button>
                        </TabsContent>

                        <TabsContent value="javascript" className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {embedCodes.javascript}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                embedCodes.javascript,
                                'javascript'
                              )
                            }
                            className="w-full"
                          >
                            {copiedStates.javascript ? (
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            JavaScriptコードをコピー
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8">
                      共有URLを生成してください
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
