import { storage } from './storage';
import { CONFIG } from './config';

/**
 * Analytics event types for tracking user interactions.
 * Events are batched and sent periodically to reduce API calls.
 */
export type AnalyticsEvent =
  // Extension lifecycle
  | 'extension_installed'
  | 'extension_opened'
  | 'sidepanel_opened'
  // Inbox events
  | 'inbox_created_quick'
  | 'inbox_created_anonymous'
  | 'inbox_created_manual'
  | 'inbox_created_custom'
  | 'inbox_deleted'
  | 'inbox_extended'
  | 'inbox_made_permanent'
  // Message events
  | 'message_viewed'
  | 'message_deleted'
  | 'message_searched'
  | 'message_composed'
  // Feature usage
  | 'qr_code_generated'
  | 'qr_code_downloaded'
  | 'referral_shared'
  | 'autofill_used'
  // Onboarding
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  // Auth & settings
  | 'login_success'
  | 'logout'
  | 'settings_updated'
  | 'theme_changed';

interface QueuedEvent {
  event: AnalyticsEvent;
  metadata: Record<string, any>;
  timestamp: string;
}

// Batching configuration
const BATCH_INTERVAL_MS = 30000; // Send every 30 seconds
const BATCH_SIZE_THRESHOLD = 10; // Or when 10 events accumulated
const STORAGE_KEY = 'analyticsQueue';

/**
 * Analytics class with event batching for efficient API usage.
 * Events are queued locally and sent in batches to reduce network overhead.
 */
class Analytics {
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load any queued events from previous session
    try {
      const stored = await storage.get(STORAGE_KEY as any);
      if (Array.isArray(stored)) {
        this.queue = stored;
      }
    } catch {
      // Ignore storage errors
    }

    // Start periodic flush timer
    this.startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flush();
      this.startFlushTimer();
    }, BATCH_INTERVAL_MS);
  }

  /**
   * Track an analytics event. Events are queued and batched automatically.
   */
  track(event: AnalyticsEvent, metadata: Record<string, any> = {}) {
    const queuedEvent: QueuedEvent = {
      event,
      metadata,
      timestamp: new Date().toISOString(),
    };

    this.queue.push(queuedEvent);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}:`, metadata);
    }

    // Persist queue to storage
    this.persistQueue();

    // Flush if threshold reached
    if (this.queue.length >= BATCH_SIZE_THRESHOLD) {
      this.flush();
    }
  }

  private async persistQueue() {
    try {
      await storage.set(STORAGE_KEY as any, this.queue);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Flush all queued events to the backend.
   */
  async flush() {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];
    await this.persistQueue();

    try {
      const deviceId = await storage.getDeviceId();
      const auth = await storage.getAuth();
      const settings = await storage.getSettings();

      const payload = {
        deviceId,
        userId: auth.user?.id || null,
        isAnonymous: auth.isAnonymous,
        platform: 'web-extension',
        theme: settings.theme,
        events: eventsToSend,
      };

      // Send to backend
      const response = await fetch(`${CONFIG.API_URL}/extension/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.queue = [...eventsToSend, ...this.queue];
        await this.persistQueue();
      }
    } catch {
      // Re-queue events on network error
      this.queue = [...eventsToSend, ...this.queue];
      await this.persistQueue();
    }
  }

  /**
   * Check if this is the first install of the extension.
   */
  async isFirstInstall(): Promise<boolean> {
    const installed = await storage.get('extensionInstalled' as any);
    return !installed;
  }

  /**
   * Mark extension as installed (call after first-install onboarding).
   */
  async markInstalled() {
    await storage.set('extensionInstalled' as any, true);
    this.track('extension_installed');
  }

  /**
   * Get onboarding status.
   */
  async getOnboardingStatus(): Promise<{ completed: boolean; step: number }> {
    const status = await storage.get('onboardingStatus' as any);
    return status || { completed: false, step: 0 };
  }

  /**
   * Update onboarding progress.
   */
  async setOnboardingStatus(completed: boolean, step: number) {
    await storage.set('onboardingStatus' as any, { completed, step });
  }
}

export const analytics = new Analytics();
