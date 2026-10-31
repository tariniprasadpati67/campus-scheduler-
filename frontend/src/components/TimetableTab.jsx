import React, { useState, useMemo } from 'react';
import SessionDetailModal from './SessionDetailModal.jsx';

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

export default function TimetableTab({ citData, scheduleData }) {
  const [viewType, setViewType] = useState('group'); // 'group' | 'faculty' | 'room'
  const [selectedId, setSelectedId] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  // Lookups
  const courseMap = useMemo(() => {
    const map = {};
    for (const c of citData.courses || []) map[c.id] = c;
    return map;
  }, [citData]);

  const facultyMap = useMemo(() => {
    const map = {};
    for (const f of citData.faculty || []) map[f.id] = f;
    return map;
  }, [citData]);

  const roomMap = useMemo(() => {
    const map = {};
    for (const r of citData.rooms || []) map[r.id] = r;
    return map;
  }, [citData]);

  const sessionDefMap = useMemo(() => {
    const map = {};
    for (const s of citData.sessions || []) map[s.id] = s;
    return map;
  }, [citData]);

  // Options for Dropdown 2
  const options = useMemo(() => {
    if (viewType === 'group') {
      return (citData.student_groups || []).map((g) => ({
        id: g.id,
        label: `${g.id} (${g.name || g.department})`,
      }));
    } else if (viewType === 'faculty') {
      return (citData.faculty || []).map((f) => ({
        id: f.id,
        label: `${f.name} (${f.department})`,
      }));
    } else {
      return (citData.rooms || []).map((r) => ({
        id: r.id,
        label: `${r.id} - ${r.name} (${r.type}, Cap: ${r.capacity})`,
      }));
    }
  }, [viewType, citData]);

  // Set default selection when viewType changes
  React.useEffect(() => {
    if (options.length > 0) {
      setSelectedId(options[0].id);
    }
  }, [viewType, options]);

  // Enriched sessions with metadata
  const enrichedSessions = useMemo(() => {
    return (scheduleData.sessions || []).map((item) => {
      const def = sessionDefMap[item.session_id] || {};
      const course = courseMap[def.course_id] || {};
      const faculty = facultyMap[def.faculty_id] || {};
      const room = roomMap[item.room_id] || {};

      return {
        ...def,
        ...item,
        id: item.session_id,
        course_title: course.title,
        faculty_name: faculty.name,
        room_name: room.name,
        room_building: room.building,
        room_capacity: room.capacity,
      };
    });
  }, [scheduleData, sessionDefMap, courseMap, facultyMap, roomMap]);

  // Filter sessions matching selected item
  const relevantSessions = useMemo(() => {
    if (!selectedId) return [];
    return enrichedSessions.filter((s) => {
      if (viewType === 'group') return s.groups?.includes(selectedId);
      if (viewType === 'faculty') return s.faculty_id === selectedId;
      if (viewType === 'room') return s.room_id === selectedId;
      return false;
    });
  }, [enrichedSessions, viewType, selectedId]);

  // Build grid map: [day][period] -> session
  const grid = useMemo(() => {
    const map = {};
    for (const d of DAYS) map[d] = {};

    for (const s of relevantSessions) {
      const day = s.day;
      const start = s.start_period;
      const dur = s.duration || 1;
      if (map[day]) {
        map[day][start] = { session: s, isStart: true, span: dur };
        for (let p = start + 1; p < start + dur; p++) {
          map[day][p] = { session: s, isStart: false };
        }
      }
    }
    return map;
  }, [relevantSessions]);

  const cellColors = {
    lecture: 'bg-blue-50/90 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    tutorial: 'bg-emerald-50/90 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
    lab: 'bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
  };

  const badgeColors = {
    lecture: 'bg-blue-200/80 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
    tutorial: 'bg-emerald-200/80 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200',
    lab: 'bg-amber-200/80 dark:bg-amber-800 text-amber-800 dark:text-amber-200',
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              View By
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="group">Student group</option>
              <option value="faculty">Faculty</option>
              <option value="room">Room</option>
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-[260px]">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {viewType === 'group' ? 'Group' : viewType === 'faculty' ? 'Faculty' : 'Room'}
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-full"
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-400"></span> Lecture
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-400"></span> Tutorial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400"></span> Lab (3h)
          </span>
        </div>
      </div>

      {/* Timetable Grid with horizontal scroll for mobile */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px] text-left">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
              <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase w-32 border-r border-slate-200 dark:border-slate-700 shadow-sm">
                Period / Time
              </th>
              {DAYS.map((day) => (
                <th key={day} className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {PERIODS.map((period) => {
              if (period.id === 'LUNCH') {
                return (
                  <tr key="lunch" className="bg-amber-50/60 dark:bg-amber-950/20 text-center font-medium text-amber-800 dark:text-amber-300 border-y-2 border-amber-200 dark:border-amber-900/60">
                    <td className="sticky left-0 z-10 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-2 text-xs font-bold border-r border-amber-200 dark:border-amber-900/60">
                      13:00 - 14:00
                    </td>
                    <td colSpan={5} className="py-2 text-xs uppercase tracking-widest font-semibold">
                      ☕ Lunch Break
                    </td>
                  </tr>
                );
              }

              const pId = period.id;

              return (
                <tr key={pId} className="h-20">
                  {/* Sticky Time Header on Left */}
                  <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 px-3 py-2 text-xs border-r border-slate-200 dark:border-slate-700 font-medium text-slate-500 dark:text-slate-400">
                    <div className="font-bold text-slate-700 dark:text-slate-200">{period.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{period.time}</div>
                  </td>

                  {/* Days */}
                  {DAYS.map((day) => {
                    const cell = grid[day]?.[pId];

                    if (cell && !cell.isStart) {
                      // Subsumed by multi-period lab span
                      return null;
                    }

                    if (cell && cell.isStart) {
                      const s = cell.session;
                      const span = cell.span;
                      const colorClass = cellColors[s.kind] || 'bg-slate-100';
                      const badgeClass = badgeColors[s.kind] || 'bg-slate-200';

                      return (
                        <td
                          key={day}
                          rowSpan={span}
                          onClick={() => setActiveSession(s)}
                          className={`p-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0 cursor-pointer transition select-none ${colorClass}`}
                        >
                          <div className="h-full flex flex-col justify-between p-1.5 rounded-lg border border-transparent hover:border-current/20">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-sm tracking-tight">{s.course_id}</span>
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                                  {s.kind}
                                </span>
                              </div>
                              <p className="text-xs font-medium line-clamp-1 opacity-90">{s.course_title || s.id}</p>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-current/10 text-[11px] space-y-0.5 opacity-90">
                              {viewType !== 'room' && (
                                <div className="font-medium">📍 {s.room_id}</div>
                              )}
                              {viewType !== 'faculty' && (
                                <div className="truncate">👤 {s.faculty_name || s.faculty_id}</div>
                              )}
                              {viewType !== 'group' && (
                                <div className="truncate">👥 {s.groups?.join(', ')}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    // Empty slot
                    return (
                      <td
                        key={day}
                        className="p-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-transparent text-center text-slate-300 dark:text-slate-600 text-xs"
                      >
                        <span className="select-none opacity-40">—</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Session Details Modal */}
      {activeSession && (
        <SessionDetailModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}

