import React from 'react';
import { Play, Flame, ShieldAlert, Cpu, Github, ExternalLink, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onOpenDemo: () => void;
  onRefresh: () => void;
  sessionCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo, onRefresh, sessionCount }) => {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-[1.5px] shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#0b0f19] rounded-[10.5px] flex items-center justify-center">
              <Play className="w-5 h-5 text-purple-400 fill-purple-400 ml-0.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-purple-300">
                Urchin
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                CF Workers Stack
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Session Replay for Cloudflare</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg transition"
            title="Refresh session data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>

          <a
            href="/demo.html"
            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition"
            title="Open standalone store demo with Urchin SDK"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Demo Store</span>
          </a>

          <button
            onClick={onOpenDemo}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg shadow-md shadow-purple-600/20 transition transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Record Live Demo</span>
          </button>

          <a
            href="https://github.com/toanalien/posthog-session-replay"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 rounded-lg transition"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>

      </div>
    </header>
  );
};
