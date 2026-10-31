import React, { useState, useEffect } from 'react';
import TimetableTab from './components/TimetableTab.jsx';
import ExamsTab from './components/ExamsTab.jsx';
import BookingsTab from './components/BookingsTab.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('timetable');
  const [citData, setCitData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [citRes, schedRes] = await Promise.all([
          fetch('/data/cit_public.json'),
          fetch('/data/schedule.json'),
        ]);

        if (!citRes.ok || !schedRes.ok) {
          throw new Error(
            `Data files not found in /data/ (HTTP ${citRes.status} / ${schedRes.status}). Please run 'npm run sync-data' first.`
          );
        }

        const citJson = await citRes.json();
        const schedJson = await schedRes.json();

        setCitData(citJson);
        setScheduleData(schedJson);
      } catch (err) {
        console.error('Failed to load schedule data:', err);
        setError(err.message || 'Failed to load scheduling data files.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏛️</span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  CIT Campus Scheduling Platform
                </h1>
                {citData && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {citData.dataset_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chilika Institute of Technology • Read-Only Viewer
              </p>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 sm:space-x-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('timetable')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  activeTab === 'timetable'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📅 Timetable</span>
                {scheduleData?.sessions && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {scheduleData.sessions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('exams')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  activeTab === 'exams'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📝 Midsem Exams</span>
                {scheduleData?.exams && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {scheduleData.exams.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  activeTab === 'bookings'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🎪 Spectra Bookings</span>
                {scheduleData?.fest_week?.bookings && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {scheduleData.fest_week.bookings.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading schedule and dataset definitions...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-6 rounded-2xl max-w-xl mx-auto my-12 text-center space-y-3">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-base font-bold text-rose-800 dark:text-rose-200">
              Schedule Data Not Available
            </h3>
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            <div className="pt-2">
              <code className="text-xs bg-rose-100 dark:bg-rose-900/80 px-2 py-1 rounded font-mono text-rose-800 dark:text-rose-200">
                npm run sync-data
              </code>
            </div>
          </div>
        )}

        {!loading && !error && citData && scheduleData && (
          <>
            {activeTab === 'timetable' && (
              <TimetableTab citData={citData} scheduleData={scheduleData} />
            )}
            {activeTab === 'exams' && (
              <ExamsTab citData={citData} scheduleData={scheduleData} />
            )}
            {activeTab === 'bookings' && (
              <BookingsTab citData={citData} scheduleData={scheduleData} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 py-4 text-center text-xs text-slate-400">
        CIT Campus Scheduling Platform • Read-Only Viewer (Step 3b)
      </footer>
    </div>
  );
}

