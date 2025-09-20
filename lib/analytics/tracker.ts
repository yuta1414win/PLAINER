export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  projectId: string;
  type: EventType;
  data: EventData;
  metadata?: Record<string, any>;
}

export type EventType =
  | 'page_view'
  | 'step_view'
  | 'step_complete'
  | 'hotspot_click'
  | 'video_play'
  | 'video_complete'
  | 'session_start'
  | 'session_end'
  | 'error'
  | 'onboarding_start'
  | 'onboarding_step'
  | 'onboarding_complete'
  | 'onboarding_skip'
  | 'onboarding_abandon'
  | 'onboarding_glossary_open'
  | 'onboarding_glossary_search'
  | 'onboarding_feedback_open'
  | 'onboarding_feedback_submit';

export interface EventData {
  stepId?: string;
  stepIndex?: number;
  duration?: number;
  hotspotId?: string;
  videoId?: string;
  progress?: number;
  errorMessage?: string;
  userAgent?: string;
  screenResolution?: string;
  referrer?: string;
  language?: string;
  totalSteps?: number;
  onboardingSource?: string;
  onboardingSessionId?: string;
  stepTitle?: string;
  query?: string;
  resultsCount?: number;
  rating?: number;
  comment?: string;
}

export interface AnalyticsSession {
  id: string;
  userId?: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  events: AnalyticsEvent[];
  completed: boolean;
  device?: DeviceInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  screenWidth: number;
  screenHeight: number;
}

export interface AnalyticsMetrics {
  totalViews: number;
  uniqueVisitors: number;
  averageDuration: number;
  completionRate: number;
  dropoffRate: number;
  hotspotEngagement: number;
  stepMetrics: StepMetric[];
  timeSeriesData: TimeSeriesData[];
  onboardingMetrics?: OnboardingMetricsSummary;
}

export interface StepMetric {
  stepId: string;
  stepIndex: number;
  views: number;
  averageDuration: number;
  completions: number;
  dropoffs: number;
  hotspotClicks: number;
}

export interface TimeSeriesData {
  date: Date;
  views: number;
  uniqueVisitors: number;
  completions: number;
  averageDuration: number;
}

export interface OnboardingMetricsSummary {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  skipCount: number;
  abandonCount: number;
  averageDurationMs: number;
  sourceBreakdown: Record<string, number>;
  stepProgression: Array<{
    stepIndex: number;
    views: number;
    stepTitle?: string;
  }>;
  glossary: {
    openCount: number;
    openBySource: Record<string, number>;
    searchCount: number;
    topQueries: Array<{
      query: string;
      count: number;
      averageResults: number;
    }>;
  };
  feedback: {
    submissions: number;
    averageRating: number;
    recentComments: Array<{
      rating: number;
      comment: string;
      submittedAt: string;
    }>;
  };
}

import AnalyticsSettings from '@/lib/analytics/settings';

export class AnalyticsTracker {
  private static instances: Map<string, AnalyticsTracker> = new Map();
  private sessionId: string;
  private userId?: string;
  private projectId: string;
  private events: AnalyticsEvent[] = [];
  private startTime: Date;
  private stepStartTimes: Map<string, number> = new Map();
  private isTracking: boolean = true;

  private constructor(projectId: string, userId?: string) {
    this.projectId = projectId;
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    // Respect user consent (read from localStorage on client)
    if (typeof window !== 'undefined') {
      try {
        const v = window.localStorage.getItem('plainer_analytics_consent');
        // GDPR default: do not track until explicitly granted
        this.isTracking = v === 'granted';
      } catch {
        this.isTracking = false;
      }
    }

    // Start listeners regardless; actual tracking checks consent per event
    this.initializeSession();

    // Apply retention policy once per session start
    try {
      const days = AnalyticsSettings.getRetentionDays();
      // Fire and forget
      AnalyticsTracker.purgeOldData(days).catch(() => {});
    } catch {}

    // React to consent changes dynamically
    if (typeof window !== 'undefined') {
      window.addEventListener('plainer:consent-changed', (e: any) => {
        const status = e?.detail?.status;
        this.isTracking = status === 'granted';
        // Start a session once consent is granted
        if (this.isTracking && this.events.findIndex(ev => ev.type === 'session_start') === -1) {
          this.trackEvent('session_start', {
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            referrer: document.referrer,
            language: navigator.language,
          });
        }
      });
    }
  }

  static getInstance(projectId: string, userId?: string): AnalyticsTracker {
    const key = `${projectId}::${userId ?? 'anonymous'}`;
    const existing = AnalyticsTracker.instances.get(key);
    if (existing) {
      return existing;
    }

    const tracker = new AnalyticsTracker(projectId, userId);
    AnalyticsTracker.instances.set(key, tracker);
    return tracker;
  }

  // セッション初期化
  private initializeSession(): void {
    this.trackEvent('session_start', {
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      referrer: document.referrer,
      language: navigator.language,
    });

    // ページ離脱時にセッション終了を記録
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // ページ可視性変更の監視
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking();
      } else {
        this.resumeTracking();
      }
    });
  }

  // トラッキング有効/無効
  setTracking(enabled: boolean): void {
    this.isTracking = enabled;
  }

  pauseTracking(): void {
    this.isTracking = false;
  }

  resumeTracking(): void {
    this.isTracking = true;
  }

  // イベントトラッキング
  trackEvent(
    type: EventType,
    data: EventData,
    metadata?: Record<string, any>
  ): void {
    if (!this.isTracking) return;

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      projectId: this.projectId,
      type,
      data,
      metadata,
    };

    this.events.push(event);
    this.saveEvent(event);
  }

  // ページビュー
  trackPageView(stepId: string, stepIndex: number): void {
    this.trackEvent('page_view', { stepId, stepIndex });
  }

  // ステップビュー
  trackStepView(stepId: string, stepIndex: number): void {
    this.trackEvent('step_view', { stepId, stepIndex });
    this.stepStartTimes.set(stepId, Date.now());
  }

  // ステップ完了
  trackStepComplete(stepId: string, stepIndex: number): void {
    const startTime = this.stepStartTimes.get(stepId);
    const duration = startTime ? Date.now() - startTime : 0;

    this.trackEvent('step_complete', {
      stepId,
      stepIndex,
      duration,
    });

    this.stepStartTimes.delete(stepId);
  }

  // ホットスポットクリック
  trackHotspotClick(hotspotId: string, stepId: string): void {
    this.trackEvent('hotspot_click', {
      hotspotId,
      stepId,
    });
  }

  // ビデオ再生
  trackVideoPlay(videoId: string, progress: number): void {
    this.trackEvent('video_play', {
      videoId,
      progress,
    });
  }

  // ビデオ完了
  trackVideoComplete(videoId: string): void {
    this.trackEvent('video_complete', {
      videoId,
      progress: 100,
    });
  }

  // エラートラッキング
  trackError(errorMessage: string, metadata?: Record<string, any>): void {
    this.trackEvent(
      'error',
      {
        errorMessage,
      },
      metadata
    );
  }

  // セッション終了
  endSession(): void {
    const duration = Date.now() - this.startTime.getTime();
    this.trackEvent('session_end', { duration });
    this.saveSession();
  }

  // データ保存
  private saveEvent(event: AnalyticsEvent): void {
    // IndexedDBに保存
    this.saveToIndexedDB('analytics_events', event);

    // リアルタイム送信（オプション）
    if (this.shouldSendRealtime()) {
      this.sendToServer(event);
    }
  }

  private saveSession(): void {
    const session: AnalyticsSession = {
      id: this.sessionId,
      userId: this.userId,
      projectId: this.projectId,
      startTime: this.startTime,
      endTime: new Date(),
      duration: Date.now() - this.startTime.getTime(),
      events: this.events,
      completed: true,
      device: this.getDeviceInfo(),
    };

    this.saveToIndexedDB('analytics_sessions', session);
  }

  // IndexedDB保存
  private async saveToIndexedDB(storeName: string, data: any): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.add(data);
    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is not available in this environment'));
      }
      const request = indexedDB.open('PlainerAnalytics', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('analytics_events')) {
          db.createObjectStore('analytics_events', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('analytics_sessions')) {
          db.createObjectStore('analytics_sessions', { keyPath: 'id' });
        }
      };
    });
  }

  // サーバー送信（オプション）
  private async sendToServer(event: AnalyticsEvent): Promise<void> {
    // 実装は環境に応じて
    console.log('Analytics event:', event);
  }

  private shouldSendRealtime(): boolean {
    // リアルタイム送信の条件
    return false; // デフォルトはオフ
  }

  // Export analytics data (events + sessions)
  static async exportAnalyticsData(projectId?: string): Promise<{
    exportedAt: string;
    projectId?: string;
    events: AnalyticsEvent[];
    sessions: AnalyticsSession[];
  }> {
    const openDb = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          return reject(new Error('IndexedDB is not available in this environment'));
        }
        const request = indexedDB.open('PlainerAnalytics', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('analytics_events')) {
            db.createObjectStore('analytics_events', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('analytics_sessions')) {
            db.createObjectStore('analytics_sessions', { keyPath: 'id' });
          }
        };
      });

    const db = await openDb();
    const [events, sessions] = await Promise.all([
      new Promise<AnalyticsEvent[]>((resolve, reject) => {
        const tx = db.transaction(['analytics_events'], 'readonly');
        const store = tx.objectStore('analytics_events');
        const req = store.getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const rows = (req.result as AnalyticsEvent[]) || [];
          resolve(
            projectId ? rows.filter((r) => r.projectId === projectId) : rows
          );
        };
      }),
      new Promise<AnalyticsSession[]>((resolve, reject) => {
        const tx = db.transaction(['analytics_sessions'], 'readonly');
        const store = tx.objectStore('analytics_sessions');
        const req = store.getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const rows = (req.result as AnalyticsSession[]) || [];
          resolve(
            projectId ? rows.filter((r) => r.projectId === projectId) : rows
          );
        };
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      projectId,
      events,
      sessions,
    };
  }

  // Purge analytics data older than N days (0 disables purge)
  static async purgeOldData(days: number, projectId?: string): Promise<void> {
    if (!Number.isFinite(days) || days <= 0) return; // 0 or invalid => no-op
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

    const openDb = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          return reject(new Error('IndexedDB is not available in this environment'));
        }
        const request = indexedDB.open('PlainerAnalytics', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('analytics_events')) {
            db.createObjectStore('analytics_events', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('analytics_sessions')) {
            db.createObjectStore('analytics_sessions', { keyPath: 'id' });
          }
        };
      });

    const db = await openDb();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['analytics_events', 'analytics_sessions'],
        'readwrite'
      );

      let pending = 2;
      const done = () => {
        pending -= 1;
        if (pending === 0) resolve();
      };
      const fail = (err?: any) => reject(err);

      // Events cleanup
      const evStore = tx.objectStore('analytics_events');
      const evReq = evStore.openCursor();
      evReq.onsuccess = () => {
        const cursor = evReq.result as IDBCursorWithValue | null;
        if (!cursor) return done();
        const val = cursor.value as AnalyticsEvent;
        const ts = new Date(val.timestamp).getTime();
        if (ts < threshold && (!projectId || val.projectId === projectId)) {
          cursor.delete();
        }
        cursor.continue();
      };
      evReq.onerror = () => fail(evReq.error);

      // Sessions cleanup
      const seStore = tx.objectStore('analytics_sessions');
      const seReq = seStore.openCursor();
      seReq.onsuccess = () => {
        const cursor = seReq.result as IDBCursorWithValue | null;
        if (!cursor) return done();
        const val = cursor.value as AnalyticsSession;
        const ts = new Date(val.startTime).getTime();
        if (ts < threshold && (!projectId || val.projectId === projectId)) {
          cursor.delete();
        }
        cursor.continue();
      };
      seReq.onerror = () => fail(seReq.error);
    });
  }

  // デバイス情報取得
  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobile|Android|iPhone/i.test(userAgent)) {
      type = 'mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      type = 'tablet';
    }

    let os = 'Unknown';
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

    let browser = 'Unknown';
    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';

    return {
      type,
      os,
      browser,
      screenWidth,
      screenHeight,
    };
  }

  // ID生成
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 個人データの削除（クライアント側の解析データ）
  static async clearAnalyticsData(): Promise<void> {
    // Delete IndexedDB object stores data related to analytics
    const openDb = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          return reject(new Error('IndexedDB is not available in this environment'));
        }
        const request = indexedDB.open('PlainerAnalytics', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          // Ensure stores exist (no-op if first open creates them)
          const db = request.result;
          if (!db.objectStoreNames.contains('analytics_events')) {
            db.createObjectStore('analytics_events', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('analytics_sessions')) {
            db.createObjectStore('analytics_sessions', { keyPath: 'id' });
          }
        };
      });

    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(
          ['analytics_events', 'analytics_sessions'],
          'readwrite'
        );
        tx.objectStore('analytics_events').clear();
        tx.objectStore('analytics_sessions').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.error('Failed to clear analytics data:', e);
      throw e;
    }
  }

  // メトリクス取得
  async getMetrics(
    projectId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsMetrics> {
    const db = await this.openDatabase();
    const events = await this.getEvents(db, projectId, dateRange);
    const sessions = await this.getSessions(db, projectId, dateRange);

    return this.calculateMetrics(events, sessions);
  }

  private async getEvents(
    db: IDBDatabase,
    projectId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsEvent[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['analytics_events'], 'readonly');
      const store = transaction.objectStore('analytics_events');
      const request = store.getAll();

      request.onsuccess = () => {
        let events = request.result as AnalyticsEvent[];

        // フィルタリング
        events = events.filter((e) => e.projectId === projectId);

        if (dateRange) {
          events = events.filter((e) => {
            const timestamp = new Date(e.timestamp);
            return timestamp >= dateRange.start && timestamp <= dateRange.end;
          });
        }

        resolve(events);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getSessions(
    db: IDBDatabase,
    projectId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsSession[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['analytics_sessions'], 'readonly');
      const store = transaction.objectStore('analytics_sessions');
      const request = store.getAll();

      request.onsuccess = () => {
        let sessions = request.result as AnalyticsSession[];

        // フィルタリング
        sessions = sessions.filter((s) => s.projectId === projectId);

        if (dateRange) {
          sessions = sessions.filter((s) => {
            const startTime = new Date(s.startTime);
            return startTime >= dateRange.start && startTime <= dateRange.end;
          });
        }

        resolve(sessions);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private calculateMetrics(
    events: AnalyticsEvent[],
    sessions: AnalyticsSession[]
  ): AnalyticsMetrics {
    const uniqueUsers = new Set(sessions.map((s) => s.userId || s.id));
    const completedSessions = sessions.filter((s) => s.completed);
    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );

    // ステップメトリクス計算
    const stepMetricsMap = new Map<string, StepMetric>();

    events.forEach((event) => {
      if (event.data.stepId) {
        const key = event.data.stepId;
        const metric = stepMetricsMap.get(key) || {
          stepId: event.data.stepId,
          stepIndex: event.data.stepIndex || 0,
          views: 0,
          averageDuration: 0,
          completions: 0,
          dropoffs: 0,
          hotspotClicks: 0,
        };

        switch (event.type) {
          case 'step_view':
            metric.views++;
            break;
          case 'step_complete':
            metric.completions++;
            if (event.data.duration) {
              metric.averageDuration =
                (metric.averageDuration * (metric.completions - 1) +
                  event.data.duration) /
                metric.completions;
            }
            break;
          case 'hotspot_click':
            metric.hotspotClicks++;
            break;
        }

        stepMetricsMap.set(key, metric);
      }
    });

    // 時系列データ生成
    const timeSeriesData = this.generateTimeSeriesData(events, sessions);

    return {
      totalViews: events.filter((e) => e.type === 'page_view').length,
      uniqueVisitors: uniqueUsers.size,
      averageDuration:
        sessions.length > 0 ? totalDuration / sessions.length : 0,
      completionRate:
        sessions.length > 0 ? completedSessions.length / sessions.length : 0,
      dropoffRate:
        sessions.length > 0
          ? 1 - completedSessions.length / sessions.length
          : 0,
      hotspotEngagement: events.filter((e) => e.type === 'hotspot_click')
        .length,
      stepMetrics: Array.from(stepMetricsMap.values()),
      timeSeriesData,
    };
  }

  private generateTimeSeriesData(
    events: AnalyticsEvent[],
    sessions: AnalyticsSession[]
  ): TimeSeriesData[] {
    const dataMap = new Map<string, TimeSeriesData>();

    sessions.forEach((session) => {
      const date = new Date(session.startTime);
      const dateKey = date.toISOString().split('T')[0];

      const data = dataMap.get(dateKey) || {
        date: new Date(dateKey),
        views: 0,
        uniqueVisitors: 0,
        completions: 0,
        averageDuration: 0,
      };

      data.uniqueVisitors++;
      if (session.completed) data.completions++;
      data.averageDuration =
        (data.averageDuration * (data.uniqueVisitors - 1) +
          (session.duration || 0)) /
        data.uniqueVisitors;

      dataMap.set(dateKey, data);
    });

    events.forEach((event) => {
      if (event.type === 'page_view') {
        const date = new Date(event.timestamp);
        const dateKey = date.toISOString().split('T')[0];

        const data = dataMap.get(dateKey) || {
          date: new Date(dateKey),
          views: 0,
          uniqueVisitors: 0,
          completions: 0,
          averageDuration: 0,
        };

        data.views++;
        dataMap.set(dateKey, data);
      }
    });

    return Array.from(dataMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }
}
