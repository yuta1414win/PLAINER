import { NextRequest } from 'next/server';
import { StepOptimizer } from '@/lib/ai/step-optimizer';
import {
  ContentGenerator,
  type GeneratedContent,
  type ContentRequest,
} from '@/lib/ai/content-generator';
import {
  FlowAnalyzer,
  type FlowAnalysisRequest,
  type FlowAnalysisResult,
} from '@/lib/ai/flow-analyzer';
import type {
  OptimizationRequest,
  OptimizationResult,
} from '@/lib/ai/step-optimizer';

export interface APIRequest {
  type: 'optimization' | 'content' | 'flow';
  data: OptimizationRequest | ContentRequest | FlowAnalysisRequest;
  streaming?: boolean;
}

export type AIResponsePayload =
  | OptimizationResult
  | GeneratedContent
  | FlowAnalysisResult
  | Record<string, unknown>;

// Initialize AI services
const stepOptimizer = new StepOptimizer();
const contentGenerator = new ContentGenerator();
const flowAnalyzer = new FlowAnalyzer();

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  requestCounts: new Map<string, { count: number; resetTime: number }>(),
};

export const RATE_LIMIT_CONFIG = {
  maxRequests: RATE_LIMIT.maxRequests,
  windowMs: RATE_LIMIT.windowMs,
};

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(clientId: string): RateLimitStatus {
  const now = Date.now();
  const clientData = RATE_LIMIT.requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    RATE_LIMIT.requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return {
      allowed: true,
      limit: RATE_LIMIT.maxRequests,
      remaining: RATE_LIMIT.maxRequests - 1,
      reset: now + RATE_LIMIT.windowMs,
    };
  }

  if (clientData.count >= RATE_LIMIT.maxRequests) {
    const retryAfterMs = Math.max(0, clientData.resetTime - now);
    return {
      allowed: false,
      limit: RATE_LIMIT.maxRequests,
      remaining: 0,
      reset: clientData.resetTime,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  clientData.count += 1;
  return {
    allowed: true,
    limit: RATE_LIMIT.maxRequests,
    remaining: Math.max(0, RATE_LIMIT.maxRequests - clientData.count),
    reset: clientData.resetTime,
  };
}

export function validateOptimizationRequest(data: unknown): data is OptimizationRequest {
  if (!data || typeof data !== 'object') return false;
  const request = data as Partial<OptimizationRequest>;
  if (typeof request.type !== 'string') return false;
  if (!Array.isArray(request.steps) || request.steps.length === 0) return false;
  return request.steps.every((step) => {
    if (!step || typeof step !== 'object') return false;
    const candidate = step as { id?: unknown; title?: unknown };
    return typeof candidate.id === 'string' && typeof candidate.title === 'string';
  });
}

export function validateContentRequest(data: unknown): data is ContentRequest {
  if (!data || typeof data !== 'object') return false;
  const request = data as Partial<ContentRequest>;
  if (typeof request.type !== 'string' || typeof request.target !== 'string') return false;
  return typeof request.context === 'object' && request.context !== null;
}

export function validateFlowRequest(data: unknown): data is FlowAnalysisRequest {
  if (!data || typeof data !== 'object') return false;
  const request = data as Partial<FlowAnalysisRequest>;
  return Array.isArray(request.steps) && request.steps.length > 0;
}

export async function handleOptimization(
  request: OptimizationRequest
): Promise<OptimizationResult> {
  const result = await stepOptimizer.optimize(request);
  return result;
}

export async function handleContentGeneration(
  request: ContentRequest
): Promise<GeneratedContent> {
  const result = await contentGenerator.generateContent(request);
  return result;
}

export async function handleFlowAnalysis(
  request: FlowAnalysisRequest
): Promise<FlowAnalysisResult> {
  const result = await flowAnalyzer.analyzeFlow(request);
  return result;
}

export async function handleStreamingResponse(
  request: APIRequest,
  encoder: TextEncoder
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Starting optimization...', progress: 0 })}\n\n`));
        let result: AIResponsePayload | undefined;
        switch (request.type) {
          case 'optimization':
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing steps...', progress: 25 })}\n\n`));
            result = await handleOptimization(request.data as OptimizationRequest);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Generating suggestions...', progress: 75 })}\n\n`));
            break;
          case 'content':
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Generating content...', progress: 50 })}\n\n`));
            result = await handleContentGeneration(request.data as ContentRequest);
            break;
          case 'flow':
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing flow patterns...', progress: 50 })}\n\n`));
            result = await handleFlowAnalysis(request.data as FlowAnalysisRequest);
            break;
          default:
            throw new Error('Invalid request type');
        }
        if (!result) throw new Error('AI handler returned empty result');
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', data: result, progress: 100 })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
        controller.close();
      }
    },
  });
}

export function getClientIdFromRequest(request: NextRequest): string {
  const headerFirst = (value: string | null) => {
    if (!value) return undefined;
    const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
    return parts[0];
  };

  return (
    headerFirst(request.headers.get('cf-connecting-ip')) ||
    headerFirst(request.headers.get('x-forwarded-for')) ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const DEFAULT_ALLOWED_ORIGIN = '*';

function getAllowedOrigins(): string[] {
  const raw = process.env.API_ALLOWED_ORIGINS;
  if (!raw) return [DEFAULT_ALLOWED_ORIGIN];
  const parsed = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [DEFAULT_ALLOWED_ORIGIN];
}

function resolveAllowedOrigin(origin: string | null): { value: string; vary: boolean } | null {
  const allowedOrigins = getAllowedOrigins();
  const allowsAny = allowedOrigins.includes('*');

  if (allowsAny) {
    return { value: '*', vary: false };
  }

  if (!origin) return null;

  if (allowedOrigins.includes(origin)) {
    return { value: origin, vary: true };
  }

  return null;
}

export interface CorsHeaderOptions {
  isPreflight?: boolean;
}

export function buildCorsHeaders(
  origin: string | null,
  options: CorsHeaderOptions = {}
): Record<string, string> | null {
  const resolved = resolveAllowedOrigin(origin);
  if (!resolved) return null;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': resolved.value,
    'Access-Control-Expose-Headers':
      'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
  };

  if (resolved.vary) {
    headers.Vary = 'Origin';
  }

  if (options.isPreflight) {
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] =
      'Content-Type, Authorization, X-Requested-With, X-Request-ID';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

export function withRateLimitHeaders(
  headers: Record<string, string>,
  status: RateLimitStatus
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit': String(status.limit),
    'X-RateLimit-Remaining': String(status.remaining),
    'X-RateLimit-Reset': String(Math.ceil(status.reset / 1000)),
  };
}
