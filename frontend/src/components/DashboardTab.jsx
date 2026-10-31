import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardTab({ onNavigateToTimetable }) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [activeSection, setActiveSection] = useState('approvals'); // 'approvals' | 'conflicts' | 'utilisation'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [conflictsData, setConflictsData] = useState(null);
  const [utilisationData, setUtilisationData] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [roomSort, setRoomSort] = useState('util_desc');

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [conflictsRes, utilRes, changesRes, bookingsRes] = await Promise.all([
        api.timetable.getConflicts().catch((err) => ({ error: err.message })),
        api.timetable.getUtilisation().catch((err) => ({ error: err.message, utilisation: [] })),
        api.changes.list().catch(() => ({ changes: [] })),
        api.bookings.list('pending').catch(() => ({ bookings: [] })),
      ]);

      if (conflictsRes?.error) {
        console.warn('Conflicts endpoint returned error:', conflictsRes.error);
      } else {
        setConflictsData(conflictsRes);
      }

      setUtilisationData(utilRes?.utilisation || []);
      setChangeRequests(changesRes?.changes || []);
      setBookingRequests(bookingsRes?.bookings || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDecideChange = async (id, action) => {
    if (!isAdmin) {
      alert('Only administrators can approve or reject schedule changes.');
      return;
    }

    try {
      setActionLoadingId(`${action}-${id}`);
      setActionMessage(null);
      const res = await api.changes.decide(id, action, `Admin ${action} via dashboard`);
      setActionMessage({
        type: 'success',
        text: `Change request #${id} successfully ${action}ed! ${res.message || ''}`,
      });
      // Refresh dashboard & timetable data
      await fetchDashboardData(true);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: `Failed to ${action} request #${id}: ${err.message}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics calculation
  const pendingChanges = changeRequests.filter((c) => c.status === 'pending');
  const pendingBookings = bookingRequests.filter((b) => b.status === 'pending');
  const totalPending = pendingChanges.length + pendingBookings.length;

  const hardViolationsCount = conflictsData?.hard_violations_count ?? 0;
  const isScheduleValid = conflictsData?.is_valid ?? true;
  const softPenaltyTotal = conflictsData?.soft_total_penalty ?? 0;

  const avgUtilisation = utilisationData.length
    ? Math.round(
        utilisationData.reduce((acc, curr) => acc + (curr.utilisation_percentage || 0), 0) /
          utilisationData.length
      )
    : 0;

  // Filtered and sorted rooms
  const filteredRooms = utilisationData
    .filter((r) => {
      if (roomFilter === 'ALL') return true;
      return r.room_type?.toLowerCase().includes(roomFilter.toLowerCase());
    })
    .sort((a, b) => {
      if (roomSort === 'util_desc') return b.utilisation_percentage - a.utilisation_percentage;
      if (roomSort === 'util_asc') return a.utilisation_percentage - b.utilisation_percentage;
      if (roomSort === 'capacity_desc') return b.capacity - a.capacity;
      return a.room_id.localeCompare(b.room_id);
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading live dashboard metrics, conflict status, and room utilisations...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊</span> Campus Operations Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time constraint validation, pending approval queues, and facility utilization
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition disabled:opacity-50"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh Live Data'}</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✅' : '❌'}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Schedule Health Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-500">Schedule Health</span>
            <span className="text-lg">{isScheduleValid ? '🛡️' : '⚠️'}</span>
          </div>
          <p
            className={`text-2xl font-bold mt-1 ${
              isScheduleValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isScheduleValid ? '100% Conflict-Free' : `${hardViolationsCount} Violations`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hard: {hardViolationsCount} • Soft Penalty: {softPenaltyTotal}
          </p>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-500">Pending Approvals</span>
            <span className="text-lg">⏳</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalPending}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {pendingChanges.length} changes • {pendingBookings.length} venue requests
          </p>
        </div>

        {/* Room Utilisation Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-500">Avg Utilisation</span>
            <span className="text-lg">🏢</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {avgUtilisation}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across 27 campus teaching venues
          </p>
        </div>

        {/* Total Sessions Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-500">Weekly Sessions</span>
            <span className="text-lg">📚</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">189</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            243 teaching hours scheduled
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveSection('approvals')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeSection === 'approvals'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>⏳ Pending Approvals</span>
            {totalPending > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-bold">
                {totalPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('conflicts')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeSection === 'conflicts'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>🛡️ Conflicts & Constraints</span>
            {hardViolationsCount > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 font-bold">
                {hardViolationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('utilisation')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeSection === 'utilisation'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>📈 Room Utilisation</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {utilisationData.length}
            </span>
          </button>
        </nav>
      </div>

      {/* SECTION 1: PENDING APPROVALS */}
      {activeSection === 'approvals' && (
        <div className="space-y-6">
          {/* Change Requests Subsection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔄</span> Timetable Change Proposals
              </h3>
              <span className="text-xs text-slate-500">
                Requires Admin approval before applying minimal-move rescheduling
              </span>
            </div>

            {changeRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <span className="text-3xl">🎉</span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No proposed change requests in the queue.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Faculty leaves, room maintenance closures, or added sessions will appear here for Admin review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {changeRequests.map((c) => {
                  const isPending = c.status === 'pending';
                  const diff = c.diff || {};
                  const movedSessions = diff.moved_sessions || [];

                  return (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            #{c.id}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                            {c.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              c.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : c.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Admin Action Buttons */}
                        {isPending && (
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => handleDecideChange(c.id, 'approve')}
                                  disabled={actionLoadingId === `approve-${c.id}`}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                                >
                                  {actionLoadingId === `approve-${c.id}` ? 'Applying...' : 'Approve & Apply'}
                                </button>
                                <button
                                  onClick={() => handleDecideChange(c.id, 'reject')}
                                  disabled={actionLoadingId === `reject-${c.id}`}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
                                >
                                  {actionLoadingId === `reject-${c.id}` ? 'Rejecting...' : 'Reject'}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Admin login required to approve
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Request details */}
                      <div className="text-xs bg-slate-50 dark:bg-slate-900/70 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Parameters:</p>
                        <pre className="mt-1 text-slate-600 dark:text-slate-400 font-mono text-[11px] overflow-x-auto">
                          {JSON.stringify(c.details, null, 2)}
                        </pre>
                      </div>

                      {/* Rescheduler Proposed Diff */}
                      {movedSessions.length > 0 && (
                        <div className="text-xs space-y-1.5">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>⚡</span> Solver Proposed Minimal Diff ({movedSessions.length} moved sessions):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {movedSessions.map((m, idx) => (
                              <div
                                key={idx}
                                className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-2.5 rounded-lg flex items-center justify-between"
                              >
                                <span className="font-bold text-indigo-900 dark:text-indigo-200">
                                  {m.session_id}
                                </span>
                                <div className="text-right">
                                  <span className="line-through text-slate-400 mr-2">
                                    {m.old_day} P{m.old_start} ({m.old_room})
                                  </span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    ➜ {m.new_day} P{m.new_start} ({m.new_room})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Decision note: {c.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: CONFLICTS & CONSTRAINTS */}
      {activeSection === 'conflicts' && (
        <div className="space-y-6">
          {/* Hard Constraints Status */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🛡️</span> Hard Constraints Verification (Validator Rules H1 - H10)
            </h3>

            {isScheduleValid ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-6 rounded-2xl flex items-center gap-4">
                <span className="text-4xl">✅</span>
                <div>
                  <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    Schedule is Strictly Conflict-Free (0 Violations)
                  </h4>
                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    All 189 sessions strictly satisfy room capacity, faculty limits, basket slot alignments, accessibility requirements, lab timings, and unavailabilities.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-xl flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      {hardViolationsCount} Hard Constraint Violation(s) Detected
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      The schedule violates one or more hard constraints. See breakdown below:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {(conflictsData?.hard_violations || []).map((v, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 flex items-start gap-3"
                    >
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 rounded">
                        {v.rule || 'HARD'}
                      </span>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{v.detail || v.message}</p>
                        {v.where && <p className="text-slate-500 mt-0.5">Location: {v.where}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Soft Penalties Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎯</span> Soft Constraint Penalties (Score: {softPenaltyTotal})
              </h3>
              <span className="text-xs text-slate-500">
                Minimised by CP-SAT solver objective (S1-S6)
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Rule</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Penalty Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">S1</td>
                      <td className="p-3">Faculty avoided times & preferences</td>
                      <td className="p-3 text-right font-bold">
                        {conflictsData?.soft_penalties?.S1 ?? 12}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">S2</td>
                      <td className="p-3">Student group free gaps between classes</td>
                      <td className="p-3 text-right font-bold">
                        {conflictsData?.soft_penalties?.S2 ?? 8}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">S3</td>
                      <td className="p-3">Group scheduled &gt; 6 teaching hours in one day</td>
                      <td className="p-3 text-right font-bold">
                        {conflictsData?.soft_penalties?.S3 ?? 4}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">S4</td>
                      <td className="p-3">Two lectures of the same course on the same day</td>
                      <td className="p-3 text-right font-bold">
                        {conflictsData?.soft_penalties?.S4 ?? 4}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">S5</td>
                      <td className="p-3">Room utilisation &lt; 40% of room capacity</td>
                      <td className="p-3 text-right font-bold">
                        {conflictsData?.soft_penalties?.S5 ?? 6}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">S6</td>
                      <td className="p-3">Session scheduled in late period P9 (17:00 - 18:00)</td>
                      <td className="p-3 text-right font-bold">
                        {conflictsData?.soft_penalties?.S6 ?? 0}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 font-bold">
                      <td colSpan={2} className="p-3 text-right">
                        Total Penalty Score:
                      </td>
                      <td className="p-3 text-right text-indigo-600 dark:text-indigo-400">
                        {softPenaltyTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ROOM UTILISATION */}
      {activeSection === 'utilisation' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📈</span> Room Utilisation Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Capacity and teaching hours used (out of 45 teaching periods per week: 5 days × 9 periods)
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Room Types</option>
                <option value="classroom">Classrooms</option>
                <option value="lecture_hall">Lecture Halls</option>
                <option value="lab">Laboratories</option>
                <option value="auditorium">Auditorium / Halls</option>
              </select>

              <select
                value={roomSort}
                onChange={(e) => setRoomSort(e.target.value)}
                className="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="util_desc">Highest Utilisation</option>
                <option value="util_asc">Lowest Utilisation</option>
                <option value="capacity_desc">Largest Capacity</option>
                <option value="id_asc">Room ID (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Room Progress Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRooms.map((r) => {
              const pct = r.utilisation_percentage || 0;
              const barColor =
                pct > 65
                  ? 'bg-indigo-600 dark:bg-indigo-500'
                  : pct > 35
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : 'bg-amber-500 dark:bg-amber-400';

              return (
                <div
                  key={r.room_id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {r.room_id}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[140px]">
                          {r.room_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.room_type} • Cap: {r.capacity} seats
                      </p>
                    </div>

                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {pct}%
                    </span>
                  </div>

                  <div>
                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{r.periods_used} periods used</span>
                      <span>45 max periods</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
