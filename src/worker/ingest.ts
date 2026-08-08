import { DatabaseService } from './db';
import { StorageService } from './storage';
import { IngestPayload, RRWebEvent, SessionEventRecord } from './types';

export class IngestService {
  constructor(
    private db: DatabaseService,
    private storage: StorageService
  ) {}

  async processIngest(payload: IngestPayload, userAgentHeader: string = '', cfCountry: string = 'US'): Promise<{ success: boolean; eventCount: number }> {
    const { sessionId, events } = payload;
    const projectId = payload.projectId || 'default';
    const distinctId = payload.distinctId || 'anonymous';
    const windowId = payload.windowId || 'window-1';
    const chunkIndex = payload.chunkIndex || 0;

    if (!events || events.length === 0) {
      return { success: true, eventCount: 0 };
    }

    // 1. Save raw events to R2 bucket & in-memory fallback
    const r2Key = await this.storage.saveChunk(projectId, sessionId, chunkIndex, events);
    this.db.saveInMemoryChunk(sessionId, events);

    // 2. Extract timestamps and metrics
    const timestamps = events.map(e => e.timestamp).filter(Boolean);
    const startTime = Math.min(...timestamps);
    const endTime = Math.max(...timestamps);

    // Parse user agent
    const userAgent = payload.metadata?.userAgent || userAgentHeader || '';
    const browser = this.detectBrowser(userAgent);
    const os = this.detectOS(userAgent);
    const device = userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone') ? 'Mobile' : 'Desktop';

    let errorCount = 0;
    let rageClickCount = 0;
    let entryUrl = payload.metadata?.href || '';
    let exitUrl = payload.metadata?.href || '';
    const extractedEvents: SessionEventRecord[] = [];

    // Analyze events
    const clickTimestamps: number[] = [];

    for (const evt of events) {
      // Check Meta event for href
      if (evt.type === 4 && evt.data?.href) {
        if (!entryUrl) entryUrl = evt.data.href;
        exitUrl = evt.data.href;
      }

      // Check Custom events ($console_log, $network_request, $pageview)
      if (evt.type === 5 && evt.data?.tag) {
        const tag = evt.data.tag;
        const payloadData = evt.data.payload;

        if (tag === '$console_log' && payloadData?.level === 'error') {
          errorCount++;
          extractedEvents.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            session_id: sessionId,
            project_id: projectId,
            timestamp: evt.timestamp,
            event_type: 'console_error',
            tag: 'error',
            data: JSON.stringify(payloadData)
          });
        } else if (tag === '$pageview') {
          if (!entryUrl) entryUrl = payloadData?.href || '';
          exitUrl = payloadData?.href || exitUrl;
          extractedEvents.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            session_id: sessionId,
            project_id: projectId,
            timestamp: evt.timestamp,
            event_type: 'pageview',
            tag: payloadData?.title || 'Page View',
            data: JSON.stringify(payloadData)
          });
        }
      }

      // Check IncrementalSnapshot for Clicks & Rage clicks
      if (evt.type === 3 && evt.data?.source === 2 && evt.data?.type === 2) {
        // Mouse click
        clickTimestamps.push(evt.timestamp);
      }
    }

    // Rage click algorithm: 3 or more clicks within 800ms window
    clickTimestamps.sort((a, b) => a - b);
    for (let i = 0; i < clickTimestamps.length - 2; i++) {
      if (clickTimestamps[i + 2] - clickTimestamps[i] <= 800) {
        rageClickCount++;
        extractedEvents.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          session_id: sessionId,
          project_id: projectId,
          timestamp: clickTimestamps[i],
          event_type: 'rage_click',
          tag: 'Rage Click',
          data: JSON.stringify({ timestamp: clickTimestamps[i] })
        });
        i += 2; // skip past this rage cluster
      }
    }

    // 3. Upsert session metadata in D1 database
    await this.db.upsertSession({
      id: sessionId,
      project_id: projectId,
      distinct_id: distinctId,
      start_time: startTime,
      end_time: endTime,
      event_count: events.length,
      error_count: errorCount,
      rage_click_count: rageClickCount,
      entry_url: entryUrl,
      exit_url: exitUrl,
      browser,
      os,
      device,
      country: cfCountry,
      user_agent: userAgent
    });

    // 4. Save extracted session events
    if (extractedEvents.length > 0) {
      await this.db.addSessionEvents(extractedEvents);
    }

    // 5. Record chunk entry
    const chunkId = `chk_${sessionId}_${chunkIndex}_${Date.now()}`;
    await this.db.recordChunk(chunkId, sessionId, windowId, chunkIndex, r2Key, events.length, startTime, endTime);

    return { success: true, eventCount: events.length };
  }

  private detectBrowser(ua: string): string {
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/')) return 'Safari';
    return 'Browser';
  }

  private detectOS(ua: string): string {
    if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
  }
}
