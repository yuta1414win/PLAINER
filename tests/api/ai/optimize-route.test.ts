import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { OptimizationRequest, OptimizationResult } from '@/lib/ai/step-optimizer';
import type { GeneratedContent, ContentRequest } from '@/lib/ai/content-generator';
import type { FlowAnalysisResult, FlowAnalysisRequest } from '@/lib/ai/flow-analyzer';
import type { Step } from '@/lib/types';

const { mockOptimize, mockGenerateContent, mockAnalyzeFlow } = vi.hoisted(() => ({
  mockOptimize: vi.fn<
    (request: OptimizationRequest) => Promise<OptimizationResult>
  >(),
  mockGenerateContent: vi.fn<
    (request: ContentRequest) => Promise<GeneratedContent>
  >(),
  mockAnalyzeFlow: vi.fn<
    (request: FlowAnalysisRequest) => Promise<FlowAnalysisResult>
  >(),
}));

vi.mock('@/lib/ai/step-optimizer', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/step-optimizer')>(
    '@/lib/ai/step-optimizer'
  );
  return {
    ...actual,
    StepOptimizer: class {
      optimize = mockOptimize;
    },
  };
});

vi.mock('@/lib/ai/content-generator', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/content-generator')>(
    '@/lib/ai/content-generator'
  );
  return {
    ...actual,
    ContentGenerator: class {
      generateContent = mockGenerateContent;
    },
  };
});

vi.mock('@/lib/ai/flow-analyzer', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/flow-analyzer')>(
    '@/lib/ai/flow-analyzer'
  );
  return {
    ...actual,
    FlowAnalyzer: class {
      analyzeFlow = mockAnalyzeFlow;
    },
  };
});

import { POST } from '@/app/api/ai/optimize/route';
import {
  validateOptimizationRequest,
  handleStreamingResponse,
  type AIResponsePayload,
} from '@/app/api/ai/optimize/route-helpers';

const baseStep: Step = {
  id: 'step-1',
  name: 'Step 1',
  title: 'Initial Step',
  description: 'Demo step for testing',
  image: 'data:image/png;base64,test',
  hotspots: [],
  annotations: [],
  masks: [],
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const optimizationRequest: OptimizationRequest = {
  type: 'flow_optimization',
  steps: [baseStep],
};

const optimizationResult: OptimizationResult = {
  type: 'flow_optimization',
  confidence: 0.9,
  suggestions: [],
  predictedImprovement: {
    confidence: 0.8,
    methodology: 'mock-analysis',
  },
  implementationDifficulty: 'low',
  estimatedEffort: '1h',
  metadata: {
    timestamp: new Date(),
    modelVersion: 'mock-model',
    processingTime: 12,
    tokensUsed: 42,
    cacheHit: false,
    analysisDepth: 'shallow',
  },
};

const generatedContent: GeneratedContent = {
  id: 'content-1',
  type: 'description',
  content: 'Improved description',
  confidence: 0.85,
  metadata: {
    timestamp: new Date(),
    modelVersion: 'mock-model',
    tokensUsed: 30,
    processingTime: 5,
    detectedElements: [],
    suggestedVariants: [],
  },
  validation: {
    isValid: true,
    score: 0.92,
    recommendations: [],
    issues: [],
  },
  improvements: [],
};

const flowAnalysisResult: FlowAnalysisResult = {
  originalOrder: ['step-1'],
  optimizedOrder: [baseStep],
  confidence: 0.88,
  improvements: [],
  issues: [],
  metrics: {
    cognitiveLoad: {
      overallComplexity: 0.2,
      stepComplexityVariation: 0.1,
      contextSwitches: 0,
      informationOverload: 0.1,
      mentalModelConsistency: 0.9,
    },
    logicalFlow: {
      sequenceCoherence: 0.9,
      dependencyViolations: 0,
      logicalGaps: 0,
      redundancyScore: 0.1,
      completenessScore: 0.95,
    },
    userExperience: {
      predictedSatisfaction: 0.9,
      frustrationPoints: 0,
      engagementLevel: 0.85,
      motivationMaintenance: 0.82,
      successLikelihood: 0.87,
    },
    efficiency: {
      timeOptimization: 0.8,
      effortMinimization: 0.78,
      errorPrevention: 0.9,
      resourceUtilization: 0.7,
    },
  },
  recommendations: [],
  metadata: {
    timestamp: new Date(),
    analysisDepth: 'medium',
    processingTime: 18,
    algorithmsUsed: ['mock-algorithm'],
    dataQuality: 0.95,
    assumptions: [],
  },
};

const decoder = new TextDecoder();

beforeEach(() => {
  vi.clearAllMocks();
  mockOptimize.mockResolvedValue(optimizationResult);
  mockGenerateContent.mockResolvedValue(generatedContent);
  mockAnalyzeFlow.mockResolvedValue(flowAnalysisResult);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('optimize route helpers', () => {
  it('rejects invalid optimization requests', () => {
    expect(validateOptimizationRequest(undefined)).toBe(false);
    expect(validateOptimizationRequest({ type: 'flow_optimization', steps: [] })).toBe(false);

    const valid = validateOptimizationRequest({
      type: 'flow_optimization',
      steps: [baseStep],
    });

    expect(valid).toBe(true);
  });

  it('streams progress and final payload for optimization requests', async () => {
    const stream = await handleStreamingResponse(
      {
        type: 'optimization',
        data: optimizationRequest,
        streaming: true,
      },
      new TextEncoder()
    );

    const reader = stream.getReader();
    const payloads: string[] = [];

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      payloads.push(decoder.decode(value));
    }

    expect(payloads.some((chunk) => chunk.includes('Starting optimization'))).toBe(true);
    expect(payloads.some((chunk) => chunk.includes('Generating suggestions'))).toBe(true);

    const resultEvent = payloads.find((chunk) => chunk.includes('"type":"result"'));
    expect(resultEvent).toBeDefined();
    const dataPayload = JSON.parse(resultEvent!.replace(/^data:\s*/, '')) as {
      type: string;
      data: AIResponsePayload;
    };
    expect(dataPayload.type).toBe('result');
    expect(dataPayload.data).toMatchObject({ type: 'flow_optimization' });
    expect(mockOptimize).toHaveBeenCalledWith(optimizationRequest);
  });
});

describe('optimize route POST handler', () => {
  it('returns 400 for malformed requests', async () => {
    const request = new NextRequest('http://localhost/api/ai/optimize', {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': 'test-client-invalid',
      },
    } as RequestInit);

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('returns optimization results for valid payloads', async () => {
    const request = new NextRequest('http://localhost/api/ai/optimize', {
      method: 'POST',
      body: JSON.stringify({
        type: 'optimization',
        data: optimizationRequest,
      }),
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': 'test-client-success',
      },
    } as RequestInit);

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ type: 'flow_optimization' });
    expect(mockOptimize).toHaveBeenCalledTimes(1);
  });
});
