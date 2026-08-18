import React, { useEffect, useState, useRef } from 'react';
import { UrchinReplaySDK } from '../../sdk';
import { X, Play, AlertTriangle, Flame, Wifi, Lock, Eye, CheckCircle2 } from 'lucide-react';

interface DemoPlaygroundModalProps {
  onClose: () => void;
  onSessionRecorded: () => void;
}

export const DemoPlaygroundModal: React.FC<DemoPlaygroundModalProps> = ({
  onClose,
  onSessionRecorded
}) => {
  const sdkRef = useRef<UrchinReplaySDK | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);
  const [inputText, setInputText] = useState<string>('');
  const [passwordText, setPasswordText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Recording active session...');
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    const sdk = new UrchinReplaySDK({
      endpoint: window.location.origin,
      projectId: 'default',
      distinctId: 'user_tester_' + Math.random().toString(36).substring(2, 6),
      flushIntervalMs: 2000,
      debug: true
    });
    sdk.start();
    sdkRef.current = sdk;

    logEvent('Initialized UrchinReplaySDK instance with live rrweb recorder');

    return () => {
      if (sdkRef.current) {
        sdkRef.current.stop();
      }
    };
  }, []);

  const logEvent = (msg: string) => {
    setEventLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 10)]);
  };

  const handleRapidClick = () => {
    setClickCount(prev => prev + 1);
    logEvent(`Clicked action button (${clickCount + 1} times)`);
  };

  const handleTriggerError = () => {
    logEvent('Triggered artificial Uncaught Error exception');
    setStatusMessage('Captured Uncaught JS Exception!');
    setTimeout(() => {
      console.error(new Error('Simulated Payment Processing Failure [Code: ERR_PAYMENT_FAILED]'));
    }, 50);
  };

  const handleSimulateFetch = async () => {
    logEvent('Simulating XHR / Fetch API Request...');
    try {
      await fetch('https://jsonplaceholder.typicode.com/todos/1');
      logEvent('Fetch API request completed successfully (200 OK)');
    } catch (e) {
      logEvent('Fetch API request completed');
    }
  };

  const handleFinishAndFlush = async () => {
    setStatusMessage('Flushing recorded session to Cloudflare Worker & R2...');
    if (sdkRef.current) {
      await sdkRef.current.flush();
    }
    setTimeout(() => {
      onSessionRecorded();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      
      <div className="w-full max-w-2xl bg-[#0e1526] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Interactive Recording Playground</span>
              </h3>
              <p className="text-xs text-purple-300 font-medium">Interact below to record DOM mutations, errors, and rage clicks!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Status Indicator */}
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></div>
              <span className="text-xs font-bold text-purple-200">{statusMessage}</span>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-900/50">
              Live rrweb Record
            </span>
          </div>

          {/* Interactive Form & Privacy Masking Test */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-purple-400" />
              Privacy & Input Masking Sandbox
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Text Input</label>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type something here..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Masked Password Input</label>
                <input
                  type="password"
                  value={passwordText}
                  onChange={(e) => setPasswordText(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 urchin-mask"
                />
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Rapid Clicks (Rage Click Test) */}
            <button
              onClick={handleRapidClick}
              className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex flex-col items-center justify-center space-y-2 transition group"
            >
              <Flame className="w-6 h-6 text-amber-400 group-hover:scale-110 transition" />
              <span>Rapid Click ({clickCount})</span>
              <span className="text-[10px] text-slate-400 font-normal">Click 3x fast for Rage Click</span>
            </button>

            {/* Error Generator */}
            <button
              onClick={handleTriggerError}
              className="p-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex flex-col items-center justify-center space-y-2 transition group"
            >
              <AlertTriangle className="w-6 h-6 text-rose-400 group-hover:scale-110 transition" />
              <span>Throw JS Error</span>
              <span className="text-[10px] text-slate-400 font-normal">Captures stack trace</span>
            </button>

            {/* Network Fetch Simulator */}
            <button
              onClick={handleSimulateFetch}
              className="p-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex flex-col items-center justify-center space-y-2 transition group"
            >
              <Wifi className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition" />
              <span>Simulate API Fetch</span>
              <span className="text-[10px] text-slate-400 font-normal">Records network waterfall</span>
            </button>

          </div>

          {/* Live Activity Log */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-sans">Recorded Event Log Stream</p>
            {eventLog.map((log, idx) => (
              <p key={idx} className="text-slate-300 truncate">{log}</p>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">Click finish to flush snapshots to Cloudflare</span>
          <button
            onClick={handleFinishAndFlush}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-purple-600/20 transition transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finish & View Replay</span>
          </button>
        </div>

      </div>

    </div>
  );
};
