import { Step, UUID, Project } from '../types';
import { getGeminiModel, processImageForGemini } from '../gemini';
import { OptimizationPreferences, OptimizationContext } from './step-optimizer';

// ============================================================================
// Content Generation Types
// ============================================================================

export interface ContentRequest {
  readonly type: ContentType;
  readonly target: ContentTarget;
  readonly context: GenerationContext;
  readonly preferences?: ContentPreferences;
  readonly constraints?: ContentConstraints;
}

export type ContentType =
  | 'title'
  | 'description'
  | 'annotation'
  | 'tooltip'
  | 'cta_text'
  | 'alt_text'
  | 'complete_step';

export type ContentTarget =
  | 'new_step'
  | 'existing_step'
  | 'step_sequence'
  | 'project_overview';

export interface GenerationContext {
  readonly steps?: readonly Step[];
  readonly currentStep?: Step;
  readonly project?: Project;
  readonly userIntent?: string;
  readonly domain?: string;
  readonly screenshots?: readonly ScreenshotData[];
  readonly previousGenerations?: readonly GeneratedContent[];
}

export interface ScreenshotData {
  readonly id: UUID;
  readonly imageBase64: string;
  readonly mimeType: string;
  readonly annotations?: readonly ImageAnnotation[];
  readonly metadata?: ImageMetadata;
}

export interface ImageAnnotation {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly type: 'element' | 'region' | 'action' | 'feature';
}

export interface ImageMetadata {
  readonly width: number;
  readonly height: number;
  readonly deviceType?: 'desktop' | 'mobile' | 'tablet';
  readonly browser?: string;
  readonly viewport?: string;
}

export interface ContentPreferences {
  readonly tone?: 'formal' | 'casual' | 'friendly' | 'professional' | 'playful';
  readonly length?: 'brief' | 'moderate' | 'detailed';
  readonly complexity?: 'simple' | 'intermediate' | 'advanced';
  readonly language?: string;
  readonly audienceLevel?: 'beginner' | 'intermediate' | 'expert';
  readonly includeEmojis?: boolean;
  readonly brandVoice?: string;
}

export interface ContentConstraints {
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly keywords?: readonly string[];
  readonly avoidWords?: readonly string[];
  readonly mustInclude?: readonly string[];
  readonly format?: 'plain' | 'markdown' | 'html';
  readonly accessibility?: boolean;
}

// ============================================================================
// Content Generation Results
// ============================================================================

export interface GeneratedContent {
  readonly id: UUID;
  readonly type: ContentType;
  readonly content: string;
  readonly alternativeVersions?: readonly string[];
  readonly confidence: number;
  readonly metadata: ContentMetadata;
  readonly improvements?: readonly ContentImprovement[];
  readonly validation: ContentValidation;
}

export interface ContentMetadata {
  readonly timestamp: Date;
  readonly modelVersion: string;
  readonly tokensUsed: number;
  readonly processingTime: number;
  readonly sourceImages?: readonly string[];
  readonly detectedElements?: readonly string[];
  readonly suggestedVariants?: readonly string[];
}

export interface ContentImprovement {
  readonly aspect:
    | 'clarity'
    | 'engagement'
    | 'accessibility'
    | 'brevity'
    | 'accuracy';
  readonly current: string;
  readonly improved: string;
  readonly reason: string;
  readonly impact: 'low' | 'medium' | 'high';
}

export interface ContentValidation {
  readonly isValid: boolean;
  readonly issues?: readonly ValidationIssue[];
  readonly score: number; // 0-1
  readonly recommendations?: readonly string[];
}

export interface ValidationIssue {
  readonly type: 'length' | 'tone' | 'clarity' | 'accessibility' | 'grammar';
  readonly severity: 'low' | 'medium' | 'high';
  readonly message: string;
  readonly suggestion?: string;
}

// ============================================================================
// Content Suggestions
// ============================================================================

export interface ContentSuggestion {
  readonly stepId: UUID;
  readonly suggestions: readonly StepContentSuggestion[];
  readonly overallScore: number;
  readonly improvementAreas: readonly ImprovementArea[];
}

export interface StepContentSuggestion {
  readonly field: 'title' | 'description' | 'annotations' | 'cta' | 'tooltips';
  readonly current: string;
  readonly suggested: string;
  readonly reason: string;
  readonly impact: 'low' | 'medium' | 'high';
  readonly confidence: number;
}

export interface ImprovementArea {
  readonly area:
    | 'engagement'
    | 'clarity'
    | 'accessibility'
    | 'brevity'
    | 'consistency';
  readonly priority: 'low' | 'medium' | 'high';
  readonly description: string;
  readonly affectedSteps: readonly UUID[];
}

// ============================================================================
// Smart Content Templates
// ============================================================================

interface ContentTemplate {
  readonly type: ContentType;
  readonly patterns: readonly string[];
  readonly variables: readonly string[];
  readonly constraints: Partial<ContentConstraints>;
}

const CONTENT_TEMPLATES: readonly ContentTemplate[] = [
  {
    type: 'title',
    patterns: [
      'Step {number}: {action}',
      '{action} {object}',
      'How to {action}',
      '{action} - {purpose}',
    ],
    variables: ['number', 'action', 'object', 'purpose'],
    constraints: { maxLength: 50 },
  },
  {
    type: 'description',
    patterns: [
      'In this step, you will {action} by {method}. This {purpose}.',
      'To {objective}, {action} the {element}. {additional_info}',
      '{action} the {element} to {purpose}. {note}',
    ],
    variables: [
      'action',
      'method',
      'purpose',
      'objective',
      'element',
      'additional_info',
      'note',
    ],
    constraints: { minLength: 20, maxLength: 200 },
  },
  {
    type: 'cta_text',
    patterns: [
      '{action} Now',
      'Get Started',
      '{action} {object}',
      'Continue to {next_step}',
    ],
    variables: ['action', 'object', 'next_step'],
    constraints: { maxLength: 25 },
  },
];

// ============================================================================
// Main Content Generator
// ============================================================================

export class ContentGenerator {
  private model = getGeminiModel();
  private cache = new Map<string, GeneratedContent>();

  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let content: string;
      let alternativeVersions: string[] = [];
      let confidence = 0.8;
      let detectedElements: string[] = [];

      switch (request.type) {
        case 'complete_step':
          ({ content, alternativeVersions, confidence, detectedElements } =
            await this.generateCompleteStep(request));
          break;
        case 'title':
          content = await this.generateTitle(request);
          alternativeVersions = await this.generateTitleVariants(
            content,
            request
          );
          break;
        case 'description':
          content = await this.generateDescription(request);
          alternativeVersions = await this.generateDescriptionVariants(
            content,
            request
          );
          break;
        case 'annotation':
          content = await this.generateAnnotation(request);
          break;
        case 'tooltip':
          content = await this.generateTooltip(request);
          break;
        case 'cta_text':
          content = await this.generateCTAText(request);
          alternativeVersions = await this.generateCTAVariants(
            content,
            request
          );
          break;
        case 'alt_text':
          content = await this.generateAltText(request);
          break;
        default:
          throw new Error(`Unsupported content type: ${request.type}`);
      }

      const result: GeneratedContent = {
        id: crypto.randomUUID() as UUID,
        type: request.type,
        content,
        alternativeVersions,
        confidence,
        metadata: {
          timestamp: new Date(),
          modelVersion: 'gemini-2.5-pro',
          tokensUsed: Math.ceil(content.length / 4),
          processingTime: Date.now() - startTime,
          detectedElements,
          suggestedVariants: alternativeVersions,
        },
        validation: this.validateContent(content, request),
        improvements: this.suggestImprovements(content, request),
      };

      // Cache result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(
        `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async generateCompleteStep(request: ContentRequest): Promise<{
    content: string;
    alternativeVersions: string[];
    confidence: number;
    detectedElements: string[];
  }> {
    if (!request.context.screenshots?.[0]) {
      throw new Error('Screenshot required for complete step generation');
    }

    const screenshot = request.context.screenshots[0];
    const imagePart = await processImageForGemini(screenshot.imageBase64);

    const prompt = this.buildCompleteStepPrompt(request);

    const result = await this.model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const aiResponse = response.text();

    // Parse the AI response to extract structured content
    const { title, description, annotations, detectedElements } =
      this.parseCompleteStepResponse(aiResponse);

    const content = JSON.stringify({
      title,
      description,
      annotations,
      detectedElements,
    });

    return {
      content,
      alternativeVersions: [], // Would generate alternative complete steps
      confidence: 0.85,
      detectedElements,
    };
  }

  private async generateTitle(request: ContentRequest): Promise<string> {
    const prompt = this.buildTitlePrompt(request);

    // Use image context if available
    if (request.context.screenshots?.[0]) {
      const imagePart = await processImageForGemini(
        request.context.screenshots[0].imageBase64
      );
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return this.extractTitleFromResponse(response.text());
    } else {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.extractTitleFromResponse(response.text());
    }
  }

  private async generateDescription(request: ContentRequest): Promise<string> {
    const prompt = this.buildDescriptionPrompt(request);

    if (request.context.screenshots?.[0]) {
      const imagePart = await processImageForGemini(
        request.context.screenshots[0].imageBase64
      );
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return this.extractDescriptionFromResponse(response.text());
    } else {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.extractDescriptionFromResponse(response.text());
    }
  }

  private async generateAnnotation(request: ContentRequest): Promise<string> {
    const prompt = this.buildAnnotationPrompt(request);
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }

  private async generateTooltip(request: ContentRequest): Promise<string> {
    const prompt = this.buildTooltipPrompt(request);
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }

  private async generateCTAText(request: ContentRequest): Promise<string> {
    const prompt = this.buildCTAPrompt(request);
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return this.extractCTAFromResponse(response.text());
  }

  private async generateAltText(request: ContentRequest): Promise<string> {
    if (!request.context.screenshots?.[0]) {
      return 'Screenshot showing application interface';
    }

    const imagePart = await processImageForGemini(
      request.context.screenshots[0].imageBase64
    );
    const prompt = this.buildAltTextPrompt(request);

    const result = await this.model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text().trim();
  }

  // ============================================================================
  // Variant Generation
  // ============================================================================

  private async generateTitleVariants(
    baseTitle: string,
    request: ContentRequest
  ): Promise<string[]> {
    const prompt = `Generate 3 alternative versions of this title: "${baseTitle}"
    Keep the same meaning but vary the style and approach.
    Consider: ${request.preferences?.tone || 'professional'} tone, ${request.preferences?.complexity || 'simple'} complexity.

    Return only the alternatives, one per line, no numbering:`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response
      .text()
      .split('\n')
      .filter((line) => line.trim())
      .slice(0, 3);
  }

  private async generateDescriptionVariants(
    baseDescription: string,
    request: ContentRequest
  ): Promise<string[]> {
    const prompt = `Generate 2 alternative versions of this description: "${baseDescription}"
    Keep the same core information but vary the structure and wording.
    Target: ${request.preferences?.audienceLevel || 'intermediate'} users.

    Return only the alternatives, separated by "---":`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response
      .text()
      .split('---')
      .map((s) => s.trim())
      .filter((s) => s)
      .slice(0, 2);
  }

  private async generateCTAVariants(
    baseCTA: string,
    request: ContentRequest
  ): Promise<string[]> {
    const prompt = `Generate 3 alternative call-to-action buttons for: "${baseCTA}"
    Keep them concise and action-oriented.
    Tone: ${request.preferences?.tone || 'professional'}

    Return only the alternatives, one per line:`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response
      .text()
      .split('\n')
      .filter((line) => line.trim())
      .slice(0, 3);
  }

  // ============================================================================
  // Prompt Building
  // ============================================================================

  private buildCompleteStepPrompt(request: ContentRequest): string {
    const preferences = request.preferences;
    const context = request.context;

    return `Analyze this screenshot and generate a complete step for a tutorial.

Context:
- Domain: ${context.domain || 'general software'}
- User Intent: ${context.userIntent || 'learning how to use the interface'}
- Audience: ${preferences?.audienceLevel || 'intermediate'} users
- Tone: ${preferences?.tone || 'professional'}
- Language: ${preferences?.language || 'English'}

Generate:
1. TITLE: A clear, concise title (max 50 characters)
2. DESCRIPTION: Detailed explanation (80-200 words)
3. ANNOTATIONS: Key UI elements to highlight (with brief labels)
4. DETECTED_ELEMENTS: List all interactive elements visible

Format your response as:
TITLE: [title here]
DESCRIPTION: [description here]
ANNOTATIONS: [element1: label1 | element2: label2 | ...]
DETECTED_ELEMENTS: [button, input, menu, etc.]

Focus on user-friendly language and clear instructions.`;
  }

  private buildTitlePrompt(request: ContentRequest): string {
    const step = request.context.currentStep;
    const preferences = request.preferences;

    return `Generate a clear, engaging title for this tutorial step.

Context:
${step ? `Current step description: ${step.description}` : ''}
${request.context.userIntent ? `User goal: ${request.context.userIntent}` : ''}
${request.context.domain ? `Domain: ${request.context.domain}` : ''}

Requirements:
- Max ${request.constraints?.maxLength || 50} characters
- Tone: ${preferences?.tone || 'professional'}
- Complexity: ${preferences?.complexity || 'simple'}
- Include action words when appropriate

Return only the title, no explanation.`;
  }

  private buildDescriptionPrompt(request: ContentRequest): string {
    const step = request.context.currentStep;
    const preferences = request.preferences;

    return `Write a clear, helpful description for this tutorial step.

Context:
${step ? `Step title: ${step.title}` : ''}
${request.context.userIntent ? `User goal: ${request.context.userIntent}` : ''}
${request.context.domain ? `Domain: ${request.context.domain}` : ''}

Requirements:
- Length: ${request.constraints?.minLength || 50}-${request.constraints?.maxLength || 200} characters
- Tone: ${preferences?.tone || 'professional'}
- Audience: ${preferences?.audienceLevel || 'intermediate'} users
- Include specific actions and expected outcomes
${preferences?.accessibility ? '- Use accessible language' : ''}

Return only the description, no explanation.`;
  }

  private buildAnnotationPrompt(request: ContentRequest): string {
    return `Generate a brief, helpful annotation for a UI element.

Context: ${request.context.userIntent || 'interface tutorial'}
Tone: ${request.preferences?.tone || 'professional'}
Max length: 20 words

Focus on what the user should do with this element.
Return only the annotation text.`;
  }

  private buildTooltipPrompt(request: ContentRequest): string {
    return `Generate a helpful tooltip for a UI element.

Context: ${request.context.userIntent || 'interface tutorial'}
Tone: ${request.preferences?.tone || 'helpful'}
Max length: 30 words

Explain what this element does or why it's important.
Return only the tooltip text.`;
  }

  private buildCTAPrompt(request: ContentRequest): string {
    const context = request.context;

    return `Generate an engaging call-to-action button text.

Context: ${context.userIntent || 'next step in tutorial'}
Tone: ${request.preferences?.tone || 'professional'}
Max length: 25 characters

Make it action-oriented and clear about what happens next.
Return only the CTA text.`;
  }

  private buildAltTextPrompt(request: ContentRequest): string {
    return `Generate descriptive alt text for this screenshot.

Context:
- This is a tutorial step screenshot
- Domain: ${request.context.domain || 'software interface'}
- Purpose: Help users understand the interface

Requirements:
- Describe key visual elements and their purpose
- Include interactive elements (buttons, forms, etc.)
- Keep it concise but informative
- Max 125 characters

Return only the alt text description.`;
  }

  // ============================================================================
  // Response Parsing
  // ============================================================================

  private parseCompleteStepResponse(response: string): {
    title: string;
    description: string;
    annotations: string[];
    detectedElements: string[];
  } {
    const lines = response.split('\n');
    let title = '';
    let description = '';
    let annotations: string[] = [];
    let detectedElements: string[] = [];

    for (const line of lines) {
      if (line.startsWith('TITLE:')) {
        title = line.replace('TITLE:', '').trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        description = line.replace('DESCRIPTION:', '').trim();
      } else if (line.startsWith('ANNOTATIONS:')) {
        const annotationText = line.replace('ANNOTATIONS:', '').trim();
        annotations = annotationText
          .split('|')
          .map((a) => a.trim())
          .filter((a) => a);
      } else if (line.startsWith('DETECTED_ELEMENTS:')) {
        const elementsText = line.replace('DETECTED_ELEMENTS:', '').trim();
        detectedElements = elementsText
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e);
      }
    }

    return { title, description, annotations, detectedElements };
  }

  private extractTitleFromResponse(response: string): string {
    // Clean up the response to extract just the title
    return response
      .replace(/^(Title:|TITLE:)/i, '')
      .trim()
      .replace(/['"]/g, '');
  }

  private extractDescriptionFromResponse(response: string): string {
    return response.replace(/^(Description:|DESCRIPTION:)/i, '').trim();
  }

  private extractCTAFromResponse(response: string): string {
    return response
      .replace(/^(CTA:|Button:|ACTION:)/i, '')
      .trim()
      .replace(/['"]/g, '');
  }

  // ============================================================================
  // Content Validation
  // ============================================================================

  private validateContent(
    content: string,
    request: ContentRequest
  ): ContentValidation {
    const issues: ValidationIssue[] = [];
    let score = 1.0;

    // Length validation
    if (
      request.constraints?.maxLength &&
      content.length > request.constraints.maxLength
    ) {
      issues.push({
        type: 'length',
        severity: 'high',
        message: `Content exceeds maximum length of ${request.constraints.maxLength} characters`,
        suggestion:
          'Consider shortening the content while preserving key information',
      });
      score -= 0.3;
    }

    if (
      request.constraints?.minLength &&
      content.length < request.constraints.minLength
    ) {
      issues.push({
        type: 'length',
        severity: 'medium',
        message: `Content is shorter than minimum length of ${request.constraints.minLength} characters`,
        suggestion: 'Add more detail or explanation',
      });
      score -= 0.2;
    }

    // Accessibility validation
    if (request.preferences?.accessibility) {
      if (!/[.!?]$/.test(content)) {
        issues.push({
          type: 'accessibility',
          severity: 'low',
          message: 'Content should end with punctuation for screen readers',
          suggestion: 'Add appropriate punctuation at the end',
        });
        score -= 0.1;
      }
    }

    // Keyword validation
    if (request.constraints?.mustInclude) {
      for (const keyword of request.constraints.mustInclude) {
        if (!content.toLowerCase().includes(keyword.toLowerCase())) {
          issues.push({
            type: 'clarity',
            severity: 'medium',
            message: `Required keyword "${keyword}" not found`,
            suggestion: `Include the keyword "${keyword}" in the content`,
          });
          score -= 0.15;
        }
      }
    }

    return {
      isValid: issues.length === 0 || issues.every((i) => i.severity === 'low'),
      issues: issues.length > 0 ? issues : undefined,
      score: Math.max(0, score),
      recommendations: issues
        .map((i) => i.suggestion)
        .filter((s) => s) as string[],
    };
  }

  private suggestImprovements(
    content: string,
    request: ContentRequest
  ): ContentImprovement[] {
    const improvements: ContentImprovement[] = [];

    // Engagement improvements
    if (!this.hasActionWords(content) && request.type !== 'alt_text') {
      improvements.push({
        aspect: 'engagement',
        current: content,
        improved: this.addActionWords(content),
        reason: 'Adding action words increases user engagement',
        impact: 'medium',
      });
    }

    // Clarity improvements
    if (this.hasComplexSentences(content)) {
      improvements.push({
        aspect: 'clarity',
        current: content,
        improved: this.simplifyLanguage(content),
        reason: 'Simpler language improves comprehension',
        impact: 'high',
      });
    }

    return improvements;
  }

  // ============================================================================
  // Content Analysis Utilities
  // ============================================================================

  private hasActionWords(content: string): boolean {
    const actionWords = [
      'click',
      'select',
      'choose',
      'enter',
      'type',
      'drag',
      'navigate',
      'open',
      'close',
      'save',
    ];
    return actionWords.some((word) => content.toLowerCase().includes(word));
  }

  private addActionWords(content: string): string {
    // Simplified implementation - would be more sophisticated in production
    if (content.includes('the button')) {
      return content.replace('the button', 'click the button');
    }
    return content;
  }

  private hasComplexSentences(content: string): boolean {
    const sentences = content.split(/[.!?]/).filter((s) => s.trim());
    return sentences.some((sentence) => sentence.split(' ').length > 20);
  }

  private simplifyLanguage(content: string): string {
    // Simplified implementation
    return content
      .replace(/utilize/g, 'use')
      .replace(/commence/g, 'start')
      .replace(/terminate/g, 'end');
  }

  private generateCacheKey(request: ContentRequest): string {
    return JSON.stringify({
      type: request.type,
      target: request.target,
      context: {
        userIntent: request.context.userIntent,
        domain: request.context.domain,
        currentStep: request.context.currentStep?.id,
      },
      preferences: request.preferences,
    });
  }
}

// ============================================================================
// Main Generation Function
// ============================================================================

export async function generateContentSuggestions(
  steps: readonly Step[],
  preferences?: OptimizationPreferences,
  context?: OptimizationContext
): Promise<readonly ContentSuggestion[]> {
  const generator = new ContentGenerator();
  const suggestions: ContentSuggestion[] = [];

  for (const step of steps) {
    const stepSuggestions = await analyzeStepContent(
      step,
      generator,
      preferences
    );
    suggestions.push(stepSuggestions);
  }

  return suggestions;
}

async function analyzeStepContent(
  step: Step,
  generator: ContentGenerator,
  preferences?: OptimizationPreferences
): Promise<ContentSuggestion> {
  const stepSuggestions: StepContentSuggestion[] = [];
  let totalScore = 0;
  let maxScore = 0;

  // Analyze title
  const titleAnalysis = analyzeTitle(step.title);
  totalScore += titleAnalysis.score;
  maxScore += 1;

  if (titleAnalysis.needsImprovement) {
    stepSuggestions.push({
      field: 'title',
      current: step.title,
      suggested: await generateImprovedTitle(step, generator, preferences),
      reason: titleAnalysis.reason,
      impact: titleAnalysis.impact,
      confidence: 0.8,
    });
  }

  // Analyze description
  const descriptionAnalysis = analyzeDescription(step.description);
  totalScore += descriptionAnalysis.score;
  maxScore += 1;

  if (descriptionAnalysis.needsImprovement) {
    stepSuggestions.push({
      field: 'description',
      current: step.description,
      suggested: await generateImprovedDescription(
        step,
        generator,
        preferences
      ),
      reason: descriptionAnalysis.reason,
      impact: descriptionAnalysis.impact,
      confidence: 0.85,
    });
  }

  const overallScore = maxScore > 0 ? totalScore / maxScore : 1;

  return {
    stepId: step.id,
    suggestions: stepSuggestions,
    overallScore,
    improvementAreas: identifyImprovementAreas(step, stepSuggestions),
  };
}

function analyzeTitle(title: string): {
  score: number;
  needsImprovement: boolean;
  reason: string;
  impact: 'low' | 'medium' | 'high';
} {
  let score = 1;
  let needsImprovement = false;
  let reason = '';
  let impact: 'low' | 'medium' | 'high' = 'low';

  if (title.length > 60) {
    score -= 0.3;
    needsImprovement = true;
    reason = 'Title is too long and may be truncated';
    impact = 'medium';
  }

  if (title.length < 10) {
    score -= 0.4;
    needsImprovement = true;
    reason = 'Title is too short and lacks context';
    impact = 'high';
  }

  if (!/^[A-Z]/.test(title)) {
    score -= 0.1;
    needsImprovement = true;
    reason = 'Title should start with a capital letter';
    impact = 'low';
  }

  return { score: Math.max(0, score), needsImprovement, reason, impact };
}

function analyzeDescription(description: string): {
  score: number;
  needsImprovement: boolean;
  reason: string;
  impact: 'low' | 'medium' | 'high';
} {
  let score = 1;
  let needsImprovement = false;
  let reason = '';
  let impact: 'low' | 'medium' | 'high' = 'low';

  if (description.length < 20) {
    score -= 0.5;
    needsImprovement = true;
    reason = 'Description is too brief and lacks helpful detail';
    impact = 'high';
  }

  if (description.length > 300) {
    score -= 0.2;
    needsImprovement = true;
    reason = 'Description is too long and may overwhelm users';
    impact = 'medium';
  }

  const actionWords = ['click', 'select', 'enter', 'choose', 'navigate'];
  if (!actionWords.some((word) => description.toLowerCase().includes(word))) {
    score -= 0.3;
    needsImprovement = true;
    reason = 'Description lacks clear action words to guide the user';
    impact = 'high';
  }

  return { score: Math.max(0, score), needsImprovement, reason, impact };
}

async function generateImprovedTitle(
  step: Step,
  generator: ContentGenerator,
  preferences?: OptimizationPreferences
): Promise<string> {
  const request: ContentRequest = {
    type: 'title',
    target: 'existing_step',
    context: {
      currentStep: step,
      userIntent: 'improve existing tutorial step',
    },
    preferences: {
      tone:
        preferences?.priority === 'engagement' ? 'friendly' : 'professional',
      complexity: 'simple',
      length: 'brief',
    },
    constraints: {
      maxLength: 50,
    },
  };

  const result = await generator.generateContent(request);
  return result.content;
}

async function generateImprovedDescription(
  step: Step,
  generator: ContentGenerator,
  preferences?: OptimizationPreferences
): Promise<string> {
  const request: ContentRequest = {
    type: 'description',
    target: 'existing_step',
    context: {
      currentStep: step,
      userIntent: 'improve existing tutorial step',
    },
    preferences: {
      tone:
        preferences?.priority === 'engagement' ? 'friendly' : 'professional',
      complexity:
        preferences?.targetAudience === 'beginner' ? 'simple' : 'intermediate',
      length: 'moderate',
    },
    constraints: {
      minLength: 50,
      maxLength: 200,
      accessibility: preferences?.priority === 'accessibility',
    },
  };

  const result = await generator.generateContent(request);
  return result.content;
}

function identifyImprovementAreas(
  step: Step,
  suggestions: readonly StepContentSuggestion[]
): readonly ImprovementArea[] {
  const areas: ImprovementArea[] = [];

  const highImpactSuggestions = suggestions.filter((s) => s.impact === 'high');
  if (highImpactSuggestions.length > 0) {
    areas.push({
      area: 'clarity',
      priority: 'high',
      description: 'Step content needs clearer instructions and action words',
      affectedSteps: [step.id],
    });
  }

  const engagementSuggestions = suggestions.filter((s) =>
    s.reason.includes('engagement')
  );
  if (engagementSuggestions.length > 0) {
    areas.push({
      area: 'engagement',
      priority: 'medium',
      description: 'Step content could be more engaging and user-friendly',
      affectedSteps: [step.id],
    });
  }

  return areas;
}

// Export singleton instance
export const contentGenerator = new ContentGenerator();
