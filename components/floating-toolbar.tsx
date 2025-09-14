'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MousePointer2,
  Square,
  Circle,
  Type,
  Sparkles,
  Minus,
  ArrowUpRight,
  Palette,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ToolType =
  | 'select'
  | 'hotspot'
  | 'annotation'
  | 'mask'
  | 'text'
  | 'arrow'
  | 'highlight';

interface FloatingToolbarProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  position?: { x: number; y: number };
  isVisible?: boolean;
  onLayerToggle?: () => void;
  onVisibilityToggle?: () => void;
  onLockToggle?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  showLayerControls?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
  className?: string;
}

const tools = [
  {
    id: 'select' as ToolType,
    icon: MousePointer2,
    label: '選択',
    shortcut: 'V',
  },
  {
    id: 'hotspot' as ToolType,
    icon: Square,
    label: 'ホットスポット',
    shortcut: 'H',
  },
  { id: 'annotation' as ToolType, icon: Circle, label: '注釈', shortcut: 'A' },
  { id: 'mask' as ToolType, icon: Square, label: 'マスク', shortcut: 'M' },
  { id: 'text' as ToolType, icon: Type, label: 'テキスト', shortcut: 'T' },
  { id: 'arrow' as ToolType, icon: ArrowUpRight, label: '矢印', shortcut: 'R' },
  {
    id: 'highlight' as ToolType,
    icon: Sparkles,
    label: 'ハイライト',
    shortcut: 'L',
  },
];

export function FloatingToolbar({
  selectedTool,
  onToolChange,
  position,
  isVisible = true,
  onLayerToggle,
  onVisibilityToggle,
  onLockToggle,
  onDuplicate,
  onDelete,
  showLayerControls = false,
  isLocked = false,
  isHidden = false,
  className,
}: FloatingToolbarProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [toolbarPosition, setToolbarPosition] = React.useState(
    position || { x: 50, y: 20 }
  );
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // キーボードショートカット
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      const tool = tools.find(
        (t) => t.shortcut.toLowerCase() === e.key.toLowerCase()
      );
      if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onToolChange(tool.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToolChange]);

  // ドラッグ処理
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);

    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (toolbarRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // 画面内に収まるように制限
        const maxX = window.innerWidth - (toolbarRef.current.offsetWidth || 0);
        const maxY =
          window.innerHeight - (toolbarRef.current.offsetHeight || 0);

        setToolbarPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible) return null;

  return (
    <TooltipProvider>
      <div
        ref={toolbarRef}
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-lg p-1',
          'transition-opacity duration-200',
          isDragging ? 'cursor-move opacity-90' : 'opacity-100',
          className
        )}
        style={{
          left: `${toolbarPosition.x}px`,
          top: `${toolbarPosition.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1">
          {/* ドラッグハンドル */}
          <div className="w-1 h-8 bg-muted rounded mx-1 cursor-move" />

          {/* メインツール */}
          <div className="flex items-center gap-0.5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedTool === tool.id ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onToolChange(tool.id)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      {tool.label}{' '}
                      <span className="text-xs opacity-70">
                        ({tool.shortcut})
                      </span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* セパレーター */}
          {showLayerControls && (
            <>
              <div className="w-px h-6 bg-border mx-1" />

              {/* レイヤーコントロール */}
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onLayerToggle}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>レイヤー</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onVisibilityToggle}
                    >
                      {isHidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{isHidden ? '表示' : '非表示'}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onLockToggle}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{isLocked ? 'ロック解除' : 'ロック'}</p>
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      複製
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
