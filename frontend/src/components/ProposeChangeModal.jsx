import React, { useState } from 'react';
import { api } from '../services/api.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const PERIOD_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function ProposeChangeModal({ isOpen, onClose, onProposalCreated, citData }) {
  if (!isOpen) return null;

  // AI assistant state
  const [aiText, setAiText] = useState('');
  const [parsingAi, setParsingAi] = useState(false);

  // Form states
  const [changeType, setChangeType] = useState('faculty_leave'); // 'faculty_leave' | 'room_closed'
  const [facultyId, setFacultyId] = useState(citData?.faculty?.[0]?.id || 'F01');
  const [roomId, setRoomId] = useState(citData?.rooms?.[0]?.id || 'CR-101');
  const [day, setDay] = useState('MON');
  const [selectedPeriods, setSelectedPeriods] = useState([1, 2]);
  const [reason, setReason] = useState('Medical leave / maintenance');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [resultMessage, setResultMessage] = useState(null);

  const togglePeriod = (p) => {
    if (selectedPeriods.includes(p)) {
      if (selectedPeriods.length > 1) {
        setSelectedPeriods(selectedPeriods.filter((x) => x !== p));
      }
    } else {
      setSelectedPeriods([...selectedPeriods, p].sort((a, b) => a - b));
    }
  };

  const handleAiExtract = async () => {
    if (!aiText.trim()) return;
    setParsingAi(true);
    setErrorMessage(null);

    try {
      const res = await api.ai.parseChange(aiText.trim(), facultyId);
      if (res.change_type) setChangeType(res.change_type);
      if (res.faculty_id) setFacultyId(res.faculty_id);
      if (res.room_id) setRoomId(res.room_id);
      if (res.day && DAYS.includes(res.day)) setDay(res.day);
      if (res.periods && res.periods.length > 0) setSelectedPeriods(res.periods);
      if (res.reason) setReason(res.reason);
    } catch (err) {
      console.warn('AI change parsing failed:', err);
      setErrorMessage(`AI parsing failed: ${err.message}. Please fill out form manually.`);
    } finally {
      setParsingAi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setResultMessage(null);

    let details = {};
    if (changeType === 'faculty_leave') {
      details = {
        faculty_id: facultyId,
        day,
        periods: selectedPeriods,
      };
    } else {
      details = {
        room_id: roomId,
        day,
        periods: selectedPeriods,
      };
    }

    try {
      const res = await api.changes.propose({
        change_type: changeType,
        details,
        reason: reason.trim(),
      });

      if (res.status === 'infeasible') {
        setErrorMessage(
          res.message || 'Change cannot be accommodated: constraint conflict prevents finding a valid schedule.'
        );
      } else {
        setResultMessage(
          `Proposal created successfully (ID #${res.id}). Minimal-move rescheduling computed diff (${res.diff?.moved_sessions?.length || 0} moves). Status: PENDING Admin approval.`
        );
        if (onProposalCreated) onProposalCreated(res);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error('Propose change error:', err);
      setErrorMessage(err.message || 'Failed to submit change proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔄</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Propose Schedule Change
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI Faculty Assistant & Disruption Rescheduling Engine
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

        {/* AI Faculty Assistant Prompt Box */}
        <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
            <span>✨</span>
            <span>Faculty AI Assistant (Leave & Room Maintenance)</span>
          </span>
          <textarea
            rows={2}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Type in plain language: e.g. 'Prof. Sharma is on leave next Tuesday periods 2 to 4' or 'Room CR-101 closed Thursday morning'"
            className="w-full p-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAiExtract}
              disabled={parsingAi || !aiText.trim()}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {parsingAi ? 'Parsing...' : '✨ Parse Disruption'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
            <strong>Notice:</strong> {errorMessage}
          </div>
        )}

        {resultMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
            {resultMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Disruption / Change Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChangeType('faculty_leave')}
                className={`py-2 px-3 rounded-xl font-semibold border transition ${
                  changeType === 'faculty_leave'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                👨‍🏫 Faculty Leave
              </button>
              <button
                type="button"
                onClick={() => setChangeType('room_closed')}
                className={`py-2 px-3 rounded-xl font-semibold border transition ${
                  changeType === 'room_closed'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🏛️ Room Maintenance
              </button>
            </div>
          </div>

          {changeType === 'faculty_leave' ? (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Affected Faculty Member
              </label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {(citData?.faculty || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department}) - ID: {f.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Affected Room
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {(citData?.rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} - {r.name} ({r.type}, Cap: {r.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Day of Disruption
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
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
                Selected Periods
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PERIOD_LIST.map((p) => {
                  const isSelected = selectedPeriods.includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => togglePeriod(p)}
                      className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      P{p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Justification
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attending academic conference / Projector wiring repair"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Running Solver...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
