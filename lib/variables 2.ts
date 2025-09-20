import type {
  Variable,
  VariableInstance,
  Project,
  Step,
  ConditionalStep,
} from './types';

export class VariableProcessor {
  private variables: Variable[] = [];
  private instances: VariableInstance[] = [];

  constructor(project: Project) {
    this.variables = project.variables || [];
    this.instances = project.variableInstances || [];
  }

  /**
   * Replace variables in text with their current values
   */
  processText(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      const variable = this.variables.find((v) => v.name === variableName);
      if (!variable) return match;

      const instance = this.instances.find((i) => i.variableId === variable.id);
      return instance?.value || variable.defaultValue || match;
    });
  }

  /**
   * Get variable value by name
   */
  getVariableValue(variableName: string): string | undefined {
    const variable = this.variables.find((v) => v.name === variableName);
    if (!variable) return undefined;

    const instance = this.instances.find((i) => i.variableId === variable.id);
    return instance?.value || variable.defaultValue;
  }

  /**
   * Set variable value
   */
  setVariableValue(variableName: string, value: string): void {
    const variable = this.variables.find((v) => v.name === variableName);
    if (!variable) return;

    const existingInstance = this.instances.find(
      (i) => i.variableId === variable.id
    );
    if (existingInstance) {
      existingInstance.value = value;
    } else {
      this.instances.push({
        variableId: variable.id,
        value,
      });
    }
  }

  /**
   * Evaluate condition expression
   */
  evaluateCondition(condition: string): boolean {
    try {
      // Simple condition parser for expressions like "variableName === 'value'"
      const conditionRegex =
        /(\w+)\s*(===|!==|==|!=|>|<|>=|<=)\s*['"]?([^'"]+)['"]?/;
      const match = condition.match(conditionRegex);

      if (!match) return false;

      const [, variableName, operator, expectedValue] = match;
      const actualValue = this.getVariableValue(variableName);

      if (actualValue === undefined) return false;

      switch (operator) {
        case '===':
        case '==':
          return actualValue === expectedValue;
        case '!==':
        case '!=':
          return actualValue !== expectedValue;
        case '>':
          return parseFloat(actualValue) > parseFloat(expectedValue);
        case '<':
          return parseFloat(actualValue) < parseFloat(expectedValue);
        case '>=':
          return parseFloat(actualValue) >= parseFloat(expectedValue);
        case '<=':
          return parseFloat(actualValue) <= parseFloat(expectedValue);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Determine if a step should be visible based on conditions
   */
  isStepVisible(step: Step, conditionalSteps: ConditionalStep[]): boolean {
    const stepConditions = conditionalSteps.filter((c) => c.stepId === step.id);

    if (stepConditions.length === 0) {
      return step.isVisible !== false; // Default to visible
    }

    return stepConditions.every((condition) =>
      this.evaluateCondition(condition.condition)
    );
  }

  /**
   * Process all steps and return visible ones with processed text
   */
  processSteps(steps: Step[], conditionalSteps: ConditionalStep[]): Step[] {
    return steps
      .filter((step) => this.isStepVisible(step, conditionalSteps))
      .map((step) => ({
        ...step,
        title: this.processText(step.title),
        description: step.description
          ? this.processText(step.description)
          : undefined,
        annotations: step.annotations.map((annotation) => ({
          ...annotation,
          text: this.processText(annotation.text),
        })),
        hotspots: step.hotspots.map((hotspot) => ({
          ...hotspot,
          label: hotspot.label ? this.processText(hotspot.label) : undefined,
          tooltipText: hotspot.tooltipText
            ? this.processText(hotspot.tooltipText)
            : undefined,
        })),
        cta: step.cta
          ? {
              ...step.cta,
              label: this.processText(step.cta.label),
              url: this.processText(step.cta.url),
            }
          : undefined,
      }));
  }

  /**
   * Extract variable references from text
   */
  extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return matches
      .map((match) => match.replace(/[{}]/g, ''))
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }

  /**
   * Validate variable references in project
   */
  validateProject(project: Project): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for undefined variable references
    project.steps.forEach((step, stepIndex) => {
      const titleVars = this.extractVariables(step.title);
      const descVars = step.description
        ? this.extractVariables(step.description)
        : [];

      [...titleVars, ...descVars].forEach((varName) => {
        if (!this.variables.find((v) => v.name === varName)) {
          errors.push(`Step ${stepIndex + 1}: Undefined variable '${varName}'`);
        }
      });

      step.annotations.forEach((annotation, annotationIndex) => {
        const annotationVars = this.extractVariables(annotation.text);
        annotationVars.forEach((varName) => {
          if (!this.variables.find((v) => v.name === varName)) {
            errors.push(
              `Step ${stepIndex + 1}, Annotation ${annotationIndex + 1}: Undefined variable '${varName}'`
            );
          }
        });
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get current instances for persistence
   */
  getInstances(): VariableInstance[] {
    return [...this.instances];
  }
}

/**
 * Create default variables for common use cases
 */
export function createDefaultVariables(): Variable[] {
  return [
    {
      id: `var-${Date.now()}-1`,
      name: 'userName',
      type: 'text',
      defaultValue: 'User',
      description: 'User name for personalization',
    },
    {
      id: `var-${Date.now()}-2`,
      name: 'companyName',
      type: 'text',
      defaultValue: 'Your Company',
      description: 'Company name for branding',
    },
    {
      id: `var-${Date.now()}-3`,
      name: 'productName',
      type: 'text',
      defaultValue: 'Product',
      description: 'Product name for references',
    },
  ];
}

/**
 * Utility function to create a new variable
 */
export function createVariable(
  name: string,
  type: Variable['type'],
  defaultValue?: string,
  description?: string
): Variable {
  return {
    id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    defaultValue,
    description,
  };
}
