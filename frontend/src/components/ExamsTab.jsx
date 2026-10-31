import React, { useState, useMemo } from 'react';

export default function ExamsTab({ citData, scheduleData }) {
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('ALL');

  const examDefMap = useMemo(() => {
    const map = {};
    for (const e of citData.exams || []) map[e.id] = e;
    return map;
  }, [citData]);

  const courseMap = useMemo(() => {
    const map = {};
    for (const c of citData.courses || []) map[c.id] = c;
    return map;
  }, [citData]);

  const roomMap = useMemo(() => {
    const map = {};
    for (const r of citData.rooms || []) map[r.id] = r;
    return map;
  }, [citData]);

  const exams = useMemo(() => {
    return (scheduleData.exams || []).map((e) => {
      const def = examDefMap[e.exam_id] || {};
      return {
        ...def,
        ...e,
        course_titles: (def.course_ids || []).map((cid) => courseMap[cid]?.title || cid),
      };
    });
  }, [scheduleData, examDefMap, courseMap]);

  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchDay = selectedDay === 'ALL' || e.day === selectedDay;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.exam_id?.toLowerCase().includes(q) ||
        e.course_ids?.some((c) => c.toLowerCase().includes(q)) ||
        e.groups?.some((g) => g.toLowerCase().includes(q)) ||
        e.rooms?.some((r) => r.toLowerCase().includes(q));
      return matchDay && matchSearch;
    });
  }, [exams, selectedDay, search]);

  const daysList = ['ALL', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search course, group, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase">Day:</span>
            <div className="flex flex-wrap gap-1">
              {daysList.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                    selectedDay === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing {filteredExams.length} of {exams.length} exams
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExams.map((exam) => {
          const totalSeats = (exam.rooms || []).reduce((sum, rid) => {
            return sum + Math.floor((roomMap[rid]?.capacity || 0) / 2);
          }, 0);

          return (
            <div
              key={exam.exam_id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:border-indigo-400 dark:hover:border-indigo-500 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 rounded-md">
                    {exam.day} • {exam.session} ({exam.session === 'AM' ? '09:30-11:30' : '14:00-16:00'})
                  </span>
                  <span className="text-xs font-mono text-slate-400">{exam.exam_id}</span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                  {exam.course_ids?.join(', ')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {exam.course_titles?.join(', ')}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold">Assigned Rooms:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {exam.rooms?.map((rid) => (
                        <span
                          key={rid}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-200"
                        >
                          📍 {rid} (half cap: {Math.floor((roomMap[rid]?.capacity || 0) / 2)})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-semibold">Groups ({exam.size} students):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exam.groups?.map((g) => (
                        <span key={g} className="px-1.5 py-0.5 text-[11px] bg-slate-100 dark:bg-slate-700/60 rounded">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                <span>Duration: {exam.duration_hours || 2} hours</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Capacity: {totalSeats} / {exam.size} seats
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No exams found matching your filter criteria.
        </div>
      )}
    </div>
  );
}

