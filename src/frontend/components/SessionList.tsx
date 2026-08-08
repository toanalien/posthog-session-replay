import React from 'react';
import { SessionRecord } from '../../worker/types';
import { Play, Clock, AlertTriangle, Flame, Monitor, Smartphone, Globe, User, ArrowRight } from 'lucide-react';

interface SessionListProps {
  sessions: SessionRecord[];
  onSelectSession: (session: SessionRecord) => void;
  isLoading: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onSelectSession,
  isLoading
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return mins > 0 ? `${mins}m ${remainder}s` : `${remainder}s`;
  };

  const formatDate = (tsMs: number) => {
    const d = new Date(tsMs);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400">Loading Session Replays from Cloudflare D1...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <Play className="w-6 h-6 ml-0.5" />
        </div>
        <h4 className="text-lg font-bold text-white">No Session Replays Found</h4>
        <p className="text-xs text-slate-400 max-w-md">
          No recorded sessions match your filter criteria or no sessions have been ingested yet. Click "Record Live Demo" above to record a real-time session!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelectSession(s)}
          className="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 cursor-pointer group"
        >
          {/* User & Location */}
          <div className="flex items-center space-x-3.5 min-w-[220px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-extrabold text-sm group-hover:scale-105 transition">
              {s.distinct_id.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                  {s.distinct_id}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {s.country}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium flex items-center mt-0.5">
                <Globe className="w-3 h-3 mr-1 text-slate-500" />
                {s.browser} · {s.os}
              </p>
            </div>
          </div>

          {/* Entry URL */}
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-slate-300 font-semibold truncate max-w-sm" title={s.entry_url || '/'}>
              {s.entry_url || '/'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formatDate(s.start_time)}
            </p>
          </div>

          {/* Duration & Badges */}
          <div className="flex items-center space-x-3">
            
            {/* Duration Badge */}
            <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{formatTime(s.duration_seconds)}</span>
            </div>

            {/* Error Badge */}
            {s.error_count > 0 && (
              <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs font-bold text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{s.error_count} error{s.error_count > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Rage Click Badge */}
            {s.rage_click_count > 0 && (
              <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{s.rage_click_count} rage click{s.rage_click_count > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Play Button */}
            <button className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-500 text-xs font-bold text-purple-300 hover:text-white transition group-hover:shadow-lg group-hover:shadow-purple-500/20">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Replay</span>
            </button>

          </div>

        </div>
      ))}
    </div>
  );
};
