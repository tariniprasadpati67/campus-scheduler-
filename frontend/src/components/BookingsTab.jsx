import React, { useState, useMemo } from 'react';

export default function BookingsTab({ citData, scheduleData }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const reqDefMap = useMemo(() => {
    const map = {};
    for (const r of citData.booking_requests || []) map[r.id] = r;
    return map;
  }, [citData]);

  const cancellations = useMemo(() => {
    return new Set((citData.cancellations || []).map((c) => c.request_id));
  }, [citData]);

  const bookings = useMemo(() => {
    const festBookings = scheduleData.fest_week?.bookings || [];
    return festBookings.map((b) => {
      const def = reqDefMap[b.request_id] || {};
      return {
        ...def,
        ...b,
        is_cancelled: cancellations.has(b.request_id),
      };
    });
  }, [scheduleData, reqDefMap, cancellations]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
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
  }, [bookings, filterStatus, search]);

  const statusBadge = {
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    alternative_offered: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-300 dark:border-rose-700',
  };

  const statusLabels = {
    approved: 'Approved',
    alternative_offered: 'Alternative Offered',
    rejected: 'Rejected',
  };

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      approved: bookings.filter((b) => b.status === 'approved').length,
      alternative: bookings.filter((b) => b.status === 'alternative_offered').length,
      rejected: bookings.filter((b) => b.status === 'rejected').length,
    };
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-semibold">Total Requests</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Approved</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-semibold">Alternatives</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.alternative}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-rose-600 dark:text-rose-400 uppercase font-semibold">Rejected</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search request, title, requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <div className="flex flex-wrap gap-1">
              {['ALL', 'approved', 'alternative_offered', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition capitalize ${
                    filterStatus === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing {filteredBookings.length} of {bookings.length}
        </div>
      </div>

      {/* Bookings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBookings.map((b) => (
          <div
            key={b.request_id}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{b.request_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium text-slate-600 dark:text-slate-300 capitalize">
                      {b.role || 'requester'} • {b.requested_category?.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {b.title || b.request_id}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">by {b.requester}</p>
                </div>

                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border whitespace-nowrap ${
                    statusBadge[b.status] || 'bg-slate-100'
                  }`}
                >
                  {statusLabels[b.status] || b.status}
                </span>
              </div>

              {/* Assignment details if approved or alternative */}
              {b.status !== 'rejected' && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Assigned Slot:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {b.day} P{b.start_period} - P{b.end_period}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Assigned Venue:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      📍 {b.room_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Attendance / Duration:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {b.attendance} people • {b.duration_periods} period(s)
                    </span>
                  </div>
                </div>
              )}

              {/* Reason text */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Decision Reason:
                </span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-0.5 italic">
                  "{b.reason || 'No reason specified'}"
                </p>
              </div>
            </div>

            {/* Raw request preview */}
            {b.raw_text && (
              <div className="pt-2 text-[11px] text-slate-400 truncate">
                <span className="font-semibold">Request:</span> {b.raw_text}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredBookings.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No booking requests found matching your filter criteria.
        </div>
      )}
    </div>
  );
}

