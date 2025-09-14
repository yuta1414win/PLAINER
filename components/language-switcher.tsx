'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Globe, Languages, Check } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import type { Language } from '@/lib/i18n';

const languages = [
  { code: 'ja' as Language, name: '日本語', flag: '🇯🇵' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
];

interface LanguageSwitcherProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'button' | 'select' | 'dropdown';
}

export function LanguageSwitcher({
  isOpen = false,
  onClose,
  variant = 'button',
}: LanguageSwitcherProps) {
  const { project, updateProject } = useEditorStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentLanguage = project?.language || 'en';
  const currentLangData =
    languages.find((lang) => lang.code === currentLanguage) || languages[1];

  const handleLanguageChange = (language: Language) => {
    if (!project) return;

    updateProject({ language });

    if (variant === 'dropdown') {
      setIsDropdownOpen(false);
    }

    if (onClose) {
      onClose();
    }
  };

  if (variant === 'select') {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-500" />
        <Select value={currentLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2"
        >
          <Languages className="h-4 w-4" />
          <span className="text-sm">{currentLangData.flag}</span>
        </Button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-2">
              <div className="text-xs text-gray-500 uppercase font-medium mb-2 px-2">
                Language
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-2 py-2 text-sm rounded-md hover:bg-gray-100 ${
                    currentLanguage === lang.code
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsDropdownOpen(true)}
        className="flex items-center gap-2"
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLangData.name}</span>
        <span className="sm:hidden">{currentLangData.flag}</span>
      </Button>

      <Dialog
        open={isOpen || isDropdownOpen}
        onOpenChange={(open) => {
          setIsDropdownOpen(open);
          if (!open && onClose) onClose();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Language Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-4">
              Choose your preferred language for the interface.
            </p>

            <div className="grid gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    currentLanguage === lang.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{lang.name}</div>
                    <div className="text-sm text-gray-500">
                      {lang.code === 'ja'
                        ? 'Japanese interface'
                        : 'English interface'}
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                {currentLanguage === 'ja'
                  ? '言語設定はプロジェクトに保存され、次回開くときにも適用されます。'
                  : 'Language settings are saved with your project and will be remembered when you return.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook for using translations in components
import { useMemo } from 'react';
import { getTranslation } from '@/lib/i18n';

export function useTranslation() {
  const { project } = useEditorStore();
  const language = project?.language || 'en';

  const t = useMemo(() => {
    return getTranslation(language);
  }, [language]);

  return { t, language };
}
