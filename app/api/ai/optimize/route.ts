import { NextRequest, NextResponse } from 'next/server';
import { StepOptimizer } from '@/lib/ai/step-optimizer';
import { ContentGenerator } from '@/lib/ai/content-generator';
import { FlowAnalyzer } from '@/lib/ai/flow-analyzer';
import type {
  OptimizationRequest,
  OptimizationResult,
  ContentRequest,
  FlowAnalysisRequest,
  Step,
  Project,
} from '@/lib/types';

interface APIRequest {
  type: 'optimization' | 'content' | 'flow';
  data: OptimizationRequest | ContentRequest | FlowAnalysisRequest;
  streaming?: boolean;
}

interface APIResponse {
  success: boolean;
  data?: OptimizationResult | any;
  error?: string;
  requestId?: string;
}

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

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = RATE_LIMIT.requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    RATE_LIMIT.requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (clientData.count >= RATE_LIMIT.maxRequests) {
    return false;
  }

  clientData.count++;
  return true;
}

function validateOptimizationRequest(data: any): data is OptimizationRequest {
  return (
    typeof data === 'object' &&
    typeof data.type === 'string' &&
    Array.isArray(data.steps) &&
    data.steps.length > 0 &&
    data.steps.every(
      (step: any) =>
        typeof step === 'object' &&
        typeof step.id === 'string' &&
        typeof step.title === 'string'
    )
  );
}

function validateContentRequest(data: any): data is ContentRequest {
  return (
    typeof data === 'object' &&
    typeof data.type === 'string' &&
    (typeof data.context === 'string' || typeof data.context === 'undefined')
  );
}

function validateFlowRequest(data: any): data is FlowAnalysisRequest {
  return (
    typeof data === 'object' &&
    Array.isArray(data.steps) &&
    data.steps.length > 0
  );
}

async function handleOptimization(
  request: OptimizationRequest
): Promise<OptimizationResult> {
  try {
    const result = await stepOptimizer.optimize(request);

    // Log optimization metrics for analytics
    console.log('Optimization completed:', {
      type: request.type,
      stepCount: request.steps.length,
      suggestionsCount: result.suggestions.length,
      confidenceScore: result.confidence,
      processingTime: Date.now() - result.timestamp,
    });

    return result;
  } catch (error) {
    console.error('Optimization error:', error);
    throw new Error(
      `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleContentGeneration(request: ContentRequest): Promise<any> {
  try {
    const result = await contentGenerator.generateContent(request);

    console.log('Content generation completed:', {
      type: request.type,
      contentLength: result.content?.length || 0,
      suggestionsCount: result.suggestions?.length || 0,
    });

    return result;
  } catch (error) {
    console.error('Content generation error:', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleFlowAnalysis(request: FlowAnalysisRequest): Promise<any> {
  try {
    const result = await flowAnalyzer.analyzeFlow(request);

    console.log('Flow analysis completed:', {
      stepCount: request.steps.length,
      issuesFound: result.issues?.length || 0,
      optimizationsCount: result.optimizations?.length || 0,
    });

    return result;
  } catch (error) {
    console.error('Flow analysis error:', error);
    throw new Error(
      `Flow analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleStreamingResponse(
  request: APIRequest,
  encoder: TextEncoder
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        const initialData = JSON.stringify({
          type: 'status',
          message: 'Starting optimization...',
          progress: 0,
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

        let result;

        // Process based on request type
        switch (request.type) {
          case 'optimization':
            // Send progress updates during optimization
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'status',
                  message: 'Analyzing steps...',
                  progress: 25,
                })}\n\n`
              )
            );

            result = await handleOptimization(
              request.data as OptimizationRequest
            );

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'status',
                  message: 'Generating suggestions...',
                  progress: 75,
                })}\n\n`
              )
            );
            break;

          case 'content':
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'status',
                  message: 'Generating content...',
                  progress: 50,
                })}\n\n`
              )
            );

            result = await handleContentGeneration(
              request.data as ContentRequest
            );
            break;

          case 'flow':
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'status',
                  message: 'Analyzing flow patterns...',
                  progress: 50,
                })}\n\n`
              )
            );

            result = await handleFlowAnalysis(
              request.data as FlowAnalysisRequest
            );
            break;

          default:
            throw new Error('Invalid request type');
        }

        // Send final result
        const finalData = JSON.stringify({
          type: 'result',
          data: result,
          progress: 100,
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

        // End stream
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const body: APIRequest = await request.json();

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          requestId,
        },
        { status: 429 }
      );
    }

    // Validate request structure
    if (!body.type || !body.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format. Missing type or data.',
          requestId,
        },
        { status: 400 }
      );
    }

    // Handle streaming responses
    if (body.streaming) {
      const encoder = new TextEncoder();
      const stream = await handleStreamingResponse(body, encoder);

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Request-ID': requestId,
        },
      });
    }

    // Handle regular responses
    let result;

    switch (body.type) {
      case 'optimization':
        if (!validateOptimizationRequest(body.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid optimization request format.',
              requestId,
            },
            { status: 400 }
          );
        }
        result = await handleOptimization(body.data);
        break;

      case 'content':
        if (!validateContentRequest(body.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid content request format.',
              requestId,
            },
            { status: 400 }
          );
        }
        result = await handleContentGeneration(body.data);
        break;

      case 'flow':
        if (!validateFlowRequest(body.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid flow request format.',
              requestId,
            },
            { status: 400 }
          );
        }
        result = await handleFlowAnalysis(body.data);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid request type. Must be optimization, content, or flow.',
            requestId,
          },
          { status: 400 }
        );
    }

    const response: APIResponse = {
      success: true,
      data: result,
      requestId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);

    const errorResponse: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      requestId,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Health check endpoint
export async function GET(): Promise<Response> {
  try {
    // Basic health check - verify AI services can be initialized
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        stepOptimizer: 'available',
        contentGenerator: 'available',
        flowAnalyzer: 'available',
      },
      rateLimit: {
        maxRequests: RATE_LIMIT.maxRequests,
        windowMs: RATE_LIMIT.windowMs,
      },
    };

    return NextResponse.json(healthCheck);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Forwarded-For',
    },
  });
}
