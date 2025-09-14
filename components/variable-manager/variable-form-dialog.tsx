'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Variable, UUID, VariableType } from '@/lib/types';
import { useTranslation } from '../language-switcher';
import {
  ErrorFactory,
  Validators,
  useErrorHandler,
} from '@/lib/error-handling';

interface VariableFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variable: Omit<Variable, 'id'> | Variable) => void;
  editingVariable?: Variable | null;
  existingVariableNames: string[];
}

interface FormData {
  name: string;
  type: VariableType;
  defaultValue: string;
  description: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  defaultValue?: string;
  description?: string;
}

const VARIABLE_TYPES: {
  value: VariableType;
  label: string;
  description: string;
}[] = [
  {
    value: 'text',
    label: 'Text',
    description: 'Simple text content like names, descriptions, or labels',
  },
  {
    value: 'number',
    label: 'Number',
    description: 'Numeric values for calculations or display',
  },
  {
    value: 'url',
    label: 'URL',
    description: 'Web addresses or links to external resources',
  },
  {
    value: 'image',
    label: 'Image URL',
    description: 'URLs pointing to image files',
  },
];

export const VariableFormDialog = memo(function VariableFormDialog({
  isOpen,
  onClose,
  onSave,
  editingVariable,
  existingVariableNames,
}: VariableFormDialogProps) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'text',
    defaultValue: '',
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when dialog opens or editing variable changes
  useEffect(() => {
    if (isOpen) {
      if (editingVariable) {
        setFormData({
          name: editingVariable.name,
          type: editingVariable.type,
          defaultValue: editingVariable.defaultValue || '',
          description: editingVariable.description || '',
        });
      } else {
        setFormData({
          name: '',
          type: 'text',
          defaultValue: '',
          description: '',
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, editingVariable]);

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Name validation
    const nameError = Validators.required(formData.name, 'Variable name');
    if (nameError) {
      newErrors.name = nameError.userMessage;
    } else {
      // Check for valid variable name format
      const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
      if (!nameRegex.test(formData.name)) {
        newErrors.name =
          'Variable name must start with a letter and contain only letters, numbers, and underscores';
      } else if (
        !editingVariable &&
        existingVariableNames.includes(formData.name)
      ) {
        newErrors.name = 'A variable with this name already exists';
      } else if (
        editingVariable &&
        editingVariable.name !== formData.name &&
        existingVariableNames.includes(formData.name)
      ) {
        newErrors.name = 'A variable with this name already exists';
      }
    }

    // Type validation
    if (!formData.type) {
      newErrors.type = 'Please select a variable type';
    }

    // URL-specific validation
    if (formData.type === 'url' && formData.defaultValue) {
      const urlError = Validators.url(formData.defaultValue, 'Default URL');
      if (urlError) {
        newErrors.defaultValue = urlError.userMessage;
      }
    }

    // Image URL validation
    if (formData.type === 'image' && formData.defaultValue) {
      const urlError = Validators.url(
        formData.defaultValue,
        'Default image URL'
      );
      if (urlError) {
        newErrors.defaultValue = urlError.userMessage;
      }
    }

    // Number validation
    if (formData.type === 'number' && formData.defaultValue) {
      const numValue = parseFloat(formData.defaultValue);
      if (isNaN(numValue)) {
        newErrors.defaultValue = 'Default value must be a valid number';
      }
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate form
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Create variable object
      const variableData: Omit<Variable, 'id'> = {
        name: formData.name.trim(),
        type: formData.type,
        defaultValue: formData.defaultValue.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      // If editing, include the ID
      const finalVariable = editingVariable
        ? ({ ...variableData, id: editingVariable.id } as Variable)
        : variableData;

      // Save variable
      onSave(finalVariable);
      onClose();
    } catch (error) {
      handleError(
        ErrorFactory.validation('VAL_001', 'Failed to save variable', {
          context: {
            action: editingVariable ? 'update' : 'create',
            variableName: formData.name,
          },
          userMessage: 'Failed to save variable. Please try again.',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isFormValid = Object.keys(validateForm()).length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingVariable
              ? t.editor.variables.editVariable
              : t.editor.variables.createVariable}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Variable Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t.editor.variables.variableName} *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., companyName, userEmail"
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Use in content as:{' '}
              <code>{`{{${formData.name || 'variableName'}}}`}</code>
            </p>
          </div>

          {/* Variable Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t.editor.variables.variableType} *
            </label>
            <Select
              value={formData.type}
              onValueChange={(value: VariableType) =>
                handleInputChange('type', value)
              }
            >
              <SelectTrigger className={errors.type ? 'border-red-300' : ''}>
                <SelectValue placeholder="Select variable type" />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type}</p>
            )}
          </div>

          {/* Default Value */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t.editor.variables.defaultValue}
            </label>
            <Input
              value={formData.defaultValue}
              onChange={(e) =>
                handleInputChange('defaultValue', e.target.value)
              }
              placeholder={`Enter default ${formData.type} value`}
              type={formData.type === 'number' ? 'number' : 'text'}
              className={errors.defaultValue ? 'border-red-300' : ''}
            />
            {errors.defaultValue && (
              <p className="text-sm text-red-600 mt-1">{errors.defaultValue}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this variable is used for..."
              rows={3}
              className={errors.description ? 'border-red-300' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Form validation summary */}
          {Object.keys(errors).length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {t.editor.variables.validationErrors}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting
              ? t.common.loading
              : editingVariable
                ? t.common.save
                : t.common.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
