'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { recordOnboardingMetric } from '@/lib/onboarding/metrics';

interface GlossaryEntry {
  term: string;
  description: string;
  category: 'エディタ' | 'ストレージ' | 'コラボ' | 'AI' | 'ショートカット';
  tip?: string;
}

const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    term: 'ホットスポット',
    description:
      '画像上で強調したい領域を囲い、クリックでテキストやリンクを表示できる注釈オブジェクト。',
    category: 'エディタ',
    tip: 'Rキーで矩形ホットスポット作成、Cキーで円形に切り替え。',
  },
  {
    term: 'マスク',
    description:
      '不要な箇所や個人情報を覆い隠すためのブラー/塗りつぶしエリア。',
    category: 'エディタ',
    tip: 'ブラー強度は右側パネルでリアルタイムに調整可能。',
  },
  {
    term: 'ステップ',
    description:
      '手順ガイドを構成する最小単位。画像、説明文、ホットスポットなどの要素を含む。',
    category: 'エディタ',
    tip: '左側リストでドラッグ＆ドロップすると順番を並び替えられます。',
  },
  {
    term: 'IndexedDB 保存',
    description:
      'ブラウザ内のローカルデータベースにプロジェクトを自動保存し、再訪時に復元します。',
    category: 'ストレージ',
    tip: '別ブラウザに移す場合はエクスポート（JSON）を活用。',
  },
  {
    term: 'リアルタイムコラボ',
    description:
      '同じプロジェクトを複数人で同時編集できる機能。プレゼンス表示やロック管理を含む。',
    category: 'コラボ',
    tip: '同じルームIDで参加し、WSポートが開放されていることを確認。',
  },
  {
    term: 'AIアシスタント',
    description:
      'Gemini 連携で説明文改善やフロー分析などの提案を受けられるサイドパネル。',
    category: 'AI',
    tip: 'APIキー未設定でもモックレスポンスで操作感を試せます。',
  },
  {
    term: 'キーボードショートカット',
    description:
      'コマンド入力で素早く操作できる仕組み。? キーで一覧モーダルを開けます。',
    category: 'ショートカット',
    tip: 'Cmd/Ctrl + Zで元に戻す、Cmd/Ctrl + Sで手動保存。',
  },
];

interface GlossaryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: 'header' | 'onboarding';
}

export function GlossaryPanel({ open, onOpenChange, source = 'header' }: GlossaryPanelProps) {
  const [query, setQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return GLOSSARY_ENTRIES;
    }
    return GLOSSARY_ENTRIES.filter((entry) => {
      const haystack = `${entry.term} ${entry.description} ${entry.tip ?? ''}`.toLowerCase();
      return haystack.includes(trimmed.toLowerCase());
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    recordOnboardingMetric({ type: 'glossary_open', source });
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = window.setTimeout(() => {
      recordOnboardingMetric({
        type: 'glossary_search',
        query: trimmed,
        results: filteredEntries.length,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [open, query, filteredEntries.length]);

  useEffect(() => {
    if (open) return;
    setQuery('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            用語ガイド &amp; チートシート
          </DialogTitle>
          <DialogDescription>
            よく使う用語やショートカットの意味を簡単に検索できます。初心者モードの補助資料として活用してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="用語やキーワードで検索"
              className="pl-9"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Separator />

          <ScrollArea className="max-h-60 pr-3">
            <div className="space-y-4">
              {filteredEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  該当する項目が見つかりませんでした。別のキーワードを試してください。
                </p>
              ) : (
                filteredEntries.map((entry) => (
                  <article key={entry.term} className="rounded-md border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{entry.term}</h3>
                      <Badge variant="secondary" className="text-[11px]">
                        {entry.category}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{entry.description}</p>
                    {entry.tip ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">TIP:</span> {entry.tip}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-xs text-muted-foreground">
            近日提供予定: PDF でダウンロードできるチートシート、よくある質問、目的別テンプレート集。
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
