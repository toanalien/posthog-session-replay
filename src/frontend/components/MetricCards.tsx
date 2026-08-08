import React from 'react';
import { Video, Clock, AlertTriangle, Flame } from 'lucide-react';

interface MetricCardsProps {
  totalSessions: number;
  avgDurationSec: number;
  totalErrors: number;
  totalRageClicks: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalSessions,
  avgDurationSec,
  totalErrors,
  totalRageClicks,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return mins > 0 ? `${mins}m ${remainder}s` : `${remainder}s`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      
      {/* Total Sessions */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sessions</p>
            <h3 className="text-3xl font-extrabold mt-1 text-white tracking-tight">{totalSessions}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Video className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs text-purple-300/80 mt-3 font-medium flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse"></span>
          Ingesting via Cloudflare Workers
        </p>
      </div>

      {/* Average Duration */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg. Duration</p>
            <h3 className="text-3xl font-extrabold mt-1 text-white tracking-tight">{formatTime(avgDurationSec)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs text-cyan-300/80 mt-3 font-medium">Recorded user engagements</p>
      </div>

      {/* Console Errors */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Errors Recorded</p>
            <h3 className="text-3xl font-extrabold mt-1 text-rose-400 tracking-tight">{totalErrors}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs text-rose-300/80 mt-3 font-medium">Browser uncaught exceptions</p>
      </div>

      {/* Rage Clicks */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rage Clicks</p>
            <h3 className="text-3xl font-extrabold mt-1 text-amber-400 tracking-tight">{totalRageClicks}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs text-amber-300/80 mt-3 font-medium">Frustrated click clusters</p>
      </div>

    </div>
  );
};
