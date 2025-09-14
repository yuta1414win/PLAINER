'use client';

import * as React from 'react';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  ClipboardPaste,
  Scissors,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Palette,
  Type,
  Square,
  Circle,
} from 'lucide-react';

interface CanvasContextMenuProps {
  children: React.ReactNode;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleVisibility?: () => void;
  onToggleLock?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignMiddle?: () => void;
  onAlignBottom?: () => void;
  onChangeStyle?: (style: string) => void;
  onConvertTo?: (type: 'hotspot' | 'annotation' | 'mask') => void;
  selectedItems?: number;
  isVisible?: boolean;
  isLocked?: boolean;
  canGroup?: boolean;
  canUngroup?: boolean;
  canPaste?: boolean;
  elementType?: 'hotspot' | 'annotation' | 'mask' | 'text' | null;
}

export function CanvasContextMenu({
  children,
  onCopy,
  onPaste,
  onCut,
  onDelete,
  onDuplicate,
  onToggleVisibility,
  onToggleLock,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onGroup,
  onUngroup,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onChangeStyle,
  onConvertTo,
  selectedItems = 0,
  isVisible = true,
  isLocked = false,
  canGroup = false,
  canUngroup = false,
  canPaste = false,
  elementType = null,
}: CanvasContextMenuProps) {
  const hasSelection = selectedItems > 0;
  const hasMultipleSelection = selectedItems > 1;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {hasSelection && (
          <>
            <ContextMenuItem onClick={onCopy} disabled={!hasSelection}>
              <Copy className="mr-2 h-4 w-4" />
              コピー
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={onCut} disabled={!hasSelection}>
              <Scissors className="mr-2 h-4 w-4" />
              切り取り
              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}

        <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
          <ClipboardPaste className="mr-2 h-4 w-4" />
          貼り付け
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>

        {hasSelection && (
          <>
            <ContextMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              複製
              <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
              <ContextMenuShortcut>Delete</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSeparator />

            {/* レイヤー操作 */}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Layers className="mr-2 h-4 w-4" />
                レイヤー
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={onBringToFront}>
                  <ArrowUpToLine className="mr-2 h-4 w-4" />
                  最前面へ
                  <ContextMenuShortcut>⌘⇧↑</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={onBringForward}>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  前面へ
                  <ContextMenuShortcut>⌘↑</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={onSendBackward}>
                  <ArrowDown className="mr-2 h-4 w-4" />
                  背面へ
                  <ContextMenuShortcut>⌘↓</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={onSendToBack}>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  最背面へ
                  <ContextMenuShortcut>⌘⇧↓</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            {/* 整列 */}
            {hasMultipleSelection && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <AlignCenter className="mr-2 h-4 w-4" />
                  整列
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={onAlignLeft}>
                    <AlignLeft className="mr-2 h-4 w-4" />
                    左揃え
                  </ContextMenuItem>
                  <ContextMenuItem onClick={onAlignCenter}>
                    <AlignCenter className="mr-2 h-4 w-4" />
                    中央揃え（水平）
                  </ContextMenuItem>
                  <ContextMenuItem onClick={onAlignRight}>
                    <AlignRight className="mr-2 h-4 w-4" />
                    右揃え
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={onAlignTop}>
                    <AlignStartVertical className="mr-2 h-4 w-4" />
                    上揃え
                  </ContextMenuItem>
                  <ContextMenuItem onClick={onAlignMiddle}>
                    <AlignCenterVertical className="mr-2 h-4 w-4" />
                    中央揃え（垂直）
                  </ContextMenuItem>
                  <ContextMenuItem onClick={onAlignBottom}>
                    <AlignEndVertical className="mr-2 h-4 w-4" />
                    下揃え
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            {/* グループ化 */}
            {(canGroup || canUngroup) && (
              <>
                <ContextMenuSeparator />
                {canGroup && (
                  <ContextMenuItem onClick={onGroup}>
                    <Group className="mr-2 h-4 w-4" />
                    グループ化
                    <ContextMenuShortcut>⌘G</ContextMenuShortcut>
                  </ContextMenuItem>
                )}
                {canUngroup && (
                  <ContextMenuItem onClick={onUngroup}>
                    <Ungroup className="mr-2 h-4 w-4" />
                    グループ解除
                    <ContextMenuShortcut>⌘⇧G</ContextMenuShortcut>
                  </ContextMenuItem>
                )}
              </>
            )}

            <ContextMenuSeparator />

            {/* 表示/非表示 */}
            <ContextMenuItem onClick={onToggleVisibility}>
              {isVisible ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  非表示
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  表示
                </>
              )}
              <ContextMenuShortcut>⌘H</ContextMenuShortcut>
            </ContextMenuItem>

            {/* ロック/アンロック */}
            <ContextMenuItem onClick={onToggleLock}>
              {isLocked ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  ロック解除
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  ロック
                </>
              )}
              <ContextMenuShortcut>⌘L</ContextMenuShortcut>
            </ContextMenuItem>

            {/* 要素タイプの変換 */}
            {elementType && (
              <>
                <ContextMenuSeparator />
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Square className="mr-2 h-4 w-4" />
                    変換
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {elementType !== 'hotspot' && (
                      <ContextMenuItem onClick={() => onConvertTo?.('hotspot')}>
                        <Square className="mr-2 h-4 w-4" />
                        ホットスポットに変換
                      </ContextMenuItem>
                    )}
                    {elementType !== 'annotation' && (
                      <ContextMenuItem
                        onClick={() => onConvertTo?.('annotation')}
                      >
                        <Circle className="mr-2 h-4 w-4" />
                        注釈に変換
                      </ContextMenuItem>
                    )}
                    {elementType !== 'mask' && (
                      <ContextMenuItem onClick={() => onConvertTo?.('mask')}>
                        <Square className="mr-2 h-4 w-4" />
                        マスクに変換
                      </ContextMenuItem>
                    )}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </>
            )}

            {/* スタイル変更 */}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                スタイル
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuRadioGroup value="default">
                  <ContextMenuRadioItem
                    value="default"
                    onClick={() => onChangeStyle?.('default')}
                  >
                    デフォルト
                  </ContextMenuRadioItem>
                  <ContextMenuRadioItem
                    value="primary"
                    onClick={() => onChangeStyle?.('primary')}
                  >
                    プライマリ
                  </ContextMenuRadioItem>
                  <ContextMenuRadioItem
                    value="secondary"
                    onClick={() => onChangeStyle?.('secondary')}
                  >
                    セカンダリ
                  </ContextMenuRadioItem>
                  <ContextMenuRadioItem
                    value="success"
                    onClick={() => onChangeStyle?.('success')}
                  >
                    成功
                  </ContextMenuRadioItem>
                  <ContextMenuRadioItem
                    value="warning"
                    onClick={() => onChangeStyle?.('warning')}
                  >
                    警告
                  </ContextMenuRadioItem>
                  <ContextMenuRadioItem
                    value="danger"
                    onClick={() => onChangeStyle?.('danger')}
                  >
                    危険
                  </ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {!hasSelection && (
          <>
            <ContextMenuLabel>要素を選択してください</ContextMenuLabel>
            <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              貼り付け
              <ContextMenuShortcut>⌘V</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
