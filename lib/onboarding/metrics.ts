const METRICS_STORAGE_KEY = 'plainer.onboarding.metrics';

export type OnboardingEventType =
  | 'start'
  | 'step'
  | 'skip'
  | 'complete'
  | 'abandon'
  | 'glossary_open'
  | 'glossary_search'
  | 'feedback_open'
  | 'feedback';

export interface BaseMetricEvent {
  id: string;
  sessionId?: string;
  type: OnboardingEventType;
  timestamp: string;
}

export type OnboardingMetricEvent =
  | (BaseMetricEvent & {
      type: 'start';
      sessionId: string;
      totalSteps: number;
      source: 'auto' | 'manual';
    })
  | (BaseMetricEvent & {
      type: 'step';
      sessionId: string;
      stepIndex: number;
      totalSteps: number;
      stepTitle: string;
    })
  | (BaseMetricEvent & {
      type: 'skip';
      sessionId: string;
      stepIndex: number;
      totalSteps: number;
      durationMs: number;
    })
  | (BaseMetricEvent & {
      type: 'complete';
      sessionId: string;
      totalSteps: number;
      durationMs: number;
    })
  | (BaseMetricEvent & {
      type: 'abandon';
      sessionId: string;
      stepIndex: number;
      totalSteps: number;
      durationMs: number;
    })
  | (BaseMetricEvent & {
      type: 'glossary_open';
      source: 'header' | 'onboarding';
    })
  | (BaseMetricEvent & {
      type: 'glossary_search';
      query: string;
      results: number;
    })
  | (BaseMetricEvent & {
      type: 'feedback_open';
    })
  | (BaseMetricEvent & {
      type: 'feedback';
      rating: number;
      comment: string;
    });

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function recordOnboardingMetric(
  event: Omit<OnboardingMetricEvent, 'id' | 'timestamp'>
): void {
  if (typeof window === 'undefined') return;

  const enriched: OnboardingMetricEvent = {
    ...event,
    id: createId(),
    timestamp: now(),
  } as OnboardingMetricEvent;

  try {
    const raw = window.localStorage.getItem(METRICS_STORAGE_KEY);
    const existing: OnboardingMetricEvent[] = raw ? JSON.parse(raw) : [];
    existing.push(enriched);
    const trimmed = existing.slice(-200);
    window.localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(
      new CustomEvent('plainer:onboarding-metric', { detail: enriched })
    );
  } catch (error) {
    console.warn('Failed to persist onboarding metric', error);
  }
}

export function createOnboardingSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
