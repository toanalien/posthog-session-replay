import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DatabaseService } from './db';
import { StorageService } from './storage';
import { IngestService } from './ingest';
import { Env, IngestPayload } from './types';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for cross-origin recording and SDK requests
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Urchin-Project-Key'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

// Ingest endpoint (matches PostHog snapshot ingestion behavior)
app.post('/api/v1/projects/:projectId/snapshots', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const body = await c.req.json<IngestPayload>();
    body.projectId = projectId;

    const db = new DatabaseService(c.env);
    const storage = new StorageService(c.env);
    const ingest = new IngestService(db, storage);

    const userAgent = c.req.header('user-agent') || '';
    const cfCountry = (c.req.raw as any).cf?.country || 'US';

    const result = await ingest.processIngest(body, userAgent, cfCountry);
    return c.json({ status: 'ok', ...result });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return c.json({ error: err.message || 'Ingest failed' }, 500);
  }
});

// Alternative shorthand ingest endpoint
app.post('/api/v1/snapshots', async (c) => {
  try {
    const body = await c.req.json<IngestPayload>();
    const projectId = body.projectId || 'default';

    const db = new DatabaseService(c.env);
    const storage = new StorageService(c.env);
    const ingest = new IngestService(db, storage);

    const userAgent = c.req.header('user-agent') || '';
    const cfCountry = (c.req.raw as any).cf?.country || 'US';

    const result = await ingest.processIngest(body, userAgent, cfCountry);
    return c.json({ status: 'ok', ...result });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return c.json({ error: err.message || 'Ingest failed' }, 500);
  }
});

// List sessions for a project
app.get('/api/v1/projects/:projectId/sessions', async (c) => {
  const projectId = c.req.param('projectId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const search = c.req.query('search') || '';

  const db = new DatabaseService(c.env);
  const result = await db.listSessions(projectId, limit, offset, search);

  return c.json(result);
});

// Get session details and extracted timeline events
app.get('/api/v1/projects/:projectId/sessions/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = new DatabaseService(c.env);

  const session = await db.getSessionById(sessionId);
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const events = await db.getSessionEvents(sessionId);
  return c.json({ session, timelineEvents: events });
});

// Get full replay snapshots stream for player playback
app.get('/api/v1/projects/:projectId/sessions/:sessionId/snapshots', async (c) => {
  const projectId = c.req.param('projectId');
  const sessionId = c.req.param('sessionId');

  const db = new DatabaseService(c.env);
  const storage = new StorageService(c.env);

  // Try R2 storage first
  let r2Events = await storage.getSessionChunks(projectId, sessionId);
  
  // Fallback to in-memory store
  if (r2Events.length === 0) {
    r2Events = db.getInMemoryChunks(sessionId);
  }

  return c.json({ sessionId, events: r2Events });
});

export default app;
