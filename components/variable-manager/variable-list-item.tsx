'use client';

import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import type { Variable, UUID } from '@/lib/types';
import { useTranslation } from '../language-switcher';

interface VariableListItemProps {
  variable: Variable;
  currentValue: string;
  references: Array<{ stepId: UUID; title: string; context: string }>;
  isPreviewMode: boolean;
  onEdit: (variable: Variable) => void;
  onDelete: (variableId: UUID) => void;
  onValueChange: (variableName: string, value: string) => void;
}

export const VariableListItem = memo(function VariableListItem({
  variable,
  currentValue,
  references,
  isPreviewMode,
  onEdit,
  onDelete,
  onValueChange,
}: VariableListItemProps) {
  const { t } = useTranslation();
  const [isValueVisible, setIsValueVisible] = useState(false);
  const [tempValue, setTempValue] = useState(currentValue);

  const handleValueSubmit = () => {
    if (tempValue !== currentValue) {
      onValueChange(variable.name, tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValueSubmit();
    } else if (e.key === 'Escape') {
      setTempValue(currentValue);
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                {`{{${variable.name}}}`}
              </code>
              <Badge
                variant={variable.type === 'text' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {variable.type}
              </Badge>
            </CardTitle>
            {variable.description && (
              <CardDescription className="mt-2">
                {variable.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(variable)}
              title={t.editor.variables.editVariable}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(variable.id)}
              title={t.common.delete}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Current Value */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                {t.editor.variables.currentValue}
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsValueVisible(!isValueVisible)}
                className="h-6 w-6 p-0"
              >
                {isValueVisible ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type={isValueVisible ? 'text' : 'password'}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleValueSubmit}
                onKeyDown={handleKeyDown}
                placeholder={
                  variable.defaultValue || `Enter ${variable.type} value`
                }
                className="flex-1"
              />
            </div>
            {tempValue !== currentValue && (
              <p className="text-xs text-orange-600 mt-1">
                Press Enter to save changes
              </p>
            )}
          </div>

          {/* Default Value */}
          {variable.defaultValue && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t.editor.variables.defaultValue}
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                {variable.defaultValue}
              </div>
            </div>
          )}

          {/* References */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t.editor.variables.usedInPlaces}
            </label>
            {references.length > 0 ? (
              <div className="space-y-1">
                {references.map((ref, index) => (
                  <div
                    key={`${ref.stepId}-${index}`}
                    className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-200"
                  >
                    <div className="font-medium text-blue-900">{ref.title}</div>
                    <div className="text-blue-700 mt-1">{ref.context}</div>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-2">
                  {references.length} {t.editor.variables.usedInPlaces}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Not used in any steps
              </div>
            )}
          </div>

          {/* Preview */}
          {isPreviewMode && (
            <div>
              <label className="text-sm font-medium mb-2 block">Preview</label>
              <div className="text-sm p-3 bg-green-50 border border-green-200 rounded">
                <div className="font-mono text-green-800">
                  {`{{${variable.name}}}`} →{' '}
                  <span className="font-sans">
                    {currentValue || variable.defaultValue || '<empty>'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
