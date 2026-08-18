-- D1 Migration Schema for Urchin Session Replay

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL DEFAULT 'default',
    distinct_id TEXT NOT NULL DEFAULT 'anonymous',
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration_seconds REAL DEFAULT 0,
    active_seconds REAL DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    rage_click_count INTEGER DEFAULT 0,
    entry_url TEXT DEFAULT '',
    exit_url TEXT DEFAULT '',
    browser TEXT DEFAULT 'Unknown',
    os TEXT DEFAULT 'Unknown',
    device TEXT DEFAULT 'Desktop',
    country TEXT DEFAULT 'US',
    user_agent TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS session_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    project_id TEXT NOT NULL DEFAULT 'default',
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    tag TEXT DEFAULT '',
    data TEXT DEFAULT '{}',
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_chunks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    window_id TEXT DEFAULT '',
    chunk_index INTEGER NOT NULL DEFAULT 0,
    r2_key TEXT NOT NULL,
    event_count INTEGER DEFAULT 0,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_distinct ON sessions(distinct_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_chunks_session ON session_chunks(session_id, chunk_index ASC);

-- Insert default project if not exists
INSERT OR IGNORE INTO projects (id, name, api_key) VALUES ('default', 'Default Project', 'urchin_demo_local_key');
