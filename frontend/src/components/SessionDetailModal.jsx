import React from 'react';

export default function SessionDetailModal({ session, onClose }) {
  if (!session) return null;

  const kindBadgeColors = {
    lecture: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    tutorial: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    lab: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full border ${kindBadgeColors[session.kind] || 'bg-slate-100 text-slate-800'}`}>
              {session.kind}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {session.course_id}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Course Title</span>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{session.course_title || session.course_id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Session ID</span>
              <p className="font-mono text-slate-700 dark:text-slate-200">{session.id}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Duration</span>
              <p className="text-slate-700 dark:text-slate-200">{session.duration} hour(s)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Faculty</span>
              <p className="font-medium text-slate-800 dark:text-slate-100">{session.faculty_name || session.faculty_id}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">ID: {session.faculty_id}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Room</span>
              <p className="font-medium text-slate-800 dark:text-slate-100">{session.room_id} {session.room_name ? `(${session.room_name})` : ''}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{session.room_building} • Cap: {session.room_capacity}</p>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Student Groups</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {session.groups?.map((g) => (
                <span key={g} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Class Size</span>
              <p className="text-slate-700 dark:text-slate-200">{session.size} students</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Schedule Slot</span>
              <p className="font-medium text-indigo-600 dark:text-indigo-400">
                {session.day} P{session.start_period} {session.duration > 1 ? `- P${session.start_period + session.duration - 1}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

