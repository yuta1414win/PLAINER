'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, HelpCircle } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  description: string;
  zone?: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Zone navigation
  { key: 'Ctrl+1', description: 'ツールバーにフォーカス', zone: 'Navigation' },
  {
    key: 'Ctrl+2',
    description: 'ステップ一覧にフォーカス',
    zone: 'Navigation',
  },
  { key: 'Ctrl+3', description: 'キャンバスにフォーカス', zone: 'Navigation' },
  { key: 'Ctrl+4', description: 'プロパティにフォーカス', zone: 'Navigation' },
  {
    key: 'Ctrl+5',
    description: 'メインエリアにフォーカス',
    zone: 'Navigation',
  },

  // Zone switching
  { key: 'Tab', description: '次のゾーンに移動', zone: 'Navigation' },
  { key: 'Shift+Tab', description: '前のゾーンに移動', zone: 'Navigation' },
  { key: 'Alt+←', description: '左のゾーンに移動', zone: 'Navigation' },
  { key: 'Alt+→', description: '右のゾーンに移動', zone: 'Navigation' },
  { key: 'Alt+↑', description: '上のゾーンに移動', zone: 'Navigation' },
  { key: 'Alt+↓', description: '下のゾーンに移動', zone: 'Navigation' },

  // Within zone navigation
  { key: '↑/←', description: 'ゾーン内で前の要素に移動', zone: 'Within Zone' },
  { key: '↓/→', description: 'ゾーン内で次の要素に移動', zone: 'Within Zone' },
  { key: 'Enter', description: '選択した要素を実行', zone: 'Within Zone' },
  { key: 'Space', description: '選択した要素を切り替え', zone: 'Within Zone' },

  // Canvas controls
  { key: 'Ctrl++', description: 'ズームイン', zone: 'Canvas' },
  { key: 'Ctrl+-', description: 'ズームアウト', zone: 'Canvas' },
  { key: 'Ctrl+0', description: 'ズームリセット', zone: 'Canvas' },
  { key: 'Ctrl+9', description: '画像に合わせてズーム', zone: 'Canvas' },

  // Editor shortcuts
  { key: 'Ctrl+Z', description: '元に戻す', zone: 'Editor' },
  { key: 'Ctrl+Y', description: 'やり直し', zone: 'Editor' },
  { key: 'Ctrl+S', description: '保存', zone: 'Editor' },
  { key: 'Delete', description: '選択した要素を削除', zone: 'Editor' },
  { key: 'Ctrl+C', description: 'コピー', zone: 'Editor' },
  { key: 'Ctrl+V', description: '貼り付け', zone: 'Editor' },
  { key: 'Ctrl+D', description: '複製', zone: 'Editor' },
];

const groupedShortcuts = shortcuts.reduce(
  (acc, shortcut) => {
    const zone = shortcut.zone || 'General';
    if (!acc[zone]) {
      acc[zone] = [];
    }
    acc[zone].push(shortcut);
    return acc;
  },
  {} as Record<string, KeyboardShortcut[]>
);

export function KeyboardFocusHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          title="キーボードショートカット"
        >
          <Keyboard className="w-4 h-4" />
          <HelpCircle className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            キーボードショートカット
          </DialogTitle>
          <DialogDescription>
            キーボードを使用してエディターを効率的にナビゲートする方法
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-sm">
              フォーカスゾーンについて
            </h3>
            <p className="text-sm text-muted-foreground">
              エディターは5つのフォーカスゾーンに分かれています：
              <span className="font-medium">ツールバー</span>、
              <span className="font-medium">ステップ一覧</span>、
              <span className="font-medium">キャンバス</span>、
              <span className="font-medium">プロパティパネル</span>、
              <span className="font-medium">メインエリア</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              現在のフォーカスゾーンは青い枠で強調表示されます。
            </p>
          </div>

          {Object.entries(groupedShortcuts).map(([zone, shortcuts]) => (
            <div key={zone} className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">{zone}</h3>
              <div className="grid gap-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/20"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
              {Object.keys(groupedShortcuts).indexOf(zone) <
                Object.keys(groupedShortcuts).length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-sm text-blue-900 dark:text-blue-100">
              ヒント
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                •
                入力フィールド内ではナビゲーションショートカットは無効になります
              </li>
              <li>
                •
                フォーカスゾーンが表示されていない場合、そのゾーンには移動できません
              </li>
              <li>• キャンバス内ではマウスホイールでズーム操作も可能です</li>
              <li>
                •
                一部のショートカットは現在のコンテキストによって動作が変わります
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
