import React, { useState, useMemo, useEffect } from 'react';
import BookingFormModal from './BookingFormModal.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function BookingsTab({ citData, scheduleData }) {
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Live bookings state
  const [liveBookings, setLiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);
  const [explainingItem, setExplainingItem] = useState(null);
  const [explanationText, setExplanationText] = useState(null);
  const [explainingLoading, setExplainingLoading] = useState(false);

  const reqDefMap = useMemo(() => {
    const map = {};
    for (const r of citData?.booking_requests || []) map[r.id] = r;
    return map;
  }, [citData]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.bookings.list();
      if (res?.bookings && res.bookings.length > 0) {
        setLiveBookings(res.bookings);
      } else {
        // Fallback to static scheduleData fest bookings
        const fest = scheduleData?.fest_week?.bookings || [];
        setLiveBookings(
          fest.map((b) => {
            const def = reqDefMap[b.request_id] || {};
            return {
              id: b.request_id,
              request_id: b.request_id,
              title: def.title || b.request_id,
              requester: def.requester || 'Campus Org',
              status: b.status,
              reason: b.reason,
              assigned_day: b.assigned_day,
              assigned_start: b.assigned_start_period,
              assigned_end: b.assigned_end_period,
              assigned_room: b.assigned_room_id,
            };
          })
        );
      }
    } catch (err) {
      console.warn('Could not fetch /api/bookings, falling back to static:', err.message);
      const fest = scheduleData?.fest_week?.bookings || [];
      setLiveBookings(
        fest.map((b) => {
          const def = reqDefMap[b.request_id] || {};
          return {
            id: b.request_id,
            request_id: b.request_id,
            title: def.title || b.request_id,
            requester: def.requester || 'Campus Org',
            status: b.status,
            reason: b.reason,
            assigned_day: b.assigned_day,
            assigned_start: b.assigned_start_period,
            assigned_end: b.assigned_end_period,
            assigned_room: b.assigned_room_id,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancelBooking = async (id) => {
    if (!confirm(`Are you sure you want to cancel booking request #${id}?`)) return;
    try {
      setCancellingId(id);
      await api.bookings.cancel(id, 'Cancelled by requester via web portal');
      setActionAlert({ type: 'success', text: `Booking request #${id} cancelled successfully.` });
      await loadBookings();
    } catch (err) {
      setActionAlert({ type: 'error', text: `Failed to cancel request #${id}: ${err.message}` });
    } finally {
      setCancellingId(null);
    }
  };

  const handleExplain = async (booking) => {
    setExplainingItem(booking);
    setExplanationText(null);
    setExplainingLoading(true);

    try {
      const res = await api.ai.explainDecision('booking', booking);
      setExplanationText(res.explanation || booking.reason || 'Standard constraint evaluation applied.');
    } catch (err) {
      setExplanationText(booking.reason || 'Decision reached based on capacity and priority rules.');
    } finally {
      setExplainingLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return liveBookings.filter((b) => {
      const matchStatus = filterStatus === 'ALL' || b.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.request_id?.toLowerCase().includes(q) ||
        b.title?.toLowerCase().includes(q) ||
        b.requester?.toLowerCase().includes(q) ||
        b.reason?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [liveBookings, filterStatus, search]);

  const stats = useMemo(() => {
    return {
      total: liveBookings.length,
      approved: liveBookings.filter((b) => b.status === 'approved').length,
      alternative: liveBookings.filter((b) => b.status === 'alternative_offered').length,
      rejected: liveBookings.filter((b) => b.status === 'rejected').length,
      cancelled: liveBookings.filter((b) => b.status === 'cancelled').length,
    };
  }, [liveBookings]);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Total Requests</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
            Approved
          </p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.approved}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[11px] text-amber-600 dark:text-amber-400 uppercase font-semibold">
            Alternative
          </p>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.alternative}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[11px] text-rose-600 dark:text-rose-400 uppercase font-semibold">
            Rejected
          </p>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {stats.rejected}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Cancelled</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-500 mt-1">{stats.cancelled}</p>
        </div>
      </div>

      {actionAlert && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}
        >
          <span>{actionAlert.text}</span>
          <button onClick={() => setActionAlert(null)} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Room Conflict Priority Order & Rule Banner */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>⚖️</span> Room Allocation Priority Order
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            When two requests want the same room at the same time:
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">1. Exams</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
            <span className="font-bold text-blue-700 dark:text-blue-300">2. Classes</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="font-bold text-emerald-700 dark:text-emerald-300">3. Institute</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <span className="font-bold text-amber-700 dark:text-amber-300">4. Guest Talk</span>
          </div>
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
            <span className="font-bold text-orange-700 dark:text-orange-300">5. Dept Event</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
            <span className="font-bold text-purple-700 dark:text-purple-300">6. Club Event</span>
          </div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings by event or ID..."
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="alternative_offered">Alternative Offered</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => setIsFormModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow transition flex items-center justify-center gap-2"
        >
          <span>➕</span>
          <span>Request Venue</span>
        </button>
      </div>

      {/* Bookings List Cards */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <span className="text-3xl">🔍</span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No booking requests found matching your filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const isApproved = b.status === 'approved';
            const isAlt = b.status === 'alternative_offered';
            const isRejected = b.status === 'rejected';
            const isCancelled = b.status === 'cancelled';

            return (
              <div
                key={b.id || b.request_id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {b.request_id || `#${b.id}`}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {b.title || 'Venue Request'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        By {b.requester || 'Campus Group'} • {b.category || 'Event'}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                          : isAlt
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {b.status?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Allocation Details */}
                  {(isApproved || isAlt) && b.assigned_day && b.assigned_room && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                        {b.assigned_room}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {b.assigned_day} P{b.assigned_start}-P{b.assigned_end}
                      </span>
                    </div>
                  )}

                  {/* Engine Decision Reason */}
                  {b.reason && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                      Decision Note: {b.reason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => handleExplain(b)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1"
                  >
                    <span>💡</span>
                    <span>Explain Decision</span>
                  </button>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelBooking(b.id || b.request_id)}
                      disabled={cancellingId === (b.id || b.request_id)}
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold transition disabled:opacity-50"
                    >
                      {cancellingId === (b.id || b.request_id) ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Booking Form Modal */}
      {isFormModalOpen && (
        <BookingFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          rooms={citData?.rooms || []}
          onBookingCreated={() => {
            loadBookings();
          }}
        />
      )}

      {/* Decision Explanation Modal */}
      {explainingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Decision Explanation: {explainingItem.request_id || `#${explainingItem.id}`}
                </h4>
              </div>
              <button
                onClick={() => setExplainingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Event:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{explainingItem.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Outcome:</span>
                <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {explainingItem.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 mt-2">
                {explainingLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-500">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing constraints and priority decisions...</span>
                  </div>
                ) : (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    {explanationText}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setExplainingItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
