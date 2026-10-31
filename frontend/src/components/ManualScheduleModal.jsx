import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const PERIODS = [
  { id: 1, label: 'P1 (08:00 - 09:00)' },
  { id: 2, label: 'P2 (09:00 - 10:00)' },
  { id: 3, label: 'P3 (10:00 - 11:00)' },
  { id: 4, label: 'P4 (11:00 - 12:00)' },
  { id: 5, label: 'P5 (12:00 - 13:00)' },
  { id: 6, label: 'P6 (14:00 - 15:00)' },
  { id: 7, label: 'P7 (15:00 - 16:00)' },
  { id: 8, label: 'P8 (16:00 - 17:00)' },
  { id: 9, label: 'P9 (17:00 - 18:00)' },
];

export default function ManualScheduleModal({
  isOpen,
  onClose,
  initialSession,
  allSessions = [],
  rooms = [],
  onRescheduleSuccess,
}) {
  if (!isOpen) return null;

  const [selectedSessionId, setSelectedSessionId] = useState(
    initialSession?.session_id || initialSession?.id || (allSessions[0]?.session_id || '')
  );
  const [targetDay, setTargetDay] = useState(initialSession?.day || 'MON');
  const [targetPeriod, setTargetPeriod] = useState(initialSession?.start_period || 1);
  const [targetRoom, setTargetRoom] = useState(initialSession?.room_id || (rooms[0]?.id || ''));
  const [reason, setReason] = useState('Manual timetable adjustment requested by coordinator');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const currentSession =
    allSessions.find((s) => (s.session_id || s.id) === selectedSessionId) || initialSession;

  useEffect(() => {
    if (initialSession) {
      setSelectedSessionId(initialSession.session_id || initialSession.id);
      setTargetDay(initialSession.day || 'MON');
      setTargetPeriod(initialSession.start_period || 1);
      setTargetRoom(initialSession.room_id || '');
    }
  }, [initialSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const res = await api.timetable.manualSchedule({
        session_id: selectedSessionId,
        day: targetDay,
        start_period: parseInt(targetPeriod, 10),
        room_id: targetRoom,
        reason: reason.trim() || 'Manual adjustment',
      });

      setSuccessMessage(res.message || 'Session successfully rescheduled!');
      if (onRescheduleSuccess) {
        onRescheduleSuccess(res.session);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Manual schedule error:', err);
      // The backend returns detailed constraint breakdown in err.message
      setErrorMessage(err.message || 'Failed to reschedule. Constraint violation detected.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔧</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Manual Rescheduling
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Move or swap a teaching session. Hard constraints strictly enforced.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <span>⚠️</span>
              <span>Reschedule Blocked (Constraint Violation):</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed break-words">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <span>✅</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Session Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Session to Reschedule
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                const s = allSessions.find((item) => (item.session_id || item.id) === e.target.value);
                if (s) {
                  setTargetDay(s.day);
                  setTargetPeriod(s.start_period);
                  setTargetRoom(s.room_id);
                }
              }}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {allSessions.map((s) => {
                const sid = s.session_id || s.id;
                return (
                  <option key={sid} value={sid}>
                    {sid} - {s.course_id || s.course_name} ({s.faculty_id || s.faculty_name}) [Currently: {s.day} P{s.start_period} in {s.room_id}]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Placement Summary Card */}
          {currentSession && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-semibold text-slate-500">Course / Type:</span>{' '}
                {currentSession.course_name || currentSession.course_id} (
                {currentSession.duration}h {currentSession.session_type || currentSession.kind})
              </div>
              <div>
                <span className="font-semibold text-slate-500">Faculty:</span>{' '}
                {currentSession.faculty_name || currentSession.faculty_id}
              </div>
              <div>
                <span className="font-semibold text-slate-500">Groups:</span>{' '}
                {Array.isArray(currentSession.group_ids || currentSession.groups)
                  ? (currentSession.group_ids || currentSession.groups).join(', ')
                  : 'N/A'}
              </div>
              <div>
                <span className="font-semibold text-slate-500">Current Slot:</span>{' '}
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {currentSession.day} P{currentSession.start_period} ({currentSession.room_id})
                </span>
              </div>
            </div>
          )}

          {/* Target Day & Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Day
              </label>
              <select
                value={targetDay}
                onChange={(e) => setTargetDay(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Start Period
              </label>
              <select
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(parseInt(e.target.value, 10))}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Room */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Room
            </label>
            <select
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} - {r.name} ({r.type}, Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Reason / Justification */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Justification (Logged to Audit Trail)
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Moved to larger lecture hall to accommodate joined sections"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking Constraints...</span>
                </>
              ) : (
                <span>Confirm & Apply</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
