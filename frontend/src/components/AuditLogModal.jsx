import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export default function AuditLogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await api.admin.getAuditLogs(100);
        setLogs(res.audit_logs || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch audit log.');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📜</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Campus System Audit Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable trail of all scheduling interventions, approvals, and decisions
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

        {loading && (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 text-xs">
            {logs.length === 0 ? (
              <p className="text-center py-8 text-slate-400">No audit log entries recorded yet.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {log.action}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Actor:</strong> {log.actor} • <strong>Detail:</strong> {log.detail}
                  </p>
                  <p className="text-slate-500 italic text-[11px]">
                    <strong>Reason:</strong> {log.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

