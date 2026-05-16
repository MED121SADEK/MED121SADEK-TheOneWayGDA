/**
 * AnalyticsEngine — Client-side analytics collection & aggregation
 * All data stored in localStorage with 7-day retention.
 */

/* ─── Types ─── */

interface PageViewEvent {
  type: 'page_view'
  page: string
  timestamp: number
  sessionId: string
  referrer: string
}

interface FeatureEvent {
  type: 'feature_use'
  feature: string
  action?: string
  timestamp: number
  sessionId: string
  metadata?: Record<string, unknown>
}

interface NavigationEvent {
  type: 'navigation'
  from: string
  to: string
  timestamp: number
  sessionId: string
}

interface SessionEvent {
  type: 'session_start' | 'session_end'
  timestamp: number
  sessionId: string
  page: string
}

type AnalyticsEvent = PageViewEvent | FeatureEvent | NavigationEvent | SessionEvent;

interface HourlyBucket {
  hour: string       // e.g. "2025-01-15T14"
  views: number
  events: number
}

export interface DashboardData {
  totalPageViews: number;
  uniquePages: number;
  sessionDuration: number;       // seconds
  bounceRate: number;            // 0-100
  pagePopularity: { page: string; count: number }[];
  featureUsage: { feature: string; count: number }[];
  hourlyActivity: HourlyBucket[];
  topNavigationPaths: { from: string; to: string; count: number }[];
  recentActivity: { type: string; label: string; timestamp: number }[];
  growthRate: number;            // % change vs prior period
  activeFeatures: number;
  avgSessionDuration: number;    // seconds
}

const STORAGE_KEY = 'onewaygda_analytics';
const SESSION_KEY = 'onewaygda_session';
const MAX_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FLUSH_INTERVAL_MS = 5_000;
const MAX_EVENTS = 10_000;

/* ─── Helpers ─── */

function getOrCreateSession(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getStoredEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const events: AnalyticsEvent[] = JSON.parse(raw);
    // Prune events older than 7 days
    const cutoff = Date.now() - MAX_RETENTION_MS;
    return events.filter((e) => e.timestamp > cutoff);
  } catch {
    return [];
  }
}

function persistEvents(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last MAX_EVENTS
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — clear oldest half
    try {
      const half = events.slice(Math.floor(events.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(half));
    } catch {
      // give up silently
    }
  }
}

function appendEvent(event: AnalyticsEvent): void {
  const events = getStoredEvents();
  events.push(event);
  persistEvents(events);
}

function getHourKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}`;
}

function getPageLabel(path: string): string {
  const labels: Record<string, string> = {
    '/': 'Home',
    '/leaderboard': 'Leaderboard',
    '/community': 'Community',
    '/workspace': 'Workspace',
    '/analytics': 'Analytics',
    '/workflow/new': 'Workflow',
    '/teams': 'Teams',
    '/assistants': 'AI Assistants',
    '/billing': 'Billing',
    '/developers': 'Developers',
    '/notifications': 'Notifications',
  };
  return labels[path] || path.replace(/^\//, '').replace(/\//g, ' > ') || 'Home';
}

/* ─── Buffer for batched flushing ─── */

let pendingEvents: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function startFlushLoop(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (pendingEvents.length > 0) {
      const events = getStoredEvents();
      events.push(...pendingEvents);
      persistEvents(events);
      // Also try to POST to server
      trySendToServer(pendingEvents);
      pendingEvents = [];
    }
  }, FLUSH_INTERVAL_MS);
}

async function trySendToServer(events: AnalyticsEvent[]): Promise<void> {
  try {
    await fetch('/api/analytics', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
  } catch {
    // Server unavailable — data is still in localStorage
  }
}

/* ─── Public API ─── */

const AnalyticsEngine = {
  _initialized: false,
  _currentPage: '',
  _sessionStart: 0,
  _pageEnterTime: 0,
  _visibilityHandler: (() => {}) as () => void,
  _originalPushState: null as typeof history.pushState | null,
  _popstateHandler: null as (() => void) | null,

  /**
   * Call once to start tracking (usually from a top-level layout or provider).
   * IMPORTANT: Provides a destroy() method to restore original history.pushState
   * and prevent conflicts with other components (e.g., AiCopilot) that also
   * monkey-patch the History API.
   */
  init(): void {
    if (typeof window === 'undefined' || this._initialized) return;
    this._initialized = true;
    this._sessionStart = Date.now();
    this._currentPage = window.location.pathname;
    this._pageEnterTime = Date.now();

    // Record session start
    appendEvent({
      type: 'session_start',
      timestamp: Date.now(),
      sessionId: getOrCreateSession(),
      page: this._currentPage,
    });

    // Record initial page view
    this.trackPageView(this._currentPage);

    // Listen for visibility changes to track session duration
    this._visibilityHandler = () => {
      if (document.hidden) {
        // Page hidden — record time spent
        const spent = Math.round((Date.now() - this._pageEnterTime) / 1000);
        if (spent > 0) {
          this.trackEvent('time_on_page', { page: this._currentPage, seconds: spent });
        }
      } else {
        // Page visible again
        this._pageEnterTime = Date.now();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    // Track SPA navigation via popstate — use addEventListener instead of
    // monkey-patching history.pushState to avoid conflicts with other
    // components (e.g., AiCopilot) that also wrap pushState/replaceState.
    this._popstateHandler = () => {
      const from = this._currentPage;
      const to = window.location.pathname;
      this.trackNavigation(from, to);
    };
    window.addEventListener('popstate', this._popstateHandler);

    // Start flush loop
    startFlushLoop();
  },

  /**
   * Record a page view.
   */
  trackPageView(page: string): void {
    if (typeof window === 'undefined') return;
    this._pageEnterTime = Date.now();

    const event: PageViewEvent = {
      type: 'page_view',
      page,
      timestamp: Date.now(),
      sessionId: getOrCreateSession(),
      referrer: document.referrer || '',
    };
    pendingEvents.push(event);
    // Also persist immediately for dashboard reads
    appendEvent(event);
    this._currentPage = page;
  },

  /**
   * Track a custom event (e.g. feature usage).
   */
  trackEvent(event: string, data?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;

    if (event.startsWith('feature:')) {
      const featureEvent: FeatureEvent = {
        type: 'feature_use',
        feature: event.replace('feature:', ''),
        action: data?.action as string | undefined,
        timestamp: Date.now(),
        sessionId: getOrCreateSession(),
        metadata: data,
      };
      pendingEvents.push(featureEvent);
      appendEvent(featureEvent);
    } else {
      // Generic event stored as feature event
      const genericEvent: FeatureEvent = {
        type: 'feature_use',
        feature: event,
        action: data?.action as string | undefined,
        timestamp: Date.now(),
        sessionId: getOrCreateSession(),
        metadata: data,
      };
      pendingEvents.push(genericEvent);
      appendEvent(genericEvent);
    }
  },

  /**
   * Track navigation between pages.
   */
  trackNavigation(from: string, to: string): void {
    if (typeof window === 'undefined' || from === to) return;
    this.trackPageView(to);

    const event: NavigationEvent = {
      type: 'navigation',
      from,
      to,
      timestamp: Date.now(),
      sessionId: getOrCreateSession(),
    };
    pendingEvents.push(event);
    appendEvent(event);
  },

  /**
   * Compute aggregated dashboard data from stored events.
   */
  getDashboardData(): DashboardData {
    const events = getStoredEvents();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    // ── Page Views ──
    const pageViews = events.filter((e) => e.type === 'page_view');
    const totalPageViews = pageViews.length;

    // ── Unique Pages ──
    const uniquePages = new Set(pageViews.map((e) => e.page)).size;

    // ── Feature Usage ──
    const featureEvents = events.filter((e) => e.type === 'feature_use');
    const featureMap = new Map<string, number>();
    featureEvents.forEach((e) => {
      featureMap.set(e.feature, (featureMap.get(e.feature) || 0) + 1);
    });
    const featureUsage = Array.from(featureMap.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);

    // ── Page Popularity ──
    const pageMap = new Map<string, number>();
    pageViews.forEach((e) => pageMap.set(e.page, (pageMap.get(e.page) || 0) + 1));
    const pagePopularity = Array.from(pageMap.entries())
      .map(([page, count]) => ({ page: getPageLabel(page), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Hourly Activity (last 24h) ──
    const hourlyMap = new Map<string, { views: number; events: number }>();
    for (let i = 23; i >= 0; i--) {
      const key = getHourKey(now - i * 60 * 60 * 1000);
      hourlyMap.set(key, { views: 0, events: 0 });
    }
    pageViews
      .filter((e) => e.timestamp > oneDayAgo)
      .forEach((e) => {
        const key = getHourKey(e.timestamp);
        const bucket = hourlyMap.get(key);
        if (bucket) bucket.views++;
      });
    featureEvents
      .filter((e) => e.timestamp > oneDayAgo)
      .forEach((e) => {
        const key = getHourKey(e.timestamp);
        const bucket = hourlyMap.get(key);
        if (bucket) bucket.events++;
      });
    const hourlyActivity = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour: hour.split('T')[1] + ':00',
      views: data.views,
      events: data.events,
    }));

    // ── Top Navigation Paths ──
    const navEvents = events.filter((e) => e.type === 'navigation') as NavigationEvent[];
    const navMap = new Map<string, number>();
    navEvents.forEach((e) => {
      const key = `${getPageLabel(e.from)} → ${getPageLabel(e.to)}`;
      navMap.set(key, (navMap.get(key) || 0) + 1);
    });
    const topNavigationPaths = Array.from(navMap.entries())
      .map(([path, count]) => {
        const [from, to] = path.split(' → ');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Recent Activity (last 20) ──
    const allSorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
    const recentActivity = allSorted.slice(0, 20).map((e) => {
      if (e.type === 'page_view') {
        return { type: 'page_view', label: `Visited ${getPageLabel(e.page)}`, timestamp: e.timestamp };
      }
      if (e.type === 'feature_use') {
        return { type: 'feature_use', label: `Used ${e.feature}`, timestamp: e.timestamp };
      }
      if (e.type === 'navigation') {
        const nav = e as NavigationEvent;
        return { type: 'navigation', label: `${getPageLabel(nav.from)} → ${getPageLabel(nav.to)}`, timestamp: e.timestamp };
      }
      return { type: 'session', label: 'Session started', timestamp: e.timestamp };
    });

    // ── Session Duration ──
    const sessionStarts = events.filter((e) => e.type === 'session_start');
    let avgSessionDuration = 0;
    if (sessionStarts.length > 0) {
      // Estimate from time_on_page events
      const timeEvents = featureEvents.filter((e) => e.feature === 'time_on_page');
      if (timeEvents.length > 0) {
        const totalTime = timeEvents.reduce((sum, e) => sum + ((e.metadata?.seconds as number) || 0), 0);
        avgSessionDuration = Math.round(totalTime / Math.max(sessionStarts.length, 1));
      } else {
        // Fallback: use time between first and last event
        const first = events[0]?.timestamp || now;
        const last = events[events.length - 1]?.timestamp || now;
        avgSessionDuration = Math.round((last - first) / Math.max(sessionStarts.length, 1) / 1000);
      }
    }

    // ── Bounce Rate (sessions with only 1 page view) ──
    const sessionIds = new Set(pageViews.map((e) => e.sessionId));
    let singlePageSessions = 0;
    sessionIds.forEach((sid) => {
      const count = pageViews.filter((e) => e.sessionId === sid).length;
      if (count === 1) singlePageSessions++;
    });
    const bounceRate = sessionIds.size > 0 ? Math.round((singlePageSessions / sessionIds.size) * 100) : 0;

    // ── Growth Rate (compare last 24h vs prior 24h) ──
    const recentViews = pageViews.filter((e) => e.timestamp > oneDayAgo).length;
    const priorViews = pageViews.filter((e) => e.timestamp > twoDaysAgo && e.timestamp <= oneDayAgo).length;
    const growthRate = priorViews > 0 ? Math.round(((recentViews - priorViews) / priorViews) * 100) : recentViews > 0 ? 100 : 0;

    return {
      totalPageViews,
      uniquePages,
      sessionDuration: avgSessionDuration,
      bounceRate,
      pagePopularity,
      featureUsage: featureUsage.slice(0, 8),
      hourlyActivity,
      topNavigationPaths,
      recentActivity,
      growthRate,
      activeFeatures: featureMap.size,
      avgSessionDuration,
    };
  },

  /**
   * Clear all stored analytics data.
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },

  /**
   * Export all stored events as JSON string.
   */
  exportJSON(): string {
    const events = getStoredEvents();
    return JSON.stringify({ exportedAt: new Date().toISOString(), events }, null, 2);
  },

  destroy(): void {
    if (typeof window === 'undefined') return;
    document.removeEventListener('visibilitychange', this._visibilityHandler);
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
    }
    // Restore original pushState if we had replaced it
    if (this._originalPushState) {
      history.pushState = this._originalPushState;
      this._originalPushState = null;
    }
    // Stop flush loop and flush remaining events
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    if (pendingEvents.length > 0) {
      const events = getStoredEvents();
      events.push(...pendingEvents);
      persistEvents(events);
      pendingEvents = [];
    }
    this._initialized = false;
  },
};

export default AnalyticsEngine;
