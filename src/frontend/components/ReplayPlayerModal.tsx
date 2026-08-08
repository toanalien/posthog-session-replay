import React, { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import { SessionRecord, SessionEventRecord, RRWebEvent } from '../../worker/types';
import {
  X, Play, Pause, FastForward, Activity, Terminal, Wifi, Info,
  AlertTriangle, Flame, ExternalLink, ShieldAlert, Monitor, CheckCircle, Clock
} from 'lucide-react';

interface ReplayPlayerModalProps {
  session: SessionRecord;
  onClose: () => void;
  apiEndpoint?: string;
}

export const ReplayPlayerModal: React.FC<ReplayPlayerModalProps> = ({
  session,
  onClose,
  apiEndpoint = ''
}) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<'timeline' | 'console' | 'network' | 'info'>('timeline');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [skipInactive, setSkipInactive] = useState<boolean>(true);
  const [events, setEvents] = useState<RRWebEvent[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<SessionEventRecord[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);

  // Fetch full rrweb snapshots and timeline details
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const snapRes = await fetch(`${apiEndpoint}/api/v1/projects/${session.project_id}/sessions/${session.id}/snapshots`);
        const snapData: any = await snapRes.json();
        
        const sessRes = await fetch(`${apiEndpoint}/api/v1/projects/${session.project_id}/sessions/${session.id}`);
        const sessData: any = await sessRes.json();

        if (isMounted) {
          const rawEvts: RRWebEvent[] = snapData.events || [];
          setEvents(rawEvts);
          setTimelineEvents(sessData.timelineEvents || []);

          // Extract console logs and network requests from raw events
          const logs: any[] = [];
          const nets: any[] = [];

          rawEvts.forEach(evt => {
            if (evt.type === 5 && evt.data?.tag) {
              if (evt.data.tag === '$console_log') {
                logs.push({ ...evt.data.payload, timestamp: evt.timestamp });
              } else if (evt.data.tag === '$network_request') {
                nets.push({ ...evt.data.payload, timestamp: evt.timestamp });
              }
            }
          });

          setConsoleLogs(logs);
          setNetworkRequests(nets);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load session snapshots:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      if (playerInstanceRef.current) {
        try { playerInstanceRef.current.pause(); } catch (_) {}
      }
    };
  }, [session.id]);

  // Instantiate rrweb player when events are ready
  useEffect(() => {
    if (isLoading || events.length === 0 || !playerContainerRef.current) return;

    // Clean up existing player instance
    if (playerInstanceRef.current) {
      playerContainerRef.current.innerHTML = '';
      playerInstanceRef.current = null;
    }

    try {
      const player = new rrwebPlayer({
        target: playerContainerRef.current,
        props: {
          events: events,
          width: playerContainerRef.current.clientWidth || 800,
          height: 480,
          autoPlay: true,
          speed: speed,
          skipInactive: skipInactive,
          showController: true,
        },
      });

      playerInstanceRef.current = player;
      setIsPlaying(true);

      player.addEventListener('ui-update-current-time', (time: any) => {
        setCurrentTimeMs(Number(time) || 0);
      });
    } catch (e) {
      console.error('Error mounting rrweb-player:', e);
    }

    return () => {
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
    };
  }, [isLoading, events]);

  const togglePlay = () => {
    if (!playerInstanceRef.current) return;
    if (isPlaying) {
      playerInstanceRef.current.pause();
      setIsPlaying(false);
    } else {
      playerInstanceRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (playerInstanceRef.current) {
      playerInstanceRef.current.setSpeed(newSpeed);
    }
  };

  const seekToTimestamp = (targetTimeMs: number) => {
    if (!playerInstanceRef.current || events.length === 0) return;
    const startTime = events[0].timestamp;
    const offset = Math.max(0, targetTimeMs - startTime);
    try {
      playerInstanceRef.current.goto(offset, true);
    } catch (e) {
      console.warn('Seek error:', e);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      
      <div className="w-full max-w-7xl h-[90vh] bg-[#0d1322] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Session Replay</span>
                <span className="text-xs font-mono text-purple-400 font-normal">({session.id})</span>
              </h3>
              <p className="text-xs text-slate-400">
                User: <span className="text-slate-200 font-medium">{session.distinct_id}</span> · {session.browser} ({session.os}) · {session.country}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left: RRWeb Player Container */}
          <div className="flex-1 bg-[#090d16] p-4 flex flex-col justify-between overflow-hidden relative">
            
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-400">Reconstructing DOM Snapshot Stream...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-center p-6">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
                <h4 className="text-sm font-bold text-white">No Snapshot Events Recorded</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  This session record contains metadata but no raw DOM snapshot chunks were found in storage.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-black border border-slate-800/60 relative">
                <div ref={playerContainerRef} className="w-full h-full flex items-center justify-center"></div>
              </div>
            )}

            {/* Quick Player Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl glass-card text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/60 rounded-lg p-1">
                  {[0.5, 1, 2, 4, 8].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                        speed === s ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 text-slate-400">
                <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={skipInactive}
                    onChange={(e) => setSkipInactive(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>Skip Inactivity</span>
                </label>
                <span className="text-slate-600">|</span>
                <span className="font-mono text-slate-300 font-bold">
                  Duration: {formatTime(session.duration_seconds)}
                </span>
              </div>
            </div>

          </div>

          {/* Right: Multi-Tab Debugger Inspector */}
          <div className="w-full lg:w-[420px] bg-[#0f1627] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col overflow-hidden">
            
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-slate-800/80 bg-slate-900/60 px-2 py-1">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 text-xs font-bold border-b-2 transition ${
                  activeTab === 'timeline'
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 text-xs font-bold border-b-2 transition ${
                  activeTab === 'console'
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console ({consoleLogs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('network')}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 text-xs font-bold border-b-2 transition ${
                  activeTab === 'network'
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Network ({networkRequests.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 text-xs font-bold border-b-2 transition ${
                  activeTab === 'info'
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Metadata</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Key Event Markers</p>
                  {timelineEvents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No major markers recorded in timeline.</p>
                  ) : (
                    timelineEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => seekToTimestamp(evt.timestamp)}
                        className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-purple-500/40 cursor-pointer transition flex items-start space-x-3 group"
                      >
                        {evt.event_type === 'console_error' && (
                          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 mt-0.5">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        {evt.event_type === 'rage_click' && (
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                            <Flame className="w-4 h-4" />
                          </div>
                        )}
                        {evt.event_type === 'pageview' && (
                          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                              {evt.tag || evt.event_type}
                            </span>
                            <span className="text-[10px] font-mono text-purple-400">Seek &gt;</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                            {evt.data}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Console Logs Tab */}
              {activeTab === 'console' && (
                <div className="space-y-2 font-mono text-xs">
                  {consoleLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center font-sans">No console outputs captured.</p>
                  ) : (
                    consoleLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-[11px] ${
                          log.level === 'error'
                            ? 'bg-rose-950/40 border-rose-900/50 text-rose-300'
                            : log.level === 'warn'
                            ? 'bg-amber-950/40 border-amber-900/50 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                          <span className="uppercase font-bold">[{log.level || 'LOG'}]</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="break-all whitespace-pre-wrap">{log.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Network Requests Tab */}
              {activeTab === 'network' && (
                <div className="space-y-2 font-mono text-xs">
                  {networkRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center font-sans">No network fetch/XHR calls captured.</p>
                  ) : (
                    networkRequests.map((net, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 text-[10px]">
                            {net.method}
                          </span>
                          <span className={`font-bold text-[10px] ${net.status >= 400 || net.status === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {net.status || 'ERR'} ({net.duration}ms)
                          </span>
                        </div>
                        <p className="text-slate-300 truncate text-[10px]" title={net.url}>
                          {net.url}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Session Info Metadata Tab */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">User Details</p>
                    <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                      <span className="text-slate-400">Distinct ID:</span>
                      <span className="font-mono font-semibold">{session.distinct_id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                      <span className="text-slate-400">Location / Country:</span>
                      <span className="font-semibold">{session.country}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                      <span className="text-slate-400">Browser / OS:</span>
                      <span className="font-semibold">{session.browser} on {session.os}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Cloudflare Stack Info</p>
                    <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                      <span className="text-slate-400">Ingested via:</span>
                      <span className="font-mono text-emerald-400 font-semibold">Cloudflare Worker</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                      <span className="text-slate-400">Snapshot Storage:</span>
                      <span className="font-mono text-cyan-400 font-semibold">Cloudflare R2 Bucket</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-300">
                      <span className="text-slate-400">Metadata Storage:</span>
                      <span className="font-mono text-purple-400 font-semibold">Cloudflare D1 (SQLite)</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
