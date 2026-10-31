import React, { useState, useMemo, useEffect } from 'react';
import SessionDetailModal from './SessionDetailModal.jsx';
import ManualScheduleModal from './ManualScheduleModal.jsx';
import { api } from '../services/api.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const PERIODS = [
  { id: 1, time: '08:00 - 09:00', label: 'P1' },
  { id: 2, time: '09:00 - 10:00', label: 'P2' },
  { id: 3, time: '10:00 - 11:00', label: 'P3' },
  { id: 4, time: '11:00 - 12:00', label: 'P4' },
  { id: 5, time: '12:00 - 13:00', label: 'P5' },
  { id: 'LUNCH', time: '13:00 - 14:00', label: 'Lunch' },
  { id: 6, time: '14:00 - 15:00', label: 'P6' },
  { id: 7, time: '15:00 - 16:00', label: 'P7' },
  { id: 8, time: '16:00 - 17:00', label: 'P8' },
  { id: 9, time: '17:00 - 18:00', label: 'P9' },
];

export default function TimetableTab({ citData, scheduleData, onScheduleChanged }) {
  const [viewType, setViewType] = useState('group'); // 'group' | 'faculty' | 'room'
  const [selectedId, setSelectedId] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [rescheduleSession, setRescheduleSession] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Live session entries from API (fallback to initial scheduleData)
  const [liveSessions, setLiveSessions] = useState(scheduleData?.sessions || []);
  const [loading, setLoading] = useState(false);
  const [mobileDay, setMobileDay] = useState('MON');

  // Lookups
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

  const sessionDefMap = useMemo(() => {
    const map = {};
    for (const s of citData?.sessions || []) map[s.id] = s;
    return map;
  }, [citData]);

  // Options for Selector
  const options = useMemo(() => {
    if (viewType === 'group') {
      return (citData?.student_groups || []).map((g) => ({
        id: g.id,
        label: `${g.id} (${g.name || g.department})`,
      }));
    } else if (viewType === 'faculty') {
      return (citData?.faculty || []).map((f) => ({
        id: f.id,
        label: `${f.name} (${f.department})`,
      }));
    } else {
      return (citData?.rooms || []).map((r) => ({
        id: r.id,
        label: `${r.id} - ${r.name} (${r.type}, Cap: ${r.capacity})`,
      }));
    }
  }, [viewType, citData]);

  // Set default selection when viewType changes
  useEffect(() => {
    if (options.length > 0 && (!selectedId || !options.some((o) => o.id === selectedId))) {
      setSelectedId(options[0].id);
    }
  }, [viewType, options, selectedId]);

  // Fetch updated sessions from backend API
  const refreshTimetable = async () => {
    try {
      setLoading(true);
      const res = await api.timetable.get();
      if (res?.sessions) {
        setLiveSessions(res.sessions);
      }
    } catch (err) {
      console.warn('Backend timetable fetch failed, keeping current data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTimetable();
  }, []);

  // Enriched sessions with full metadata
  const enrichedSessions = useMemo(() => {
    return (liveSessions || []).map((item) => {
      const sid = item.session_id || item.id;
      const def = sessionDefMap[sid] || {};
      const course = courseMap[item.course_id || def.course_id] || {};
      const faculty = facultyMap[item.faculty_id || def.faculty_id] || {};
      const room = roomMap[item.room_id] || {};

      return {
        ...def,
        ...item,
        id: sid,
        course_title: course.title || course.name || item.course_name,
        faculty_name: faculty.name || item.faculty_name,
        room_name: room.name || item.room_name,
        room_building: room.building,
        room_capacity: room.capacity,
        groups: def.groups || item.group_ids || [],
      };
    });
  }, [liveSessions, sessionDefMap, courseMap, facultyMap, roomMap]);

  // Filter sessions matching selected item
  const relevantSessions = useMemo(() => {
    if (!selectedId) return [];
    return enrichedSessions.filter((s) => {
      if (viewType === 'group') {
        return (s.groups || []).includes(selectedId);
      } else if (viewType === 'faculty') {
        return s.faculty_id === selectedId;
      } else {
        return s.room_id === selectedId;
      }
    });
  }, [enrichedSessions, viewType, selectedId]);

  // Build grid map: day -> period -> session
  const timetableMatrix = useMemo(() => {
    const matrix = {};
    for (const d of DAYS) {
      matrix[d] = {};
    }

    for (const session of relevantSessions) {
      const d = session.day;
      const p = session.start_period;
      const dur = session.duration || 1;

      if (matrix[d]) {
        matrix[d][p] = session;
        for (let i = 1; i < dur; i++) {
          matrix[d][p + i] = { isContinuation: true, parentSession: session };
        }
      }
    }
    return matrix;
  }, [relevantSessions]);

  const handleRescheduleSuccess = (updatedSession) => {
    refreshTimetable();
    if (onScheduleChanged) onScheduleChanged();
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Type Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewType('group')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewType === 'group'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              👥 Group
            </button>
            <button
              onClick={() => setViewType('faculty')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewType === 'faculty'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              👨‍🏫 Faculty
            </button>
            <button
              onClick={() => setViewType('room')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewType === 'room'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🏛️ Room
            </button>
          </div>

          {/* Entity Dropdown */}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[280px] sm:max-w-md"
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Button: Manual Rescheduling */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRescheduleSession(relevantSessions[0] || null);
              setIsManualModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow transition flex items-center justify-center gap-2"
          >
            <span>🔧</span>
            <span>Manual Reschedule</span>
          </button>
        </div>
      </div>

      {/* Selected Entity Details Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {options.find((o) => o.id === selectedId)?.label || selectedId}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
            {relevantSessions.length} weekly sessions
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Lecture
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Tutorial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Lab (3h)
          </span>
        </div>
      </div>

      {/* Desktop / Tablet Grid View (hidden on small mobile) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px] text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500">
              <th className="p-3 text-left w-24 font-semibold uppercase tracking-wider">Day</th>
              {PERIODS.map((period) => (
                <th
                  key={period.id}
                  className={`p-2 text-center font-semibold uppercase tracking-wider ${
                    period.id === 'LUNCH' ? 'w-16 bg-slate-100/50 dark:bg-slate-900/80' : ''
                  }`}
                >
                  <div>{period.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{period.time}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {DAYS.map((day) => (
              <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                <td className="p-3 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                  {day}
                </td>

                {PERIODS.map((period) => {
                  if (period.id === 'LUNCH') {
                    return (
                      <td
                        key="lunch"
                        className="p-1 bg-slate-100/70 dark:bg-slate-900/50 text-center text-slate-400 font-medium text-[11px] border-r border-slate-200 dark:border-slate-700"
                      >
                        <span className="[writing-mode:vertical-lr] tracking-widest uppercase">
                          Lunch
                        </span>
                      </td>
                    );
                  }

                  const pNum = period.id;
                  const item = timetableMatrix[day]?.[pNum];

                  // Continuation cell for 3h labs
                  if (item?.isContinuation) {
                    return null;
                  }

                  if (item) {
                    const dur = item.duration || 1;
                    const isLab = item.kind === 'lab' || dur > 1;
                    const cardStyle =
                      item.kind === 'lab'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100'
                        : item.kind === 'tutorial'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100';

                    return (
                      <td
                        key={pNum}
                        colSpan={dur}
                        className="p-1.5 border-r border-slate-100 dark:border-slate-700/60 align-top"
                      >
                        <div
                          onClick={() => setActiveSession(item)}
                          className={`h-full p-2.5 rounded-xl border ${cardStyle} cursor-pointer hover:shadow-md transition flex flex-col justify-between`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs truncate">{item.course_id}</span>
                              {isLab && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-200">
                                  LAB
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] truncate mt-0.5 opacity-90">
                              {viewType === 'faculty' ? item.groups?.join(', ') : item.faculty_name}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-75 mt-2">
                            <span>{item.room_id}</span>
                            <span>{item.duration}h</span>
                          </div>
                        </div>
                      </td>
                    );
                  }

                  // Empty slot
                  return (
                    <td
                      key={pNum}
                      className="p-2 border-r border-slate-100 dark:border-slate-700/60 text-center text-slate-300 dark:text-slate-600"
                    >
                      <span className="text-[11px] select-none">-</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-Friendly Day-by-Day Cards View (visible only on mobile) */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Day Selector Tabs */}
        <div className="flex justify-between bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          {DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setMobileDay(d)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mobileDay === d
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Sessions list for selected mobile day */}
        <div className="space-y-2">
          {PERIODS.filter((p) => p.id !== 'LUNCH').map((p) => {
            const item = timetableMatrix[mobileDay]?.[p.id];
            if (item?.isContinuation) return null;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3"
              >
                <div className="w-14 text-center">
                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    {p.label}
                  </span>
                  <p className="text-[10px] text-slate-400">{p.time.split(' - ')[0]}</p>
                </div>

                <div className="flex-1 border-l border-slate-100 dark:border-slate-700 pl-3">
                  {item ? (
                    <div
                      onClick={() => setActiveSession(item)}
                      className="cursor-pointer hover:opacity-80"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.course_id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-700">
                          {item.room_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {item.course_title || item.course_id}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {item.faculty_name} • {item.groups?.join(', ')} ({item.duration}h)
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No class scheduled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Detail Modal */}
      {activeSession && (
        <SessionDetailModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
          onReschedule={(session) => {
            setRescheduleSession(session);
            setIsManualModalOpen(true);
          }}
        />
      )}

      {/* Manual Reschedule Modal */}
      {isManualModalOpen && (
        <ManualScheduleModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          initialSession={rescheduleSession}
          allSessions={enrichedSessions}
          rooms={citData?.rooms || []}
          onRescheduleSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
}
