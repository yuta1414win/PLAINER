'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Link,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CTA } from '@/lib/types';

interface CTASettingsProps {
  cta?: CTA | null;
  onCTAUpdate: (cta: CTA | null) => void;
  className?: string;
}

const URL_PATTERN =
  /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUrl(url: string): { valid: boolean; message?: string } {
  if (!url.trim()) {
    return { valid: false, message: 'URLは必須です' };
  }

  // メール形式チェック
  if (url.startsWith('mailto:')) {
    const email = url.replace('mailto:', '');
    if (!EMAIL_PATTERN.test(email)) {
      return {
        valid: false,
        message: 'メールアドレスの形式が正しくありません',
      };
    }
    return { valid: true };
  }

  // 電話番号形式チェック
  if (url.startsWith('tel:')) {
    return { valid: true };
  }

  // HTTP/HTTPS URLチェック
  let urlToCheck = url;
  if (!urlToCheck.startsWith('http://') && !urlToCheck.startsWith('https://')) {
    urlToCheck = 'https://' + urlToCheck;
  }

  try {
    new URL(urlToCheck);
    return { valid: true };
  } catch {
    return { valid: false, message: 'URLの形式が正しくありません' };
  }
}

export function CTASettings({ cta, onCTAUpdate, className }: CTASettingsProps) {
  const [label, setLabel] = useState(cta?.label || '');
  const [url, setUrl] = useState(cta?.url || '');
  const [target, setTarget] = useState<'_self' | '_blank'>(
    cta?.target || '_blank'
  );
  const [isEnabled, setIsEnabled] = useState(!!cta);

  const urlValidation = validateUrl(url);

  const handleSave = useCallback(() => {
    if (!isEnabled) {
      onCTAUpdate(null);
      return;
    }

    if (!label.trim()) {
      return;
    }

    if (!urlValidation.valid) {
      return;
    }

    let processedUrl = url.trim();
    if (
      !processedUrl.startsWith('http://') &&
      !processedUrl.startsWith('https://') &&
      !processedUrl.startsWith('mailto:') &&
      !processedUrl.startsWith('tel:')
    ) {
      processedUrl = 'https://' + processedUrl;
    }

    const newCTA: CTA = {
      label: label.trim(),
      url: processedUrl,
      target,
    };

    onCTAUpdate(newCTA);
  }, [isEnabled, label, url, target, urlValidation.valid, onCTAUpdate]);

  const handleDelete = useCallback(() => {
    setIsEnabled(false);
    setLabel('');
    setUrl('');
    setTarget('_blank');
    onCTAUpdate(null);
  }, [onCTAUpdate]);

  const handleReset = useCallback(() => {
    if (cta) {
      setLabel(cta.label);
      setUrl(cta.url);
      setTarget(cta.target || '_blank');
      setIsEnabled(true);
    } else {
      setLabel('');
      setUrl('');
      setTarget('_blank');
      setIsEnabled(false);
    }
  }, [cta]);

  const isFormValid = label.trim() && urlValidation.valid;
  const hasChanges =
    isEnabled !== !!cta ||
    label !== (cta?.label || '') ||
    url !== (cta?.url || '') ||
    target !== (cta?.target || '_blank');

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="w-5 h-5" />
            CTA設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CTA有効/無効切り替え */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">CTAボタンを表示</Label>
              <div className="text-sm text-muted-foreground">
                ステップにアクションボタンを追加します
              </div>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {isEnabled && (
            <>
              <Separator />

              {/* ラベル設定 */}
              <div className="space-y-2">
                <Label htmlFor="cta-label">
                  ボタンラベル <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cta-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="例: 詳細はこちら"
                  maxLength={50}
                />
                <div className="text-xs text-muted-foreground">
                  {label.length}/50 文字
                </div>
              </div>

              {/* URL設定 */}
              <div className="space-y-2">
                <Label htmlFor="cta-url">
                  リンク先 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cta-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com または mailto:info@example.com"
                  className={cn(
                    !urlValidation.valid && url && 'border-destructive'
                  )}
                />
                {url && !urlValidation.valid && (
                  <div className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {urlValidation.message}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  HTTP/HTTPS
                  URL、メールアドレス（mailto:）、電話番号（tel:）が使用できます
                </div>
              </div>

              {/* ターゲット設定 */}
              <div className="space-y-2">
                <Label>リンクの開き方</Label>
                <Select
                  value={target}
                  onValueChange={(value: '_self' | '_blank') =>
                    setTarget(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_self">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        同じタブで開く
                      </div>
                    </SelectItem>
                    <SelectItem value="_blank">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        新しいタブで開く
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* プレビュー */}
              {label && urlValidation.valid && (
                <div className="space-y-2">
                  <Label>プレビュー</Label>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <Button
                      variant="default"
                      size="sm"
                      disabled
                      className="pointer-events-none"
                    >
                      {label}
                      {target === '_blank' && (
                        <ExternalLink className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* アクションボタン */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!isFormValid || !hasChanges}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {cta ? '更新' : '追加'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  リセット
                </Button>
                {cta && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    title="CTA削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
