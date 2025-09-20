"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { useSpeechToSteps } from '@/hooks/use-speech-to-steps';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Square, Plus } from 'lucide-react';
import { useProjectStore } from '@/lib/stores';

function svgPlaceholderBase64(text: string, w = 800, h = 600): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" fill="#111827">${esc(text)}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const VoiceToSteps: React.FC<{ className?: string }> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const { supported, listening, transcript, steps, start, stop, reset } = useSpeechToSteps('ja-JP');
  const { project, addStep } = useProjectStore();

  const addAll = useCallback(() => {
    if (!project) return;
    steps.forEach((s, idx) => {
      const title = s.title || `音声ステップ ${idx + 1}`;
      const image = svgPlaceholderBase64(title);
      addStep({
        id: undefined,
        title,
        description: s.description || '',
        image: image as any,
        thumbnail: image as any,
        hotspots: [],
        annotations: [],
        masks: [],
        order: project.steps.length + idx,
      });
    });
    reset();
    setOpen(false);
  }, [project, steps, addStep, reset]);

  const canAdd = useMemo(() => steps && steps.length > 0, [steps]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className={className} disabled={!supported}>
          <Mic className="w-4 h-4 mr-2" /> 音声でステップ生成
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh] p-4">
        <DrawerTitle>音声からステップ生成</DrawerTitle>
        <DrawerDescription>音声で手順を話すと、ステップ候補に変換します。</DrawerDescription>
        <div className="mt-3 flex items-center gap-2">
          {!listening ? (
            <Button onClick={start} disabled={!supported}>
              <Mic className="w-4 h-4 mr-2" /> 開始
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop}>
              <Square className="w-4 h-4 mr-2" /> 停止
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            クリア
          </Button>
          <div className="text-sm text-muted-foreground">
            {supported ? '音声認識に対応しています' : '音声認識はこのブラウザで利用できません'}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card className="p-3">
            <div className="text-sm font-medium mb-2">認識テキスト</div>
            <div className="text-sm whitespace-pre-wrap min-h-[120px] bg-muted/30 p-2 rounded">
              {transcript || '（認識結果がここに表示されます）'}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-sm font-medium mb-2">ステップ候補</div>
            <ScrollArea className="max-h-60 pr-2">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                {steps.map((s, i) => (
                  <li key={i}>
                    <strong>{s.title}</strong>
                    {s.description ? <span className="opacity-80"> — {s.description}</span> : null}
                  </li>
                ))}
                {steps.length === 0 && (
                  <div className="text-muted-foreground">（ステップがまだありません）</div>
                )}
              </ol>
            </ScrollArea>
          </Card>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={addAll} disabled={!canAdd}>
            <Plus className="w-4 h-4 mr-2" /> ステップとして追加
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default VoiceToSteps;

