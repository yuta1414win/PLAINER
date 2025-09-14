import { Step, Project, UUID } from '../types';
import { OptimizationType, OptimizationPreferences } from './step-optimizer';

// ============================================================================
// Prompt Template Types
// ============================================================================

export interface PromptTemplate {
  readonly name: string;
  readonly description: string;
  readonly template: string;
  readonly variables: readonly string[];
  readonly examples?: readonly PromptExample[];
  readonly constraints?: PromptConstraints;
  readonly optimization?: PromptOptimization;
}

export interface PromptExample {
  readonly input: Record<string, any>;
  readonly expectedOutput: string;
  readonly explanation?: string;
}

export interface PromptConstraints {
  readonly maxTokens?: number;
  readonly minTokens?: number;
  readonly temperature?: number;
  readonly responseFormat?: 'text' | 'json' | 'structured';
  readonly requiredElements?: readonly string[];
}

export interface PromptOptimization {
  readonly clarity: number; // 0-1
  readonly specificity: number; // 0-1
  readonly conciseness: number; // 0-1
  readonly actionability: number; // 0-1
}

// ============================================================================
// Advanced Prompt Engineering Context
// ============================================================================

export interface PromptContext {
  readonly domain: string;
  readonly userExpertise: 'novice' | 'intermediate' | 'expert';
  readonly taskComplexity: 'simple' | 'moderate' | 'complex';
  readonly culturalContext?: CulturalContext;
  readonly technicalContext?: TechnicalContext;
  readonly businessContext?: BusinessContext;
}

export interface CulturalContext {
  readonly language: string;
  readonly region?: string;
  readonly communicationStyle: 'direct' | 'indirect' | 'formal' | 'casual';
  readonly culturalSensitivities?: readonly string[];
}

export interface TechnicalContext {
  readonly frameworks: readonly string[];
  readonly platforms: readonly string[];
  readonly constraints: readonly string[];
  readonly integrations?: readonly string[];
}

export interface BusinessContext {
  readonly industry?: string;
  readonly companySize?: 'startup' | 'sme' | 'enterprise';
  readonly priorities: readonly ('speed' | 'quality' | 'cost' | 'innovation')[];
  readonly constraints?: readonly string[];
}

// ============================================================================
// Prompt Generation Options
// ============================================================================

export interface PromptGenerationOptions {
  readonly optimizationType: OptimizationType;
  readonly context?: PromptContext;
  readonly includeExamples?: boolean;
  readonly includeConstraints?: boolean;
  readonly responseFormat?: 'structured' | 'conversational' | 'technical';
  readonly chainOfThought?: boolean;
  readonly fewShotLearning?: boolean;
  readonly customInstructions?: readonly string[];
}

export interface GeneratedPromptBundle {
  readonly main: string;
  readonly system?: string;
  readonly followUp?: readonly string[];
  readonly validation?: string;
  readonly metadata: PromptMetadata;
}

export interface PromptMetadata {
  readonly tokenEstimate: number;
  readonly complexity: 'low' | 'medium' | 'high';
  readonly optimizationScore: number; // 0-1
  readonly techniques: readonly string[];
  readonly expectedQuality: number; // 0-1
}

// ============================================================================
// Specialized Prompt Categories
// ============================================================================

export interface FlowOptimizationPrompts {
  readonly sequenceAnalysis: string;
  readonly dependencyMapping: string;
  readonly userJourneyOptimization: string;
  readonly bottleneckIdentification: string;
}

export interface ContentEnhancementPrompts {
  readonly clarityImprovement: string;
  readonly engagementBoost: string;
  readonly accessibilityEnhancement: string;
  readonly tonalAdjustment: string;
}

export interface UserExperiencePrompts {
  readonly frictionReduction: string;
  readonly motivationMaintenance: string;
  readonly cognitiveLoadOptimization: string;
  readonly errorPrevention: string;
}

export interface PerformancePrompts {
  readonly speedOptimization: string;
  readonly efficiencyAnalysis: string;
  readonly resourceUtilization: string;
  readonly scalabilityAssessment: string;
}

// ============================================================================
// Prompt Templates Library
// ============================================================================

const PROMPT_TEMPLATES: Record<OptimizationType, PromptTemplate> = {
  flow_optimization: {
    name: 'Flow Optimization Analysis',
    description: 'Analyzes and optimizes step sequence and flow logic',
    template: `You are an expert UX researcher and tutorial optimization specialist. Analyze the following step sequence and provide optimization recommendations.

**Context:**
- Domain: {domain}
- User Type: {userType}
- Current Performance: {currentMetrics}
- Business Goals: {goals}

**Steps to Analyze:**
{stepSequence}

**Analysis Framework:**
1. **Dependency Analysis**: Identify logical dependencies between steps
2. **Cognitive Load Assessment**: Evaluate mental effort required for each transition
3. **User Journey Mapping**: Map natural user progression and decision points
4. **Bottleneck Identification**: Find steps that slow down or confuse users

**Output Requirements:**
- Provide specific reordering recommendations with rationale
- Identify redundant or missing steps
- Suggest transition improvements
- Estimate impact on completion rates

**Response Format:**
ANALYSIS: [Detailed analysis of current flow issues]
RECOMMENDATIONS: [Specific actionable improvements]
REORDERED_SEQUENCE: [Optimized step order with explanations]
IMPACT_ESTIMATE: [Predicted improvements with confidence levels]

Focus on evidence-based recommendations that improve user success rates.`,
    variables: [
      'domain',
      'userType',
      'currentMetrics',
      'goals',
      'stepSequence',
    ],
    constraints: {
      maxTokens: 4000,
      responseFormat: 'structured',
      requiredElements: [
        'ANALYSIS',
        'RECOMMENDATIONS',
        'REORDERED_SEQUENCE',
        'IMPACT_ESTIMATE',
      ],
    },
    optimization: {
      clarity: 0.9,
      specificity: 0.85,
      conciseness: 0.7,
      actionability: 0.95,
    },
  },

  content_enhancement: {
    name: 'Content Quality Enhancement',
    description:
      'Improves step content for clarity, engagement, and effectiveness',
    template: `You are a professional instructional designer and content strategist. Enhance the following tutorial content to maximize user understanding and engagement.

**Content Enhancement Goals:**
- Clarity: Make instructions crystal clear and unambiguous
- Engagement: Maintain user interest and motivation
- Accessibility: Ensure content works for diverse audiences
- Effectiveness: Optimize for successful task completion

**Current Content:**
{stepContent}

**Enhancement Context:**
- Target Audience: {targetAudience}
- Tone Preference: {tonePreference}
- Domain: {domain}
- Device Context: {deviceContext}
- Success Metrics: {successMetrics}

**Enhancement Framework:**
1. **Clarity Analysis**: Identify unclear or confusing language
2. **Engagement Assessment**: Evaluate motivational and engaging elements
3. **Accessibility Review**: Check for inclusive language and accessibility
4. **Action Orientation**: Ensure each step has clear, actionable instructions

**Content Enhancement Standards:**
- Use active voice and action verbs
- Include specific, measurable outcomes
- Provide context for why each action matters
- Address potential user concerns or confusion points
- Maintain consistent terminology throughout

**Output Format:**
CURRENT_ANALYSIS: [Analysis of existing content strengths and weaknesses]
ENHANCED_CONTENT: [Improved version with specific changes highlighted]
ENGAGEMENT_ADDITIONS: [Suggested elements to increase user motivation]
ACCESSIBILITY_IMPROVEMENTS: [Changes to improve universal usability]
EFFECTIVENESS_METRICS: [How to measure improvement success]

Prioritize changes that have the highest impact on user success.`,
    variables: [
      'stepContent',
      'targetAudience',
      'tonePreference',
      'domain',
      'deviceContext',
      'successMetrics',
    ],
    constraints: {
      maxTokens: 3500,
      responseFormat: 'structured',
      requiredElements: [
        'CURRENT_ANALYSIS',
        'ENHANCED_CONTENT',
        'ENGAGEMENT_ADDITIONS',
        'ACCESSIBILITY_IMPROVEMENTS',
      ],
    },
    optimization: {
      clarity: 0.95,
      specificity: 0.8,
      conciseness: 0.75,
      actionability: 0.9,
    },
  },

  user_journey: {
    name: 'User Journey Optimization',
    description: 'Optimizes entire user experience and journey flow',
    template: `You are a senior UX strategist specializing in user journey optimization. Analyze and optimize the complete user experience flow.

**User Journey Context:**
- User Persona: {userPersona}
- Journey Stage: {journeyStage}
- Entry Points: {entryPoints}
- Success Criteria: {successCriteria}
- Pain Points: {currentPainPoints}

**Current Journey Map:**
{journeySteps}

**User Behavior Data:**
{behaviorData}

**Optimization Framework:**
1. **User Mindset Analysis**: Understand user mental models and expectations
2. **Friction Point Identification**: Find moments that cause hesitation or abandonment
3. **Motivation Maintenance**: Ensure continuous engagement and progress feeling
4. **Success Pathway Optimization**: Create clear path to goal achievement

**Journey Optimization Principles:**
- Progressive disclosure of complexity
- Continuous positive reinforcement
- Clear progress indicators
- Easy recovery from errors
- Contextual help and guidance

**Analysis Areas:**
- Entry experience and onboarding
- Task progression and momentum building
- Decision points and choice architecture
- Error handling and recovery paths
- Completion and next steps

**Output Structure:**
JOURNEY_ANALYSIS: [Current journey strengths and weaknesses]
USER_MINDSET_INSIGHTS: [User thoughts and feelings at each stage]
FRICTION_ELIMINATION: [Specific improvements to reduce user effort]
MOTIVATION_STRATEGIES: [Ways to maintain engagement throughout]
OPTIMIZED_JOURNEY: [Improved user flow with rationale]
SUCCESS_INDICATORS: [Metrics to track journey improvement]

Focus on creating a seamless, intuitive experience that feels effortless to users.`,
    variables: [
      'userPersona',
      'journeyStage',
      'entryPoints',
      'successCriteria',
      'currentPainPoints',
      'journeySteps',
      'behaviorData',
    ],
    constraints: {
      maxTokens: 4500,
      responseFormat: 'structured',
      requiredElements: [
        'JOURNEY_ANALYSIS',
        'USER_MINDSET_INSIGHTS',
        'FRICTION_ELIMINATION',
        'OPTIMIZED_JOURNEY',
      ],
    },
    optimization: {
      clarity: 0.85,
      specificity: 0.9,
      conciseness: 0.7,
      actionability: 0.85,
    },
  },

  accessibility: {
    name: 'Accessibility Enhancement',
    description: 'Ensures universal accessibility and inclusive design',
    template: `You are an accessibility expert and inclusive design specialist. Evaluate and enhance the tutorial for universal accessibility.

**Accessibility Standards:**
- WCAG 2.1 AA compliance minimum
- Inclusive design principles
- Universal usability guidelines
- Multi-modal accessibility support

**Content to Evaluate:**
{tutorialContent}

**Accessibility Context:**
- Target Users: {accessibilityNeeds}
- Technical Constraints: {technicalLimitations}
- Platform Requirements: {platformRequirements}
- Compliance Level: {complianceTarget}

**Evaluation Framework:**
1. **Perceivable**: Information and UI components must be presentable to users in ways they can perceive
2. **Operable**: Interface components and navigation must be operable by all users
3. **Understandable**: Information and operation of UI must be understandable
4. **Robust**: Content must be robust enough for various assistive technologies

**Accessibility Checklist:**
- Visual accessibility (contrast, font size, visual hierarchy)
- Motor accessibility (navigation, interaction methods)
- Cognitive accessibility (clear language, consistent patterns)
- Auditory accessibility (alternative text, captions)
- Technology accessibility (screen reader compatibility)

**Enhancement Areas:**
- Alternative text for images and interactive elements
- Keyboard navigation and focus management
- Clear headings and semantic structure
- Plain language and reading level
- Error identification and guidance
- Consistent navigation and interaction patterns

**Output Format:**
ACCESSIBILITY_AUDIT: [Current accessibility compliance assessment]
PRIORITY_ISSUES: [Critical accessibility barriers to address]
ENHANCEMENT_RECOMMENDATIONS: [Specific improvements with implementation guidance]
ALTERNATIVE_FORMATS: [Suggestions for multiple content presentation methods]
TESTING_GUIDELINES: [How to validate accessibility improvements]
COMPLIANCE_CHECKLIST: [Steps to ensure ongoing accessibility]

Prioritize changes that provide the greatest accessibility benefit for the widest range of users.`,
    variables: [
      'tutorialContent',
      'accessibilityNeeds',
      'technicalLimitations',
      'platformRequirements',
      'complianceTarget',
    ],
    constraints: {
      maxTokens: 4000,
      responseFormat: 'structured',
      requiredElements: [
        'ACCESSIBILITY_AUDIT',
        'PRIORITY_ISSUES',
        'ENHANCEMENT_RECOMMENDATIONS',
        'COMPLIANCE_CHECKLIST',
      ],
    },
    optimization: {
      clarity: 0.95,
      specificity: 0.9,
      conciseness: 0.7,
      actionability: 0.95,
    },
  },

  performance: {
    name: 'Performance Optimization',
    description: 'Optimizes tutorial performance and efficiency metrics',
    template: `You are a performance optimization specialist and data analyst. Analyze and improve tutorial performance metrics.

**Performance Context:**
- Current Metrics: {currentPerformance}
- Performance Goals: {performanceTargets}
- User Behavior Data: {userBehaviorData}
- Technical Constraints: {technicalLimitations}

**Tutorial Content:**
{tutorialSteps}

**Performance Analysis Framework:**
1. **Speed Optimization**: Reduce time to completion while maintaining quality
2. **Efficiency Maximization**: Minimize user effort and cognitive load
3. **Success Rate Improvement**: Increase task completion and user satisfaction
4. **Resource Optimization**: Efficient use of user attention and system resources

**Key Performance Indicators:**
- Time to completion
- Task success rate
- User error frequency
- Abandonment points
- User satisfaction scores
- Cognitive load metrics

**Optimization Strategies:**
- Streamline complex processes
- Eliminate unnecessary steps
- Improve information architecture
- Optimize decision points
- Reduce context switching
- Enhance feedback mechanisms

**Analysis Areas:**
- Step complexity and cognitive load
- Information processing requirements
- Decision-making overhead
- Error-prone interactions
- Time-consuming tasks
- User attention allocation

**Output Structure:**
PERFORMANCE_ANALYSIS: [Current performance bottlenecks and inefficiencies]
OPTIMIZATION_OPPORTUNITIES: [Specific areas for improvement with impact estimates]
STREAMLINING_RECOMMENDATIONS: [Ways to reduce time and effort]
EFFICIENCY_IMPROVEMENTS: [Changes to maximize user productivity]
MEASUREMENT_STRATEGY: [How to track and validate performance improvements]
IMPLEMENTATION_PRIORITY: [Recommended order of changes based on impact]

Focus on changes that provide measurable performance improvements without sacrificing user experience quality.`,
    variables: [
      'currentPerformance',
      'performanceTargets',
      'userBehaviorData',
      'technicalLimitations',
      'tutorialSteps',
    ],
    constraints: {
      maxTokens: 3800,
      responseFormat: 'structured',
      requiredElements: [
        'PERFORMANCE_ANALYSIS',
        'OPTIMIZATION_OPPORTUNITIES',
        'STREAMLINING_RECOMMENDATIONS',
        'MEASUREMENT_STRATEGY',
      ],
    },
    optimization: {
      clarity: 0.85,
      specificity: 0.9,
      conciseness: 0.8,
      actionability: 0.9,
    },
  },

  ab_test_suggestions: {
    name: 'A/B Testing Strategy',
    description: 'Generates comprehensive A/B testing recommendations',
    template: `You are an experimentation strategist and conversion optimization expert. Design comprehensive A/B testing strategies for tutorial optimization.

**Testing Context:**
- Business Objectives: {businessGoals}
- Success Metrics: {successMetrics}
- User Segments: {userSegments}
- Technical Capabilities: {testingCapabilities}
- Timeline: {testingTimeline}

**Current Tutorial:**
{tutorialContent}

**A/B Testing Framework:**
1. **Hypothesis Formation**: Create testable hypotheses based on user research
2. **Test Design**: Structure experiments for statistical significance
3. **Variant Creation**: Develop meaningful alternative approaches
4. **Success Metrics**: Define measurable outcomes
5. **Implementation Planning**: Practical testing execution strategy

**Testing Principles:**
- One variable per test for clear attribution
- Statistical significance requirements
- Practical significance thresholds
- User experience consistency
- Ethical testing practices

**Test Categories:**
- Content and messaging variations
- Flow and sequence alternatives
- Interface and interaction changes
- Timing and pacing adjustments
- Personalization approaches

**Experimental Design Requirements:**
- Clear hypothesis and rationale
- Defined success criteria
- Sample size calculations
- Test duration estimates
- Risk assessment and mitigation

**Output Format:**
TESTING_STRATEGY: [Overall approach and prioritization]
HYPOTHESIS_CATALOG: [Specific testable hypotheses with rationales]
TEST_DESIGNS: [Detailed experiment configurations]
VARIANT_SPECIFICATIONS: [Exact changes to test with implementation details]
SUCCESS_METRICS: [Measurement framework and statistical requirements]
IMPLEMENTATION_ROADMAP: [Testing schedule and resource requirements]
RISK_ANALYSIS: [Potential issues and mitigation strategies]

Prioritize tests with highest potential impact and lowest implementation complexity.`,
    variables: [
      'businessGoals',
      'successMetrics',
      'userSegments',
      'testingCapabilities',
      'testingTimeline',
      'tutorialContent',
    ],
    constraints: {
      maxTokens: 4200,
      responseFormat: 'structured',
      requiredElements: [
        'TESTING_STRATEGY',
        'HYPOTHESIS_CATALOG',
        'TEST_DESIGNS',
        'SUCCESS_METRICS',
        'IMPLEMENTATION_ROADMAP',
      ],
    },
    optimization: {
      clarity: 0.9,
      specificity: 0.95,
      conciseness: 0.75,
      actionability: 0.9,
    },
  },

  comprehensive: {
    name: 'Comprehensive Optimization Analysis',
    description:
      'Holistic optimization covering all aspects of tutorial experience',
    template: `You are a senior product optimization consultant with expertise in UX design, content strategy, accessibility, and performance optimization. Conduct a comprehensive analysis and optimization of this tutorial system.

**Optimization Scope:**
- User Experience and Journey Design
- Content Quality and Effectiveness
- Accessibility and Inclusion
- Performance and Efficiency
- Business Impact and ROI

**Tutorial System:**
{tutorialSystem}

**Context and Constraints:**
- Business Context: {businessContext}
- User Research: {userResearch}
- Technical Environment: {technicalContext}
- Success Criteria: {successCriteria}
- Resource Constraints: {resourceLimitations}

**Comprehensive Analysis Framework:**
1. **User-Centered Design**: Analyze from user perspective and needs
2. **Content Excellence**: Evaluate information architecture and messaging
3. **Accessibility Leadership**: Ensure universal design principles
4. **Performance Excellence**: Optimize for speed and efficiency
5. **Business Alignment**: Connect improvements to business outcomes

**Multi-Dimensional Evaluation:**
- User satisfaction and task success
- Learning effectiveness and retention
- Accessibility and inclusion metrics
- Performance and efficiency indicators
- Business impact and conversion rates

**Optimization Strategies:**
- Quick wins with immediate impact
- Medium-term improvements requiring development
- Long-term strategic enhancements
- Continuous improvement processes

**Implementation Considerations:**
- Resource requirements and timelines
- Technical feasibility and constraints
- User impact and change management
- Measurement and validation approaches

**Output Structure:**
EXECUTIVE_SUMMARY: [High-level findings and recommendations]
USER_EXPERIENCE_ANALYSIS: [UX strengths, weaknesses, and optimization opportunities]
CONTENT_OPTIMIZATION: [Content improvements for clarity and effectiveness]
ACCESSIBILITY_ENHANCEMENT: [Universal design improvements and compliance]
PERFORMANCE_OPTIMIZATION: [Speed, efficiency, and resource improvements]
BUSINESS_IMPACT_ANALYSIS: [Connection between improvements and business outcomes]
IMPLEMENTATION_ROADMAP: [Prioritized improvement plan with timelines]
SUCCESS_MEASUREMENT: [KPIs and metrics to track improvement success]
CONTINUOUS_IMPROVEMENT: [Ongoing optimization and testing strategies]

Provide a balanced analysis that considers user needs, business objectives, and implementation feasibility.`,
    variables: [
      'tutorialSystem',
      'businessContext',
      'userResearch',
      'technicalContext',
      'successCriteria',
      'resourceLimitations',
    ],
    constraints: {
      maxTokens: 5000,
      responseFormat: 'structured',
      requiredElements: [
        'EXECUTIVE_SUMMARY',
        'USER_EXPERIENCE_ANALYSIS',
        'CONTENT_OPTIMIZATION',
        'ACCESSIBILITY_ENHANCEMENT',
        'PERFORMANCE_OPTIMIZATION',
        'BUSINESS_IMPACT_ANALYSIS',
        'IMPLEMENTATION_ROADMAP',
      ],
    },
    optimization: {
      clarity: 0.9,
      specificity: 0.85,
      conciseness: 0.7,
      actionability: 0.9,
    },
  },
};

// ============================================================================
// Prompt Engineering Utilities
// ============================================================================

export class PromptEngineer {
  private templates = PROMPT_TEMPLATES;

  generateOptimizationPrompt(
    type: OptimizationType,
    data: Record<string, any>,
    options?: PromptGenerationOptions
  ): GeneratedPromptBundle {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`No template found for optimization type: ${type}`);
    }

    // Apply context-aware enhancements
    const enhancedTemplate = this.enhanceTemplate(template, options?.context);

    // Fill template variables
    const filledPrompt = this.fillTemplate(enhancedTemplate.template, data);

    // Apply prompt engineering techniques
    const optimizedPrompt = this.applyTechniques(filledPrompt, options);

    // Generate system prompt if needed
    const systemPrompt = this.generateSystemPrompt(type, options?.context);

    // Create follow-up prompts
    const followUpPrompts = this.generateFollowUpPrompts(type, options);

    // Generate validation prompt
    const validationPrompt = this.generateValidationPrompt(type);

    // Calculate metadata
    const metadata = this.calculatePromptMetadata(
      optimizedPrompt,
      enhancedTemplate,
      options
    );

    return {
      main: optimizedPrompt,
      system: systemPrompt,
      followUp: followUpPrompts,
      validation: validationPrompt,
      metadata,
    };
  }

  private enhanceTemplate(
    template: PromptTemplate,
    context?: PromptContext
  ): PromptTemplate {
    if (!context) return template;

    let enhancedTemplate = template.template;

    // Add cultural context adaptations
    if (context.culturalContext) {
      enhancedTemplate = this.adaptForCulture(
        enhancedTemplate,
        context.culturalContext
      );
    }

    // Add technical context
    if (context.technicalContext) {
      enhancedTemplate = this.addTechnicalContext(
        enhancedTemplate,
        context.technicalContext
      );
    }

    // Add business context
    if (context.businessContext) {
      enhancedTemplate = this.addBusinessContext(
        enhancedTemplate,
        context.businessContext
      );
    }

    return {
      ...template,
      template: enhancedTemplate,
    };
  }

  private adaptForCulture(template: string, culture: CulturalContext): string {
    let adapted = template;

    // Adjust communication style
    switch (culture.communicationStyle) {
      case 'formal':
        adapted = adapted.replace(/\b(you|your)\b/g, 'the user');
        adapted = adapted.replace(/\b(we|us|our)\b/g, 'the system');
        break;
      case 'casual':
        adapted = adapted.replace(/\bshall\b/g, 'should');
        adapted = adapted.replace(/\bmust\b/g, 'need to');
        break;
      case 'direct':
        adapted = adapted.replace(/\bperhaps\b/g, '');
        adapted = adapted.replace(/\bmight consider\b/g, 'should');
        break;
      case 'indirect':
        adapted = adapted.replace(/\bmust\b/g, 'might consider');
        adapted = adapted.replace(/\bshould\b/g, 'could');
        break;
    }

    // Add language-specific instructions if not English
    if (culture.language !== 'en') {
      adapted += `\n\n**Language Requirements:**
- Respond in ${culture.language}
- Use culturally appropriate examples and references
- Consider local conventions and practices`;
    }

    return adapted;
  }

  private addTechnicalContext(
    template: string,
    technical: TechnicalContext
  ): string {
    const technicalSection = `\n\n**Technical Context:**
- Frameworks: ${technical.frameworks.join(', ')}
- Platforms: ${technical.platforms.join(', ')}
- Constraints: ${technical.constraints.join(', ')}
${technical.integrations ? `- Integrations: ${technical.integrations.join(', ')}` : ''}

Consider these technical factors in your recommendations.`;

    return template + technicalSection;
  }

  private addBusinessContext(
    template: string,
    business: BusinessContext
  ): string {
    const businessSection = `\n\n**Business Context:**
${business.industry ? `- Industry: ${business.industry}` : ''}
${business.companySize ? `- Company Size: ${business.companySize}` : ''}
- Priorities: ${business.priorities.join(', ')}
${business.constraints ? `- Business Constraints: ${business.constraints.join(', ')}` : ''}

Align recommendations with business objectives and constraints.`;

    return template + businessSection;
  }

  private fillTemplate(template: string, data: Record<string, any>): string {
    let filled = template;

    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`;
      const replacement = this.formatValue(value);
      filled = filled.replace(new RegExp(placeholder, 'g'), replacement);
    }

    // Remove unfilled placeholders
    filled = filled.replace(/\{[^}]+\}/g, '[Not provided]');

    return filled;
  }

  private formatValue(value: any): string {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[None specified]';
      if (typeof value[0] === 'object') {
        return value
          .map((item, index) => `${index + 1}. ${this.formatObject(item)}`)
          .join('\n');
      }
      return value.join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      return this.formatObject(value);
    }

    return String(value || '[Not specified]');
  }

  private formatObject(obj: any): string {
    if (obj.title && obj.description) {
      return `"${obj.title}": ${obj.description}`;
    }

    if (obj.id && obj.title) {
      return `${obj.title} (ID: ${obj.id})`;
    }

    return JSON.stringify(obj, null, 2);
  }

  private applyTechniques(
    prompt: string,
    options?: PromptGenerationOptions
  ): string {
    let enhanced = prompt;

    // Apply chain of thought reasoning
    if (options?.chainOfThought) {
      enhanced = this.addChainOfThought(enhanced);
    }

    // Apply few-shot learning examples
    if (options?.fewShotLearning) {
      enhanced = this.addFewShotExamples(enhanced, options.optimizationType);
    }

    // Add custom instructions
    if (options?.customInstructions) {
      enhanced = this.addCustomInstructions(
        enhanced,
        options.customInstructions
      );
    }

    // Format for response type
    if (options?.responseFormat) {
      enhanced = this.formatForResponseType(enhanced, options.responseFormat);
    }

    return enhanced;
  }

  private addChainOfThought(prompt: string): string {
    return (
      prompt +
      `\n\n**Reasoning Process:**
Please think through your analysis step by step:
1. First, analyze the current situation and identify key issues
2. Consider multiple potential solutions and their trade-offs
3. Evaluate each option against the stated goals and constraints
4. Select the best recommendations with clear rationale
5. Provide implementation guidance with expected outcomes

Show your reasoning process clearly in your response.`
    );
  }

  private addFewShotExamples(prompt: string, type: OptimizationType): string {
    const examples = this.getFewShotExamples(type);
    if (examples.length === 0) return prompt;

    const exampleSection = `\n\n**Examples:**\n${examples.join('\n\n')}`;
    return prompt + exampleSection;
  }

  private getFewShotExamples(type: OptimizationType): string[] {
    const examples: Record<OptimizationType, string[]> = {
      flow_optimization: [
        `Example: When analyzing a checkout flow, identify that "Payment Information" before "Shipping Address" creates cognitive load because users worry about security before completing shipping details. Recommendation: Move shipping before payment to build trust gradually.`,
      ],
      content_enhancement: [
        `Example: Change "Configure the settings" to "Click Settings > General > Enable notifications to receive updates about your orders" - specific actions with clear outcomes.`,
      ],
      user_journey: [
        `Example: User enters tutorial confused about goals → Add welcome step explaining benefits → User proceeds with clear expectations and motivation.`,
      ],
      accessibility: [
        `Example: Button labeled "Click here" → Change to "Download tutorial PDF (opens in new window)" - descriptive and informative for screen readers.`,
      ],
      performance: [
        `Example: 8-step process with 50% completion → Combine similar steps, add progress indicators → 5-step process with 75% completion.`,
      ],
      ab_test_suggestions: [
        `Example: Test hypothesis "Showing progress bar increases completion rates" → Variant A: No progress bar, Variant B: Step progress bar → Measure completion rate difference.`,
      ],
      comprehensive: [
        `Example: Comprehensive analysis identifies content clarity (6/10), accessibility (4/10), performance (7/10) → Prioritize accessibility fixes for greatest user impact.`,
      ],
    };

    return examples[type] || [];
  }

  private addCustomInstructions(
    prompt: string,
    instructions: readonly string[]
  ): string {
    const instructionSection = `\n\n**Additional Instructions:**\n${instructions.map((i) => `- ${i}`).join('\n')}`;
    return prompt + instructionSection;
  }

  private formatForResponseType(prompt: string, format: string): string {
    switch (format) {
      case 'structured':
        return (
          prompt +
          `\n\n**Response Format Requirements:**
- Use clear section headers in ALL CAPS
- Provide specific, actionable recommendations
- Include quantitative estimates where possible
- Structure information for easy scanning and implementation`
        );

      case 'conversational':
        return (
          prompt +
          `\n\n**Response Style:**
- Use a conversational, consultative tone
- Explain reasoning behind recommendations
- Address potential concerns or questions
- Make complex concepts accessible`
        );

      case 'technical':
        return (
          prompt +
          `\n\n**Technical Response Requirements:**
- Include specific implementation details
- Reference relevant standards and best practices
- Provide code examples or technical specifications where applicable
- Focus on technical feasibility and constraints`
        );

      default:
        return prompt;
    }
  }

  private generateSystemPrompt(
    type: OptimizationType,
    context?: PromptContext
  ): string {
    const baseSystem = `You are an expert optimization consultant specializing in tutorial and user experience enhancement. Your role is to provide evidence-based, actionable recommendations that improve user success rates and satisfaction.

Key principles:
- Always prioritize user needs and experience
- Provide specific, measurable recommendations
- Consider accessibility and inclusion in all suggestions
- Balance user experience with business objectives
- Support recommendations with clear rationale`;

    if (!context) return baseSystem;

    let contextualSystem = baseSystem;

    if (context.userExpertise) {
      contextualSystem += `\n\nTarget user expertise level: ${context.userExpertise}. Adjust complexity and explanation depth accordingly.`;
    }

    if (context.domain) {
      contextualSystem += `\n\nDomain context: ${context.domain}. Use domain-appropriate terminology and examples.`;
    }

    return contextualSystem;
  }

  private generateFollowUpPrompts(
    type: OptimizationType,
    options?: PromptGenerationOptions
  ): string[] {
    const followUps: string[] = [];

    // Add type-specific follow-ups
    switch (type) {
      case 'flow_optimization':
        followUps.push(
          'What are the potential risks of implementing these flow changes?',
          'How would you measure the success of these optimizations?',
          'Are there any user segments that might be negatively affected?'
        );
        break;

      case 'content_enhancement':
        followUps.push(
          'How would you A/B test these content improvements?',
          'What metrics would indicate successful content enhancement?',
          'Are there localization considerations for different markets?'
        );
        break;

      case 'accessibility':
        followUps.push(
          'What assistive technologies should be prioritized for testing?',
          'How do these changes impact users with different disabilities?',
          'What ongoing maintenance is required for accessibility compliance?'
        );
        break;
    }

    // Add general follow-ups
    followUps.push(
      'What would be the implementation timeline for these recommendations?',
      'What resources would be required to execute these improvements?',
      'How do these changes align with broader product strategy?'
    );

    return followUps;
  }

  private generateValidationPrompt(type: OptimizationType): string {
    return `Review your ${type} recommendations and validate:

1. **Feasibility**: Are the recommendations technically and practically feasible?
2. **Impact**: Will these changes meaningfully improve user experience?
3. **Evidence**: Are the recommendations based on solid UX principles and best practices?
4. **Completeness**: Have all important aspects been addressed?
5. **Prioritization**: Are the most impactful changes highlighted?
6. **Measurement**: Can success be measured and validated?

Provide any corrections or additional considerations needed.`;
  }

  private calculatePromptMetadata(
    prompt: string,
    template: PromptTemplate,
    options?: PromptGenerationOptions
  ): PromptMetadata {
    const tokenEstimate = Math.ceil(prompt.length / 4); // Rough token estimation

    const complexity = this.assessComplexity(prompt, options);
    const optimizationScore = this.calculateOptimizationScore(
      template,
      options
    );
    const techniques = this.identifyTechniques(options);
    const expectedQuality = this.estimateQuality(template, options);

    return {
      tokenEstimate,
      complexity,
      optimizationScore,
      techniques,
      expectedQuality,
    };
  }

  private assessComplexity(
    prompt: string,
    options?: PromptGenerationOptions
  ): 'low' | 'medium' | 'high' {
    let score = 0;

    // Length-based complexity
    if (prompt.length > 4000) score += 2;
    else if (prompt.length > 2000) score += 1;

    // Options-based complexity
    if (options?.chainOfThought) score += 1;
    if (options?.fewShotLearning) score += 1;
    if (options?.context) score += 1;

    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private calculateOptimizationScore(
    template: PromptTemplate,
    options?: PromptGenerationOptions
  ): number {
    let score = 0;

    // Template optimization score
    if (template.optimization) {
      score += template.optimization.clarity * 0.25;
      score += template.optimization.specificity * 0.25;
      score += template.optimization.conciseness * 0.25;
      score += template.optimization.actionability * 0.25;
    } else {
      score += 0.5; // Default moderate score
    }

    // Enhancement bonuses
    if (options?.chainOfThought) score += 0.1;
    if (options?.fewShotLearning) score += 0.1;
    if (options?.context) score += 0.1;

    return Math.min(1, score);
  }

  private identifyTechniques(options?: PromptGenerationOptions): string[] {
    const techniques: string[] = ['structured_template'];

    if (options?.chainOfThought) techniques.push('chain_of_thought');
    if (options?.fewShotLearning) techniques.push('few_shot_learning');
    if (options?.context) techniques.push('context_enhancement');
    if (options?.customInstructions) techniques.push('custom_instructions');

    return techniques;
  }

  private estimateQuality(
    template: PromptTemplate,
    options?: PromptGenerationOptions
  ): number {
    let quality = 0.7; // Base quality

    // Template quality
    if (template.optimization) {
      quality = Math.max(quality, template.optimization.actionability);
    }

    // Enhancement bonuses
    if (options?.context) quality += 0.1;
    if (options?.chainOfThought) quality += 0.05;
    if (options?.includeExamples) quality += 0.05;

    return Math.min(1, quality);
  }

  // Public utility methods
  getAvailableTemplates(): readonly string[] {
    return Object.keys(this.templates);
  }

  getTemplateInfo(type: OptimizationType): PromptTemplate | null {
    return this.templates[type] || null;
  }

  validateTemplate(template: PromptTemplate): boolean {
    return !!(
      template.name &&
      template.description &&
      template.template &&
      template.variables &&
      Array.isArray(template.variables)
    );
  }
}

// ============================================================================
// Main Export Functions
// ============================================================================

// Simple in-memory prompt cache (type + input hash + options)
const __promptCache = new Map<string, GeneratedPromptBundle>();

function hashObject(obj: any): string {
  const json = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const chr = json.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit int
  }
  return Math.abs(hash).toString(36);
}

export function generateOptimizationPromptsCached(
  type: OptimizationType,
  data: Record<string, any>,
  options?: PromptGenerationOptions
): GeneratedPromptBundle {
  const key = `${type}:${hashObject({ d: data, o: options })}`;
  const hit = __promptCache.get(key);
  if (hit) return hit;
  const bundle = generateOptimizationPrompts(type, data, options);
  __promptCache.set(key, bundle);
  return bundle;
}

export function clearPromptCache() {
  __promptCache.clear();
}

export function generateOptimizationPrompts(
  type: OptimizationType,
  data: Record<string, any>,
  options?: PromptGenerationOptions
): GeneratedPromptBundle {
  const engineer = new PromptEngineer();
  return engineer.generateOptimizationPrompt(type, data, options);
}

export function createPromptContext(
  domain: string,
  userExpertise: 'novice' | 'intermediate' | 'expert',
  preferences?: OptimizationPreferences
): PromptContext {
  return {
    domain,
    userExpertise,
    taskComplexity: preferences?.priority === 'speed' ? 'simple' : 'moderate',
    culturalContext: preferences?.language
      ? {
          language: preferences.language,
          communicationStyle:
            preferences.brandTone === 'formal' ? 'formal' : 'casual',
        }
      : undefined,
    technicalContext: preferences?.deviceType
      ? {
          frameworks: [],
          platforms: [preferences.deviceType],
          constraints: [],
        }
      : undefined,
  };
}

// Export singleton instance
export const promptEngineer = new PromptEngineer();
