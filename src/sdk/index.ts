import * as rrweb from 'rrweb';

export interface UrchinSdkConfig {
  endpoint?: string;
  projectId?: string;
  distinctId?: string;
  maskAllInputs?: boolean;
  maskTextSelector?: string;
  flushIntervalMs?: number;
  debug?: boolean;
}

export class UrchinReplaySDK {
  private endpoint: string;
  private projectId: string;
  private distinctId: string;
  private sessionId: string;
  private windowId: string;
  private eventQueue: any[] = [];
  private chunkIndex = 0;
  private stopRecordingFn: (() => void) | null = null;
  private flushTimer: any = null;
  private maskAllInputs: boolean;
  private maskTextSelector?: string;
  private debug: boolean;

  constructor(config: UrchinSdkConfig = {}) {
    this.endpoint = config.endpoint || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8787');
    this.projectId = config.projectId || 'default';
    this.distinctId = config.distinctId || this.getOrCreateDistinctId();
    this.sessionId = this.getOrCreateSessionId();
    this.windowId = 'win_' + Math.random().toString(36).substring(2, 9);
    this.maskAllInputs = config.maskAllInputs ?? true;
    this.maskTextSelector = config.maskTextSelector;
    this.debug = config.debug ?? false;

    const interval = config.flushIntervalMs || 5000;
    this.startFlushLoop(interval);
    this.setupConsoleInterceptor();
    this.setupNetworkInterceptor();
    this.setupUnloadHandler();
  }

  public start() {
    if (typeof window === 'undefined') return;

    if (this.debug) {
      console.log(`[UrchinSDK] Starting session recording for Session: ${this.sessionId}`);
    }

    // Emit Initial Pageview Custom Event
    this.recordCustomEvent('$pageview', {
      href: window.location.href,
      pathname: window.location.pathname,
      title: document.title,
      referrer: document.referrer
    });

    try {
      this.stopRecordingFn = rrweb.record({
        emit: (event) => {
          this.eventQueue.push(event);
          if (this.eventQueue.length >= 100) {
            this.flush();
          }
        },
        maskAllInputs: this.maskAllInputs,
        maskTextSelector: this.maskTextSelector,
        blockClass: 'ph-no-capture',
        maskTextClass: 'ph-mask',
        inlineStylesheet: true,
        collectFonts: true,
      }) || null;
    } catch (e) {
      console.error('[UrchinSDK] Failed to initialize rrweb recorder:', e);
    }
  }

  public stop() {
    if (this.stopRecordingFn) {
      this.stopRecordingFn();
      this.stopRecordingFn = null;
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  public recordCustomEvent(tag: string, payload: any) {
    const customEvt = {
      type: 5, // Custom Event in rrweb spec
      data: { tag, payload },
      timestamp: Date.now()
    };
    this.eventQueue.push(customEvt);
  }

  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    const payload = {
      projectId: this.projectId,
      sessionId: this.sessionId,
      windowId: this.windowId,
      distinctId: this.distinctId,
      chunkIndex: this.chunkIndex++,
      events: eventsToFlush,
      metadata: {
        userAgent: navigator.userAgent,
        href: window.location.href,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      }
    };

    const targetUrl = `${this.endpoint.replace(/\/$/, '')}/api/v1/projects/${this.projectId}/snapshots`;

    if (this.debug) {
      console.log(`[UrchinSDK] Flushing ${eventsToFlush.length} events to ${targetUrl}`);
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.warn('[UrchinSDK] Flush failed status:', response.status);
      }
    } catch (err) {
      console.error('[UrchinSDK] Flush network error:', err);
      // Re-queue un-sent events to prevent data loss
      this.eventQueue = [...eventsToFlush, ...this.eventQueue];
    }
  }

  private startFlushLoop(intervalMs: number) {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, intervalMs);
  }

  private setupConsoleInterceptor() {
    if (typeof window === 'undefined') return;
    const methods: Array<'log' | 'warn' | 'error'> = ['log', 'warn', 'error'];

    methods.forEach((level) => {
      const original = console[level];
      console[level] = (...args: any[]) => {
        try {
          const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          this.recordCustomEvent('$console_log', { level, message, timestamp: Date.now() });
        } catch (_) {}
        original.apply(console, args);
      };
    });
  }

  private setupNetworkInterceptor() {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;
    const sdk = this;

    window.fetch = async function (...args) {
      const startTime = Date.now();
      let url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      let method = (args[1]?.method || 'GET').toUpperCase();

      // Don't capture our own ingestion calls to avoid feedback loops
      if (url.includes('/api/v1/projects/') && url.includes('/snapshots')) {
        return originalFetch.apply(this, args);
      }

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;
        sdk.recordCustomEvent('$network_request', {
          url,
          method,
          status: response.status,
          duration,
          timestamp: startTime
        });
        return response;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        sdk.recordCustomEvent('$network_request', {
          url,
          method,
          status: 0,
          error: err.message,
          duration,
          timestamp: startTime
        });
        throw err;
      }
    };
  }

  private setupUnloadHandler() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        const payload = JSON.stringify({
          projectId: this.projectId,
          sessionId: this.sessionId,
          windowId: this.windowId,
          distinctId: this.distinctId,
          chunkIndex: this.chunkIndex++,
          events: this.eventQueue,
          metadata: { userAgent: navigator.userAgent, href: window.location.href }
        });
        const targetUrl = `${this.endpoint.replace(/\/$/, '')}/api/v1/projects/${this.projectId}/snapshots`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(targetUrl, payload);
        }
      }
    });
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'session_node';
    let sid = sessionStorage.getItem('urchin_session_id');
    if (!sid) {
      sid = 'sid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('urchin_session_id', sid);
    }
    return sid;
  }

  private getOrCreateDistinctId(): string {
    if (typeof window === 'undefined') return 'anon_node';
    let did = localStorage.getItem('urchin_distinct_id');
    if (!did) {
      did = 'usr_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('urchin_distinct_id', did);
    }
    return did;
  }
}

// Global script attachment helper
if (typeof window !== 'undefined') {
  (window as any).UrchinReplaySDK = UrchinReplaySDK;
}
