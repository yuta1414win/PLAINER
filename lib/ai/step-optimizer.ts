import { Step, Project, UUID, PromptTemplate } from '../types';
import { getGeminiModelForTask } from '../gemini';
import { generateOptimizationPromptsCached } from './prompt-engineering';
import { analyzeStepFlow } from './flow-analyzer';
import { generateContentSuggestions } from './content-generator';

// ============================================================================
// Optimization Types
// ============================================================================

export interface OptimizationRequest {
  readonly type: OptimizationType;
  readonly steps: readonly Step[];
  readonly project?: Project;
  readonly targetMetrics?: PerformanceMetrics;
  readonly preferences?: OptimizationPreferences;
  readonly context?: OptimizationContext;
}

export type OptimizationType =
  | 'flow_optimization'
  | 'content_enhancement'
  | 'user_journey'
  | 'accessibility'
  | 'performance'
  | 'ab_test_suggestions'
  | 'comprehensive';

export interface PerformanceMetrics {
  readonly conversionRate?: number;
  readonly completionRate?: number;
  readonly averageTimePerStep?: number;
  readonly dropOffPoints?: readonly UUID[];
  readonly userFeedback?: readonly UserFeedback[];
}

export interface UserFeedback {
  readonly stepId: UUID;
  readonly rating: number; // 1-5
  readonly comments?: string;
  readonly timestamp: Date;
}

export interface OptimizationPreferences {
  readonly priority: 'speed' | 'quality' | 'engagement' | 'accessibility';
  readonly targetAudience?: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  readonly deviceType?: 'desktop' | 'mobile' | 'both';
  readonly language?: string;
  readonly brandTone?: 'formal' | 'casual' | 'friendly' | 'professional';
}

export interface OptimizationContext {
  readonly domain?: string;
  readonly userBehaviorData?: UserBehaviorData;
  readonly seasonality?: 'peak' | 'low' | 'normal';
  readonly competitorAnalysis?: CompetitorInsights;
}

export interface UserBehaviorData {
  readonly heatmaps?: readonly HeatmapData[];
  readonly clickPatterns?: readonly ClickPattern[];
  readonly scrollDepth?: readonly ScrollData[];
  readonly timeOnStep?: readonly TimeData[];
}

export interface HeatmapData {
  readonly stepId: UUID;
  readonly hotspots: readonly { x: number; y: number; intensity: number }[];
}

export interface ClickPattern {
  readonly stepId: UUID;
  readonly elementId?: string;
  readonly coordinates: { x: number; y: number };
  readonly frequency: number;
}

export interface ScrollData {
  readonly stepId: UUID;
  readonly averageDepth: number; // 0-1
  readonly exitPoints: readonly number[];
}

export interface TimeData {
  readonly stepId: UUID;
  readonly averageTime: number; // seconds
  readonly medianTime: number;
  readonly distribution: readonly number[];
}

export interface CompetitorInsights {
  readonly bestPractices: readonly string[];
  readonly commonPatterns: readonly string[];
  readonly innovativeFeatures: readonly string[];
}

// ============================================================================
// Optimization Results
// ============================================================================

export interface OptimizationResult {
  readonly type: OptimizationType;
  readonly confidence: number; // 0-1
  readonly suggestions: readonly OptimizationSuggestion[];
  readonly reorderedSteps?: readonly Step[];
  readonly predictedImprovement: PredictedImprovement;
  readonly implementationDifficulty: 'low' | 'medium' | 'high';
  readonly estimatedEffort: string;
  readonly metadata: OptimizationMetadata;
}

export interface OptimizationSuggestion {
  readonly id: UUID;
  readonly type: SuggestionType;
  readonly title: string;
  readonly description: string;
  readonly targetStepId?: UUID;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly impact: 'low' | 'medium' | 'high';
  readonly effort: 'low' | 'medium' | 'high';
  readonly category: SuggestionCategory;
  readonly beforeAfter?: BeforeAfterComparison;
  readonly implementation: ImplementationGuide;
  readonly abTestRecommendation?: ABTestRecommendation;
}

export type SuggestionType =
  | 'reorder'
  | 'content_change'
  | 'visual_enhancement'
  | 'interaction_improvement'
  | 'accessibility_fix'
  | 'performance_boost'
  | 'engagement_increase';

export type SuggestionCategory =
  | 'structure'
  | 'content'
  | 'design'
  | 'interaction'
  | 'accessibility'
  | 'performance'
  | 'analytics';

export interface BeforeAfterComparison {
  readonly before: string | Step;
  readonly after: string | Step;
  readonly visualDiff?: string;
}

export interface ImplementationGuide {
  readonly steps: readonly string[];
  readonly codeChanges?: readonly string[];
  readonly designConsiderations?: readonly string[];
  readonly testingStrategy?: string;
}

export interface ABTestRecommendation {
  readonly variants: readonly TestVariant[];
  readonly successMetrics: readonly string[];
  readonly duration: string;
  readonly sampleSize: number;
  readonly significance: number;
}

export interface TestVariant {
  readonly name: string;
  readonly description: string;
  readonly changes: readonly string[];
  readonly expectedOutcome: string;
}

export interface PredictedImprovement {
  readonly conversionRate?: { current: number; predicted: number };
  readonly completionRate?: { current: number; predicted: number };
  readonly userSatisfaction?: { current: number; predicted: number };
  readonly timeToComplete?: { current: number; predicted: number };
  readonly confidence: number;
  readonly methodology: string;
}

export interface OptimizationMetadata {
  readonly timestamp: Date;
  readonly modelVersion: string;
  readonly processingTime: number;
  readonly tokensUsed: number;
  readonly cacheHit: boolean;
  readonly analysisDepth: 'shallow' | 'medium' | 'deep';
}

// ============================================================================
// Caching System
// ============================================================================

interface CacheEntry {
  readonly key: string;
  readonly result: OptimizationResult;
  readonly timestamp: Date;
  readonly ttl: number; // Time to live in milliseconds
}

class OptimizationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 1000 * 60 * 30; // 30 minutes

  generateKey(request: OptimizationRequest): string {
    const stepsHash = this.hashSteps(request.steps);
    const contextHash = JSON.stringify({
      type: request.type,
      preferences: request.preferences,
      targetMetrics: request.targetMetrics
    });
    return `${request.type}-${stepsHash}-${this.hashString(contextHash)}`;
  }

  private hashSteps(steps: readonly Step[]): string {
    const stepData = steps.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      order: s.order
    }));
    return this.hashString(JSON.stringify(stepData));
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  get(key: string): OptimizationResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      ...entry.result,
      metadata: {
        ...entry.result.metadata,
        cacheHit: true
      }
    };
  }

  set(key: string, result: OptimizationResult, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      key,
      result: {
        ...result,
        metadata: {
          ...result.metadata,
          cacheHit: false
        }
      },
      timestamp: new Date(),
      ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map(entry => ({
        key: entry.key,
        timestamp: entry.timestamp,
        age: Date.now() - entry.timestamp.getTime()
      }))
    };
  }
}

// ============================================================================
// Main Optimizer Class
// ============================================================================

export class StepOptimizer {
  private cache = new OptimizationCache();

  async optimize(request: OptimizationRequest): Promise<OptimizationResult> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.cache.generateKey(request);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      let result: OptimizationResult;

      switch (request.type) {
        case 'flow_optimization':
          result = await this.optimizeFlow(request);
          break;
        case 'content_enhancement':
          result = await this.enhanceContent(request);
          break;
        case 'user_journey':
          result = await this.optimizeUserJourney(request);
          break;
        case 'accessibility':
          result = await this.optimizeAccessibility(request);
          break;
        case 'performance':
          result = await this.optimizePerformance(request);
          break;
        case 'ab_test_suggestions':
          result = await this.generateABTestSuggestions(request);
          break;
        case 'comprehensive':
          result = await this.comprehensiveOptimization(request);
          break;
        default:
          throw new Error(`Unsupported optimization type: ${request.type}`);
      }

      // Add metadata
      result = {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          modelVersion: 'gemini-2.5-pro',
          analysisDepth: this.determineAnalysisDepth(request)
        }
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw new Error(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async optimizeFlow(request: OptimizationRequest): Promise<OptimizationResult> {
    const flowAnalysis = await analyzeStepFlow(request.steps, request.context?.userBehaviorData);
    const prompts = generateOptimizationPromptsCached('flow_optimization', {
      steps: request.steps,
      analysis: flowAnalysis,
      preferences: request.preferences
    }, { chainOfThought: true, fewShotLearning: true, responseFormat: 'structured' });

    const model = getGeminiModelForTask('quality');
    const result = await model.generateContent(prompts.main);
    const response = await result.response;
    const aiSuggestions = this.parseAISuggestions(response.text(), 'flow_optimization');

    return {
      type: 'flow_optimization',
      confidence: flowAnalysis.confidence,
      suggestions: aiSuggestions,
      reorderedSteps: flowAnalysis.optimizedOrder,
      predictedImprovement: this.predictPerformanceImprovement(request, aiSuggestions),
      implementationDifficulty: this.assessImplementationDifficulty(aiSuggestions),
      estimatedEffort: this.estimateEffort(aiSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: this.estimateTokenUsage(prompts.main),
        cacheHit: false,
        analysisDepth: 'medium'
      }
    };
  }

  private async enhanceContent(request: OptimizationRequest): Promise<OptimizationResult> {
    const contentSuggestions = await generateContentSuggestions(
      request.steps,
      request.preferences,
      request.context
    );

    const prompts = generateOptimizationPromptsCached('content_enhancement', {
      steps: request.steps,
      suggestions: contentSuggestions,
      preferences: request.preferences
    }, { fewShotLearning: true, responseFormat: 'structured' });

    const model = getGeminiModelForTask('fast');
    const result = await model.generateContent(prompts.main);
    const response = await result.response;
    const aiSuggestions = this.parseAISuggestions(response.text(), 'content_enhancement');

    return {
      type: 'content_enhancement',
      confidence: 0.85,
      suggestions: aiSuggestions,
      predictedImprovement: this.predictPerformanceImprovement(request, aiSuggestions),
      implementationDifficulty: 'medium',
      estimatedEffort: this.estimateEffort(aiSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: this.estimateTokenUsage(prompts.main),
        cacheHit: false,
        analysisDepth: 'medium'
      }
    };
  }

  private async optimizeUserJourney(request: OptimizationRequest): Promise<OptimizationResult> {
    // Combine flow and content analysis for comprehensive user journey optimization
    const [flowAnalysis, contentSuggestions] = await Promise.all([
      analyzeStepFlow(request.steps, request.context?.userBehaviorData),
      generateContentSuggestions(request.steps, request.preferences, request.context)
    ]);

    const prompts = generateOptimizationPromptsCached('user_journey', {
      steps: request.steps,
      flowAnalysis,
      contentSuggestions,
      preferences: request.preferences,
      userBehavior: request.context?.userBehaviorData
    }, { chainOfThought: true, fewShotLearning: true, responseFormat: 'structured' });

    const model = getGeminiModelForTask('quality');
    const result = await model.generateContent(prompts.main);
    const response = await result.response;
    const aiSuggestions = this.parseAISuggestions(response.text(), 'user_journey');

    return {
      type: 'user_journey',
      confidence: Math.min(flowAnalysis.confidence, 0.9),
      suggestions: aiSuggestions,
      reorderedSteps: flowAnalysis.optimizedOrder,
      predictedImprovement: this.predictPerformanceImprovement(request, aiSuggestions),
      implementationDifficulty: this.assessImplementationDifficulty(aiSuggestions),
      estimatedEffort: this.estimateEffort(aiSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: this.estimateTokenUsage(prompts.main),
        cacheHit: false,
        analysisDepth: 'deep'
      }
    };
  }

  private async optimizeAccessibility(request: OptimizationRequest): Promise<OptimizationResult> {
    const prompts = generateOptimizationPromptsCached('accessibility', {
      steps: request.steps,
      preferences: request.preferences
    }, { responseFormat: 'structured' });

    const model = getGeminiModelForTask('balanced');
    const result = await model.generateContent(prompts.main);
    const response = await result.response;
    const aiSuggestions = this.parseAISuggestions(response.text(), 'accessibility');

    return {
      type: 'accessibility',
      confidence: 0.9,
      suggestions: aiSuggestions,
      predictedImprovement: this.predictPerformanceImprovement(request, aiSuggestions),
      implementationDifficulty: this.assessImplementationDifficulty(aiSuggestions),
      estimatedEffort: this.estimateEffort(aiSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: this.estimateTokenUsage(prompts.main),
        cacheHit: false,
        analysisDepth: 'medium'
      }
    };
  }

  private async optimizePerformance(request: OptimizationRequest): Promise<OptimizationResult> {
    const prompts = generateOptimizationPromptsCached('performance', {
      steps: request.steps,
      targetMetrics: request.targetMetrics,
      preferences: request.preferences
    }, { responseFormat: 'structured' });

    const model = getGeminiModelForTask('balanced');
    const result = await model.generateContent(prompts.main);
    const response = await result.response;
    const aiSuggestions = this.parseAISuggestions(response.text(), 'performance');

    return {
      type: 'performance',
      confidence: 0.8,
      suggestions: aiSuggestions,
      predictedImprovement: this.predictPerformanceImprovement(request, aiSuggestions),
      implementationDifficulty: this.assessImplementationDifficulty(aiSuggestions),
      estimatedEffort: this.estimateEffort(aiSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: this.estimateTokenUsage(prompts.main),
        cacheHit: false,
        analysisDepth: 'medium'
      }
    };
  }

  private async generateABTestSuggestions(request: OptimizationRequest): Promise<OptimizationResult> {
    const prompts = generateOptimizationPromptsCached('ab_test_suggestions', {
      steps: request.steps,
      targetMetrics: request.targetMetrics,
      preferences: request.preferences
    }, { responseFormat: 'structured' });

    const model = getGeminiModelForTask('fast');
    const result = await model.generateContent(prompts.main);
    const response = await result.response;
    const aiSuggestions = this.parseAISuggestions(response.text(), 'ab_test_suggestions');

    return {
      type: 'ab_test_suggestions',
      confidence: 0.75,
      suggestions: aiSuggestions,
      predictedImprovement: this.predictPerformanceImprovement(request, aiSuggestions),
      implementationDifficulty: 'medium',
      estimatedEffort: this.estimateEffort(aiSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: this.estimateTokenUsage(prompts.main),
        cacheHit: false,
        analysisDepth: 'medium'
      }
    };
  }

  private async comprehensiveOptimization(request: OptimizationRequest): Promise<OptimizationResult> {
    // Run multiple optimization types in parallel
    const [flowResult, contentResult, accessibilityResult] = await Promise.all([
      this.optimize({ ...request, type: 'flow_optimization' }),
      this.optimize({ ...request, type: 'content_enhancement' }),
      this.optimize({ ...request, type: 'accessibility' })
    ]);

    // Combine and prioritize suggestions
    const allSuggestions = [
      ...flowResult.suggestions,
      ...contentResult.suggestions,
      ...accessibilityResult.suggestions
    ].sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };

      const scoreA = priorityWeight[a.priority] + impactWeight[a.impact];
      const scoreB = priorityWeight[b.priority] + impactWeight[b.impact];

      return scoreB - scoreA;
    });

    return {
      type: 'comprehensive',
      confidence: (flowResult.confidence + contentResult.confidence + accessibilityResult.confidence) / 3,
      suggestions: allSuggestions,
      reorderedSteps: flowResult.reorderedSteps,
      predictedImprovement: this.predictPerformanceImprovement(request, allSuggestions),
      implementationDifficulty: this.assessImplementationDifficulty(allSuggestions),
      estimatedEffort: this.estimateEffort(allSuggestions),
      metadata: {
        timestamp: new Date(),
        modelVersion: 'gemini-2.5-pro',
        processingTime: 0,
        tokensUsed: 0,
        cacheHit: false,
        analysisDepth: 'deep'
      }
    };
  }

  /**
   * Optimize multiple requests in parallel (batch processing)
   */
  async optimizeBatch(requests: OptimizationRequest[]): Promise<OptimizationResult[]> {
    return await Promise.all(requests.map((r) => this.optimize(r)));
  }

  /**
   * Incremental optimization: compare with a previous request and focus on changed steps.
   */
  async optimizeIncremental(prev: OptimizationRequest, next: OptimizationRequest): Promise<OptimizationResult> {
    if (prev.type !== next.type) return this.optimize(next);
    const changed = diffStepIds(prev.steps, next.steps);
    const reduced: OptimizationRequest = {
      ...next,
      steps: next.steps.filter((s) => changed.includes(s.id)),
    };
    return this.optimize(reduced.steps.length ? reduced : next);
  }

  private parseAISuggestions(response: string, type: OptimizationType): OptimizationSuggestion[] {
    // Parse AI response and convert to structured suggestions
    // This is a simplified implementation - in production, you'd want more robust parsing
    try {
      const lines = response.split('\n').filter(line => line.trim());
      const suggestions: OptimizationSuggestion[] = [];

      for (const line of lines) {
        if (line.startsWith('SUGGESTION:')) {
          const suggestion = this.parseSuggestionLine(line, type);
          if (suggestion) suggestions.push(suggestion);
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return [];
    }
  }

  private parseSuggestionLine(line: string, type: OptimizationType): OptimizationSuggestion | null {
    // Simplified parsing - would need more sophisticated logic in production
    const parts = line.replace('SUGGESTION:', '').trim().split('|');
    if (parts.length < 3) return null;

    const id = this.generateUUID();
    return {
      id,
      type: this.mapToSuggestionType(type),
      title: parts[0]?.trim() || 'Untitled Suggestion',
      description: parts[1]?.trim() || 'No description provided',
      priority: this.extractPriority(parts[2]) || 'medium',
      impact: this.extractImpact(parts[2]) || 'medium',
      effort: this.extractEffort(parts[2]) || 'medium',
      category: this.mapToSuggestionCategory(type),
      implementation: {
        steps: ['Implementation details would be extracted from AI response'],
        testingStrategy: 'A/B test recommended'
      },
      abTestRecommendation: {
        variants: [
          {
            name: 'Control',
            description: 'Current implementation',
            changes: [],
            expectedOutcome: 'Baseline metrics'
          },
          {
            name: 'Optimized',
            description: 'AI-suggested improvements',
            changes: ['Apply suggested changes'],
            expectedOutcome: 'Improved user engagement'
          }
        ],
        successMetrics: ['conversion_rate', 'completion_rate'],
        duration: '2 weeks',
        sampleSize: 1000,
        significance: 0.95
      }
    };
  }

  private mapToSuggestionType(optimizationType: OptimizationType): SuggestionType {
    const mapping: Record<OptimizationType, SuggestionType> = {
      flow_optimization: 'reorder',
      content_enhancement: 'content_change',
      user_journey: 'interaction_improvement',
      accessibility: 'accessibility_fix',
      performance: 'performance_boost',
      ab_test_suggestions: 'engagement_increase',
      comprehensive: 'interaction_improvement'
    };
    return mapping[optimizationType];
  }

  private mapToSuggestionCategory(optimizationType: OptimizationType): SuggestionCategory {
    const mapping: Record<OptimizationType, SuggestionCategory> = {
      flow_optimization: 'structure',
      content_enhancement: 'content',
      user_journey: 'interaction',
      accessibility: 'accessibility',
      performance: 'performance',
      ab_test_suggestions: 'analytics',
      comprehensive: 'structure'
    };
    return mapping[optimizationType];
  }

  private extractPriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = text.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('low')) return 'low';
    return 'medium';
  }

  private extractImpact(text: string): 'low' | 'medium' | 'high' {
    const lower = text.toLowerCase();
    if (lower.includes('high impact')) return 'high';
    if (lower.includes('low impact')) return 'low';
    return 'medium';
  }

  private extractEffort(text: string): 'low' | 'medium' | 'high' {
    const lower = text.toLowerCase();
    if (lower.includes('high effort') || lower.includes('complex')) return 'high';
    if (lower.includes('low effort') || lower.includes('simple')) return 'low';
    return 'medium';
  }

  private predictPerformanceImprovement(
    request: OptimizationRequest,
    suggestions: OptimizationSuggestion[]
  ): PredictedImprovement {
    // Simplified prediction model - in production, this would use ML models
    const baseImprovement = suggestions.length * 0.05; // 5% per suggestion
    const priorityMultiplier = suggestions.reduce((acc, s) => {
      const weights = { critical: 0.15, high: 0.1, medium: 0.05, low: 0.02 };
      return acc + weights[s.priority];
    }, 0);

    const totalImprovement = Math.min(baseImprovement + priorityMultiplier, 0.5); // Cap at 50%

    return {
      conversionRate: request.targetMetrics?.conversionRate ? {
        current: request.targetMetrics.conversionRate,
        predicted: request.targetMetrics.conversionRate * (1 + totalImprovement)
      } : undefined,
      completionRate: request.targetMetrics?.completionRate ? {
        current: request.targetMetrics.completionRate,
        predicted: request.targetMetrics.completionRate * (1 + totalImprovement)
      } : undefined,
      userSatisfaction: {
        current: 3.5,
        predicted: Math.min(3.5 * (1 + totalImprovement), 5.0)
      },
      confidence: 0.75,
      methodology: 'Rule-based prediction with priority weighting'
    };
  }

  private assessImplementationDifficulty(suggestions: OptimizationSuggestion[]): 'low' | 'medium' | 'high' {
    const effortCounts = suggestions.reduce((acc, s) => {
      acc[s.effort] = (acc[s.effort] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (effortCounts.high > 0) return 'high';
    if (effortCounts.medium > suggestions.length / 2) return 'medium';
    return 'low';
  }

  private estimateEffort(suggestions: OptimizationSuggestion[]): string {
    const totalSuggestions = suggestions.length;
    const highEffortCount = suggestions.filter(s => s.effort === 'high').length;
    const mediumEffortCount = suggestions.filter(s => s.effort === 'medium').length;

    const hours = (highEffortCount * 8) + (mediumEffortCount * 4) + (totalSuggestions - highEffortCount - mediumEffortCount) * 2;

    if (hours <= 8) return `${hours} hours`;
    if (hours <= 40) return `${Math.ceil(hours / 8)} days`;
    return `${Math.ceil(hours / 40)} weeks`;
  }

  private determineAnalysisDepth(request: OptimizationRequest): 'shallow' | 'medium' | 'deep' {
    if (request.type === 'comprehensive') return 'deep';
    if (request.context?.userBehaviorData || request.targetMetrics) return 'medium';
    return 'shallow';
  }

  private estimateTokenUsage(prompt: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4);
  }

  private generateUUID(): UUID {
    return crypto.randomUUID() as UUID;
  }

  // Public utility methods
  getCacheStats() {
    return this.cache.getStats();
  }

  clearCache() {
    this.cache.clear();
  }

  async *streamOptimization(request: OptimizationRequest): AsyncGenerator<Partial<OptimizationResult>> {
    // Streaming implementation for real-time updates
    const optimizationPromise = this.optimize(request);

    // Yield intermediate results while processing
    yield { type: request.type, confidence: 0 };

    const result = await optimizationPromise;
    yield result;
  }
}

function diffStepIds(a: readonly Step[], b: readonly Step[]): string[] {
  const mapA = new Map(a.map((s) => [s.id, JSON.stringify({ t: s.title, d: s.description, o: s.order })]));
  const changed: string[] = [];
  for (const x of b) {
    const prev = mapA.get(x.id);
    const cur = JSON.stringify({ t: x.title, d: x.description, o: x.order });
    if (!prev || prev !== cur) changed.push(x.id);
  }
  return changed;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const stepOptimizer = new StepOptimizer();
