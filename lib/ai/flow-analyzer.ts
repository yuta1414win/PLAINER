import { Step, UUID } from '../types';
import { getGeminiModel } from '../gemini';
import { UserBehaviorData } from './step-optimizer';

// ============================================================================
// Flow Analysis Types
// ============================================================================

export interface FlowAnalysisRequest {
  readonly steps: readonly Step[];
  readonly currentOrder?: readonly UUID[];
  readonly userBehavior?: UserBehaviorData;
  readonly goals?: readonly FlowGoal[];
  readonly constraints?: FlowConstraints;
  readonly context?: FlowAnalysisContext;
}

export interface FlowGoal {
  readonly type:
    | 'completion_rate'
    | 'time_to_complete'
    | 'user_satisfaction'
    | 'error_reduction';
  readonly target: number;
  readonly weight: number; // 0-1, for multi-objective optimization
}

export interface FlowConstraints {
  readonly mustRemainFirst?: readonly UUID[];
  readonly mustRemainLast?: readonly UUID[];
  readonly cannotFollow?: readonly StepOrderConstraint[];
  readonly mustBeAdjacent?: readonly StepPairConstraint[];
  readonly maxReorderDistance?: number; // Max positions a step can move
}

export interface StepOrderConstraint {
  readonly stepId: UUID;
  readonly cannotFollowSteps: readonly UUID[];
  readonly reason: string;
}

export interface StepPairConstraint {
  readonly firstStepId: UUID;
  readonly secondStepId: UUID;
  readonly reason: string;
}

export interface FlowAnalysisContext {
  readonly domain?: string;
  readonly userType?: 'novice' | 'intermediate' | 'expert';
  readonly deviceContext?: 'desktop' | 'mobile' | 'both';
  readonly timeConstraints?: 'quick' | 'thorough' | 'flexible';
}

// ============================================================================
// Analysis Results
// ============================================================================

export interface FlowAnalysisResult {
  readonly originalOrder: readonly UUID[];
  readonly optimizedOrder?: readonly Step[];
  readonly confidence: number; // 0-1
  readonly improvements: readonly FlowImprovement[];
  readonly issues: readonly FlowIssue[];
  readonly metrics: FlowMetrics;
  readonly recommendations: readonly FlowRecommendation[];
  readonly alternativeOrders?: readonly AlternativeFlow[];
  readonly metadata: FlowAnalysisMetadata;
}

export interface FlowImprovement {
  readonly type:
    | 'reorder'
    | 'merge'
    | 'split'
    | 'add_transition'
    | 'remove_redundancy';
  readonly description: string;
  readonly impact: 'low' | 'medium' | 'high';
  readonly confidence: number;
  readonly affectedSteps: readonly UUID[];
  readonly expectedBenefit: string;
  readonly implementationNotes?: string;
}

export interface FlowIssue {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly type:
    | 'logical_gap'
    | 'cognitive_overload'
    | 'redundancy'
    | 'poor_transition'
    | 'missing_context';
  readonly description: string;
  readonly affectedSteps: readonly UUID[];
  readonly suggestedFix: string;
  readonly userImpact: string;
}

export interface FlowMetrics {
  readonly cognitiveLoad: CognitiveLoadMetrics;
  readonly logicalFlow: LogicalFlowMetrics;
  readonly userExperience: UserExperienceMetrics;
  readonly efficiency: EfficiencyMetrics;
}

export interface CognitiveLoadMetrics {
  readonly overallComplexity: number; // 0-1
  readonly stepComplexityVariation: number; // 0-1, lower is better
  readonly contextSwitches: number;
  readonly informationOverload: number; // 0-1
  readonly mentalModelConsistency: number; // 0-1
}

export interface LogicalFlowMetrics {
  readonly sequenceCoherence: number; // 0-1
  readonly dependencyViolations: number;
  readonly logicalGaps: number;
  readonly redundancyScore: number; // 0-1, lower is better
  readonly completenessScore: number; // 0-1
}

export interface UserExperienceMetrics {
  readonly predictedSatisfaction: number; // 0-1
  readonly frustrationPoints: number;
  readonly engagementLevel: number; // 0-1
  readonly motivationMaintenance: number; // 0-1
  readonly successLikelihood: number; // 0-1
}

export interface EfficiencyMetrics {
  readonly timeOptimization: number; // 0-1
  readonly effortMinimization: number; // 0-1
  readonly errorPrevention: number; // 0-1
  readonly resourceUtilization: number; // 0-1
}

export interface FlowRecommendation {
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'structure' | 'content' | 'transitions' | 'context';
  readonly title: string;
  readonly description: string;
  readonly implementation: string;
  readonly expectedImpact: string;
  readonly effort: 'low' | 'medium' | 'high';
  readonly abTestRecommended: boolean;
}

export interface AlternativeFlow {
  readonly name: string;
  readonly steps: readonly Step[];
  readonly optimizedFor: string;
  readonly tradeoffs: string;
  readonly score: number; // 0-1
  readonly useCase: string;
}

export interface FlowAnalysisMetadata {
  readonly timestamp: Date;
  readonly analysisDepth: 'shallow' | 'medium' | 'deep';
  readonly processingTime: number;
  readonly algorithmsUsed: readonly string[];
  readonly dataQuality: number; // 0-1
  readonly assumptions: readonly string[];
}

// ============================================================================
// Step Relationship Analysis
// ============================================================================

export interface StepRelationship {
  readonly fromStepId: UUID;
  readonly toStepId: UUID;
  readonly relationshipType: RelationshipType;
  readonly strength: number; // 0-1
  readonly reason: string;
}

export type RelationshipType =
  | 'prerequisite' // Step A must complete before Step B
  | 'complementary' // Steps work well together
  | 'alternative' // Steps serve similar purposes
  | 'conflicting' // Steps contradict or confuse
  | 'sequential' // Natural order progression
  | 'parallel' // Can be done simultaneously
  | 'optional_dependency' // Helpful but not required
  | 'cognitive_bridge'; // Helps user understand concept

// ============================================================================
// User Journey Patterns
// ============================================================================

export interface UserJourneyPattern {
  readonly patternType: JourneyPatternType;
  readonly description: string;
  readonly applicableSteps: readonly UUID[];
  readonly confidence: number;
  readonly userBehaviorEvidence?: string;
  readonly recommendedAction: string;
}

export type JourneyPatternType =
  | 'learning_curve' // Progressive skill building
  | 'exploration_phase' // User wants to explore options
  | 'task_completion' // Goal-oriented completion
  | 'verification_loop' // User double-checks actions
  | 'context_building' // Understanding environment first
  | 'momentum_building' // Quick wins to maintain engagement
  | 'complexity_ramp' // Gradual increase in difficulty
  | 'safety_check'; // User wants confirmation before proceeding;

// ============================================================================
// Main Flow Analyzer
// ============================================================================

export class FlowAnalyzer {
  private model = getGeminiModel();
  private cache = new Map<string, FlowAnalysisResult>();

  async analyzeFlow(request: FlowAnalysisRequest): Promise<FlowAnalysisResult> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Step 1: Analyze step relationships
      const relationships = await this.analyzeStepRelationships(request.steps);

      // Step 2: Identify user journey patterns
      const journeyPatterns = await this.identifyJourneyPatterns(request);

      // Step 3: Analyze current flow issues
      const flowIssues = this.identifyFlowIssues(request.steps, relationships);

      // Step 4: Calculate flow metrics
      const metrics = this.calculateFlowMetrics(
        request.steps,
        relationships,
        request.userBehavior
      );

      // Step 5: Generate optimized order
      const optimizedOrder = await this.generateOptimizedOrder(
        request.steps,
        relationships,
        journeyPatterns,
        request.goals,
        request.constraints
      );

      // Step 6: Identify improvements
      const improvements = this.identifyImprovements(
        request.steps,
        optimizedOrder,
        relationships,
        flowIssues
      );

      // Step 7: Generate recommendations
      const recommendations = await this.generateRecommendations(
        request.steps,
        flowIssues,
        improvements,
        journeyPatterns
      );

      // Step 8: Create alternative flows
      const alternativeOrders = await this.generateAlternativeFlows(
        request.steps,
        relationships,
        request.goals
      );

      const result: FlowAnalysisResult = {
        originalOrder: request.steps.map((s) => s.id),
        optimizedOrder,
        confidence: this.calculateConfidence(
          metrics,
          improvements,
          request.userBehavior
        ),
        improvements,
        issues: flowIssues,
        metrics,
        recommendations,
        alternativeOrders,
        metadata: {
          timestamp: new Date(),
          analysisDepth: this.determineAnalysisDepth(request),
          processingTime: Date.now() - startTime,
          algorithmsUsed: [
            'dependency_analysis',
            'cognitive_load_calculation',
            'user_journey_pattern_matching',
            'optimization_algorithm',
          ],
          dataQuality: request.userBehavior ? 0.9 : 0.7,
          assumptions: this.documentAssumptions(request),
        },
      };

      // Cache result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(
        `Flow analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async analyzeStepRelationships(
    steps: readonly Step[]
  ): Promise<readonly StepRelationship[]> {
    const relationships: StepRelationship[] = [];

    // Analyze each pair of steps
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const stepA = steps[i];
        const stepB = steps[j];

        const relationship = await this.analyzePairRelationship(stepA, stepB);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  private async analyzePairRelationship(
    stepA: Step,
    stepB: Step
  ): Promise<StepRelationship | null> {
    // Use AI to analyze the relationship between two steps
    const prompt = `Analyze the relationship between these two tutorial steps:

Step A: "${stepA.title}"
Description: ${stepA.description}

Step B: "${stepB.title}"
Description: ${stepB.description}

Determine:
1. Relationship type: prerequisite, complementary, alternative, conflicting, sequential, parallel, optional_dependency, or cognitive_bridge
2. Strength: 0.0 (no relationship) to 1.0 (strong relationship)
3. Reason: Brief explanation

Format: TYPE|STRENGTH|REASON
Example: prerequisite|0.8|Step A must be completed to understand concepts in Step B

Return only the formatted result or "none" if no significant relationship exists.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      if (text.toLowerCase() === 'none') {
        return null;
      }

      const parts = text.split('|');
      if (parts.length !== 3) {
        return null;
      }

      const relationshipType = parts[0].trim() as RelationshipType;
      const strength = parseFloat(parts[1].trim());
      const reason = parts[2].trim();

      if (isNaN(strength) || strength < 0.3) {
        return null; // Ignore weak relationships
      }

      return {
        fromStepId: stepA.id,
        toStepId: stepB.id,
        relationshipType,
        strength,
        reason,
      };
    } catch (error) {
      console.warn('Failed to analyze step pair relationship:', error);
      return null;
    }
  }

  private async identifyJourneyPatterns(
    request: FlowAnalysisRequest
  ): Promise<readonly UserJourneyPattern[]> {
    const patterns: UserJourneyPattern[] = [];

    // Analyze user behavior data if available
    if (request.userBehavior) {
      const behaviorPatterns = this.analyzeBehaviorPatterns(
        request.userBehavior,
        request.steps
      );
      patterns.push(...behaviorPatterns);
    }

    // Analyze content patterns
    const contentPatterns = await this.analyzeContentPatterns(
      request.steps,
      request.context
    );
    patterns.push(...contentPatterns);

    return patterns;
  }

  private analyzeBehaviorPatterns(
    userBehavior: UserBehaviorData,
    steps: readonly Step[]
  ): UserJourneyPattern[] {
    const patterns: UserJourneyPattern[] = [];

    // Analyze time data for learning curves
    if (userBehavior.timeOnStep) {
      const timePattern = this.analyzeTimePatterns(
        userBehavior.timeOnStep,
        steps
      );
      if (timePattern) patterns.push(timePattern);
    }

    // Analyze click patterns for exploration behavior
    if (userBehavior.clickPatterns) {
      const explorationPattern = this.analyzeExplorationPatterns(
        userBehavior.clickPatterns,
        steps
      );
      if (explorationPattern) patterns.push(explorationPattern);
    }

    // Analyze scroll depth for engagement
    if (userBehavior.scrollDepth) {
      const engagementPattern = this.analyzeEngagementPatterns(
        userBehavior.scrollDepth,
        steps
      );
      if (engagementPattern) patterns.push(engagementPattern);
    }

    return patterns;
  }

  private analyzeTimePatterns(
    timeData: readonly any[],
    steps: readonly Step[]
  ): UserJourneyPattern | null {
    // Simple analysis of time patterns
    const averageTimes = timeData.map((t) => t.averageTime);
    const isIncreasing = this.isGenerallyIncreasing(averageTimes);

    if (isIncreasing) {
      return {
        patternType: 'learning_curve',
        description:
          'Users show increasing time per step, indicating learning progression',
        applicableSteps: steps.map((s) => s.id),
        confidence: 0.8,
        userBehaviorEvidence:
          'Time per step increases indicating complexity ramp',
        recommendedAction: 'Maintain progressive difficulty increase',
      };
    }

    return null;
  }

  private analyzeExplorationPatterns(
    clickPatterns: readonly any[],
    steps: readonly Step[]
  ): UserJourneyPattern | null {
    const highClickSteps = clickPatterns
      .filter((cp) => cp.frequency > 5)
      .map((cp) => cp.stepId);

    if (highClickSteps.length > steps.length * 0.3) {
      return {
        patternType: 'exploration_phase',
        description:
          'Users show high interaction suggesting exploration behavior',
        applicableSteps: highClickSteps,
        confidence: 0.7,
        userBehaviorEvidence: 'High click frequency on multiple steps',
        recommendedAction: 'Provide clear navigation and preview options',
      };
    }

    return null;
  }

  private analyzeEngagementPatterns(
    scrollData: readonly any[],
    steps: readonly Step[]
  ): UserJourneyPattern | null {
    const lowEngagementSteps = scrollData
      .filter((sd) => sd.averageDepth < 0.5)
      .map((sd) => sd.stepId);

    if (lowEngagementSteps.length > 0) {
      return {
        patternType: 'momentum_building',
        description: 'Some steps show low engagement, need momentum building',
        applicableSteps: lowEngagementSteps,
        confidence: 0.75,
        userBehaviorEvidence: 'Low scroll depth indicates disengagement',
        recommendedAction: 'Add interactive elements and quick wins',
      };
    }

    return null;
  }

  private async analyzeContentPatterns(
    steps: readonly Step[],
    context?: FlowAnalysisContext
  ): Promise<UserJourneyPattern[]> {
    const patterns: UserJourneyPattern[] = [];

    // Analyze complexity progression
    const complexityPattern = this.analyzeComplexityProgression(steps);
    if (complexityPattern) patterns.push(complexityPattern);

    // Analyze context requirements
    const contextPattern = this.analyzeContextRequirements(steps);
    if (contextPattern) patterns.push(contextPattern);

    return patterns;
  }

  private analyzeComplexityProgression(
    steps: readonly Step[]
  ): UserJourneyPattern | null {
    // Simplified complexity analysis based on description length and action count
    const complexityScores = steps.map((step) => {
      const descriptionLength = step.description.length;
      const actionWords = [
        'click',
        'select',
        'enter',
        'choose',
        'navigate',
        'configure',
      ];
      const actionCount = actionWords.filter((word) =>
        step.description.toLowerCase().includes(word)
      ).length;

      return descriptionLength / 200 + actionCount * 0.2;
    });

    const hasGoodProgression =
      this.hasGoodComplexityProgression(complexityScores);

    if (!hasGoodProgression) {
      return {
        patternType: 'complexity_ramp',
        description:
          'Steps need better complexity progression for optimal learning',
        applicableSteps: steps.map((s) => s.id),
        confidence: 0.6,
        recommendedAction:
          'Reorder steps to create smoother complexity progression',
      };
    }

    return null;
  }

  private analyzeContextRequirements(
    steps: readonly Step[]
  ): UserJourneyPattern | null {
    // Identify steps that might need context building
    const contextWords = [
      'setup',
      'configure',
      'install',
      'prepare',
      'initialize',
    ];
    const contextSteps = steps.filter((step) =>
      contextWords.some(
        (word) =>
          step.title.toLowerCase().includes(word) ||
          step.description.toLowerCase().includes(word)
      )
    );

    if (contextSteps.length > 0) {
      return {
        patternType: 'context_building',
        description:
          'Steps require environmental setup and context understanding',
        applicableSteps: contextSteps.map((s) => s.id),
        confidence: 0.8,
        recommendedAction:
          'Ensure context-building steps come early in the flow',
      };
    }

    return null;
  }

  private identifyFlowIssues(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): FlowIssue[] {
    const issues: FlowIssue[] = [];

    // Check for dependency violations
    issues.push(...this.checkDependencyViolations(steps, relationships));

    // Check for cognitive overload
    issues.push(...this.checkCognitiveOverload(steps));

    // Check for logical gaps
    issues.push(...this.checkLogicalGaps(steps, relationships));

    // Check for redundancy
    issues.push(...this.checkRedundancy(steps));

    return issues;
  }

  private checkDependencyViolations(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): FlowIssue[] {
    const issues: FlowIssue[] = [];
    const stepOrder = new Map(steps.map((step, index) => [step.id, index]));

    for (const rel of relationships) {
      if (rel.relationshipType === 'prerequisite') {
        const fromIndex = stepOrder.get(rel.fromStepId);
        const toIndex = stepOrder.get(rel.toStepId);

        if (
          fromIndex !== undefined &&
          toIndex !== undefined &&
          fromIndex > toIndex
        ) {
          issues.push({
            severity: 'high',
            type: 'logical_gap',
            description: `Step "${steps.find((s) => s.id === rel.toStepId)?.title}" appears before its prerequisite`,
            affectedSteps: [rel.fromStepId, rel.toStepId],
            suggestedFix: `Move prerequisite step earlier in the sequence`,
            userImpact:
              'Users may encounter concepts they are not prepared for',
          });
        }
      }
    }

    return issues;
  }

  private checkCognitiveOverload(steps: readonly Step[]): FlowIssue[] {
    const issues: FlowIssue[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const complexity = this.calculateStepComplexity(step);

      if (complexity > 0.8) {
        issues.push({
          severity: 'medium',
          type: 'cognitive_overload',
          description: `Step "${step.title}" appears to be overly complex`,
          affectedSteps: [step.id],
          suggestedFix:
            'Consider breaking this step into smaller, more manageable parts',
          userImpact: 'Users may become overwhelmed and abandon the tutorial',
        });
      }
    }

    return issues;
  }

  private checkLogicalGaps(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): FlowIssue[] {
    const issues: FlowIssue[] = [];

    // Look for steps that seem disconnected
    for (let i = 1; i < steps.length; i++) {
      const currentStep = steps[i];
      const previousStep = steps[i - 1];

      const hasConnection = relationships.some(
        (rel) =>
          (rel.fromStepId === previousStep.id &&
            rel.toStepId === currentStep.id) ||
          (rel.fromStepId === currentStep.id &&
            rel.toStepId === previousStep.id)
      );

      if (!hasConnection) {
        const contextualSimilarity = this.calculateContextualSimilarity(
          previousStep,
          currentStep
        );

        if (contextualSimilarity < 0.3) {
          issues.push({
            severity: 'medium',
            type: 'poor_transition',
            description: `Unclear connection between "${previousStep.title}" and "${currentStep.title}"`,
            affectedSteps: [previousStep.id, currentStep.id],
            suggestedFix:
              'Add transitional content or reorder steps for better flow',
            userImpact: 'Users may feel lost or confused about the progression',
          });
        }
      }
    }

    return issues;
  }

  private checkRedundancy(steps: readonly Step[]): FlowIssue[] {
    const issues: FlowIssue[] = [];

    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const stepA = steps[i];
        const stepB = steps[j];

        const similarity = this.calculateStepSimilarity(stepA, stepB);

        if (similarity > 0.8) {
          issues.push({
            severity: 'low',
            type: 'redundancy',
            description: `Steps "${stepA.title}" and "${stepB.title}" appear redundant`,
            affectedSteps: [stepA.id, stepB.id],
            suggestedFix:
              'Consider merging similar steps or removing duplicate content',
            userImpact:
              'Users may feel the tutorial is unnecessarily repetitive',
          });
        }
      }
    }

    return issues;
  }

  private calculateFlowMetrics(
    steps: readonly Step[],
    relationships: readonly StepRelationship[],
    userBehavior?: UserBehaviorData
  ): FlowMetrics {
    const cognitiveLoad = this.calculateCognitiveLoadMetrics(steps);
    const logicalFlow = this.calculateLogicalFlowMetrics(steps, relationships);
    const userExperience = this.calculateUserExperienceMetrics(
      steps,
      userBehavior
    );
    const efficiency = this.calculateEfficiencyMetrics(steps, relationships);

    return { cognitiveLoad, logicalFlow, userExperience, efficiency };
  }

  private calculateCognitiveLoadMetrics(
    steps: readonly Step[]
  ): CognitiveLoadMetrics {
    const complexities = steps.map((step) =>
      this.calculateStepComplexity(step)
    );
    const avgComplexity =
      complexities.reduce((a, b) => a + b, 0) / complexities.length;

    // Calculate variation in complexity
    const variance =
      complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) /
      complexities.length;
    const variation = Math.sqrt(variance);

    // Count context switches (simplified)
    const contextSwitches = this.countContextSwitches(steps);

    return {
      overallComplexity: avgComplexity,
      stepComplexityVariation: Math.min(variation, 1),
      contextSwitches,
      informationOverload: Math.min(avgComplexity * 1.2, 1),
      mentalModelConsistency: Math.max(0, 1 - variation),
    };
  }

  private calculateLogicalFlowMetrics(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): LogicalFlowMetrics {
    const sequenceCoherence = this.calculateSequenceCoherence(
      steps,
      relationships
    );
    const dependencyViolations = this.countDependencyViolations(
      steps,
      relationships
    );
    const logicalGaps = this.countLogicalGaps(steps, relationships);
    const redundancyScore = this.calculateRedundancyScore(steps);
    const completenessScore = this.calculateCompletenessScore(steps);

    return {
      sequenceCoherence,
      dependencyViolations,
      logicalGaps,
      redundancyScore,
      completenessScore,
    };
  }

  private calculateUserExperienceMetrics(
    steps: readonly Step[],
    userBehavior?: UserBehaviorData
  ): UserExperienceMetrics {
    // Base calculations on content analysis
    let predictedSatisfaction = 0.7;
    let frustrationPoints = 0;
    let engagementLevel = 0.6;
    let motivationMaintenance = 0.7;
    let successLikelihood = 0.8;

    // Enhance with user behavior data if available
    if (userBehavior) {
      if (userBehavior.timeOnStep) {
        const avgTime =
          userBehavior.timeOnStep.reduce((sum, t) => sum + t.averageTime, 0) /
          userBehavior.timeOnStep.length;
        if (avgTime > 120) frustrationPoints += 1; // More than 2 minutes average
      }

      if (userBehavior.scrollDepth) {
        const avgDepth =
          userBehavior.scrollDepth.reduce((sum, s) => sum + s.averageDepth, 0) /
          userBehavior.scrollDepth.length;
        engagementLevel = avgDepth;
      }
    }

    return {
      predictedSatisfaction: Math.max(
        0,
        predictedSatisfaction - frustrationPoints * 0.1
      ),
      frustrationPoints,
      engagementLevel,
      motivationMaintenance,
      successLikelihood: Math.max(
        0.3,
        successLikelihood - frustrationPoints * 0.05
      ),
    };
  }

  private calculateEfficiencyMetrics(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): EfficiencyMetrics {
    const timeOptimization = this.calculateTimeOptimization(steps);
    const effortMinimization = this.calculateEffortMinimization(steps);
    const errorPrevention = this.calculateErrorPrevention(steps, relationships);
    const resourceUtilization = this.calculateResourceUtilization(steps);

    return {
      timeOptimization,
      effortMinimization,
      errorPrevention,
      resourceUtilization,
    };
  }

  private async generateOptimizedOrder(
    steps: readonly Step[],
    relationships: readonly StepRelationship[],
    journeyPatterns: readonly UserJourneyPattern[],
    goals?: readonly FlowGoal[],
    constraints?: FlowConstraints
  ): Promise<Step[]> {
    // Create dependency graph
    const dependencyGraph = this.buildDependencyGraph(steps, relationships);

    // Apply constraints
    let candidateOrder = [...steps];

    if (constraints) {
      candidateOrder = this.applyConstraints(candidateOrder, constraints);
    }

    // Optimize based on patterns and goals
    candidateOrder = this.optimizeForPatterns(candidateOrder, journeyPatterns);

    if (goals) {
      candidateOrder = this.optimizeForGoals(
        candidateOrder,
        goals,
        relationships
      );
    }

    // Final validation against dependencies
    candidateOrder = this.validateDependencies(candidateOrder, dependencyGraph);

    return candidateOrder;
  }

  private identifyImprovements(
    originalSteps: readonly Step[],
    optimizedSteps: readonly Step[],
    relationships: readonly StepRelationship[],
    issues: readonly FlowIssue[]
  ): FlowImprovement[] {
    const improvements: FlowImprovement[] = [];

    // Check for reordering improvements
    const reorderingImprovements = this.identifyReorderingImprovements(
      originalSteps,
      optimizedSteps
    );
    improvements.push(...reorderingImprovements);

    // Check for consolidation opportunities
    const consolidationImprovements = this.identifyConsolidationOpportunities(
      optimizedSteps,
      relationships
    );
    improvements.push(...consolidationImprovements);

    // Check for transition improvements
    const transitionImprovements = this.identifyTransitionImprovements(
      optimizedSteps,
      issues
    );
    improvements.push(...transitionImprovements);

    return improvements;
  }

  private async generateRecommendations(
    steps: readonly Step[],
    issues: readonly FlowIssue[],
    improvements: readonly FlowImprovement[],
    patterns: readonly UserJourneyPattern[]
  ): Promise<FlowRecommendation[]> {
    const recommendations: FlowRecommendation[] = [];

    // Generate recommendations from issues
    for (const issue of issues) {
      const recommendation = this.issueToRecommendation(issue);
      recommendations.push(recommendation);
    }

    // Generate recommendations from patterns
    for (const pattern of patterns) {
      const recommendation = this.patternToRecommendation(pattern);
      recommendations.push(recommendation);
    }

    // Generate general best practice recommendations
    const bestPracticeRecommendations =
      this.generateBestPracticeRecommendations(steps);
    recommendations.push(...bestPracticeRecommendations);

    // Sort by priority and deduplicate
    return this.prioritizeAndDeduplicateRecommendations(recommendations);
  }

  private async generateAlternativeFlows(
    steps: readonly Step[],
    relationships: readonly StepRelationship[],
    goals?: readonly FlowGoal[]
  ): Promise<AlternativeFlow[]> {
    const alternatives: AlternativeFlow[] = [];

    // Generate speed-optimized flow
    const speedOptimized = this.generateSpeedOptimizedFlow(
      steps,
      relationships
    );
    alternatives.push(speedOptimized);

    // Generate learning-optimized flow
    const learningOptimized = this.generateLearningOptimizedFlow(
      steps,
      relationships
    );
    alternatives.push(learningOptimized);

    // Generate accessibility-optimized flow
    const accessibilityOptimized = this.generateAccessibilityOptimizedFlow(
      steps,
      relationships
    );
    alternatives.push(accessibilityOptimized);

    return alternatives;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateStepComplexity(step: Step): number {
    // Simplified complexity calculation
    const descriptionLength = step.description.length;
    const hotspotCount = step.hotspots.length;
    const annotationCount = step.annotations.length;

    const lengthScore = Math.min(descriptionLength / 200, 1);
    const interactionScore = Math.min((hotspotCount + annotationCount) / 10, 1);

    return (lengthScore + interactionScore) / 2;
  }

  private calculateStepSimilarity(stepA: Step, stepB: Step): number {
    // Simple similarity based on common words
    const wordsA = stepA.title.toLowerCase().split(/\s+/);
    const wordsB = stepB.title.toLowerCase().split(/\s+/);

    const commonWords = wordsA.filter((word) => wordsB.includes(word));
    const totalWords = new Set([...wordsA, ...wordsB]).size;

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private calculateContextualSimilarity(stepA: Step, stepB: Step): number {
    // Check for contextual connections
    const contextWords = ['setup', 'configure', 'save', 'export', 'import'];

    const contextA = contextWords.filter((word) =>
      stepA.description.toLowerCase().includes(word)
    ).length;

    const contextB = contextWords.filter((word) =>
      stepB.description.toLowerCase().includes(word)
    ).length;

    return contextA > 0 && contextB > 0 ? 0.7 : 0.2;
  }

  private isGenerallyIncreasing(values: number[]): boolean {
    let increasingCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increasingCount++;
    }
    return increasingCount > values.length * 0.6;
  }

  private hasGoodComplexityProgression(complexities: number[]): boolean {
    // Check if complexity generally increases or stays stable
    let violations = 0;
    for (let i = 1; i < complexities.length; i++) {
      if (complexities[i] < complexities[i - 1] - 0.3) {
        violations++;
      }
    }
    return violations < complexities.length * 0.3;
  }

  private countContextSwitches(steps: readonly Step[]): number {
    // Simplified context switching detection
    let switches = 0;
    const contextKeywords = ['setup', 'config', 'data', 'ui', 'save'];

    let currentContext = '';
    for (const step of steps) {
      const stepContext = this.detectStepContext(step, contextKeywords);
      if (currentContext && stepContext !== currentContext) {
        switches++;
      }
      currentContext = stepContext;
    }

    return switches;
  }

  private detectStepContext(step: Step, contextKeywords: string[]): string {
    const content = (step.title + ' ' + step.description).toLowerCase();
    for (const keyword of contextKeywords) {
      if (content.includes(keyword)) {
        return keyword;
      }
    }
    return 'general';
  }

  private calculateSequenceCoherence(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): number {
    let coherentTransitions = 0;

    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];

      const hasRelationship = relationships.some(
        (rel) =>
          rel.fromStepId === currentStep.id && rel.toStepId === nextStep.id
      );

      if (hasRelationship) coherentTransitions++;
    }

    return steps.length > 1 ? coherentTransitions / (steps.length - 1) : 1;
  }

  private countDependencyViolations(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): number {
    const stepOrder = new Map(steps.map((step, index) => [step.id, index]));
    let violations = 0;

    for (const rel of relationships) {
      if (rel.relationshipType === 'prerequisite') {
        const fromIndex = stepOrder.get(rel.fromStepId);
        const toIndex = stepOrder.get(rel.toStepId);

        if (
          fromIndex !== undefined &&
          toIndex !== undefined &&
          fromIndex > toIndex
        ) {
          violations++;
        }
      }
    }

    return violations;
  }

  private countLogicalGaps(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): number {
    let gaps = 0;

    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];

      const hasConnection = relationships.some(
        (rel) =>
          (rel.fromStepId === currentStep.id && rel.toStepId === nextStep.id) ||
          (rel.fromStepId === nextStep.id && rel.toStepId === currentStep.id)
      );

      if (!hasConnection) {
        const similarity = this.calculateContextualSimilarity(
          currentStep,
          nextStep
        );
        if (similarity < 0.3) gaps++;
      }
    }

    return gaps;
  }

  private calculateRedundancyScore(steps: readonly Step[]): number {
    let redundantPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const similarity = this.calculateStepSimilarity(steps[i], steps[j]);
        if (similarity > 0.7) redundantPairs++;
        totalPairs++;
      }
    }

    return totalPairs > 0 ? redundantPairs / totalPairs : 0;
  }

  private calculateCompletenessScore(steps: readonly Step[]): number {
    // Simplified completeness check
    const hasIntro = steps.some(
      (s) => s.title.toLowerCase().includes('intro') || s.order === 0
    );
    const hasConclusion = steps.some(
      (s) =>
        s.title.toLowerCase().includes('finish') ||
        s.title.toLowerCase().includes('complete') ||
        s.order === steps.length - 1
    );

    let score = 0.5; // Base score
    if (hasIntro) score += 0.25;
    if (hasConclusion) score += 0.25;

    return score;
  }

  private calculateTimeOptimization(steps: readonly Step[]): number {
    // Estimate time based on complexity and content
    const totalComplexity = steps.reduce(
      (sum, step) => sum + this.calculateStepComplexity(step),
      0
    );
    const avgComplexity = totalComplexity / steps.length;

    // Lower complexity = better time optimization
    return Math.max(0, 1 - avgComplexity);
  }

  private calculateEffortMinimization(steps: readonly Step[]): number {
    // Estimate effort based on interaction requirements
    const totalInteractions = steps.reduce(
      (sum, step) => sum + step.hotspots.length,
      0
    );
    const avgInteractions = totalInteractions / steps.length;

    // Normalized effort score
    return Math.max(0.3, 1 - avgInteractions / 10);
  }

  private calculateErrorPrevention(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): number {
    const dependencyViolations = this.countDependencyViolations(
      steps,
      relationships
    );
    const logicalGaps = this.countLogicalGaps(steps, relationships);

    const totalIssues = dependencyViolations + logicalGaps;
    const maxPossibleIssues = steps.length;

    return Math.max(0, 1 - totalIssues / maxPossibleIssues);
  }

  private calculateResourceUtilization(steps: readonly Step[]): number {
    // Simplified resource utilization based on content richness
    const totalAnnotations = steps.reduce(
      (sum, step) => sum + step.annotations.length,
      0
    );
    const totalHotspots = steps.reduce(
      (sum, step) => sum + step.hotspots.length,
      0
    );

    const utilization = (totalAnnotations + totalHotspots) / (steps.length * 5); // Assuming 5 as max per step
    return Math.min(1, utilization);
  }

  private buildDependencyGraph(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): Map<UUID, UUID[]> {
    const graph = new Map<UUID, UUID[]>();

    for (const step of steps) {
      graph.set(step.id, []);
    }

    for (const rel of relationships) {
      if (rel.relationshipType === 'prerequisite') {
        const dependencies = graph.get(rel.toStepId) || [];
        dependencies.push(rel.fromStepId);
        graph.set(rel.toStepId, dependencies);
      }
    }

    return graph;
  }

  private applyConstraints(
    steps: Step[],
    constraints: FlowConstraints
  ): Step[] {
    // Simple constraint application - would be more sophisticated in production
    let result = [...steps];

    // Ensure must-remain-first steps are at the beginning
    if (constraints.mustRemainFirst) {
      const firstSteps = result.filter((s) =>
        constraints.mustRemainFirst!.includes(s.id)
      );
      const otherSteps = result.filter(
        (s) => !constraints.mustRemainFirst!.includes(s.id)
      );
      result = [...firstSteps, ...otherSteps];
    }

    // Ensure must-remain-last steps are at the end
    if (constraints.mustRemainLast) {
      const lastSteps = result.filter((s) =>
        constraints.mustRemainLast!.includes(s.id)
      );
      const otherSteps = result.filter(
        (s) => !constraints.mustRemainLast!.includes(s.id)
      );
      result = [...otherSteps, ...lastSteps];
    }

    return result;
  }

  private optimizeForPatterns(
    steps: Step[],
    patterns: readonly UserJourneyPattern[]
  ): Step[] {
    let optimized = [...steps];

    for (const pattern of patterns) {
      optimized = this.applyPatternOptimization(optimized, pattern);
    }

    return optimized;
  }

  private applyPatternOptimization(
    steps: Step[],
    pattern: UserJourneyPattern
  ): Step[] {
    // Apply pattern-specific optimizations
    switch (pattern.patternType) {
      case 'context_building':
        return this.moveContextStepsEarly(steps, pattern.applicableSteps);
      case 'learning_curve':
        return this.sortByComplexity(steps);
      case 'momentum_building':
        return this.frontloadEngagingSteps(steps);
      default:
        return steps;
    }
  }

  private optimizeForGoals(
    steps: Step[],
    goals: readonly FlowGoal[],
    relationships: readonly StepRelationship[]
  ): Step[] {
    let optimized = [...steps];

    for (const goal of goals) {
      optimized = this.applyGoalOptimization(optimized, goal, relationships);
    }

    return optimized;
  }

  private applyGoalOptimization(
    steps: Step[],
    goal: FlowGoal,
    relationships: readonly StepRelationship[]
  ): Step[] {
    switch (goal.type) {
      case 'completion_rate':
        return this.optimizeForCompletion(steps);
      case 'time_to_complete':
        return this.optimizeForSpeed(steps);
      case 'user_satisfaction':
        return this.optimizeForSatisfaction(steps, relationships);
      default:
        return steps;
    }
  }

  private validateDependencies(
    steps: Step[],
    dependencyGraph: Map<UUID, UUID[]>
  ): Step[] {
    // Topological sort to ensure dependencies are respected
    const visited = new Set<UUID>();
    const result: Step[] = [];
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    const visit = (stepId: UUID) => {
      if (visited.has(stepId)) return;
      visited.add(stepId);

      const dependencies = dependencyGraph.get(stepId) || [];
      for (const depId of dependencies) {
        visit(depId);
      }

      const step = stepMap.get(stepId);
      if (step) result.push(step);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return result;
  }

  private identifyReorderingImprovements(
    originalSteps: readonly Step[],
    optimizedSteps: readonly Step[]
  ): FlowImprovement[] {
    const improvements: FlowImprovement[] = [];
    const originalOrder = originalSteps.map((s) => s.id);
    const optimizedOrder = optimizedSteps.map((s) => s.id);

    // Find significant position changes
    for (let i = 0; i < originalOrder.length; i++) {
      const stepId = originalOrder[i];
      const newIndex = optimizedOrder.indexOf(stepId);

      if (Math.abs(i - newIndex) > 1) {
        const step = originalSteps.find((s) => s.id === stepId);
        if (step) {
          improvements.push({
            type: 'reorder',
            description: `Move "${step.title}" from position ${i + 1} to position ${newIndex + 1}`,
            impact: 'medium',
            confidence: 0.7,
            affectedSteps: [stepId],
            expectedBenefit: 'Better logical flow and user understanding',
          });
        }
      }
    }

    return improvements;
  }

  private identifyConsolidationOpportunities(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): FlowImprovement[] {
    const improvements: FlowImprovement[] = [];

    // Look for very similar adjacent steps
    for (let i = 0; i < steps.length - 1; i++) {
      const stepA = steps[i];
      const stepB = steps[i + 1];

      const similarity = this.calculateStepSimilarity(stepA, stepB);

      if (
        similarity > 0.8 &&
        stepA.description.length < 100 &&
        stepB.description.length < 100
      ) {
        improvements.push({
          type: 'merge',
          description: `Consider merging "${stepA.title}" and "${stepB.title}"`,
          impact: 'medium',
          confidence: 0.6,
          affectedSteps: [stepA.id, stepB.id],
          expectedBenefit: 'Reduced redundancy and smoother flow',
        });
      }
    }

    return improvements;
  }

  private identifyTransitionImprovements(
    steps: readonly Step[],
    issues: readonly FlowIssue[]
  ): FlowImprovement[] {
    const improvements: FlowImprovement[] = [];

    // Look for poor transitions identified in issues
    const transitionIssues = issues.filter(
      (issue) => issue.type === 'poor_transition'
    );

    for (const issue of transitionIssues) {
      improvements.push({
        type: 'add_transition',
        description: `Add transitional content between affected steps`,
        impact: 'medium',
        confidence: 0.8,
        affectedSteps: issue.affectedSteps,
        expectedBenefit: 'Smoother user experience and reduced confusion',
        implementationNotes:
          'Consider adding brief introductory text or visual cues',
      });
    }

    return improvements;
  }

  private issueToRecommendation(issue: FlowIssue): FlowRecommendation {
    const priorityMap: Record<
      FlowIssue['severity'],
      FlowRecommendation['priority']
    > = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };

    return {
      priority: priorityMap[issue.severity],
      category: 'structure',
      title: `Fix ${issue.type.replace('_', ' ')}`,
      description: issue.description,
      implementation: issue.suggestedFix,
      expectedImpact: issue.userImpact,
      effort: issue.severity === 'critical' ? 'high' : 'medium',
      abTestRecommended:
        issue.severity === 'high' || issue.severity === 'critical',
    };
  }

  private patternToRecommendation(
    pattern: UserJourneyPattern
  ): FlowRecommendation {
    return {
      priority: 'medium',
      category: 'structure',
      title: `Optimize for ${pattern.patternType.replace('_', ' ')}`,
      description: pattern.description,
      implementation: pattern.recommendedAction,
      expectedImpact:
        'Improved user experience aligned with detected behavior patterns',
      effort: 'medium',
      abTestRecommended: true,
    };
  }

  private generateBestPracticeRecommendations(
    steps: readonly Step[]
  ): FlowRecommendation[] {
    const recommendations: FlowRecommendation[] = [];

    // Check for introduction step
    const hasIntro = steps.some((s) => s.title.toLowerCase().includes('intro'));
    if (!hasIntro) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        title: 'Add introduction step',
        description: 'Tutorial lacks a clear introduction to orient users',
        implementation:
          'Add a welcome step explaining the tutorial goals and what users will learn',
        expectedImpact:
          'Better user orientation and increased completion rates',
        effort: 'low',
        abTestRecommended: false,
      });
    }

    // Check for conclusion step
    const hasConclusion = steps.some((s) =>
      s.title.toLowerCase().includes('complete')
    );
    if (!hasConclusion) {
      recommendations.push({
        priority: 'low',
        category: 'structure',
        title: 'Add conclusion step',
        description: 'Tutorial lacks a clear conclusion to reinforce learning',
        implementation:
          'Add a summary step highlighting key accomplishments and next steps',
        expectedImpact: 'Better sense of completion and knowledge retention',
        effort: 'low',
        abTestRecommended: false,
      });
    }

    return recommendations;
  }

  private prioritizeAndDeduplicateRecommendations(
    recommendations: FlowRecommendation[]
  ): FlowRecommendation[] {
    // Remove duplicates based on title
    const unique = recommendations.filter(
      (rec, index, arr) => arr.findIndex((r) => r.title === rec.title) === index
    );

    // Sort by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return unique.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  private generateSpeedOptimizedFlow(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): AlternativeFlow {
    // Sort by simplicity (lower complexity first for speed)
    const speedOptimized = [...steps].sort(
      (a, b) =>
        this.calculateStepComplexity(a) - this.calculateStepComplexity(b)
    );

    return {
      name: 'Speed Optimized',
      steps: speedOptimized,
      optimizedFor: 'Minimum completion time',
      tradeoffs: 'May sacrifice thorough understanding for speed',
      score: 0.8,
      useCase: 'Experienced users who need quick task completion',
    };
  }

  private generateLearningOptimizedFlow(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): AlternativeFlow {
    // Sort by complexity progression for optimal learning
    const learningOptimized = [...steps].sort((a, b) => {
      const complexityA = this.calculateStepComplexity(a);
      const complexityB = this.calculateStepComplexity(b);
      return complexityA - complexityB;
    });

    return {
      name: 'Learning Optimized',
      steps: learningOptimized,
      optimizedFor: 'Progressive skill building and comprehension',
      tradeoffs: 'May take longer but ensures thorough understanding',
      score: 0.9,
      useCase: 'New users who need comprehensive learning',
    };
  }

  private generateAccessibilityOptimizedFlow(
    steps: readonly Step[],
    relationships: readonly StepRelationship[]
  ): AlternativeFlow {
    // Focus on steps with good accessibility features
    const accessibilityOptimized = [...steps]; // Would implement accessibility sorting

    return {
      name: 'Accessibility Optimized',
      steps: accessibilityOptimized,
      optimizedFor: 'Universal accessibility and inclusive design',
      tradeoffs: 'May include additional explanatory steps',
      score: 0.85,
      useCase: 'Users requiring enhanced accessibility support',
    };
  }

  // Utility methods for pattern optimization
  private moveContextStepsEarly(
    steps: Step[],
    contextStepIds: readonly UUID[]
  ): Step[] {
    const contextSteps = steps.filter((s) => contextStepIds.includes(s.id));
    const otherSteps = steps.filter((s) => !contextStepIds.includes(s.id));
    return [...contextSteps, ...otherSteps];
  }

  private sortByComplexity(steps: Step[]): Step[] {
    return [...steps].sort(
      (a, b) =>
        this.calculateStepComplexity(a) - this.calculateStepComplexity(b)
    );
  }

  private frontloadEngagingSteps(steps: Step[]): Step[] {
    // Move steps with more interactions to the front
    return [...steps].sort(
      (a, b) =>
        b.hotspots.length +
        b.annotations.length -
        (a.hotspots.length + a.annotations.length)
    );
  }

  private optimizeForCompletion(steps: Step[]): Step[] {
    // Move simpler steps first to build momentum
    return this.sortByComplexity(steps);
  }

  private optimizeForSpeed(steps: Step[]): Step[] {
    // Prioritize essential steps, minimize optional content
    return [...steps].sort((a, b) => {
      const essentialA = a.title.toLowerCase().includes('required') ? 1 : 0;
      const essentialB = b.title.toLowerCase().includes('required') ? 1 : 0;
      return essentialB - essentialA;
    });
  }

  private optimizeForSatisfaction(
    steps: Step[],
    relationships: readonly StepRelationship[]
  ): Step[] {
    // Balance complexity progression with engaging content
    return [...steps].sort((a, b) => {
      const complexityA = this.calculateStepComplexity(a);
      const complexityB = this.calculateStepComplexity(b);
      const engagementA = a.hotspots.length + a.annotations.length;
      const engagementB = b.hotspots.length + b.annotations.length;

      const scoreA = complexityA * 0.3 + engagementA * 0.7;
      const scoreB = complexityB * 0.3 + engagementB * 0.7;

      return scoreA - scoreB;
    });
  }

  private calculateConfidence(
    metrics: FlowMetrics,
    improvements: readonly FlowImprovement[],
    userBehavior?: UserBehaviorData
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence with better metrics
    confidence += metrics.logicalFlow.sequenceCoherence * 0.1;
    confidence += metrics.userExperience.predictedSatisfaction * 0.1;

    // Increase confidence with user behavior data
    if (userBehavior) {
      confidence += 0.1;
    }

    // Decrease confidence with many high-impact improvements needed
    const highImpactImprovements = improvements.filter(
      (i) => i.impact === 'high'
    ).length;
    confidence -= highImpactImprovements * 0.05;

    return Math.max(0.3, Math.min(1, confidence));
  }

  private determineAnalysisDepth(
    request: FlowAnalysisRequest
  ): 'shallow' | 'medium' | 'deep' {
    if (request.userBehavior && request.goals && request.constraints)
      return 'deep';
    if (request.userBehavior || request.goals) return 'medium';
    return 'shallow';
  }

  private documentAssumptions(request: FlowAnalysisRequest): string[] {
    const assumptions: string[] = [];

    if (!request.userBehavior) {
      assumptions.push(
        'Analysis based on content structure without user behavior data'
      );
    }

    if (!request.context?.userType) {
      assumptions.push('Assumed intermediate user skill level');
    }

    if (!request.goals) {
      assumptions.push(
        'Optimized for general completion rate and satisfaction'
      );
    }

    return assumptions;
  }

  private generateCacheKey(request: FlowAnalysisRequest): string {
    return JSON.stringify({
      stepIds: request.steps.map((s) => s.id),
      goals: request.goals,
      constraints: request.constraints,
      context: request.context,
    });
  }

  // Public utility methods
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

// ============================================================================
// Main Export Function
// ============================================================================

export async function analyzeStepFlow(
  steps: readonly Step[],
  userBehavior?: UserBehaviorData,
  goals?: readonly FlowGoal[]
): Promise<FlowAnalysisResult> {
  const analyzer = new FlowAnalyzer();

  const request: FlowAnalysisRequest = {
    steps,
    userBehavior,
    goals,
  };

  return analyzer.analyzeFlow(request);
}

// Export singleton instance
export const flowAnalyzer = new FlowAnalyzer();
