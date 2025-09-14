'use client';

import { useState, useCallback } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#6b7280',
  '#374151',
  '#111827',
  '#ffffff',
  '#f3f4f6',
  '#e5e7eb',
  '#d1d5db',
  '#9ca3af',
];

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleColorSelect = useCallback(
    (color: string) => {
      onChange(color);
      setInputValue(color);
      setOpen(false);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // 有効な色の場合のみ onChange を呼び出し
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleInputBlur = useCallback(() => {
    // 無効な値の場合は元に戻す
    if (!/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
      setInputValue(value);
    }
  }, [inputValue, value]);

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-12 h-10 p-0 border-2"
            style={{ backgroundColor: value }}
            aria-label="カラーを選択"
          >
            <span className="sr-only">カラーを選択</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">カラーを選択</h4>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    'w-10 h-10 rounded border-2 border-transparent hover:scale-110 transition-transform',
                    value === color && 'border-foreground'
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`カラー ${color}`}
                />
              ))}
            </div>
            <div className="space-y-2">
              <label htmlFor="color-input" className="text-sm font-medium">
                カスタムカラー
              </label>
              <Input
                id="color-input"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="#000000"
                className="font-mono text-sm"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder="#000000"
        className="flex-1 font-mono text-sm"
      />
    </div>
  );
}
