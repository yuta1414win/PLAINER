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

const encoder = new TextEncoder();

function formatSSE(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return encoder.encode(payload);
}

function chunkContent(content: string): string[] {
  if (!content) return [];
  const chunks: string[] = [];
  const sentences = content.split(/(?<=[。．.!?\n])/u);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 120) {
      chunks.push(trimmed);
      continue;
    }
    const parts = trimmed.match(/.{1,80}/gu);
    if (parts) {
      chunks.push(...parts);
    } else {
      chunks.push(trimmed);
    }
  }
  return chunks;
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
    bucketId: `session:${sessionId}:stream:${clientId}`,
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(formatSSE(event, data));
      };

      try {
        send('ack', { requestId, sessionId, userMessage });
        send('status', { message: 'Generating response...' });

        const startedAt = Date.now();
        const assistant = await generateAssistantMessage(
          getLiveSession(sessionId) ?? session,
          userMessage
        );

        const chunks = chunkContent(assistant.content);
        if (chunks.length === 0) {
          send('delta', { content: assistant.content ?? '' });
        } else {
          for (const chunk of chunks) {
            send('delta', { content: chunk });
          }
        }

        const finalMessage: LiveMessage = {
          ...assistant,
          id: assistant.id ?? randomUUID(),
          timestamp: new Date(),
          metadata: {
            ...(assistant.metadata ?? {}),
            processingTime: Date.now() - startedAt,
          },
        };

        addLiveMessage(sessionId, finalMessage);
        send('complete', { assistantMessage: finalMessage });
      } catch (error) {
        console.error('[LiveAPI] Streaming response failed', error);
        const failureMessage: LiveMessage = {
          id: randomUUID(),
          type: 'error',
          content:
            'すみません、応答の生成に失敗しました。しばらく待ってから再度お試しください。',
          timestamp: new Date(),
        };
        addLiveMessage(sessionId, failureMessage);
        send('error', {
          message:
            error instanceof Error ? error.message : 'Unknown streaming error',
          assistantMessage: failureMessage,
        });
      } finally {
        send('end', { sessionId });
        controller.close();
      }
    },
    cancel() {
      console.log('[LiveAPI] Streaming connection closed by client');
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Request-ID': requestId,
    },
  });
}
