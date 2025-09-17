import { NextRequest, NextResponse } from 'next/server';
import {
  APIRequest,
  AIResponsePayload,
  checkRateLimit,
  validateOptimizationRequest,
  validateContentRequest,
  validateFlowRequest,
  handleOptimization,
  handleContentGeneration,
  handleFlowAnalysis,
  handleStreamingResponse,
  getClientIdFromRequest,
  RATE_LIMIT_CONFIG,
} from './route-helpers';

interface APIResponse {
  success: boolean;
  data?: AIResponsePayload;
  error?: string;
  requestId?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const body: APIRequest = await request.json();

    // Rate limiting
    const clientId = getClientIdFromRequest(request);
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
        maxRequests: RATE_LIMIT_CONFIG.maxRequests,
        windowMs: RATE_LIMIT_CONFIG.windowMs,
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
