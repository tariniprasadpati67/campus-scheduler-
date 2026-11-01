import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LandingPage from './components/LandingPage.jsx';
import DashboardTab from './components/DashboardTab.jsx';
import TimetableTab from './components/TimetableTab.jsx';
import ExamsTab from './components/ExamsTab.jsx';
import BookingsTab from './components/BookingsTab.jsx';
import AuditLogModal from './components/AuditLogModal.jsx';
import { api } from './services/api.js';

function MainApp() {
  const { currentUser, quickLogin, demoAccounts, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState('landing');
  const [citData, setCitData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin action modals & notifications
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [appBanner, setAppBanner] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load foundational data (cit_public.json and schedule.json)
  const loadDatasetData = async () => {
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
  };

  useEffect(() => {
    loadDatasetData();
  }, []);

  const handleResetDemo = async () => {
    if (!isAdmin) {
      alert('Only Admin can reset demo data.');
      return;
    }
    if (
      !confirm(
        'Are you sure you want to reset all demo data? This will reseed database from cit_public.json and regenerate schedule.'
      )
    ) {
      return;
    }

    try {
      setResettingDemo(true);
      setAppBanner(null);
      const res = await api.admin.resetDemo();
      setAppBanner({
        type: 'success',
        text: 'Demo data reset successfully! Solver regenerated optimal conflict-free schedule.',
      });
      await loadDatasetData();
    } catch (err) {
      setAppBanner({
        type: 'error',
        text: `Reset demo failed: ${err.message}`,
      });
    } finally {
      setResettingDemo(false);
    }
  };

  const handleExportSchedule = async () => {
    try {
      const data = await api.admin.exportSchedule();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schedule.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (activeTab === 'landing') {
    return (
      <LandingPage
        onLaunchConsole={(targetTab) => setActiveTab(targetTab || 'dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3.5 gap-4">
            {/* Title & Dataset Badge */}
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl select-none">🏛️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    CIT Campus Scheduling Platform
                  </h1>
                  {citData && (
                    <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                      {citData.dataset_id}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chilika Institute of Technology • Automated Scheduling & Conflict Resolution
                </p>
              </div>
            </div>

            {/* Role Switcher & User Profile (Desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs">
                {Object.entries(demoAccounts).map(([key, acc]) => {
                  const isActive = currentUser?.email === acc.email;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => quickLogin(key)}
                      title={acc.desc}
                      className={`cursor-pointer select-none px-2.5 py-1.5 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-750'
                      }`}
                    >
                      <span className="text-sm select-none">{acc.icon}</span>
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Admin Action Menu */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAuditModalOpen(true)}
                    title="View System Audit Trail"
                    className="p-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                  >
                    📜 Audit
                  </button>
                  <button
                    onClick={handleExportSchedule}
                    title="Export official schedule.json"
                    className="p-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                  >
                    💾 Export
                  </button>
                  <button
                    onClick={handleResetDemo}
                    disabled={resettingDemo}
                    title="Reset all demo data"
                    className="p-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    {resettingDemo ? '...' : '🔄 Reset'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {/* Mobile Drawer (Visible when hamburger clicked) */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 py-3 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Switch Demo Persona:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(demoAccounts).map(([key, acc]) => {
                    const isActive = currentUser?.email === acc.email;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          quickLogin(key);
                          setMobileMenuOpen(false);
                        }}
                        className={`cursor-pointer select-none p-2.5 rounded-xl text-xs font-semibold text-left flex items-center gap-2 transition ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{acc.icon}</span>
                        <span>{acc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsAuditModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 font-semibold"
                  >
                    📜 Audit Log
                  </button>
                  <button
                    onClick={handleExportSchedule}
                    className="flex-1 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 font-semibold"
                  >
                    💾 Export
                  </button>
                  <button
                    onClick={handleResetDemo}
                    className="flex-1 py-1.5 rounded-lg text-xs bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold"
                  >
                    🔄 Reset Demo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Primary Navigation Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 border-t border-slate-100 dark:border-slate-700/60 pt-2 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-pointer"
            >
              <span>🌐 Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>📊 Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('timetable')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap ${
                activeTab === 'timetable'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>📅 Timetable</span>
              {scheduleData?.sessions && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {scheduleData.sessions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🎪 Spectra Bookings</span>
            </button>

            <button
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap ${
                activeTab === 'exams'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>📝 Midsem Exams</span>
              {scheduleData?.exams && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {scheduleData.exams.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {appBanner && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs flex items-center justify-between ${
              appBanner.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
            }`}
          >
            <span>{appBanner.text}</span>
            <button onClick={() => setAppBanner(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Initializing scheduling data and connecting to backend...
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
          </div>
        )}

        {!loading && !error && citData && scheduleData && (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab
                citData={citData}
                onNavigateToTimetable={() => setActiveTab('timetable')}
              />
            )}

            {activeTab === 'timetable' && (
              <TimetableTab
                citData={citData}
                scheduleData={scheduleData}
                onScheduleChanged={loadDatasetData}
              />
            )}

            {activeTab === 'bookings' && (
              <BookingsTab
                citData={citData}
                scheduleData={scheduleData}
              />
            )}

            {activeTab === 'exams' && (
              <ExamsTab
                citData={citData}
                scheduleData={scheduleData}
              />
            )}
          </>
        )}
      </main>

      {/* Audit Log Modal */}
      {isAuditModalOpen && (
        <AuditLogModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 py-4 text-center text-xs text-slate-400">
        CIT Campus Scheduling Platform • Step 12 React UI
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
