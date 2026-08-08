import React from 'react';
import { Search, Filter, AlertTriangle, Flame, X } from 'lucide-react';

interface SessionFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onlyErrors: boolean;
  setOnlyErrors: (v: boolean) => void;
  onlyRageClicks: boolean;
  setOnlyRageClicks: (v: boolean) => void;
  minDuration: number;
  setMinDuration: (d: number) => void;
  onReset: () => void;
}

export const SessionFilterBar: React.FC<SessionFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  onlyErrors,
  setOnlyErrors,
  onlyRageClicks,
  setOnlyRageClicks,
  minDuration,
  setMinDuration,
  onReset
}) => {
  return (
    <div className="glass-panel p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4">
      
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter sessions by user ID, URL, browser..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/80 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Toggles */}
      <div className="flex items-center space-x-2 flex-wrap">
        
        {/* Errors Only */}
        <button
          onClick={() => setOnlyErrors(!onlyErrors)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
            onlyErrors
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/10'
              : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Has Errors</span>
        </button>

        {/* Rage Clicks Only */}
        <button
          onClick={() => setOnlyRageClicks(!onlyRageClicks)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
            onlyRageClicks
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
              : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Rage Clicks</span>
        </button>

        {/* Min Duration Dropdown */}
        <select
          value={minDuration}
          onChange={(e) => setMinDuration(Number(e.target.value))}
          className="bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
        >
          <option value={0}>All Durations</option>
          <option value={5}>&gt; 5 seconds</option>
          <option value={15}>&gt; 15 seconds</option>
          <option value={60}>&gt; 1 minute</option>
        </select>

        {(searchQuery || onlyErrors || onlyRageClicks || minDuration > 0) && (
          <button
            onClick={onReset}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 underline underline-offset-2 transition"
          >
            Clear Filters
          </button>
        )}

      </div>

    </div>
  );
};
