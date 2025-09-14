const RETENTION_KEY = 'plainer_analytics_retention_days';

// Default retention: 180 days
const DEFAULT_RETENTION_DAYS = 180;

export const AnalyticsSettings = {
  getRetentionDays(): number {
    if (typeof window === 'undefined') return DEFAULT_RETENTION_DAYS;
    const raw = window.localStorage.getItem(RETENTION_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(n) || n < 0) return DEFAULT_RETENTION_DAYS;
    return n;
  },
  setRetentionDays(days: number): void {
    if (typeof window === 'undefined') return;
    if (!Number.isFinite(days) || days < 0) return;
    window.localStorage.setItem(RETENTION_KEY, String(days));
  },
};

export default AnalyticsSettings;

