import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildCorsHeaders,
  checkRateLimit,
  getClientIdFromRequest,
  withRateLimitHeaders,
} from '@/app/api/ai/optimize/route-helpers';
import { endLiveSession, getLiveSession } from '@/lib/ai/live-session-manager';

interface RouteParams {
  params: Promise<{
    sessionId?: string;
  }>;
}

async function resolveSessionId(context: RouteParams): Promise<string | undefined> {
  try {
    const params = await context.params;
    const sessionId = params?.sessionId;
    return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : undefined;
  } catch (error) {
    console.error('[LiveAPI] Failed to resolve session params', error);
    return undefined;
  }
}

export async function OPTIONS(request: NextRequest, context: RouteParams) {
  void context;
  const corsHeaders = buildCorsHeaders(request.headers.get('origin'), {
    isPreflight: true,
  });
  if (!corsHeaders) {
    return new NextResponse(null, {
      status: 403,
      headers: {
        Vary: 'Origin',
      },
    });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const sessionId = await resolveSessionId(context);
  const requestId = randomUUID();
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

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Session identifier is required.',
        requestId,
      },
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'X-Request-ID': requestId,
        },
      }
    );
  }

  const clientId = getClientIdFromRequest(request);
  const rateLimitStatus = checkRateLimit(clientId, {
    bucketId: `session:${sessionId}:${clientId}`,
  });
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

  const session = getLiveSession(sessionId);
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: 'Session not found.',
        requestId,
      },
      {
        status: 404,
        headers: baseHeaders,
      }
    );
  }

  const ended = endLiveSession(sessionId);

  return NextResponse.json(
    {
      success: true,
      session: ended,
      requestId,
    },
    {
      status: 200,
      headers: baseHeaders,
    }
  );
}

export async function GET(request: NextRequest, context: RouteParams) {
  const sessionId = await resolveSessionId(context);
  const requestId = randomUUID();
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

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Session identifier is required.',
        requestId,
      },
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'X-Request-ID': requestId,
        },
      }
    );
  }

  const clientId = getClientIdFromRequest(request);
  const rateLimitStatus = checkRateLimit(clientId, {
    bucketId: `session:${sessionId}:${clientId}`,
  });
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

  const session = getLiveSession(sessionId);
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: 'Session not found.',
        requestId,
      },
      {
        status: 404,
        headers: baseHeaders,
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      session,
      requestId,
    },
    {
      status: 200,
      headers: baseHeaders,
    }
  );
}
