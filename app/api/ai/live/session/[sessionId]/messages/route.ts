import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { LiveMessage } from '@/lib/types';
import {
  buildCorsHeaders,
  checkRateLimit,
  getClientIdFromRequest,
  withRateLimitHeaders,
} from '@/app/api/ai/optimize/route-helpers';
import { addLiveMessage, getLiveSession } from '@/lib/ai/live-session-manager';
import { generateAssistantMessage } from '@/lib/ai/live-assistant';

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

export async function POST(request: NextRequest, context: RouteParams) {
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
    bucketId: `session:${sessionId}:messages:${clientId}`,
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

  let body: { content?: string; context?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch (error) {
    console.error('[LiveAPI] Failed to parse message payload', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Malformed JSON payload.',
        requestId,
      },
      {
        status: 400,
        headers: baseHeaders,
      }
    );
  }

  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json(
      {
        success: false,
        error: 'Message content is required.',
        requestId,
      },
      {
        status: 400,
        headers: baseHeaders,
      }
    );
  }

  const userMessage: LiveMessage = {
    id: randomUUID(),
    type: 'user',
    content,
    timestamp: new Date(),
  };

  addLiveMessage(sessionId, userMessage);
  const updatedSession = getLiveSession(sessionId);
  const startedAt = Date.now();

  let assistantMessage: LiveMessage;
  try {
    assistantMessage = await generateAssistantMessage(
      updatedSession ?? session,
      userMessage
    );
  } catch (error) {
    console.error('[LiveAPI] Failed to generate assistant response', error);
    assistantMessage = {
      id: randomUUID(),
      type: 'error',
      content:
        'すみません、応答の生成に失敗しました。少し時間をおいて再度お試しください。',
      timestamp: new Date(),
    };
  }

  addLiveMessage(sessionId, assistantMessage);

  const processingTime = Date.now() - startedAt;

  assistantMessage.metadata = {
    ...(assistantMessage.metadata ?? {}),
    processingTime,
  };

  return NextResponse.json(
    {
      success: true,
      sessionId,
      userMessage,
      assistantMessage,
      requestId,
    },
    {
      status: 200,
      headers: baseHeaders,
    }
  );
}
