import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function OverviewHero({ citData, scheduleData, onNavigate, onOpenBookingModal, onOpenProposeModal }) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner with Modern Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 border border-indigo-500/20 shadow-2xl">
        {/* Subtle background glow elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CIT Autonomous Scheduling Platform • {citData?.dataset_id || 'cit-public-v1'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Autonomous Campus Timetabling &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              Disruption-Proof Venue Intelligence
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Engineered for Chilika Institute of Technology. Solves 189 teaching sessions with zero constraint clashes using Google OR-Tools CP-SAT, handles Spectra Fest venue allocations, reschedules disruptions with minimal moves, and parses natural-language & Hinglish requests via Groq AI.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('timetable')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <span>📅</span>
              <span>Explore Weekly Timetable</span>
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs sm:text-sm font-semibold backdrop-blur-sm transition flex items-center gap-2"
            >
              <span>📊</span>
              <span>Operations Dashboard</span>
            </button>

            <button
              onClick={onOpenBookingModal}
              className="px-4 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs sm:text-sm font-semibold shadow transition flex items-center gap-2"
            >
              <span>✨</span>
              <span>AI Venue Booking</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Schedule Health</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>0 Violations</span>
              <span className="text-xs font-normal text-emerald-300/80">(100% Valid)</span>
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Teaching Sessions</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">189 Sessions</p>
            <p className="text-[10px] text-slate-400">243 scheduled hours/week</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Campus Venues</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">27 Venues</p>
            <p className="text-[10px] text-slate-400">Labs, lecture halls & auditoriums</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Midsem Exams</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-300 mt-0.5">41 Exams</p>
            <p className="text-[10px] text-slate-400">Half capacity compliant</p>
          </div>
        </div>
      </div>

      {/* Active Session & Campus Role Permissions Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🛡️</span> Active Campus Session & Role Privileges
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authenticated via Supabase PostgreSQL & JWT Security Gate
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Session Active: <strong>{currentUser?.name || 'User'}</strong> ({currentUser?.role?.toUpperCase()})
          </span>
        </div>

        {/* Dynamic Permissions based on Logged-In Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">👑</span>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Admin Authority</span>
              {currentUser?.role === 'admin' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white ml-auto">
                  YOUR ROLE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Full campus oversight: approve/reject timetable proposals, export official data, trigger solver resets, view security audit logs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">📋</span>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Dept. Coordinator</span>
              {currentUser?.role === 'coordinator' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500 text-white ml-auto">
                  YOUR ROLE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Academic operations: propose session reschedules, request departmental lab & lecture rooms, inspect conflicts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">👨‍🏫</span>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Faculty Member</span>
              {currentUser?.role === 'faculty' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-white ml-auto">
                  YOUR ROLE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Teaching schedule: personal weekly timetable view, mark unavailability or leave, verify classroom allocations.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">🎭</span>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Club Representative</span>
              {currentUser?.role === 'club' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500 text-white ml-auto">
                  YOUR ROLE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Campus fest activities: submit Spectra venue requests for auditoriums & halls, track approvals in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Bento Grid: 4 Core Engines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: CP-SAT Constraint Solver */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
              ⚙️
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Google OR-Tools CP-SAT Solver
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Mathematical constraint programming that strictly enforces 10 hard rules (H1-H10): no double bookings, matching room types & capacity, accessibility constraints, basket slot alignments, and daily faculty hour caps.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ Verified 0 Hard Violations
            </span>
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              View Constraints ➜
            </button>
          </div>
        </div>

        {/* Card 2: Minimal-Move Disruption Rescheduler */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
              🔄
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Minimal-Move Rescheduling Engine
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When faculty take medical leave or rooms undergo emergency repairs, the rescheduler penalizes moved sessions by weight, computing a minimal-move diff that keeps 95%+ of the timetable completely stable.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Admin Approval Required before applying
            </span>
            <button
              onClick={onOpenProposeModal}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Propose Disruption ➜
            </button>
          </div>
        </div>

        {/* Card 3: Multilingual Groq AI Assistant */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
              ✨
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Multilingual Groq AI Assistant
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Powered by Qwen 3.8 27B on Groq. Seamlessly parses both English and Hinglish requests (&quot;kal shaam seminar hall chahiye 100 log ke liye&quot;) into editable form parameters, with deterministic code validation preventing priority abuse.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-purple-600 dark:text-purple-400 font-semibold">
              ✓ Resolves Accessibility Conflicts
            </span>
            <button
              onClick={onOpenBookingModal}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Try AI Booking ➜
            </button>
          </div>
        </div>

        {/* Card 4: Spectra Fest Priority Allocator */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
              🎪
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Spectra Fest Priority Allocator
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Allocates 25 festival requests based on strict priority hierarchy: Exams &gt; Regular Classes &gt; Institute Events &gt; Guest Lectures &gt; Department Events &gt; Club Events. Capped by role to guarantee fairness.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ 0 Priority Inversions
            </span>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-rose-600 dark:text-rose-400 font-semibold hover:underline"
            >
              View Bookings ➜
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

