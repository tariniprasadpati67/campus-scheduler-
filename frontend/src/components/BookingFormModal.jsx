import React, { useState } from 'react';
import { api } from '../services/api.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const CATEGORIES = [
  { id: 'club_event', label: 'Club Event' },
  { id: 'department_event', label: 'Department Event' },
  { id: 'guest_lecture', label: 'Guest Lecture' },
  { id: 'institute_event', label: 'Institute Event' },
];

export default function BookingFormModal({ isOpen, onClose, onBookingCreated, rooms = [] }) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [attendance, setAttendance] = useState(80);
  const [duration, setDuration] = useState(2);
  const [category, setCategory] = useState('club_event');
  const [roomType, setRoomType] = useState('seminar_hall');
  const [requestedRoom, setRequestedRoom] = useState('');
  const [preferredDay, setPreferredDay] = useState('THU');
  const [fromPeriod, setFromPeriod] = useState(10);
  const [toPeriod, setToPeriod] = useState(12);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [resultData, setResultData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setResultData(null);

    const bookingPayload = {
      title: title.trim(),
      attendance: parseInt(attendance, 10),
      duration_periods: parseInt(duration, 10),
      requested_category: category,
      windows: [
        {
          day: preferredDay,
          from_period: parseInt(fromPeriod, 10),
          to_period: parseInt(toPeriod, 10),
        },
      ],
      room_types: [roomType],
      requested_room: requestedRoom || null,
      needs: ['projector', 'audio'],
      mandatory_for_groups: [],
      raw_text: `Manual form booking for ${title}`,
    };

    try {
      const res = await api.bookings.create(bookingPayload);
      setResultData(res);
      if (onBookingCreated) {
        onBookingCreated(res);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMessage(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎪</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Request Venue Booking
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spectra Fest & Event venue allocation engine
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
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <span>❌</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {resultData ? (
          <div className="space-y-4 text-xs">
            <div
              className={`p-4 rounded-xl border ${
                resultData.status === 'approved'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                  : resultData.status === 'alternative_offered'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-800 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wide">
                  Decision: {resultData.status}
                </span>
                <span className="text-base">
                  {resultData.status === 'approved'
                    ? '🎉'
                    : resultData.status === 'alternative_offered'
                    ? '💡'
                    : '⛔'}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed">
                <strong>Reason:</strong> {resultData.reason}
              </p>
              {resultData.assigned_slot && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between font-mono">
                  <span>Assigned Venue:</span>
                  <span className="font-bold">
                    {resultData.assigned_slot.day} P{resultData.assigned_slot.start_period}-P
                    {resultData.assigned_slot.end_period} in {resultData.assigned_slot.room_id}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
              >
                Close & View Bookings
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autonomous Robotics Hackathon Finals"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Attendance
                </label>
                <input
                  type="number"
                  min="5"
                  max="1200"
                  required
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Periods / Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Venue Type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="seminar_hall">Seminar Hall</option>
                  <option value="auditorium">Auditorium</option>
                  <option value="classroom">Classroom</option>
                  <option value="lecture_hall">Lecture Hall</option>
                  <option value="outdoor">Open-Air Theatre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Day
                </label>
                <select
                  value={preferredDay}
                  onChange={(e) => setPreferredDay(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
                  From Period
                </label>
                <input
                  type="number"
                  min="1"
                  max="13"
                  value={fromPeriod}
                  onChange={(e) => setFromPeriod(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To Period
                </label>
                <input
                  type="number"
                  min="1"
                  max="13"
                  value={toPeriod}
                  onChange={(e) => setToPeriod(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specific Room (Optional)
              </label>
              <select
                value={requestedRoom}
                onChange={(e) => setRequestedRoom(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Any suitable room matching criteria</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} - {r.name} (Cap: {r.capacity})
                  </option>
                ))}
              </select>
            </div>

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
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Allocating...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
