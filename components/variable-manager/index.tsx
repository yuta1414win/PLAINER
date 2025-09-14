'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Variable as VariableIcon,
  Eye,
  EyeOff,
  Info,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useProjectStore, useNotifications } from '@/lib/stores';
import { createVariable, VariableProcessor } from '@/lib/variables';
import { VariableListItem } from './variable-list-item';
import { VariableFormDialog } from './variable-form-dialog';
import { useTranslation } from '../language-switcher';
import { useErrorHandler, ErrorFactory } from '@/lib/error-handling';
import type { Variable, UUID } from '@/lib/types';

interface VariableManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VariableManager({ isOpen, onClose }: VariableManagerProps) {
  const { t } = useTranslation();
  const {
    project,
    addVariable,
    updateVariable,
    deleteVariable,
    setVariableValue,
  } = useProjectStore();
  const { showSuccess, showError } = useNotifications();
  const { handleError } = useErrorHandler();

  // Local state
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Derived state
  const variables = project?.variables || [];
  const processor = project ? new VariableProcessor(project) : null;

  // Filter variables based on search term
  const filteredVariables = variables.filter(
    (variable) =>
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get variable references in the project
  const getVariableReferences = useCallback(
    (variableName: string) => {
      if (!project) return [];

      const references: Array<{
        stepId: UUID;
        title: string;
        context: string;
      }> = [];

      project.steps.forEach((step) => {
        const pattern = new RegExp(`{{\\s*${variableName}\\s*}}`, 'gi');

        // Check step title
        if (pattern.test(step.title)) {
          references.push({
            stepId: step.id,
            title: step.title,
            context: 'Step title',
          });
        }

        // Check step description
        if (pattern.test(step.description)) {
          references.push({
            stepId: step.id,
            title: step.title,
            context: 'Step description',
          });
        }

        // Check annotations
        step.annotations?.forEach((annotation) => {
          if (pattern.test(annotation.text)) {
            references.push({
              stepId: step.id,
              title: step.title,
              context: `Annotation: "${annotation.text.substring(0, 50)}..."`,
            });
          }
        });

        // Check hotspots
        step.hotspots?.forEach((hotspot) => {
          if (hotspot.label && pattern.test(hotspot.label)) {
            references.push({
              stepId: step.id,
              title: step.title,
              context: `Hotspot label: "${hotspot.label}"`,
            });
          }
          if (hotspot.tooltipText && pattern.test(hotspot.tooltipText)) {
            references.push({
              stepId: step.id,
              title: step.title,
              context: `Hotspot tooltip: "${hotspot.tooltipText}"`,
            });
          }
        });
      });

      return references;
    },
    [project]
  );

  // Get current value for a variable
  const getVariableValue = useCallback(
    (variable: Variable): string => {
      if (!processor) return variable.defaultValue || '';
      return (
        processor.getVariableValue(variable.name) || variable.defaultValue || ''
      );
    },
    [processor]
  );

  // Handlers
  const handleCreateVariable = useCallback(
    async (variableData: Omit<Variable, 'id'>) => {
      try {
        const newVariable = createVariable(variableData);
        addVariable(newVariable);
        showSuccess(t.success.variableCreated);
        setIsCreateDialogOpen(false);
      } catch (error) {
        const plainError = ErrorFactory.validation(
          'VAL_001',
          'Failed to create variable',
          {
            context: { action: 'create', variableName: variableData.name },
            userMessage: 'Failed to create variable. Please try again.',
          }
        );
        handleError(plainError);
        showError(t.errors.saveProjectFailed);
      }
    },
    [addVariable, showSuccess, showError, handleError, t]
  );

  const handleUpdateVariable = useCallback(
    async (variableData: Variable) => {
      try {
        updateVariable(variableData.id, variableData);
        showSuccess(t.success.variableUpdated);
        setEditingVariable(null);
      } catch (error) {
        const plainError = ErrorFactory.validation(
          'VAL_002',
          'Failed to update variable',
          {
            context: { action: 'update', variableId: variableData.id },
            userMessage: 'Failed to update variable. Please try again.',
          }
        );
        handleError(plainError);
        showError(t.errors.saveProjectFailed);
      }
    },
    [updateVariable, showSuccess, showError, handleError, t]
  );

  const handleDeleteVariable = useCallback(
    async (variableId: UUID) => {
      try {
        const variable = variables.find((v) => v.id === variableId);
        if (!variable) return;

        const references = getVariableReferences(variable.name);
        if (references.length > 0) {
          const confirmDelete = window.confirm(
            `This variable is used in ${references.length} place(s). Deleting it may break your content. Are you sure you want to continue?`
          );
          if (!confirmDelete) return;
        }

        deleteVariable(variableId);
        showSuccess(t.success.variableDeleted);
      } catch (error) {
        const plainError = ErrorFactory.validation(
          'VAL_003',
          'Failed to delete variable',
          {
            context: { action: 'delete', variableId },
            userMessage: 'Failed to delete variable. Please try again.',
          }
        );
        handleError(plainError);
        showError(t.errors.saveProjectFailed);
      }
    },
    [
      variables,
      getVariableReferences,
      deleteVariable,
      showSuccess,
      showError,
      handleError,
      t,
    ]
  );

  const handleValueChange = useCallback(
    async (variableName: string, value: string) => {
      try {
        setVariableValue(variableName, value);
      } catch (error) {
        const plainError = ErrorFactory.validation(
          'VAL_004',
          'Failed to update variable value',
          {
            context: { action: 'setValue', variableName, value },
            userMessage: 'Failed to update variable value. Please try again.',
          }
        );
        handleError(plainError);
        showError('Failed to update variable value');
      }
    },
    [setVariableValue, handleError, showError]
  );

  const handleSaveVariable = useCallback(
    async (variableData: Omit<Variable, 'id'> | Variable) => {
      if ('id' in variableData) {
        await handleUpdateVariable(variableData);
      } else {
        await handleCreateVariable(variableData);
      }
    },
    [handleCreateVariable, handleUpdateVariable]
  );

  const existingVariableNames = variables.map((v) => v.name);

  if (!project) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VariableIcon className="h-5 w-5" />
                <DialogTitle>{t.editor.variables.title}</DialogTitle>
                <Badge variant="outline" className="text-xs">
                  {variables.length}{' '}
                  {variables.length === 1 ? 'variable' : 'variables'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                  {isPreviewMode ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Preview
                    </>
                  )}
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.editor.variables.createVariable}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {t.editor.variables.description}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Search */}
            {variables.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search variables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {/* Variables List */}
            {filteredVariables.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <VariableIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {searchTerm ? (
                      <div>
                        <p className="font-medium">
                          No variables match your search
                        </p>
                        <p className="text-sm mt-1">
                          Try adjusting your search terms
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">
                          {t.editor.variables.noVariables}
                        </p>
                        <p className="text-sm mt-2">
                          Variables help you create dynamic content that can be
                          customized for different audiences or use cases.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredVariables.map((variable) => (
                  <VariableListItem
                    key={variable.id}
                    variable={variable}
                    currentValue={getVariableValue(variable)}
                    references={getVariableReferences(variable.name)}
                    isPreviewMode={isPreviewMode}
                    onEdit={setEditingVariable}
                    onDelete={handleDeleteVariable}
                    onValueChange={handleValueChange}
                  />
                ))}
              </div>
            )}

            {/* Help Information */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Using Variables:</strong> Add variables to your content
                using the format{' '}
                <code className="bg-gray-100 px-1 rounded">{`{{variableName}}`}</code>
                . Variables can be customized via URL parameters or set manually
                here.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Variable Dialog */}
      <VariableFormDialog
        isOpen={isCreateDialogOpen || editingVariable !== null}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setEditingVariable(null);
        }}
        onSave={handleSaveVariable}
        editingVariable={editingVariable}
        existingVariableNames={existingVariableNames}
      />
    </>
  );
}
