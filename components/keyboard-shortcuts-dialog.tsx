'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Keyboard } from 'lucide-react';
import {
  defaultShortcuts,
  type ShortcutConfig,
} from '@/hooks/use-keyboard-shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts?: ShortcutConfig[];
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  shortcuts = defaultShortcuts,
}: KeyboardShortcutsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const filtered = shortcuts.filter((shortcut) => {
      const query = searchQuery.toLowerCase();
      return (
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query)
      );
    });

    return filtered.reduce(
      (acc, shortcut) => {
        const category = shortcut.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(shortcut);
        return acc;
      },
      {} as Record<string, ShortcutConfig[]>
    );
  }, [shortcuts, searchQuery]);

  const categories = Object.keys(groupedShortcuts).sort();

  const formatShortcut = (shortcut: ShortcutConfig) => {
    const keys: string[] = [];
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.alt) keys.push('Alt');
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.meta) keys.push('Cmd');
    keys.push(shortcut.key);
    return keys.join('+');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            キーボードショートカット
          </DialogTitle>
          <DialogDescription>
            利用可能なキーボードショートカットの一覧です
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ショートカットを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Shortcuts */}
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              該当するショートカットが見つかりません
            </div>
          ) : (
            <Tabs defaultValue={categories[0]} className="w-full">
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(categories.length, 5)}, 1fr)`,
                }}
              >
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categories.map((category) => (
                <TabsContent key={category} value={category}>
                  <ScrollArea className="h-[400px] w-full">
                    <div className="space-y-2 pr-4">
                      {groupedShortcuts[category].map((shortcut, index) => (
                        <div
                          key={`${category}-${index}`}
                          className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm">
                            {shortcut.description}
                          </span>
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {formatShortcut(shortcut)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <div className="bg-muted/30 p-4 rounded-lg">
          <h3 className="font-medium mb-2 text-sm">ヒント</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 入力フィールド内では一部のショートカットが無効になります</li>
            <li>• Ctrlキーは、macOSではCmdキーに対応します</li>
            <li>• ショートカットはカスタマイズ可能です（設定メニューから）</li>
            <li>• よく使う機能にはショートカットを覚えることをお勧めします</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
