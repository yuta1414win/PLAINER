'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, GitBranch, Eye, TestTube } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { VariableProcessor } from '@/lib/variables';
import { useTranslation } from './language-switcher';
import type { ConditionalStep, Step, UUID } from '@/lib/types';
import { createBrandedType } from '@/lib/types';

interface BranchingManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BranchingRule {
  id: string;
  name: string;
  condition: string;
  targetStepIds: string[];
  isActive: boolean;
}

export function BranchingManager({ isOpen, onClose }: BranchingManagerProps) {
  const { t } = useTranslation();
  const { project, updateProject } = useEditorStore();
  const [editingRule, setEditingRule] = useState<BranchingRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<BranchingRule>>({
    name: '',
    condition: '',
    targetStepIds: [],
    isActive: true,
  });
  const [testMode, setTestMode] = useState(false);

  const conditionalSteps = project?.conditionalSteps || [];
  const steps = project?.steps || [];
  const variables = project?.variables || [];
  const processor = project ? new VariableProcessor(project) : null;

  const serializeConditions = (cs: ConditionalStep) =>
    JSON.stringify(cs.conditions);

  // Convert conditional steps to rules format for easier management
  const rules: BranchingRule[] = conditionalSteps.reduce((acc, cs) => {
    const key = serializeConditions(cs);
    const existingRule = acc.find((rule) => rule.condition === key);
    if (existingRule) {
      existingRule.targetStepIds.push(cs.stepId);
    } else {
      acc.push({
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Rule: ${key}`,
        condition: key,
        targetStepIds: [cs.stepId],
        isActive: true,
      });
    }
    return acc;
  }, [] as BranchingRule[]);

  const handleCreateRule = useCallback(() => {
    if (
      !project ||
      !newRule.name ||
      !newRule.condition ||
      !newRule.targetStepIds?.length
    )
      return;

    const parseConditions = (s: string) => {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [
        {
          type: 'variable',
          operator: 'equals',
          value: s,
        },
      ];
    };

    const toUUID = (v: string) => createBrandedType<UUID>(v);

    const newConditionalSteps: ConditionalStep[] = newRule.targetStepIds.map(
      (stepId) => ({
        id: toUUID(crypto.randomUUID()),
        stepId: stepId as unknown as UUID,
        conditions: parseConditions(newRule.condition!),
        action: 'show',
      })
    );

    updateProject({
      conditionalSteps: [...conditionalSteps, ...newConditionalSteps],
    });

    setNewRule({ name: '', condition: '', targetStepIds: [], isActive: true });
    setIsCreateDialogOpen(false);
  }, [project, newRule, conditionalSteps, updateProject]);

  const handleUpdateRule = useCallback(
    (rule: BranchingRule) => {
      if (!project) return;

      // Remove old conditional steps for this rule
      const updatedConditionalSteps = conditionalSteps.filter((cs) =>
        !editingRule?.targetStepIds.includes(cs.stepId) ||
        serializeConditions(cs) !== editingRule.condition
      );

      // Add new conditional steps
      const parseConditions = (s: string) => {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return [
          {
            type: 'variable',
            operator: 'equals',
            value: s,
          },
        ];
      };

      const toUUID = (v: string) => createBrandedType<UUID>(v);

      const newConditionalSteps: ConditionalStep[] = rule.targetStepIds.map(
        (stepId) => ({
          id: toUUID(crypto.randomUUID()),
          stepId: stepId as unknown as UUID,
          conditions: parseConditions(rule.condition),
          action: 'show',
        })
      );

      updateProject({
        conditionalSteps: [...updatedConditionalSteps, ...newConditionalSteps],
      });

      setEditingRule(null);
    },
    [project, editingRule, conditionalSteps, updateProject]
  );

  const handleDeleteRule = useCallback(
    (rule: BranchingRule) => {
      if (!project) return;

      const updatedConditionalSteps = conditionalSteps.filter((cs) =>
        !rule.targetStepIds.includes(cs.stepId) ||
        serializeConditions(cs) !== rule.condition
      );

      updateProject({
        conditionalSteps: updatedConditionalSteps,
      });
    },
    [project, conditionalSteps, updateProject]
  );

  const handleTestCondition = useCallback(
    (condition: string): boolean => {
      if (!processor) return false;
      try {
        return processor.evaluateCondition(condition);
      } catch (error) {
        console.error('Error testing condition:', error);
        return false;
      }
    },
    [processor]
  );

  const getStepTitle = useCallback(
    (stepId: string): string => {
      const step = steps.find((s) => s.id === stepId);
      return step?.title || 'Unknown Step';
    },
    [steps]
  );

  const getAffectedSteps = useCallback(
    (condition: string): Step[] => {
      const affectedStepIds = conditionalSteps
        .filter((cs) => serializeConditions(cs) === condition)
        .map((cs) => cs.stepId);

      return steps.filter((step) => affectedStepIds.includes(step.id));
    },
    [conditionalSteps, steps]
  );

  const getVariableNames = useCallback((): string[] => {
    return variables.map((v) => v.name);
  }, [variables]);

  const generateConditionSuggestions = useCallback((): string[] => {
    const variableNames = getVariableNames();
    const suggestions: string[] = [];

    variableNames.forEach((varName) => {
      suggestions.push(`${varName} === 'value'`);
      suggestions.push(`${varName} !== 'value'`);
      suggestions.push(`${varName} === ''`);
      suggestions.push(`${varName} !== ''`);
    });

    return suggestions;
  }, [getVariableNames]);

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <DialogTitle>{t.editor.branching.title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestMode(!testMode)}
              >
                {testMode ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Mode
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Mode
                  </>
                )}
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.editor.branching.addCondition}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {t.editor.branching.description}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No branching rules defined yet.</p>
                  <p className="text-sm mt-2">
                    Create conditional logic to show or hide steps based on
                    variable values.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const affectedSteps = getAffectedSteps(rule.condition);
                const conditionResult = testMode
                  ? handleTestCondition(rule.condition)
                  : null;

                return (
                  <Card key={rule.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                              {rule.condition}
                            </code>
                            {testMode && (
                              <Badge
                                variant={
                                  conditionResult ? 'default' : 'secondary'
                                }
                              >
                                {conditionResult ? 'TRUE' : 'FALSE'}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {t.editor.branching.ifCondition}{' '}
                            <strong>{rule.condition}</strong>,{' '}
                            {t.editor.branching.thenShow}:
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Affected Steps ({affectedSteps.length})
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {affectedSteps.map((step) => (
                              <Badge
                                key={step.id}
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {step.title}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {testMode && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm">
                              <strong>Test Result:</strong> This condition is
                              currently{' '}
                              <span
                                className={`font-medium ${conditionResult ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {conditionResult ? 'TRUE' : 'FALSE'}
                              </span>
                              {conditionResult ? (
                                <span className="text-gray-600">
                                  {' '}
                                  - affected steps will be shown
                                </span>
                              ) : (
                                <span className="text-gray-600">
                                  {' '}
                                  - affected steps will be hidden
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Variable Reference */}
          {variables.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Available Variables</CardTitle>
                <CardDescription>
                  These variables can be used in conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => {
                    const currentValue =
                      processor?.getVariableValue(variable.name) ||
                      variable.defaultValue ||
                      '';
                    return (
                      <div
                        key={variable.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                      >
                        <code className="font-mono">{variable.name}</code>
                        <span className="text-gray-500">=</span>
                        <span className="text-blue-600">"{currentValue}"</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editor.branching.addCondition}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rule Name
              </label>
              <Input
                value={newRule.name || ''}
                onChange={(e) =>
                  setNewRule({ ...newRule, name: e.target.value })
                }
                placeholder="e.g., Show advanced steps"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t.editor.branching.condition}
              </label>
              <Select
                value={newRule.condition || ''}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, condition: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or type a condition" />
                </SelectTrigger>
                <SelectContent>
                  {generateConditionSuggestions().map((suggestion, index) => (
                    <SelectItem key={index} value={suggestion}>
                      {suggestion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={newRule.condition || ''}
                onChange={(e) =>
                  setNewRule({ ...newRule, condition: e.target.value })
                }
                placeholder="e.g., userName === 'admin'"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variable names and comparison operators: ===, !==, &gt;,
                &lt;, &gt;=, &lt;=
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Target Steps
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {steps.map((step) => (
                  <label key={step.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={
                        newRule.targetStepIds?.includes(step.id) || false
                      }
                      onChange={(e) => {
                        const targetStepIds = [
                          ...(newRule.targetStepIds || []),
                        ];
                        if (e.target.checked) {
                          targetStepIds.push(step.id);
                        } else {
                          const index = targetStepIds.indexOf(step.id);
                          if (index > -1) targetStepIds.splice(index, 1);
                        }
                        setNewRule({ ...newRule, targetStepIds });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{step.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Test condition */}
            {newRule.condition && processor && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <strong>Test:</strong> This condition is currently{' '}
                  <span
                    className={`font-medium ${
                      handleTestCondition(newRule.condition)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {handleTestCondition(newRule.condition) ? 'TRUE' : 'FALSE'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={
                !newRule.name ||
                !newRule.condition ||
                !newRule.targetStepIds?.length
              }
            >
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <Dialog open={true} onOpenChange={() => setEditingRule(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.editor.branching.editCondition}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rule Name
                </label>
                <Input
                  value={editingRule.name}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t.editor.branching.condition}
                </label>
                <Input
                  value={editingRule.condition}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      condition: e.target.value,
                    })
                  }
                  placeholder="e.g., userName === 'admin'"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Target Steps
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {steps.map((step) => (
                    <label
                      key={step.id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={editingRule.targetStepIds.includes(step.id)}
                        onChange={(e) => {
                          const targetStepIds = [...editingRule.targetStepIds];
                          if (e.target.checked) {
                            targetStepIds.push(step.id);
                          } else {
                            const index = targetStepIds.indexOf(step.id);
                            if (index > -1) targetStepIds.splice(index, 1);
                          }
                          setEditingRule({ ...editingRule, targetStepIds });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{step.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRule(null)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => handleUpdateRule(editingRule)}>
                {t.common.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
