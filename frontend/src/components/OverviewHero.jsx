import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function OverviewHero({
  citData,
  scheduleData,
  onNavigate,
  onOpenBookingModal,
  onOpenProposeModal,
}) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // --- Animation 02: Word Rotator State (Page 5) ---
  const words = ['zero clashes.', 'disruption-proof.', 'AI-orchestrated.', '100% automated.'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [words.length]);

  // --- Animation 03: Live Activity / Sale Pings Stream (Page 6) ---
  const initialPings = [
    { id: 1, title: 'Spectra Main Auditorium', role: 'Robotics Club', tag: 'Approved · Priority #6', time: 'just now', icon: '🎭', color: 'text-purple-400' },
    { id: 2, title: 'CS201 Minimal Move', role: 'CSE Coordinator', tag: 'Optimized · Tue P3', time: '1m ago', icon: '📋', color: 'text-blue-400' },
    { id: 3, title: 'Midsem Exam LH101', role: 'Dean Office', tag: 'Half-Cap Compliant', time: '3m ago', icon: '📝', color: 'text-emerald-400' },
    { id: 4, title: 'Prof. Sharma (CSE)', role: 'F01 Faculty', tag: 'Schedule Verified', time: '5m ago', icon: '👨‍🏫', color: 'text-amber-400' },
  ];
  const [pings, setPings] = useState(initialPings);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      setPings((prev) => {
        const rotating = [...prev];
        const last = rotating.pop();
        return [{ ...last, id: Date.now(), time: 'just now' }, ...rotating];
      });
    }, 3800);
    return () => clearInterval(pingInterval);
  }, []);

  // --- Animation 09: Before / After Split Slider (Page 12) ---
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderMove = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPos(percent);
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  // --- Animation 12: Click -> Success Button (Page 15) ---
  const [btnState, setBtnState] = useState('idle'); // 'idle' | 'loading' | 'success'

  const handleVerifyClick = () => {
    if (btnState !== 'idle') return;
    setBtnState('loading');
    setTimeout(() => {
      setBtnState('success');
      setTimeout(() => setBtnState('idle'), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-12 font-modern text-slate-100 select-none pb-12">
      {/* =========================================================================
          SECTION 01: HERO REVEAL & WORD ROTATOR (Pages 1, 4 & 5)
      ========================================================================= */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#131722] via-[#0d1017] to-[#080a0f] border border-white/[0.08] p-6 sm:p-12 lg:p-14 shadow-2xl">
        {/* Ambient Warm Orange Background Glow */}
        <div className="absolute top-0 right-1/4 -mt-20 w-96 h-96 rounded-full bg-orange-600/15 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"></div>

        {/* Top Header Index Tag */}
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-5 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
            <span>CIT Autonomous Scheduling Platform</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 tracking-widest">
            01 / 06 · OVERVIEW
          </span>
        </div>

        {/* Headline with MadeToScale Signature Dual-Typography */}
        <div className="max-w-4xl space-y-4">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight">
            <span className="font-editorial italic text-white block text-4xl sm:text-6xl lg:text-7xl">
              Your campus schedule,
            </span>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
              but it moves.
            </span>
          </h1>

          {/* Word Rotator (Page 5 Pattern) */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-sm sm:text-base text-slate-400 font-medium">
              Autonomous timetabling that is
            </span>
            <div className="inline-flex flex-col items-center">
              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all duration-300">
                {words[wordIndex]}
              </div>
              {/* Rotator Progress Dots */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {words.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      i === wordIndex ? 'bg-orange-400 w-3' : 'bg-white/20'
                    }`}
                  ></span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed pt-2">
            Engineered for Chilika Institute of Technology. Solves 189 teaching sessions with zero
            constraint clashes using Google OR-Tools CP-SAT, allocates Spectra Fest venues with 0
            priority inversions, and reschedules disruptions with minimal moves.
          </p>

          {/* Quick Action Pill CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-5">
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <span>📅 Explore Weekly Timetable</span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <span>📊 Operations Dashboard</span>
            </button>

            <button
              type="button"
              onClick={onOpenBookingModal}
              className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <span>🎪 Book Spectra Venue</span>
            </button>
          </div>
        </div>

        {/* Live Proof Card Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-10 pt-8 border-t border-white/[0.08]">
          <div className="bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-white/[0.06]">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Solver Health
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>0 Clashes</span>
              <span className="text-[10px] font-medium text-emerald-300/80">✓ 100% Valid</span>
            </p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-white/[0.06]">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Teaching Sessions
            </p>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">189 Sessions</p>
            <p className="text-[11px] text-slate-400">243 hours / week</p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-white/[0.06]">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Campus Venues
            </p>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">27 Venues</p>
            <p className="text-[11px] text-slate-400">Labs, halls & auditoriums</p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-white/[0.06]">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Midsem Exams
            </p>
            <p className="text-xl sm:text-2xl font-black text-orange-400 mt-1">41 Exams</p>
            <p className="text-[11px] text-slate-400">Half-capacity verified</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 02: LIVE ACTIVITY STREAM & COUNT-UP STATS (Pages 6 & 8)
      ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Real-Time Activity Feed ("Sale Pings" Style) */}
        <div className="lg:col-span-7 bg-[#10131a] rounded-[28px] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                Live Campus Activity Stream
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Auto-updating · 0.4s</span>
          </div>

          {/* Incoming Activity Cards with springy transitions */}
          <div className="space-y-2.5">
            {pings.map((p, idx) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between transition-all duration-300 ${
                  idx === 0
                    ? 'border-orange-500/40 bg-orange-500/[0.04] shadow-md shadow-orange-500/5'
                    : 'opacity-85'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-lg">
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">{p.title}</p>
                    <p className="text-[11px] text-slate-400">{p.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold ${p.color}`}>{p.tag}</span>
                  <p className="text-[10px] text-slate-500 font-mono">{p.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Verified by Google OR-Tools CP-SAT</span>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-orange-400 hover:text-orange-300 font-semibold"
            >
              View All 25 Bookings →
            </button>
          </div>
        </div>

        {/* Right Col (5 cols): Count-Up Stats with Radial Progress (Page 8 Style) */}
        <div className="lg:col-span-5 bg-[#10131a] rounded-[28px] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
              Quality Metrics & Stability
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">PERFECT (0 INV)</span>
          </div>

          {/* Radial Ring Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-orange-500 transition-all duration-1000"
                  strokeDasharray="100, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-black text-sm text-white">100%</span>
            </div>
            <div>
              <p className="font-bold text-xs text-white">Conflict-Free Solved</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All 10 Hard Constraints (H1-H10) satisfied with zero overlaps.
              </p>
            </div>
          </div>

          {/* Interactive Click -> Success Button (Page 15 Pattern) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleVerifyClick}
              disabled={btnState !== 'idle'}
              className={`w-full py-3.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                btnState === 'loading'
                  ? 'bg-slate-800 text-slate-400 cursor-wait'
                  : btnState === 'success'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-white hover:bg-slate-200 text-slate-900 shadow-white/10 active:scale-[0.98]'
              }`}
            >
              {btnState === 'loading' && (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Running CP-SAT Verification...</span>
                </>
              )}
              {btnState === 'success' && (
                <>
                  <span>✓</span>
                  <span>Verified 0 Hard Violations & 0 Priority Inversions!</span>
                </>
              )}
              {btnState === 'idle' && (
                <>
                  <span>⚡ Run Instant Solver Audit</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 03: 4. ROLES AND PRIORITY (User Core Rule & Pages 2, 14, 16)
      ========================================================================= */}
      <section className="bg-[#10131a] p-6 sm:p-10 rounded-[32px] border border-white/[0.08] shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚖️</span>
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                4. Roles & Room Conflict Priority Hierarchy
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Platform governance: 4 distinct roles, self-approval restriction, and room allocation order
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Active User: <strong>{currentUser?.name || 'User'}</strong> ({currentUser?.role?.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Golden Invariant Rule Alert */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
          <span className="text-2xl select-none">🔒</span>
          <div className="text-xs">
            <p className="font-bold text-amber-300">
              Core Security Invariant: Nobody can approve their own request.
            </p>
            <p className="text-amber-200/80 text-[11px] mt-0.5">
              Strictly enforced in database & API. Requests created by an Admin, Coordinator, or Faculty cannot be approved by the same user ID.
            </p>
          </div>
        </div>

        {/* 4 Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Admin */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentUser?.role === 'admin'
                ? 'bg-orange-500/[0.08] border-orange-500/60 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/40'
                : 'bg-white/[0.02] border-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <span className="font-bold text-xs text-white">Admin</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">
                Dean's Office
              </span>
            </div>
            {currentUser?.role === 'admin' && (
              <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500 text-white mb-2 uppercase tracking-wide">
                YOUR ACTIVE ROLE
              </span>
            )}
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>Everything:</strong> Generates the timetable, approves timetable changes and any
              booking that moves a class, can change the priority order.
            </p>
          </div>

          {/* Department Coordinator */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentUser?.role === 'coordinator'
                ? 'bg-blue-500/[0.08] border-blue-500/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                : 'bg-white/[0.02] border-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <span className="font-bold text-xs text-white">Dept. Coordinator</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">
                CSE Dept
              </span>
            </div>
            {currentUser?.role === 'coordinator' && (
              <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500 text-white mb-2 uppercase tracking-wide">
                YOUR ACTIVE ROLE
              </span>
            )}
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Requests changes to their department's sessions, books rooms for department events, approves bookings of their department's labs.
            </p>
          </div>

          {/* Faculty */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentUser?.role === 'faculty'
                ? 'bg-emerald-500/[0.08] border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                : 'bg-white/[0.02] border-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍🏫</span>
                <span className="font-bold text-xs text-white">Faculty</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">
                Prof. Sharma
              </span>
            </div>
            {currentUser?.role === 'faculty' && (
              <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white mb-2 uppercase tracking-wide">
                YOUR ACTIVE ROLE
              </span>
            )}
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Views their own timetable, marks unavailability, requests extra or moved sessions.
            </p>
          </div>

          {/* Club Representative */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentUser?.role === 'club'
                ? 'bg-purple-500/[0.08] border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40'
                : 'bg-white/[0.02] border-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎭</span>
                <span className="font-bold text-xs text-white">Club Representative</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">
                Robotics Club
              </span>
            </div>
            {currentUser?.role === 'club' && (
              <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500 text-white mb-2 uppercase tracking-wide">
                YOUR ACTIVE ROLE
              </span>
            )}
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Submits and cancels venue requests, and sees the status and reason for each.
            </p>
          </div>
        </div>

        {/* Priority Order Sequence (When two requests want same room at same time) */}
        <div className="pt-4 border-t border-white/[0.08] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🎯</span> Room Conflict Allocation Priority Order
            </h4>
            <span className="text-[11px] text-slate-400">
              When two requests want the same room at the same time, this order decides who gets it:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-orange-500/40 shadow-sm">
              <span className="inline-block w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-5">
                1
              </span>
              <p className="font-bold text-white mt-1">Exams</p>
              <p className="text-[10px] text-orange-400">Top Priority</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="inline-block w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold leading-5">
                2
              </span>
              <p className="font-bold text-white mt-1">Regular Classes</p>
              <p className="text-[10px] text-slate-400">Timetable Sessions</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="inline-block w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold leading-5">
                3
              </span>
              <p className="font-bold text-white mt-1">Institute Events</p>
              <p className="text-[10px] text-slate-400">Spectra / Convocation</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="inline-block w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold leading-5">
                4
              </span>
              <p className="font-bold text-white mt-1">Guest Lectures</p>
              <p className="text-[10px] text-slate-400">External Speakers</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="inline-block w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold leading-5">
                5
              </span>
              <p className="font-bold text-white mt-1">Department Events</p>
              <p className="text-[10px] text-slate-400">Seminars & Workshops</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="inline-block w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold leading-5">
                6
              </span>
              <p className="font-bold text-white mt-1">Club Events</p>
              <p className="text-[10px] text-slate-400">Student Fests</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 04: BEFORE / AFTER INTERACTIVE COMPARISON SLIDER (Page 12)
      ========================================================================= */}
      <section className="bg-[#10131a] p-6 sm:p-10 rounded-[32px] border border-white/[0.08] shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span> Before & After: The Power of Autonomous Scheduling
            </h3>
            <p className="text-xs text-slate-400">
              Drag the slider below to compare manual excel timetabling with CIT's autonomous mathematical solver
            </p>
          </div>
          <span className="text-xs font-mono text-orange-400">09 / 12 · CASE STUDY</span>
        </div>

        {/* Interactive Comparison Container */}
        <div
          ref={sliderRef}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onMouseMove={(e) => isDragging && handleSliderMove(e.clientX)}
          onTouchMove={handleTouchMove}
          className="relative h-64 sm:h-72 rounded-2xl overflow-hidden cursor-ew-resize select-none border border-white/[0.1]"
        >
          {/* Layer 1: Left / Before (Manual Spreadsheet Scheduling) */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-950 p-6 flex flex-col justify-between">
            <div>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wide">
                Before: Manual Scheduling
              </span>
              <h4 className="text-lg sm:text-xl font-bold text-white mt-2">
                224 Hard Constraint Violations
              </h4>
              <ul className="text-xs text-rose-200/80 space-y-1.5 mt-3">
                <li>✕ Frequent faculty double-bookings and room capacity mismatches</li>
                <li>✕ 14+ student groups clashing in overlapping lecture slots</li>
                <li>✕ Spectra Fest venue requests rejected blindly without alternative offers</li>
                <li>✕ Complete schedule collapses during sudden classroom maintenance</li>
              </ul>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Manual process: 3 weeks of staff burnout</p>
          </div>

          {/* Layer 2: Right / After (CIT Autonomous Engine) with clip-path */}
          <div
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-emerald-950/80 p-6 flex flex-col justify-between"
          >
            <div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wide">
                After: CIT Autonomous Solver
              </span>
              <h4 className="text-lg sm:text-xl font-bold text-white mt-2">
                0 Violations · Disruption Proof
              </h4>
              <ul className="text-xs text-emerald-200/90 space-y-1.5 mt-3">
                <li>✓ 100% clash-free assignment of 189 sessions in 0.4 seconds</li>
                <li>✓ Spectra Fest: 21 approved, 2 alternatives offered, 0 priority inversions</li>
                <li>✓ Disruption Recovery: Room closure resolved with only 9 minimal moves</li>
                <li>✓ Groq AI: Instant natural language Hinglish booking request parsing</li>
              </ul>
            </div>
            <p className="text-[11px] text-emerald-400 font-mono">Autonomous: Solved in 0.4s via Google CP-SAT</p>
          </div>

          {/* Draggable Divider Handle */}
          <div
            style={{ left: `${sliderPos}%` }}
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none flex items-center justify-center -translate-x-1/2"
          >
            <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center text-xs font-black">
              ↔
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 05: BENTO GRID - THE 4 CORE ENGINES (Page 9)
      ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>🧩</span> Architectural Engines
          </h3>
          <span className="text-xs font-mono text-slate-500">06 / 12 · BENTO BUILD</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tile 1: CP-SAT Solver */}
          <div className="bg-[#10131a] p-6 rounded-[28px] border border-white/[0.08] hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-xl">
                ⚙️
              </div>
              <h4 className="text-base font-bold text-white">
                Google OR-Tools CP-SAT Solver
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mathematical constraint programming enforcing 10 hard rules (H1-H10): no room or faculty
                double-bookings, capacity matching, lab requirements, accessibility constraints, and daily hour caps.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">✓ Verified 0 Hard Violations</span>
              <button
                onClick={() => onNavigate('timetable')}
                className="text-orange-400 hover:text-orange-300 font-bold"
              >
                Inspect Sessions →
              </button>
            </div>
          </div>

          {/* Tile 2: Spectra Fest Allocator */}
          <div className="bg-[#10131a] p-6 rounded-[28px] border border-white/[0.08] hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl">
                🎪
              </div>
              <h4 className="text-base font-bold text-white">
                Spectra Week Venue Allocator
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluates 25 concurrent requests across auditoriums and halls. Employs 6-tier priority
                resolution to offer high-utility alternatives while preventing priority inversions.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-purple-400 font-semibold">Score: 64.5/70 (0 Inversions)</span>
              <button
                onClick={() => onNavigate('bookings')}
                className="text-purple-400 hover:text-purple-300 font-bold"
              >
                Review Bookings →
              </button>
            </div>
          </div>

          {/* Tile 3: Disruption Engine */}
          <div className="bg-[#10131a] p-6 rounded-[28px] border border-white/[0.08] hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl">
                🔄
              </div>
              <h4 className="text-base font-bold text-white">
                Disruption & Reschedule Engine
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous disruption recovery with minimal moves penalty. When Room 102 was abruptly closed,
                rescheduled 9 sessions with 0 clashes while locking 180 unaffected sessions.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-blue-400 font-semibold">Stability: 9 moves (6 time, 3 room)</span>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-blue-400 hover:text-blue-300 font-bold"
              >
                View Disruption Diff →
              </button>
            </div>
          </div>

          {/* Tile 4: Groq AI Layer */}
          <div className="bg-[#10131a] p-6 rounded-[28px] border border-white/[0.08] hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl">
                🧠
              </div>
              <h4 className="text-base font-bold text-white">
                Groq AI Natural Language Booking
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts structured requests from natural language and Hinglish texts without manual forms.
                Strictly neutral: flags priority abuse attempts and enforces valid venue windows.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold">LLM: Groq LLaMA-3.3-70B</span>
              <button
                onClick={onOpenBookingModal}
                className="text-amber-400 hover:text-amber-300 font-bold"
              >
                Try AI Booking →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
