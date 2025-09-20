import { randomUUID } from 'node:crypto';
import type { LiveMessage, LiveSession } from '@/lib/types';

const SESSION_TIMEOUT_MS = Number(process.env.LIVE_AI_SESSION_TIMEOUT_MS || 15 * 60 * 1000);
const MAX_RECONNECT_ATTEMPTS = Number(process.env.LIVE_AI_MAX_RECONNECT_ATTEMPTS || 3);

type LiveSessionStore = {
  sessions: Map<string, LiveSession>;
};

function getStore(): LiveSessionStore {
  if (!globalThis.__PLAINER_LIVE_SESSION_STORE__) {
    globalThis.__PLAINER_LIVE_SESSION_STORE__ = {
      sessions: new Map<string, LiveSession>(),
    };
  }
  return globalThis.__PLAINER_LIVE_SESSION_STORE__;
}

function cleanupExpiredSessions() {
  const store = getStore();
  const now = Date.now();
  for (const [sessionId, session] of store.sessions.entries()) {
    const timeoutMs = session.timeoutMs ?? SESSION_TIMEOUT_MS;
    if (session.status === 'disconnected' || session.status === 'error') continue;
    if (now - session.lastActivity.getTime() > timeoutMs) {
      session.status = 'disconnected';
      session.endedAt = new Date();
      session.updatedAt = new Date();
    }
  }
}

export interface CreateLiveSessionOptions {
  clientInfo?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  timeoutMs?: number;
  ephemeralKey?: string;
  metadata?: Record<string, unknown>;
}

export function createLiveSession(options: CreateLiveSessionOptions = {}): LiveSession {
  cleanupExpiredSessions();

  const now = new Date();
  const sessionId = randomUUID();

  const session: LiveSession = {
    id: sessionId,
    status: 'active',
    startedAt: now,
    lastActivity: now,
    messages: [],
    createdAt: now,
    updatedAt: now,
    metadata: {
      ...options.metadata,
      clientInfo: options.clientInfo,
      userAgent: options.userAgent ?? undefined,
      ipAddress: options.ipAddress ?? undefined,
    },
    ephemeralKey: options.ephemeralKey,
    timeoutMs: options.timeoutMs ?? SESSION_TIMEOUT_MS,
    reconnectCount: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  };

  getStore().sessions.set(sessionId, session);
  return session;
}

export function getLiveSession(sessionId: string): LiveSession | undefined {
  cleanupExpiredSessions();
  return getStore().sessions.get(sessionId);
}

export function updateLiveSession(session: LiveSession) {
  session.updatedAt = new Date();
  session.lastActivity = new Date();
  if (session.status === 'connecting') {
    session.status = 'active';
  }
  getStore().sessions.set(session.id, session);
}

export function endLiveSession(sessionId: string): LiveSession | null {
  const session = getLiveSession(sessionId);
  if (!session) return null;
  session.status = 'disconnected';
  session.endedAt = new Date();
  session.updatedAt = new Date();
  getStore().sessions.set(sessionId, session);
  return session;
}

export function addLiveMessage(sessionId: string, message: LiveMessage): LiveMessage {
  const session = getLiveSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  session.messages.push(message);
  session.lastActivity = message.timestamp;
  session.updatedAt = new Date();
  getStore().sessions.set(sessionId, session);
  return message;
}

export function resetSessionMessages(sessionId: string) {
  const session = getLiveSession(sessionId);
  if (!session) return;
  session.messages = [];
  session.updatedAt = new Date();
  session.lastActivity = new Date();
  getStore().sessions.set(sessionId, session);
}

declare global {
  // eslint-disable-next-line no-var
  var __PLAINER_LIVE_SESSION_STORE__: LiveSessionStore | undefined;
}

export { SESSION_TIMEOUT_MS };
