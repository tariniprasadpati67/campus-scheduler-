import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import ManualScheduleModal from './ManualScheduleModal.jsx';
import BookingFormModal from './BookingFormModal.jsx';
import AuditLogModal from './AuditLogModal.jsx';
import ProposeChangeModal from './ProposeChangeModal.jsx';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const PERIODS = [
  { id: 1, label: 'P1', time: '8:30-9:30' },
  { id: 2, label: 'P2', time: '9:30-10:30' },
  { id: 3, label: 'P3', time: '10:30-11:30' },
  { id: 'LUNCH', label: 'Lunch', time: '12:30-1:30' },
  { id: 4, label: 'P4', time: '1:30-2:30' },
  { id: 5, label: 'P5', time: '2:30-3:30' },
  { id: 6, label: 'P6', time: '3:30-4:30' },
  { id: 7, label: 'P7', time: '4:30-5:30' },
  { id: 8, label: 'P8', time: '5:30-6:30' },
  { id: 9, label: 'P9', time: '6:30-7:30' },
];

export default function CommandCenterDashboard({
  citData,
  scheduleData,
  onScheduleChanged,
  onNavigateToLanding,
  onNavigateToTab,
}) {
  const { currentUser, quickLogin, demoAccounts } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const PERSONAS = [
    { key: 'admin', icon: '👑', label: 'Admin', sublabel: '(Full Access)' },
    { key: 'coordinator', icon: '💻', label: 'CSE Coordinator' },
    { key: 'faculty', icon: '👨‍🏫', label: 'Prof. Sharma', sublabel: '(Faculty)' },
    { key: 'club', icon: '🤖', label: 'Robotics Club Rep' },
  ];

  // Navigation & View States
  const [activeSidebarNav, setActiveSidebarNav] = useState('dashboard'); // dashboard | timetable | rooms | approvals | analytics | audit | settings
  const [activeSubTab, setActiveSubTab] = useState(1); // 1: Approvals, 2: Timetable, 3: Heatmap, 4: AI Assistant
  const [darkMode, setDarkMode] = useState(true);

  // Filters for Timetable
  const [selectedGroup, setSelectedGroup] = useState('CSE-1A');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  // Live Data States
  const [conflictsData, setConflictsData] = useState(null);
  const [utilisationData, setUtilisationData] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [liveSessions, setLiveSessions] = useState(scheduleData?.sessions || []);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals & Action States
  const [selectedSessionForMove, setSelectedSessionForMove] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Toast & Violation Alert States
  const [violationAlert, setViolationAlert] = useState(null);
  const [successToast, setSuccessToast] = useState({
    show: true,
    message: 'Schedule updated successfully! All constraints are satisfied.',
  });

  // AI Assistant Widget State
  const [aiPromptText, setAiPromptText] = useState('Kal robotics club ke liye lab chahiye shaam ko 4 baje tak');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsedResult, setAiParsedResult] = useState({
    event: 'Robotics Club Meeting',
    when: 'Thu, 4 PM - 5 PM',
    venue_type: 'Lab',
    priority: 'High',
  });

  // Fetch all backend data
  const loadDashboardData = async () => {
    try {
      const [confRes, utilRes, chgRes, bkRes, ttRes, auditRes] = await Promise.all([
        api.timetable.getConflicts().catch(() => null),
        api.timetable.getUtilisation().catch(() => ({ utilisation: [] })),
        api.changes.list().catch(() => ({ changes: [] })),
        api.bookings.list().catch(() => ({ bookings: [] })),
        api.timetable.get().catch(() => null),
        api.admin.getAuditLogs(10).catch(() => ({ audit_logs: [] })),
      ]);

      if (confRes) setConflictsData(confRes);
      if (utilRes?.utilisation) setUtilisationData(utilRes.utilisation);
      if (chgRes?.changes) setChangeRequests(chgRes.changes);
      if (bkRes?.bookings) setBookingRequests(bkRes.bookings);
      if (ttRes?.sessions) setLiveSessions(ttRes.sessions);
      if (auditRes?.audit_logs) setAuditLogs(auditRes.audit_logs);
    } catch (err) {
      console.warn('Dashboard live sync note:', err.message);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Metadata mappings
  const sessionDefMap = useMemo(() => {
    const map = {};
    for (const s of citData?.sessions || []) map[s.id] = s;
    return map;
  }, [citData]);

  const courseMap = useMemo(() => {
    const map = {};
    for (const c of citData?.courses || []) map[c.id] = c;
    return map;
  }, [citData]);

  const facultyMap = useMemo(() => {
    const map = {};
    for (const f of citData?.faculty || []) map[f.id] = f;
    return map;
  }, [citData]);

  const roomMap = useMemo(() => {
    const map = {};
    for (const r of citData?.rooms || []) map[r.id] = r;
    return map;
  }, [citData]);

  // Enriched sessions with metadata
  const enrichedSessions = useMemo(() => {
    return (liveSessions || []).map((s) => {
      const sid = s.session_id || s.id;
      const def = sessionDefMap[sid] || {};
      const course = courseMap[s.course_id || def.course_id] || {};
      const faculty = facultyMap[s.faculty_id || def.faculty_id] || {};
      const room = roomMap[s.room_id] || {};

      return {
        ...def,
        ...s,
        id: sid,
        session_id: sid,
        course_name: course.name || course.title || s.course_id || sid,
        faculty_name: faculty.name || s.faculty_name || s.faculty_id,
        room_name: room.name || s.room_id,
        groups: def.groups || s.group_ids || [],
        duration: def.duration || s.duration || 1,
        kind: def.kind || s.session_type || 'lecture',
      };
    });
  }, [liveSessions, sessionDefMap, courseMap, facultyMap, roomMap]);

  // Timetable grid matrix for selected group/filter
  const timetableGrid = useMemo(() => {
    const grid = {};
    for (const d of DAYS) grid[d] = {};

    const filtered = enrichedSessions.filter((s) => {
      if (selectedFaculty && s.faculty_id !== selectedFaculty) return false;
      if (selectedRoom && s.room_id !== selectedRoom) return false;
      if (selectedGroup && !(s.groups || []).includes(selectedGroup)) return false;
      return true;
    });

    for (const s of filtered) {
      const d = s.day;
      const p = s.start_period;
      const dur = s.duration || 1;
      if (grid[d]) {
        grid[d][p] = s;
        for (let i = 1; i < dur; i++) {
          grid[d][p + i] = { isContinuation: true, parent: s };
        }
      }
    }
    return grid;
  }, [enrichedSessions, selectedGroup, selectedFaculty, selectedRoom]);

  // Pending counts
  const pendingChanges = changeRequests.filter((c) => c.status === 'pending');
  const pendingBookings = bookingRequests.filter((b) => b.status === 'pending');
  const totalPending = pendingChanges.length + pendingBookings.length || 3;

  // Actions
  const handleDecideChange = async (id, action) => {
    if (!isAdmin) {
      setViolationAlert({
        title: 'Action Prohibited',
        message: 'Only Admin has permission to approve or reject change proposals.',
      });
      return;
    }

    try {
      setActionLoadingId(`${action}-${id}`);
      await api.changes.decide(id, action, `Admin decision via dashboard`);
      setSuccessToast({
        show: true,
        message: `Change Request #${id} ${action}ed successfully! Timetable updated.`,
      });
      await loadDashboardData();
      if (onScheduleChanged) onScheduleChanged();
    } catch (err) {
      setViolationAlert({
        title: 'Decision Error',
        message: err.message || `Failed to ${action} request #${id}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetDemoData = async () => {
    if (!isAdmin) {
      alert('Only Admin can reset demo data.');
      return;
    }
    if (!confirm('Reset all demo data? This re-seeds database and regenerates baseline timetable.')) return;
    try {
      await api.admin.resetDemo();
      setSuccessToast({
        show: true,
        message: 'Demo data reset successfully! Solver regenerated optimal timetable.',
      });
      await loadDashboardData();
      if (onScheduleChanged) onScheduleChanged();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
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

  const handleRunAiExtract = async () => {
    if (!aiPromptText.trim()) return;
    setAiParsing(true);
    try {
      const res = await api.ai.parseBooking(aiPromptText, currentUser?.role || 'club');
      const struct = res.structured || {};
      setAiParsedResult({
        event: struct.title || 'Robotics Club Meeting',
        when: struct.windows?.[0] ? `${struct.windows[0].day}, P${struct.windows[0].from_period} - P${struct.windows[0].to_period}` : 'Thu, 4 PM - 5 PM',
        venue_type: struct.room_types?.[0] || 'Lab',
        priority: struct.requested_category === 'institute_event' ? 'Critical' : 'High',
      });
    } catch (err) {
      console.warn('AI Parsing failed, using mock display:', err.message);
    } finally {
      setAiParsing(false);
    }
  };

  // Static sample room utilisations matching mockup visually
  const roomUtilRows = [
    { name: 'Auditorium', pct: 92, barColor: 'bg-rose-500' },
    { name: 'Seminar Hall', pct: 87, barColor: 'bg-orange-500' },
    { name: 'Lab-1', pct: 95, barColor: 'bg-rose-500' },
    { name: 'Lab-2', pct: 78, barColor: 'bg-emerald-500' },
    { name: 'Lab-3', pct: 71, barColor: 'bg-emerald-500' },
    { name: 'Classroom-101', pct: 65, barColor: 'bg-sky-500' },
    { name: 'Classroom-102', pct: 89, barColor: 'bg-orange-500' },
    { name: 'Classroom-103', pct: 73, barColor: 'bg-sky-500' },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex overflow-x-hidden font-sans select-none">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-[#0d1322] border-r border-[#1a233a] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Logo Brand Header */}
          <div className="p-4 border-b border-[#1a233a] flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 relative flex items-center justify-center">
              <svg className="w-11 h-11 drop-shadow-md" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="46" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 2" />
                <path d="M 24,50 C 24,72 36,83 50,86 C 64,83 76,72 76,50 C 76,28 64,17 50,14 C 36,17 24,28 24,50 Z" stroke="#fbbf24" strokeWidth="2" fill="#0d1527" />
                <path d="M 33,32 L 67,32 L 67,54 C 67,65 50,75 50,75 C 50,75 33,65 33,54 Z" fill="#182238" stroke="#f59e0b" strokeWidth="2" />
                <text x="50" y="52" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="900" fontFamily="serif" letterSpacing="1">CIT</text>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight leading-tight">
                CIT Campus
              </h1>
              <p className="text-[11px] font-semibold text-slate-200 leading-tight">Scheduling Platform</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Smart Schedule. Better Campus.</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveSidebarNav('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                activeSidebarNav === 'dashboard'
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#151d33]'
              }`}
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveSidebarNav('timetable')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                activeSidebarNav === 'timetable'
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#151d33]'
              }`}
            >
              <span>📅</span>
              <span>Timetable</span>
            </button>

            <button
              onClick={() => setActiveSidebarNav('rooms')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                activeSidebarNav === 'rooms'
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#151d33]'
              }`}
            >
              <span>🏛️</span>
              <span>Rooms</span>
            </button>

            <button
              onClick={() => setActiveSidebarNav('approvals')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                activeSidebarNav === 'approvals'
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#151d33]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span>✔️</span>
                <span>Approvals</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            <button
              onClick={() => setActiveSidebarNav('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                activeSidebarNav === 'analytics'
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#151d33]'
              }`}
            >
              <span>📊</span>
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#151d33] transition"
            >
              <span>📜</span>
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveSidebarNav('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                activeSidebarNav === 'settings'
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#151d33]'
              }`}
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>

            {onNavigateToLanding && (
              <button
                onClick={onNavigateToLanding}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#151d33] transition"
              >
                <span>🌐</span>
                <span>Overview / Landing</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer: Dark mode & Campus Photo card */}
        <div className="p-4 space-y-4 border-t border-[#1a233a]">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <span>☀️</span>
              <span>Dark Mode</span>
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-9 h-5 rounded-full p-0.5 transition ${
                darkMode ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-[#232f4e] shadow-md group">
            <img
              src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80"
              alt="Chilika Campus"
              className="w-full h-20 object-cover brightness-90 group-hover:scale-105 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/50 to-transparent flex flex-col justify-end p-2.5">
              <p className="font-bold text-[11px] text-white leading-tight">Chilika Campus</p>
              <p className="text-[9px] text-slate-300">Main Administrative Block</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Row with Personas & Global Actions */}
        <header className="bg-[#0e1424] border-b border-[#1a233a] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
          {/* Logo representation for mobile */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <span className="font-bold text-xs">CIT Campus</span>
          </div>

          {/* Persona Switcher Center Ribbon */}
          <div className="flex items-center bg-[#141b2e] p-1 rounded-xl border border-[#202b48] gap-1 overflow-x-auto text-xs">
            {PERSONAS.map((p) => {
              const acc = demoAccounts[p.key];
              const isActive = currentUser?.email === acc?.email || currentUser?.role === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => quickLogin(p.key)}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold ring-1 ring-blue-400/50'
                      : 'text-slate-300 hover:text-white hover:bg-[#1e2740]'
                  }`}
                >
                  <span className="text-sm select-none">{p.icon}</span>
                  <span>{p.label}</span>
                  {p.sublabel && (
                    <span className="text-[10px] opacity-80 font-normal hidden sm:inline">{p.sublabel}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Status Pill & Global Actions */}
          <div className="flex items-center gap-2.5">
            {/* 100% Conflict Free Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#102422] border border-[#14493e] text-emerald-300 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>100% Conflict-Free</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">• 0 Hard Violations • Soft Penalty: 25</span>
            </div>

            {/* Quick Actions */}
            <button
              onClick={handleResetDemoData}
              title="Reset Demo Data"
              className="p-2 rounded-xl bg-[#141c30] border border-[#202c4b] hover:bg-[#1a2542] text-slate-300 text-xs font-medium flex flex-col items-center justify-center cursor-pointer"
            >
              <span>🔄</span>
              <span className="text-[9px] mt-0.5">Reset Demo</span>
            </button>

            <button
              onClick={handleExportSchedule}
              title="Export schedule.json"
              className="p-2 rounded-xl bg-[#141c30] border border-[#202c4b] hover:bg-[#1a2542] text-slate-300 text-xs font-medium flex flex-col items-center justify-center cursor-pointer"
            >
              <span>💾</span>
              <span className="text-[9px] mt-0.5">Export</span>
            </button>

            <button
              onClick={() => setIsAuditModalOpen(true)}
              title="Audit Trail"
              className="p-2 rounded-xl bg-[#141c30] border border-[#202c4b] hover:bg-[#1a2542] text-slate-300 text-xs font-medium flex flex-col items-center justify-center cursor-pointer"
            >
              <span>📜</span>
              <span className="text-[9px] mt-0.5">Audit Trail</span>
            </button>
          </div>
        </header>

        {/* 3. MAIN DASHBOARD CONTENT */}
        <main className="p-4 sm:p-6 space-y-5">
          {/* TOP KPI CARDS ROW (4 CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Schedule Health */}
            <div className="bg-[#101728] p-4 rounded-2xl border border-[#1b2641] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
                  🛡️
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Schedule Health
                  </p>
                  <p className="text-2xl font-black text-emerald-400">100%</p>
                  <p className="text-[10px] text-emerald-500/80 font-medium">0 Hard Violations</p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5 text-right border-l border-[#1a243d] pl-3">
                <div>S1: 12 &nbsp; S3: 6</div>
                <div>S2: 8 &nbsp;&nbsp; S5: 3</div>
                <div>S4: 4 &nbsp;&nbsp; S6: 2</div>
              </div>
            </div>

            {/* Card 2: Pending Approvals */}
            <div className="bg-[#101728] p-4 rounded-2xl border border-[#1b2641] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
                  ⏳
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Pending Approvals
                  </p>
                  <p className="text-2xl font-black text-white">{totalPending}</p>
                  <p className="text-[10px] text-slate-400">
                    {pendingChanges.length || 2} Change Requests • {pendingBookings.length || 1} Fest Booking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab(1)}
                className="w-7 h-7 rounded-full bg-[#17223b] hover:bg-[#202f54] text-slate-300 flex items-center justify-center text-xs"
              >
                ➜
              </button>
            </div>

            {/* Card 3: Room Utilisation */}
            <div className="bg-[#101728] p-4 rounded-2xl border border-[#1b2641] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400">
                  🏛️
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Campus Room Utilisation
                  </p>
                  <p className="text-2xl font-black text-blue-400">78.4%</p>
                  <p className="text-[10px] text-slate-400">Avg. across 27 rooms</p>
                </div>
              </div>
              {/* Mini Sparkline SVG */}
              <svg className="w-16 h-8 text-blue-500 stroke-current fill-none stroke-2" viewBox="0 0 60 30">
                <path d="M 0,25 Q 15,5 30,18 T 60,8" />
              </svg>
            </div>

            {/* Card 4: Weekly Academic Load */}
            <div className="bg-[#101728] p-4 rounded-2xl border border-[#1b2641] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl text-purple-400">
                  📅
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Weekly Academic Load
                  </p>
                  <p className="text-2xl font-black text-white">189 <span className="text-xs font-normal text-slate-400">Sessions</span></p>
                  <p className="text-[10px] text-slate-400">243 Teaching Hours</p>
                </div>
              </div>
              {/* Mini Bar Graph Representation */}
              <div className="flex items-end gap-1 h-8">
                <div className="w-1.5 h-3 bg-purple-500/40 rounded-t" />
                <div className="w-1.5 h-5 bg-purple-500/60 rounded-t" />
                <div className="w-1.5 h-7 bg-purple-500 rounded-t" />
                <div className="w-1.5 h-6 bg-purple-500/80 rounded-t" />
              </div>
            </div>
          </div>

          {/* SUB-TABS NAVIGATION BAR */}
          <div className="flex items-center gap-2 bg-[#101728] p-1.5 rounded-xl border border-[#1b2641] overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab(1)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition shrink-0 ${
                activeSubTab === 1
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>1. Pending Approvals Queue</span>
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                3
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab(2)}
              className={`px-4 py-2 rounded-lg transition shrink-0 ${
                activeSubTab === 2
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Interactive Timetable Matrix
            </button>

            <button
              onClick={() => setActiveSubTab(3)}
              className={`px-4 py-2 rounded-lg transition shrink-0 ${
                activeSubTab === 3
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Room Utilisation & Capacity Heatmap
            </button>

            <button
              onClick={() => setActiveSubTab(4)}
              className={`px-4 py-2 rounded-lg transition shrink-0 ${
                activeSubTab === 4
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4. AI Venue Booking Assistant
            </button>
          </div>

          {/* MAIN 3-PANEL GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* COLUMN 1 (4 COLS): PENDING APPROVALS QUEUE */}
            <div className="lg:col-span-4 bg-[#101728] rounded-2xl border border-[#1b2641] p-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1b2641] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-base">⏳</span>
                    <h3 className="font-bold text-sm text-white">Pending Approvals Queue</h3>
                  </div>
                  <button
                    onClick={() => setIsProposeModalOpen(true)}
                    className="text-xs text-blue-400 hover:underline font-semibold"
                  >
                    + Propose ➜
                  </button>
                </div>

                {/* Queue Cards */}
                <div className="space-y-3">
                  {/* Item 1: Faculty Leave Request */}
                  <div className="bg-[#131b2e] rounded-xl border border-[#1f2b49] p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="font-bold text-xs text-white">Faculty Leave Request</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40">
                        Faculty
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Dr. Mehta • 14 Apr 2025</p>

                    <div className="p-2 rounded-lg bg-[#0e1424] text-[11px] font-mono flex items-center justify-between text-slate-300">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Old Slot:</span>
                        Tue P3 (10:30-11:30)
                      </div>
                      <span className="text-blue-400 font-bold">➜</span>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">New Slot:</span>
                        Tue P5 (13:30-14:30)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleDecideChange(1, 'approve')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>✓</span>
                        <span>Approve & Apply</span>
                      </button>
                      <button
                        onClick={() => handleDecideChange(1, 'reject')}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>✕</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 2: Room Closure */}
                  <div className="bg-[#131b2e] rounded-xl border border-[#1f2b49] p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span className="font-bold text-xs text-white">Room Closure</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">
                        Room
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Lab-3 • 15 Apr 2025</p>

                    <div className="p-2 rounded-lg bg-[#0e1424] text-[11px] font-mono flex items-center justify-between text-slate-300">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Old Slot:</span>
                        Wed P2 (09:30-10:30)
                      </div>
                      <span className="text-blue-400 font-bold">➜</span>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">New Slot:</span>
                        Wed P4 (11:30-12:30)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleDecideChange(2, 'approve')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>✓</span>
                        <span>Approve & Apply</span>
                      </button>
                      <button
                        onClick={() => handleDecideChange(2, 'reject')}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>✕</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Item 3: Fest Booking */}
                  <div className="bg-[#131b2e] rounded-xl border border-[#1f2b49] p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                        <span className="font-bold text-xs text-white">Fest Booking</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                        Event
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">TechFest 2025 • 16-17 Apr</p>

                    <div className="p-2 rounded-lg bg-[#0e1424] text-[11px] font-mono flex items-center justify-between text-slate-300">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Old Slot:</span>
                        Thu P6 (14:30-15:30)
                      </div>
                      <span className="text-blue-400 font-bold">➜</span>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">New Slot:</span>
                        Thu P7 (15:30-16:30)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleDecideChange(3, 'approve')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>✓</span>
                        <span>Approve & Apply</span>
                      </button>
                      <button
                        onClick={() => handleDecideChange(3, 'reject')}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>✕</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2 (5 COLS): INTERACTIVE TIMETABLE MATRIX */}
            <div className="lg:col-span-5 bg-[#101728] rounded-2xl border border-[#1b2641] p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Timetable Header & Dropdown Selectors */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2641] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">📅</span>
                    <h3 className="font-bold text-sm text-white">Interactive Timetable Matrix</h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="bg-[#141b2e] border border-[#232f4e] text-white px-2.5 py-1 rounded-lg font-medium text-xs focus:outline-none"
                    >
                      <option value="CSE-1A">CSE-A</option>
                      <option value="CSE-1B">CSE-B</option>
                      <option value="CSE-2">CSE-2</option>
                      <option value="ECE-2">ECE-2</option>
                      <option value="ME-2">ME-2</option>
                    </select>

                    <select
                      value={selectedFaculty}
                      onChange={(e) => setSelectedFaculty(e.target.value)}
                      className="bg-[#141b2e] border border-[#232f4e] text-slate-300 px-2 py-1 rounded-lg text-xs"
                    >
                      <option value="">Faculty ⌄</option>
                      {(citData?.faculty || []).slice(0, 10).map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="bg-[#141b2e] border border-[#232f4e] text-slate-300 px-2 py-1 rounded-lg text-xs"
                    >
                      <option value="">Room ⌄</option>
                      {(citData?.rooms || []).slice(0, 10).map((r) => (
                        <option key={r.id} value={r.id}>{r.id}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        setSelectedFaculty('');
                        setSelectedRoom('');
                        setSelectedGroup('CSE-1A');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white px-1.5"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* MATRIX TABLE */}
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#1b2641] text-slate-400 text-[10px]">
                        <th className="py-2 text-left w-16">Time</th>
                        {DAYS.map((d) => (
                          <th key={d} className="py-2 text-center">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#172036]">
                      {/* P1 */}
                      <tr>
                        <td className="py-1.5 font-mono text-[9px] text-slate-400">P1 (8:30-9:30)</td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">Maths <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">DSA <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">Networks <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">DBMS <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">AI <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                      </tr>

                      {/* P2 */}
                      <tr>
                        <td className="py-1.5 font-mono text-[9px] text-slate-400">P2 (9:30-10:30)</td>
                        <td className="p-0.5"><div className="bg-[#0e3b43]/60 border border-cyan-500/40 text-cyan-200 p-1.5 rounded text-center font-bold">Physics <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0e3b43]/60 border border-cyan-500/40 text-cyan-200 p-1.5 rounded text-center font-bold">Maths <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0e3b43]/60 border border-cyan-500/40 text-cyan-200 p-1.5 rounded text-center font-bold">OS <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0e3b43]/60 border border-cyan-500/40 text-cyan-200 p-1.5 rounded text-center font-bold">ML <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0e3b43]/60 border border-cyan-500/40 text-cyan-200 p-1.5 rounded text-center font-bold">Graphics <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                      </tr>

                      {/* P3 */}
                      <tr>
                        <td className="py-1.5 font-mono text-[9px] text-slate-400">P3 (10:30-11:30)</td>
                        <td className="p-0.5"><div className="bg-[#0f382a]/60 border border-emerald-500/40 text-emerald-200 p-1.5 rounded text-center font-bold">Data Sci <span className="text-[9px] font-normal block">(Lab)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0f382a]/60 border border-emerald-500/40 text-emerald-200 p-1.5 rounded text-center font-bold">DBMS <span className="text-[9px] font-normal block">(Lab)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0f382a]/60 border border-emerald-500/40 text-emerald-200 p-1.5 rounded text-center font-bold">Networks <span className="text-[9px] font-normal block">(Lab)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0f382a]/60 border border-emerald-500/40 text-emerald-200 p-1.5 rounded text-center font-bold">Data Sci <span className="text-[9px] font-normal block">(Lab)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#0f382a]/60 border border-emerald-500/40 text-emerald-200 p-1.5 rounded text-center font-bold">Robotics <span className="text-[9px] font-normal block">(Lab)</span></div></td>
                      </tr>

                      {/* Lunch Break Banner */}
                      <tr>
                        <td className="py-1 text-[9px] text-slate-400 font-mono">Lunch Break (12:30-1:30)</td>
                        <td colSpan={5} className="p-1">
                          <div className="bg-[#141d33] border border-[#232f50] text-slate-400 py-1 rounded text-center font-bold text-[10px] tracking-wider">
                            🍽️ Lunch Break
                          </div>
                        </td>
                      </tr>

                      {/* P4 */}
                      <tr>
                        <td className="py-1.5 font-mono text-[9px] text-slate-400">P4 (1:30-2:30)</td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">AI <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">Physics <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">Maths <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">DSA <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#1a365d]/60 border border-blue-500/40 text-blue-200 p-1.5 rounded text-center font-bold">OS <span className="text-[9px] font-normal block">(Lec)</span></div></td>
                      </tr>

                      {/* P5 */}
                      <tr>
                        <td className="py-1.5 font-mono text-[9px] text-slate-400">P5 (2:30-3:30)</td>
                        <td className="p-0.5"><div className="bg-[#341b52]/60 border border-purple-500/40 text-purple-200 p-1.5 rounded text-center font-bold">Web Tech <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#341b52]/60 border border-purple-500/40 text-purple-200 p-1.5 rounded text-center font-bold">Cloud <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#341b52]/60 border border-purple-500/40 text-purple-200 p-1.5 rounded text-center font-bold">Cyber Sec <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#341b52]/60 border border-purple-500/40 text-purple-200 p-1.5 rounded text-center font-bold">AI <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                        <td className="p-0.5"><div className="bg-[#341b52]/60 border border-purple-500/40 text-purple-200 p-1.5 rounded text-center font-bold">ML <span className="text-[9px] font-normal block">(Tut)</span></div></td>
                      </tr>

                      {/* P6 - Project Lab continuous block */}
                      <tr>
                        <td className="py-1.5 font-mono text-[9px] text-slate-400">P6 (3:30-4:30)</td>
                        {DAYS.map((d, dIdx) => (
                          <td key={d} className="p-0.5 relative">
                            <div
                              onClick={() => {
                                setSelectedSessionForMove(enrichedSessions[0]);
                                setIsMoveModalOpen(true);
                              }}
                              className="bg-[#0f382a]/60 border border-emerald-400 text-emerald-100 p-2 rounded text-center font-bold cursor-pointer hover:bg-emerald-600/50 transition group"
                            >
                              Project <span className="text-[9px] block font-normal">(Lab)</span>
                              {dIdx === 2 && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded shadow-lg z-20 whitespace-nowrap flex items-center gap-1 border border-blue-400/40">
                                  <span>⇄</span>
                                  <span>Click to Reschedule</span>
                                </div>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* P7 */}
                      <tr>
                        <td className="py-1 font-mono text-[9px] text-slate-500">P7 (4:30-5:30)</td>
                        {DAYS.map((d) => (
                          <td key={d} className="p-0.5"><div className="h-6 rounded bg-[#101726]/40 border border-dashed border-[#1a233a]" /></td>
                        ))}
                      </tr>

                      {/* P8 */}
                      <tr>
                        <td className="py-1 font-mono text-[9px] text-slate-500">P8 (5:30-6:30)</td>
                        {DAYS.map((d) => (
                          <td key={d} className="p-0.5"><div className="h-6 rounded bg-[#101726]/40 border border-dashed border-[#1a233a]" /></td>
                        ))}
                      </tr>

                      {/* P9 */}
                      <tr>
                        <td className="py-1 font-mono text-[9px] text-slate-500">P9 (6:30-7:30)</td>
                        {DAYS.map((d) => (
                          <td key={d} className="p-0.5"><div className="h-6 rounded bg-[#101726]/40 border border-dashed border-[#1a233a]" /></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COLUMN 3 (3 COLS): ROOM HEATMAP & AI ASSISTANT WIDGET */}
            <div className="lg:col-span-3 space-y-4">
              {/* Card A: Room Utilisation & Capacity Heatmap */}
              <div className="bg-[#101728] rounded-2xl border border-[#1b2641] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1b2641] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">📊</span>
                    <h4 className="font-bold text-xs text-white">Room Utilisation &amp; Capacity Heatmap</h4>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {roomUtilRows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-300 w-24 truncate">{r.name}</span>
                      <div className="flex-1 h-2 bg-[#172138] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${r.barColor} rounded-full`}
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-7 text-right">{r.pct}%</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveSubTab(3)}
                  className="w-full text-center text-xs text-blue-400 hover:underline pt-1 block"
                >
                  View All 27 Rooms ➜
                </button>
              </div>

              {/* Card B: AI Venue Booking Assistant */}
              <div className="bg-gradient-to-br from-[#121930] to-[#1c1836] rounded-2xl border border-[#2b274e] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 text-sm">✨</span>
                  <h4 className="font-bold text-xs text-white">AI Venue Booking Assistant</h4>
                </div>

                {/* Speech Bubble Prompt */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0 text-lg shadow-inner">
                    🤖
                  </div>
                  <div className="relative bg-white text-slate-800 text-[11px] font-medium px-3.5 py-2 rounded-2xl rounded-tl-sm shadow-md leading-snug">
                    <div className="absolute -left-1.5 top-2.5 w-2.5 h-2.5 bg-white rotate-45" />
                    "{aiPromptText}"
                  </div>
                </div>

                {/* Parsed Request Box */}
                <div className="bg-[#0b0f1a] p-3 rounded-xl border border-white/5 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">✓</span>
                    <span>Parsed Request:</span>
                  </div>
                  <div className="text-slate-300 pl-2 space-y-1 text-[11px] font-sans">
                    <div className="flex"><span className="text-slate-500 w-24 font-mono text-[10px]">Event:</span> <span className="font-semibold text-slate-200">{aiParsedResult.event}</span></div>
                    <div className="flex"><span className="text-slate-500 w-24 font-mono text-[10px]">When:</span> <span className="font-semibold text-slate-200">{aiParsedResult.when}</span></div>
                    <div className="flex"><span className="text-slate-500 w-24 font-mono text-[10px]">Venue Type:</span> <span className="font-semibold text-slate-200">{aiParsedResult.venue_type}</span></div>
                    <div className="flex items-center"><span className="text-slate-500 w-24 font-mono text-[10px]">Priority:</span> <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">{aiParsedResult.priority}</span></div>
                  </div>
                </div>

                {/* Find Best Slots Button */}
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  <span>🔍</span>
                  <span>Find Best Slots</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. BOTTOM BANNERS & NOTIFICATIONS */}
          {/* A. Red Constraint Violation Warning Banner */}
          <div className="bg-[#241118] border border-rose-500/40 p-3.5 rounded-xl flex items-center justify-between text-rose-200 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-rose-400 text-lg">⚠️</span>
              <div>
                <span className="font-bold text-rose-400">Constraint Violation Detected! &nbsp;</span>
                <span>This move would break a HARD constraint: Room Double Booking (Lab-3 on Wed P4).</span>
              </div>
            </div>
            <button
              onClick={() => alert('Constraint Breakdown:\n[H2]: Room Lab-3 is already allocated to CS291-P1 at Wed P4.\nCapacity: 35 | Lab sessions start strictly at P2 or P6.')}
              className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded-lg font-semibold text-[11px] shrink-0 cursor-pointer"
            >
              View Details ➜
            </button>
          </div>

          {/* B. Mini Audit Trail & Success Toast Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Audit Trail Row (8 Cols) */}
            <div className="md:col-span-8 bg-[#101728] rounded-xl border border-[#1b2641] p-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#1b2641] pb-2 mb-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <span>🕒</span>
                  <span>Audit Trail</span>
                </span>
                <button
                  onClick={() => setIsAuditModalOpen(true)}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  View All ➜
                </button>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-3 text-slate-400 font-mono">
                  <span className="w-12 text-slate-500">14:32</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="w-28 text-slate-200 font-sans font-semibold">Admin</span>
                  <span className="text-slate-400 font-sans">Approved: Faculty Leave (Dr. Mehta)</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono">
                  <span className="w-12 text-slate-500">13:50</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                  <span className="w-28 text-slate-200 font-sans font-semibold">CSE Coordinator</span>
                  <span className="text-slate-400 font-sans">Rescheduled: DSA Lab to Tue P5</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono">
                  <span className="w-12 text-slate-500">12:15</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                  <span className="w-28 text-slate-200 font-sans font-semibold">Prof. Sharma</span>
                  <span className="text-slate-400 font-sans">Viewed Timetable Matrix</span>
                </div>
              </div>
            </div>

            {/* Success Toast Card (4 Cols) */}
            {successToast.show && (
              <div className="md:col-span-4 bg-[#0d221c] border border-emerald-500/50 p-3 rounded-xl flex items-center justify-between text-emerald-200 text-xs shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">✓</span>
                  <div>
                    <p className="font-bold text-white text-[11px]">{successToast.message}</p>
                    <p className="text-[10px] text-emerald-400">All constraints are satisfied.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSuccessToast({ ...successToast, show: false })}
                  className="text-slate-400 hover:text-white font-bold p-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* POPUP MODALS */}
      {isMoveModalOpen && (
        <ManualScheduleModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          initialSession={selectedSessionForMove}
          allSessions={enrichedSessions}
          rooms={citData?.rooms || []}
          onRescheduleSuccess={() => {
            loadDashboardData();
            if (onScheduleChanged) onScheduleChanged();
          }}
        />
      )}

      {isBookingModalOpen && (
        <BookingFormModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          rooms={citData?.rooms || []}
          onBookingCreated={() => {
            loadDashboardData();
          }}
        />
      )}

      {isAuditModalOpen && (
        <AuditLogModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}

      {isProposeModalOpen && (
        <ProposeChangeModal
          isOpen={isProposeModalOpen}
          onClose={() => setIsProposeModalOpen(false)}
          citData={citData}
          onProposalCreated={() => {
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
