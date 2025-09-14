export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface ConsentRecord {
  status: ConsentStatus;
  updatedAt: string; // ISO8601
  policyVersion?: string;
  categories?: {
    analytics?: boolean;
  };
}

const STORAGE_KEY = 'plainer_analytics_consent';
const STORAGE_META_KEY = 'plainer_analytics_consent_meta';

export const Consent = {
  get(): ConsentStatus {
    if (typeof window === 'undefined') return 'pending';
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'granted' || v === 'denied') return v;
    return 'pending';
  },
  getRecord(): ConsentRecord {
    if (typeof window === 'undefined')
      return { status: 'pending', updatedAt: new Date(0).toISOString() };
    try {
      const raw = window.localStorage.getItem(STORAGE_META_KEY);
      if (!raw) return { status: this.get(), updatedAt: new Date().toISOString() };
      const parsed = JSON.parse(raw) as ConsentRecord;
      // Fallbacks
      return {
        status: parsed.status ?? this.get(),
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        policyVersion: parsed.policyVersion,
        categories: parsed.categories,
      };
    } catch {
      return { status: this.get(), updatedAt: new Date().toISOString() };
    }
  },
  set(status: ConsentStatus) {
    this.setWithMetadata(status);
  },
  setWithMetadata(
    status: ConsentStatus,
    opts?: { policyVersion?: string; categories?: ConsentRecord['categories'] }
  ) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, status);
      const record: ConsentRecord = {
        status,
        updatedAt: new Date().toISOString(),
        policyVersion: opts?.policyVersion,
        categories: opts?.categories ?? { analytics: status === 'granted' },
      };
      window.localStorage.setItem(STORAGE_META_KEY, JSON.stringify(record));
      window.dispatchEvent(
        new CustomEvent('plainer:consent-changed', { detail: { status, record } })
      );
    } catch {
      // noop
    }
  },
  isGranted(): boolean {
    return this.get() === 'granted';
  },
};

export default Consent;
