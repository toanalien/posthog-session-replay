import { Env, SessionRecord, SessionEventRecord } from './types';

// In-memory fallback database for local preview/development mode
const inMemorySessions = new Map<string, SessionRecord>();
const inMemoryEvents: SessionEventRecord[] = [];
const inMemoryChunks = new Map<string, any[]>();

export class DatabaseService {
  constructor(private env: Env) {}

  async upsertSession(session: Partial<SessionRecord> & { id: string }): Promise<void> {
    if (this.env.DB) {
      const existing = await this.env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(session.id).first<SessionRecord>();

      if (existing) {
        const startTime = Math.min(existing.start_time, session.start_time || existing.start_time);
        const endTime = Math.max(existing.end_time, session.end_time || existing.end_time);
        const durationSeconds = Math.max(0, (endTime - startTime) / 1000);
        const eventCount = existing.event_count + (session.event_count || 0);
        const errorCount = existing.error_count + (session.error_count || 0);
        const rageClickCount = existing.rage_click_count + (session.rage_click_count || 0);
        const exitUrl = session.exit_url || existing.exit_url;

        await this.env.DB.prepare(`
          UPDATE sessions 
          SET start_time = ?, end_time = ?, duration_seconds = ?, event_count = ?, error_count = ?, 
              rage_click_count = ?, exit_url = ?, updated_at = strftime('%s', 'now')
          WHERE id = ?
        `).bind(
          startTime,
          endTime,
          durationSeconds,
          eventCount,
          errorCount,
          rageClickCount,
          exitUrl,
          session.id
        ).run();
      } else {
        const startTime = session.start_time || Date.now();
        const endTime = session.end_time || Date.now();
        const durationSeconds = Math.max(0, (endTime - startTime) / 1000);

        await this.env.DB.prepare(`
          INSERT INTO sessions (
            id, project_id, distinct_id, start_time, end_time, duration_seconds, active_seconds,
            event_count, error_count, rage_click_count, entry_url, exit_url, browser, os, device, country, user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          session.id,
          session.project_id || 'default',
          session.distinct_id || 'anonymous',
          startTime,
          endTime,
          durationSeconds,
          durationSeconds * 0.85,
          session.event_count || 0,
          session.error_count || 0,
          session.rage_click_count || 0,
          session.entry_url || '',
          session.exit_url || '',
          session.browser || 'Chrome',
          session.os || 'macOS',
          session.device || 'Desktop',
          session.country || 'US',
          session.user_agent || ''
        ).run();
      }
    } else {
      // In-memory mode fallback
      const existing = inMemorySessions.get(session.id);
      if (existing) {
        existing.start_time = Math.min(existing.start_time, session.start_time || existing.start_time);
        existing.end_time = Math.max(existing.end_time, session.end_time || existing.end_time);
        existing.duration_seconds = Math.max(0, (existing.end_time - existing.start_time) / 1000);
        existing.event_count += session.event_count || 0;
        existing.error_count += session.error_count || 0;
        existing.rage_click_count += session.rage_click_count || 0;
        if (session.exit_url) existing.exit_url = session.exit_url;
        existing.updated_at = Math.floor(Date.now() / 1000);
      } else {
        const startTime = session.start_time || Date.now();
        const endTime = session.end_time || Date.now();
        const durationSeconds = Math.max(0, (endTime - startTime) / 1000);
        const record: SessionRecord = {
          id: session.id,
          project_id: session.project_id || 'default',
          distinct_id: session.distinct_id || 'anonymous',
          start_time: startTime,
          end_time: endTime,
          duration_seconds: durationSeconds,
          active_seconds: durationSeconds * 0.85,
          event_count: session.event_count || 0,
          error_count: session.error_count || 0,
          rage_click_count: session.rage_click_count || 0,
          entry_url: session.entry_url || '',
          exit_url: session.exit_url || '',
          browser: session.browser || 'Chrome',
          os: session.os || 'macOS',
          device: session.device || 'Desktop',
          country: session.country || 'US',
          user_agent: session.user_agent || '',
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        };
        inMemorySessions.set(session.id, record);
      }
    }
  }

  async addSessionEvents(events: SessionEventRecord[]): Promise<void> {
    if (events.length === 0) return;
    if (this.env.DB) {
      const stmt = this.env.DB.prepare(`
        INSERT INTO session_events (id, session_id, project_id, timestamp, event_type, tag, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const batch = events.map(e => stmt.bind(e.id, e.session_id, e.project_id, e.timestamp, e.event_type, e.tag || '', e.data || '{}'));
      await this.env.DB.batch(batch);
    } else {
      inMemoryEvents.push(...events);
    }
  }

  async recordChunk(chunkId: string, sessionId: string, windowId: string, chunkIndex: number, r2Key: string, eventCount: number, startTime: number, endTime: number): Promise<void> {
    if (this.env.DB) {
      await this.env.DB.prepare(`
        INSERT INTO session_chunks (id, session_id, window_id, chunk_index, r2_key, event_count, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(chunkId, sessionId, windowId, chunkIndex, r2Key, eventCount, startTime, endTime).run();
    }
  }

  async listSessions(projectId: string = 'default', limit: number = 50, offset: number = 0, search: string = ''): Promise<{ sessions: SessionRecord[]; total: number }> {
    if (this.env.DB) {
      let query = 'SELECT * FROM sessions WHERE project_id = ?';
      const params: any[] = [projectId];

      if (search) {
        query += ' AND (distinct_id LIKE ? OR entry_url LIKE ? OR browser LIKE ? OR os LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const { results } = await this.env.DB.prepare(query).bind(...params).all<SessionRecord>();
      
      const countRes = await this.env.DB.prepare('SELECT COUNT(*) as count FROM sessions WHERE project_id = ?').bind(projectId).first<{ count: number }>();
      
      return {
        sessions: results || [],
        total: countRes?.count || 0
      };
    } else {
      let list = Array.from(inMemorySessions.values()).filter(s => s.project_id === projectId);
      if (search) {
        const lower = search.toLowerCase();
        list = list.filter(s => 
          s.distinct_id.toLowerCase().includes(lower) || 
          s.entry_url.toLowerCase().includes(lower) ||
          s.browser.toLowerCase().includes(lower)
        );
      }
      list.sort((a, b) => b.start_time - a.start_time);
      return {
        sessions: list.slice(offset, offset + limit),
        total: list.length
      };
    }
  }

  async getSessionById(sessionId: string): Promise<SessionRecord | null> {
    if (this.env.DB) {
      return await this.env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(sessionId).first<SessionRecord>();
    } else {
      return inMemorySessions.get(sessionId) || null;
    }
  }

  async getSessionEvents(sessionId: string): Promise<SessionEventRecord[]> {
    if (this.env.DB) {
      const { results } = await this.env.DB.prepare('SELECT * FROM session_events WHERE session_id = ? ORDER BY timestamp ASC').bind(sessionId).all<SessionEventRecord>();
      return results || [];
    } else {
      return inMemoryEvents.filter(e => e.session_id === sessionId).sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  saveInMemoryChunk(sessionId: string, events: any[]) {
    const existing = inMemoryChunks.get(sessionId) || [];
    inMemoryChunks.set(sessionId, [...existing, ...events]);
  }

  getInMemoryChunks(sessionId: string): any[] {
    return inMemoryChunks.get(sessionId) || [];
  }
}
