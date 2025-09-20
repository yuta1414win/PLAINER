import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { LiveSession } from '@/lib/types';
import '@/lib/ai/live-session-manager';

vi.mock('@/lib/ai/live-assistant', () => {
  return {
    generateAssistantMessage: vi.fn(async (_session, userMessage) => ({
      id: 'assistant-message',
      type: 'assistant',
      content: `Echo: ${userMessage.content}`,
      timestamp: new Date(),
    })),
  };
});

import { POST as startSession } from '@/app/api/ai/live/session/route';
import { POST as postMessage } from '@/app/api/ai/live/session/[sessionId]/messages/route';
import { POST as postStreamMessage } from '@/app/api/ai/live/session/[sessionId]/messages/stream/route';

type SessionStore = {
  sessions: Map<string, LiveSession>;
};

const getStore = () =>
  (globalThis as typeof globalThis & {
    __PLAINER_LIVE_SESSION_STORE__?: SessionStore;
  }).__PLAINER_LIVE_SESSION_STORE__;

describe('Live API routes', () => {
  beforeEach(() => {
    const store = getStore();
    store?.sessions.clear();
  });

  it('creates a new live session and returns a welcome message', async () => {
    const request = new NextRequest('http://localhost/api/ai/live/session', {
      method: 'POST',
      body: JSON.stringify({ clientInfo: 'vitest' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await startSession(request);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.session?.id).toBeDefined();
    expect(Array.isArray(json.session?.messages)).toBe(true);
    expect(json.welcomeMessage?.content).toContain('こんにちは');
  });

  it('reuses an existing live session when session id header is provided', async () => {
    const initialRequest = new NextRequest('http://localhost/api/ai/live/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-plainer-client-id': 'vitest-client',
      },
    });

    const initialResponse = await startSession(initialRequest);
    expect(initialResponse.status).toBe(201);
    const initialJson = await initialResponse.json();
    const sessionId = initialJson.session.id as string;

    const reuseRequest = new NextRequest('http://localhost/api/ai/live/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-plainer-client-id': 'vitest-client',
        'x-plainer-session-id': sessionId,
      },
    });

    const reuseResponse = await startSession(reuseRequest);
    expect(reuseResponse.status).toBe(200);
    const reuseJson = await reuseResponse.json();
    expect(reuseJson.success).toBe(true);
    expect(reuseJson.reused).toBe(true);
    expect(reuseJson.session?.id).toBe(sessionId);
  });

  it('accepts user messages and returns an assistant response', async () => {
    const request = new NextRequest('http://localhost/api/ai/live/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await startSession(request);
    const json = await response.json();
    const sessionId = json.session.id as string;

    const messageRequest = new NextRequest(
      `http://localhost/api/ai/live/session/${sessionId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello assistant' }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const messageResponse = await postMessage(messageRequest, {
      params: Promise.resolve({ sessionId }),
    });

    expect(messageResponse.status).toBe(200);
    const messageJson = await messageResponse.json();
    expect(messageJson.success).toBe(true);
    expect(messageJson.assistantMessage?.content).toBe('Echo: Hello assistant');
    expect(messageJson.userMessage?.content).toBe('Hello assistant');
  });

  it('streams assistant responses over SSE', async () => {
    const request = new NextRequest('http://localhost/api/ai/live/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await startSession(request);
    const json = await response.json();
    const sessionId = json.session.id as string;

    const streamRequest = new NextRequest(
      `http://localhost/api/ai/live/session/${sessionId}/messages/stream`,
      {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello assistant' }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const streamResponse = await postStreamMessage(streamRequest, {
      params: Promise.resolve({ sessionId }),
    });

    expect(streamResponse.status).toBe(200);
    const events: Array<{ event: string; data: any }> = [];

    const reader = streamResponse.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('Missing response body');

    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const lines = rawEvent.split('\n');
        let eventName = 'message';
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trim());
          }
        }

        const dataString = dataLines.join('\n');
        const data = dataString ? JSON.parse(dataString) : null;
        events.push({ event: eventName, data });
      }
    }

    const eventNames = events.map((entry) => entry.event);
    expect(eventNames).toContain('ack');
    expect(eventNames).toContain('delta');
    expect(eventNames).toContain('complete');

    const deltas = events
      .filter((entry) => entry.event === 'delta')
      .map((entry) => entry.data.content)
      .join('');

    expect(deltas).toBe('Echo: Hello assistant');
  });
});
