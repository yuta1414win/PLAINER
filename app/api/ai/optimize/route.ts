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
  buildCorsHeaders,
  withRateLimitHeaders,
} from './route-helpers';

interface APIResponse {
  success: boolean;
  data?: AIResponsePayload;
  error?: string;
  requestId?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  if (!corsHeaders) {
    return NextResponse.json(
      {
        success: false,
        error: 'Origin not allowed.',
        requestId,
      },
      {
        status: 403,
        headers: {
          Vary: 'Origin',
        },
      }
    );
  }

  const clientId = getClientIdFromRequest(request);
  const rateLimitStatus = checkRateLimit(clientId);
  const baseHeaders = withRateLimitHeaders(
    {
      ...corsHeaders,
      'X-Request-ID': requestId,
    },
    rateLimitStatus
  );

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        requestId,
      },
      {
        status: 429,
        headers: {
          ...baseHeaders,
          ...(rateLimitStatus.retryAfterSeconds
            ? { 'Retry-After': String(rateLimitStatus.retryAfterSeconds) }
            : {}),
        },
      }
    );
  }

  try {
    // Parse request body
    const body: APIRequest = await request.json();

    const createErrorResponse = (status: number, message: string) =>
      NextResponse.json(
        {
          success: false,
          error: message,
          requestId,
        },
        {
          status,
          headers: baseHeaders,
        }
      );

    // Validate request structure
    if (!body.type || !body.data) {
      return createErrorResponse(
        400,
        'Invalid request format. Missing type or data.'
      );
    }

    // Handle streaming responses
    if (body.streaming) {
      const encoder = new TextEncoder();
      const stream = await handleStreamingResponse(body, encoder);

      return new Response(stream, {
        headers: {
          ...baseHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Handle regular responses
    let result;

    switch (body.type) {
      case 'optimization':
        if (!validateOptimizationRequest(body.data)) {
          return createErrorResponse(400, 'Invalid optimization request format.');
        }
        result = await handleOptimization(body.data);
        break;

      case 'content':
        if (!validateContentRequest(body.data)) {
          return createErrorResponse(400, 'Invalid content request format.');
        }
        result = await handleContentGeneration(body.data);
        break;

      case 'flow':
        if (!validateFlowRequest(body.data)) {
          return createErrorResponse(400, 'Invalid flow request format.');
        }
        result = await handleFlowAnalysis(body.data);
        break;

      default:
        return createErrorResponse(
          400,
          'Invalid request type. Must be optimization, content, or flow.'
        );
    }

    const response: APIResponse = {
      success: true,
      data: result,
      requestId,
    };

    return NextResponse.json(response, { headers: baseHeaders });
  } catch (error) {
    console.error('API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Malformed JSON payload.',
          requestId,
        },
        {
          status: 400,
          headers: {
            ...baseHeaders,
          },
        }
      );
    }

    const errorResponse: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      requestId,
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        ...baseHeaders,
      },
    });
  }
}

// Health check endpoint
export async function GET(request: NextRequest): Promise<Response> {
  const corsHeaders = buildCorsHeaders(request.headers.get('origin'));

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

    return NextResponse.json(healthCheck, {
      headers: {
        ...(corsHeaders ?? {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          ...(corsHeaders ?? {}),
        },
      }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest): Promise<Response> {
  const corsHeaders = buildCorsHeaders(request.headers.get('origin'), {
    isPreflight: true,
  });

  if (!corsHeaders) {
    return new Response(null, {
      status: 403,
      headers: {
        Vary: 'Origin',
      },
    });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
