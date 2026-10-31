import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const CATEGORIES = [
  { id: 'club_event', label: 'Club Event' },
  { id: 'department_event', label: 'Department Event' },
  { id: 'guest_lecture', label: 'Guest Lecture' },
  { id: 'institute_event', label: 'Institute Event' },
];

const SAMPLE_PROMPTS = [
  'Need a room for 45 people on Tuesday 6 to 8 pm, projector please.',
  'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye',
  'I want SH-2 on Friday at 10 am for a wheelchair-accessible poster session, 60 people.',
  'Book the auditorium for the CSE department farewell, Friday evening, around 400 people',
];

export default function BookingFormModal({ isOpen, onClose, onBookingCreated, rooms = [] }) {
  if (!isOpen) return null;

  const { currentUser } = useAuth();

  // AI Prompt State
  const [aiText, setAiText] = useState('');
  const [parsingAi, setParsingAi] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [aiFollowUps, setAiFollowUps] = useState([]);
  const [aiInfo, setAiInfo] = useState(null);

  // Editable Form Fields
  const [title, setTitle] = useState('');
  const [attendance, setAttendance] = useState(80);
  const [duration, setDuration] = useState(2);
  const [category, setCategory] = useState(currentUser?.role === 'admin' ? 'institute_event' : 'club_event');
  const [roomType, setRoomType] = useState('seminar_hall');
  const [requestedRoom, setRequestedRoom] = useState('');
  const [preferredDay, setPreferredDay] = useState('THU');
  const [fromPeriod, setFromPeriod] = useState(10);
  const [toPeriod, setToPeriod] = useState(11);
  const [needs, setNeeds] = useState(['projector', 'audio']);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [resultData, setResultData] = useState(null);

  // Handle AI extraction
  const handleAiExtract = async () => {
    if (!aiText.trim()) return;
    setParsingAi(true);
    setErrorMessage(null);
    setAiWarnings([]);
    setAiFollowUps([]);

    try {
      const res = await api.ai.parseBooking(aiText.trim(), currentUser?.role || 'club');
      const struct = res.structured || {};

      if (struct.title) setTitle(struct.title);
      if (struct.attendance) setAttendance(struct.attendance);
      if (struct.duration_periods) setDuration(struct.duration_periods);
      if (struct.requested_category) setCategory(struct.requested_category);
      if (struct.room_types && struct.room_types.length > 0) setRoomType(struct.room_types[0]);
      if (struct.requested_room) setRequestedRoom(struct.requested_room);
      if (struct.needs) setNeeds(struct.needs);

      if (struct.windows && struct.windows.length > 0) {
        setPreferredDay(struct.windows[0].day);
        setFromPeriod(struct.windows[0].from_period);
        setToPeriod(struct.windows[0].to_period);
      }

      setAiWarnings(res.warnings || []);
      setAiFollowUps(res.follow_ups || []);
      setAiInfo({ engine: res.engine_used, model: res.model });
    } catch (err) {
      console.warn('AI Parsing error, fallback to manual form:', err);
      setErrorMessage(`AI Extraction: ${err.message}. You can still fill the form manually.`);
    } finally {
      setParsingAi(false);
    }
  };

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
      needs: needs,
      mandatory_for_groups: [],
      raw_text: aiText || `Manual form booking for ${title}`,
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎪</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Request Venue Booking
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Natural Language / Hinglish AI Assistant & Manual Submission Form
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

        {/* AI Natural Language Assistant Box */}
        <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <span>✨</span>
              <span>AI Assistant (English or Hinglish)</span>
            </span>
            {aiInfo && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                {aiInfo.model}
              </span>
            )}
          </div>

          <textarea
            rows={2}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Type in English or Hinglish: e.g. 'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye'"
            className="w-full p-2.5 text-xs rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Sample quick prompts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500">Quick Samples:</span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAiText(sample)}
                className="text-[10px] bg-white dark:bg-slate-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 truncate max-w-[200px]"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAiExtract}
              disabled={parsingAi || !aiText.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {parsingAi ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Extract to Form</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Warnings & Follow-ups */}
        {aiWarnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span>⚠️</span>
              <span>AI Validation & Conflict Adjustments:</span>
            </div>
            {aiWarnings.map((w, i) => (
              <p key={i} className="text-[11px] leading-relaxed">
                • {w}
              </p>
            ))}
          </div>
        )}

        {aiFollowUps.length > 0 && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span>💡</span>
              <span>Follow-up Clarification:</span>
            </div>
            {aiFollowUps.map((f, i) => (
              <p key={i} className="text-[11px]">
                • {f}
              </p>
            ))}
          </div>
        )}

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
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                Editable Structured Booking Fields (Review before submitting):
              </p>
            </div>

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
                {submitting ? 'Allocating with Engine...' : 'Confirm & Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
