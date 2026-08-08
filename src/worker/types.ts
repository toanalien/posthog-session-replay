export interface Env {
  DB?: D1Database;
  REPLAY_BUCKET?: R2Bucket;
}

export interface RRWebEvent {
  type: number; // 0 = DomContentLoaded, 1 = Load, 2 = FullSnapshot, 3 = IncrementalSnapshot, 4 = Meta, 5 = Custom
  data: any;
  timestamp: number;
}

export interface IngestPayload {
  projectId?: string;
  sessionId: string;
  windowId?: string;
  distinctId?: string;
  chunkIndex?: number;
  events: RRWebEvent[];
  metadata?: {
    userAgent?: string;
    href?: string;
    viewport?: { width: number; height: number };
  };
}

export interface SessionRecord {
  id: string;
  project_id: string;
  distinct_id: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  active_seconds: number;
  event_count: number;
  error_count: number;
  rage_click_count: number;
  entry_url: string;
  exit_url: string;
  browser: string;
  os: string;
  device: string;
  country: string;
  user_agent: string;
  created_at: number;
  updated_at: number;
}

export interface SessionEventRecord {
  id: string;
  session_id: string;
  project_id: string;
  timestamp: number;
  event_type: string;
  tag?: string;
  data?: string;
}
