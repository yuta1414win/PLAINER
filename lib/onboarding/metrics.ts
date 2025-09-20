import { AnalyticsTracker } from '@/lib/analytics/tracker';

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

  forwardMetricToAnalytics(enriched);
}

export function createOnboardingSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const ONBOARDING_ANALYTICS_PROJECT_ID = 'plainer:onboarding';
const ONBOARDING_ANALYTICS_USER_ID = 'beginner-tour';

let onboardingTracker: AnalyticsTracker | null = null;
let onboardingTrackerInitFailed = false;

function getOnboardingTracker(): AnalyticsTracker | null {
  if (onboardingTrackerInitFailed || typeof window === 'undefined') {
    return null;
  }

  try {
    if (!onboardingTracker) {
      onboardingTracker = AnalyticsTracker.getInstance(
        ONBOARDING_ANALYTICS_PROJECT_ID,
        ONBOARDING_ANALYTICS_USER_ID
      );
    }
    return onboardingTracker;
  } catch (error) {
    onboardingTrackerInitFailed = true;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to initialize onboarding analytics tracker', error);
    }
    return null;
  }
}

function forwardMetricToAnalytics(event: OnboardingMetricEvent): void {
  const tracker = getOnboardingTracker();
  if (!tracker) return;

  const metadata = { recordedAt: event.timestamp };

  switch (event.type) {
    case 'start':
      tracker.trackEvent(
        'onboarding_start',
        {
          onboardingSessionId: event.sessionId,
          totalSteps: event.totalSteps,
          onboardingSource: event.source,
        },
        metadata
      );
      break;
    case 'step':
      tracker.trackEvent(
        'onboarding_step',
        {
          onboardingSessionId: event.sessionId,
          stepIndex: event.stepIndex,
          totalSteps: event.totalSteps,
          stepTitle: event.stepTitle,
        },
        metadata
      );
      break;
    case 'skip':
      tracker.trackEvent(
        'onboarding_skip',
        {
          onboardingSessionId: event.sessionId,
          stepIndex: event.stepIndex,
          totalSteps: event.totalSteps,
          duration: event.durationMs,
        },
        metadata
      );
      break;
    case 'complete':
      tracker.trackEvent(
        'onboarding_complete',
        {
          onboardingSessionId: event.sessionId,
          totalSteps: event.totalSteps,
          duration: event.durationMs,
        },
        metadata
      );
      break;
    case 'abandon':
      tracker.trackEvent(
        'onboarding_abandon',
        {
          onboardingSessionId: event.sessionId,
          stepIndex: event.stepIndex,
          totalSteps: event.totalSteps,
          duration: event.durationMs,
        },
        metadata
      );
      break;
    case 'glossary_open':
      tracker.trackEvent(
        'onboarding_glossary_open',
        {
          onboardingSessionId: event.sessionId,
          onboardingSource: event.source,
        },
        metadata
      );
      break;
    case 'glossary_search':
      tracker.trackEvent(
        'onboarding_glossary_search',
        {
          onboardingSessionId: event.sessionId,
          query: event.query,
          resultsCount: event.results,
        },
        metadata
      );
      break;
    case 'feedback_open':
      tracker.trackEvent(
        'onboarding_feedback_open',
        {
          onboardingSessionId: event.sessionId,
        },
        metadata
      );
      break;
    case 'feedback':
      tracker.trackEvent(
        'onboarding_feedback_submit',
        {
          onboardingSessionId: event.sessionId,
          rating: event.rating,
          comment: event.comment,
        },
        metadata
      );
      break;
    default:
      break;
  }
}
