import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { SessionFilterBar } from './components/SessionFilterBar';
import { SessionList } from './components/SessionList';
import { ReplayPlayerModal } from './components/ReplayPlayerModal';
import { DemoPlaygroundModal } from './components/DemoPlaygroundModal';
import { SessionRecord } from '../worker/types';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyErrors, setOnlyErrors] = useState<boolean>(false);
  const [onlyRageClicks, setOnlyRageClicks] = useState<boolean>(false);
  const [minDuration, setMinDuration] = useState<number>(0);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/projects/default/sessions');
      const data: any = await res.json();
      let list: SessionRecord[] = data.sessions || [];

      if (list.length === 0) {
        // Seed mock sessions for immediate interactive testing
        list = seedInitialSessions();
      }

      setSessions(list);
    } catch (err) {
      console.warn('API error, loading default demo sessions:', err);
      setSessions(seedInitialSessions());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...sessions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.distinct_id.toLowerCase().includes(q) ||
          s.entry_url.toLowerCase().includes(q) ||
          s.browser.toLowerCase().includes(q) ||
          s.os.toLowerCase().includes(q)
      );
    }

    if (onlyErrors) {
      result = result.filter((s) => s.error_count > 0);
    }

    if (onlyRageClicks) {
      result = result.filter((s) => s.rage_click_count > 0);
    }

    if (minDuration > 0) {
      result = result.filter((s) => s.duration_seconds >= minDuration);
    }

    setFilteredSessions(result);
  }, [sessions, searchQuery, onlyErrors, onlyRageClicks, minDuration]);

  // Metric summaries
  const totalSessions = sessions.length;
  const avgDuration =
    totalSessions > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.duration_seconds, 0) / totalSessions)
      : 0;
  const totalErrors = sessions.reduce((acc, s) => acc + s.error_count, 0);
  const totalRageClicks = sessions.reduce((acc, s) => acc + s.rage_click_count, 0);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      
      {/* Top Header Navbar */}
      <Navbar
        onOpenDemo={() => setIsDemoOpen(true)}
        onRefresh={fetchSessions}
        sessionCount={totalSessions}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Analytics KPI Overview */}
        <MetricCards
          totalSessions={totalSessions}
          avgDurationSec={avgDuration}
          totalErrors={totalErrors}
          totalRageClicks={totalRageClicks}
        />

        {/* Filter Controls */}
        <SessionFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onlyErrors={onlyErrors}
          setOnlyErrors={setOnlyErrors}
          onlyRageClicks={onlyRageClicks}
          setOnlyRageClicks={setOnlyRageClicks}
          minDuration={minDuration}
          setMinDuration={setMinDuration}
          onReset={() => {
            setSearchQuery('');
            setOnlyErrors(false);
            setOnlyRageClicks(false);
            setMinDuration(0);
          }}
        />

        {/* Session Cards List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Recorded User Sessions</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {filteredSessions.length} result{filteredSessions.length !== 1 ? 's' : ''}
              </span>
            </h2>
          </div>

          <SessionList
            sessions={filteredSessions}
            onSelectSession={(s) => setSelectedSession(s)}
            isLoading={isLoading}
          />
        </div>

      </main>

      {/* Replay Player Modal */}
      {selectedSession && (
        <ReplayPlayerModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Demo Recording Playground Modal */}
      {isDemoOpen && (
        <DemoPlaygroundModal
          onClose={() => setIsDemoOpen(false)}
          onSessionRecorded={fetchSessions}
        />
      )}

    </div>
  );
};

// Seed realistic demo sessions
function seedInitialSessions(): SessionRecord[] {
  const now = Date.now();
  return [
    {
      id: 'sid_checkout_rage_8921',
      project_id: 'default',
      distinct_id: 'alex.dev@gmail.com',
      start_time: now - 1000 * 60 * 12,
      end_time: now - 1000 * 60 * 10,
      duration_seconds: 124,
      active_seconds: 110,
      event_count: 340,
      error_count: 2,
      rage_click_count: 4,
      entry_url: 'https://store.demo.app/checkout',
      exit_url: 'https://store.demo.app/checkout/error',
      browser: 'Chrome 122',
      os: 'macOS 14',
      device: 'Desktop',
      country: 'US',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      created_at: Math.floor(now / 1000),
      updated_at: Math.floor(now / 1000),
    },
    {
      id: 'sid_onboarding_success_4412',
      project_id: 'default',
      distinct_id: 'maria_v@company.io',
      start_time: now - 1000 * 60 * 45,
      end_time: now - 1000 * 60 * 41,
      duration_seconds: 215,
      active_seconds: 190,
      event_count: 512,
      error_count: 0,
      rage_click_count: 0,
      entry_url: 'https://app.demo.io/signup',
      exit_url: 'https://app.demo.io/dashboard',
      browser: 'Safari 17',
      os: 'iOS 17',
      device: 'Mobile',
      country: 'GB',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
      created_at: Math.floor(now / 1000),
      updated_at: Math.floor(now / 1000),
    },
    {
      id: 'sid_pricing_browse_1093',
      project_id: 'default',
      distinct_id: 'usr_guest_88192',
      start_time: now - 1000 * 60 * 180,
      end_time: now - 1000 * 60 * 179,
      duration_seconds: 48,
      active_seconds: 40,
      event_count: 98,
      error_count: 1,
      rage_click_count: 1,
      entry_url: 'https://demo.io/pricing',
      exit_url: 'https://demo.io/pricing',
      browser: 'Firefox 123',
      os: 'Linux',
      device: 'Desktop',
      country: 'DE',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      created_at: Math.floor(now / 1000),
      updated_at: Math.floor(now / 1000),
    }
  ];
}
