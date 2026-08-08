import { Env, RRWebEvent } from './types';

export class StorageService {
  constructor(private env: Env) {}

  async saveChunk(projectId: string, sessionId: string, chunkIndex: number, events: RRWebEvent[]): Promise<string> {
    const r2Key = `projects/${projectId}/sessions/${sessionId}/chunk_${chunkIndex}_${Date.now()}.json`;
    const payload = JSON.stringify(events);

    if (this.env.REPLAY_BUCKET) {
      await this.env.REPLAY_BUCKET.put(r2Key, payload, {
        httpMetadata: { contentType: 'application/json' },
        customMetadata: { projectId, sessionId, eventCount: events.length.toString() }
      });
    }
    return r2Key;
  }

  async getSessionChunks(projectId: string, sessionId: string): Promise<RRWebEvent[]> {
    if (!this.env.REPLAY_BUCKET) {
      return [];
    }

    const prefix = `projects/${projectId}/sessions/${sessionId}/`;
    const objects = await this.env.REPLAY_BUCKET.list({ prefix });

    const allEvents: RRWebEvent[] = [];

    // Sort objects by key or metadata timestamp
    const sortedKeys = objects.objects.sort((a, b) => a.key.localeCompare(b.key));

    for (const obj of sortedKeys) {
      const item = await this.env.REPLAY_BUCKET.get(obj.key);
      if (item) {
        const text = await item.text();
        try {
          const events: RRWebEvent[] = JSON.parse(text);
          allEvents.push(...events);
        } catch (e) {
          console.error(`Failed to parse chunk ${obj.key}:`, e);
        }
      }
    }

    return allEvents;
  }
}
