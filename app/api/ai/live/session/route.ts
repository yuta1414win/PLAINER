import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { LiveMessage } from '@/lib/types';
import {
  buildCorsHeaders,
  checkRateLimit,
  getClientIdFromRequest,
  withRateLimitHeaders,
} from '@/app/api/ai/optimize/route-helpers';
import {
  addLiveMessage,
  createLiveSession,
  getLiveSession,
  type CreateLiveSessionOptions,
} from '@/lib/ai/live-session-manager';

function createWelcomeMessage(): LiveMessage {
  return {
    id: randomUUID(),
    type: 'assistant',
    content:
      'こんにちは！ガイド作成をお手伝いします。画像の説明、注釈の追加、CTAの最適化など、お気軽にお尋ねください。',
    timestamp: new Date(),
  };
}

export async function OPTIONS(request: NextRequest) {
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

export async function POST(request: NextRequest) {
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

  const clientId = getClientIdFromRequest(request);
  const sessionIdHeader = request.headers.get('x-plainer-session-id') ?? undefined;

  let parsedBody: Record<string, unknown> | undefined;
  let parseError: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody) {
      parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
    }
  } catch (error) {
    parseError = error;
  }

  const requestedSessionId =
    sessionIdHeader ||
    (typeof parsedBody?.sessionId === 'string' ? parsedBody.sessionId : undefined);

  if (requestedSessionId) {
    const existing = getLiveSession(requestedSessionId);
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          reused: true,
          session: {
            ...existing,
            messages: existing.messages,
          },
          requestId,
        },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'X-Request-ID': requestId,
          },
        }
      );
    }
  }

  if (parseError) {
    console.error('[LiveAPI] Failed to parse session request', parseError);
    return NextResponse.json(
      {
        success: false,
        error: 'Malformed JSON payload.',
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

  const rateLimitStatus = checkRateLimit(clientId, {
    bucketId: `session-init:${clientId}`,
    maxRequests: 60,
    windowMs: 60000,
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

  const options: CreateLiveSessionOptions = {
    clientInfo: parsedBody?.clientInfo as string | undefined,
    metadata: {
      ...(parsedBody?.metadata as Record<string, unknown> | undefined),
      clientId,
    },
    ephemeralKey: parsedBody?.ephemeralKey as string | undefined,
    timeoutMs: parsedBody?.timeoutMs as number | undefined,
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for') ?? null,
  };

  const session = createLiveSession({
    ...options,
    userAgent: options.userAgent ?? request.headers.get('user-agent'),
    ipAddress: options.ipAddress ?? request.headers.get('x-forwarded-for') ?? null,
  });

  const welcomeMessage = createWelcomeMessage();
  addLiveMessage(session.id, welcomeMessage);

  return NextResponse.json(
    {
      success: true,
      session: {
        ...session,
        messages: session.messages,
      },
      welcomeMessage,
      requestId,
    },
    {
      status: 201,
      headers: baseHeaders,
    }
  );
}
