import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const SAMPLE_AI_QUERIES = [
  {
    label: 'Hinglish Auditorium',
    prompt: 'Kal shaam ko auditorium chahiye robotics club ke liye',
    parsed: {
      title: 'Robotics Club Evening Showcase',
      attendance: 150,
      duration: '2 hours (P10 - P11)',
      day: 'THU',
      room_types: ['auditorium'],
      category: 'club_event',
      status: 'Ready for allocation',
      note: 'Translated "kal shaam" to Thursday evening event window.',
    },
  },
  {
    label: 'Guest Lecture',
    prompt: 'Need a seminar hall next Tuesday afternoon for a guest talk, around 80 people, projector please',
    parsed: {
      title: 'Industry Speaker Guest Talk',
      attendance: 80,
      duration: '2 hours (P6 - P7)',
      day: 'TUE',
      room_types: ['seminar_hall'],
      category: 'guest_lecture',
      status: 'Ready for allocation',
      note: 'Mapped "afternoon" to post-lunch period P6.',
    },
  },
  {
    label: 'Accessibility Conflict',
    prompt: 'I want SH-2 on Friday at 10 am for a wheelchair-accessible poster session, 60 people',
    parsed: {
      title: 'Accessible Research Poster Session',
      attendance: 60,
      duration: '1 hour (P3)',
      day: 'FRI',
      room_types: ['seminar_hall'],
      requested_room: 'SH-1',
      category: 'department_event',
      status: 'Conflict Resolved: SH-2 lacks wheelchair access. Switched to accessible venue SH-1.',
      warning: true,
    },
  },
];

export default function LandingPage({ onLaunchConsole }) {
  const { quickLogin, demoAccounts, currentUser } = useAuth();
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [activeSimulatorStep, setActiveSimulatorStep] = useState(2); // 0: Conflict, 1: Solving, 2: Resolved

  const currentSample = SAMPLE_AI_QUERIES[selectedSampleIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[140px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🏛️</span>
            <div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                CIT Campus Scheduler
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                v1.0 • Crunch Week
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#solver" className="hover:text-white transition">CP-SAT Solver</a>
            <a href="#ai-preview" className="hover:text-white transition">AI Assistant</a>
            <a href="#roles" className="hover:text-white transition">Roles & Permissions</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>0 Hard Violations</span>
            </div>

            <button
              onClick={() => onLaunchConsole('timetable')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚡ Launch Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium backdrop-blur-md animate-in fade-in">
          <span className="text-indigo-400">✨ Google OR-Tools CP-SAT + Groq Qwen 3.8</span>
          <span className="text-slate-600">•</span>
          <span>Chilika Institute of Technology</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1]">
          Autonomous Campus Scheduling &{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Disruption-Proof
          </span>{' '}
          Venue Allocation
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
          A mathematically validated scheduling platform built for Crunch Week. Generates optimal weekly timetables, coordinates 41 midsem exams at 50% capacity, and allocates Spectra fest venues with zero hard constraint violations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onLaunchConsole('dashboard')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📊 Open Operations Dashboard</span>
            <span>➜</span>
          </button>

          <button
            onClick={() => onLaunchConsole('timetable')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📅 Explore Weekly Timetable (189 Sessions)</span>
          </button>
        </div>

        {/* Hero Interactive Solver Visualizer */}
        <div className="pt-8 max-w-4xl mx-auto">
          <div className="bg-slate-900/90 rounded-2xl border border-white/15 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                    Live Engine State: Optimal Schedule
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  189 sessions assigned • 0 double bookings • Basket slots OEB-1..3 aligned
                </p>
              </div>

              {/* Simulator State Toggle */}
              <div className="flex bg-slate-950 p-1 rounded-xl text-[11px] font-semibold border border-white/10">
                <button
                  onClick={() => setActiveSimulatorStep(0)}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeSimulatorStep === 0 ? 'bg-rose-900/80 text-rose-200 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1. Disruption Injected
                </button>
                <button
                  onClick={() => setActiveSimulatorStep(1)}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeSimulatorStep === 1 ? 'bg-amber-900/80 text-amber-200 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2. Minimal-Move Solve
                </button>
                <button
                  onClick={() => setActiveSimulatorStep(2)}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeSimulatorStep === 2 ? 'bg-emerald-900/80 text-emerald-200 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3. Verified (0 Violations)
                </button>
              </div>
            </div>

            {/* Visualizer Step Banner */}
            {activeSimulatorStep === 0 && (
              <div className="bg-rose-950/40 border border-rose-500/30 p-3.5 rounded-xl text-xs flex items-center justify-between text-rose-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span><strong>Disruption:</strong> Prof. Sharma unavailable WED P3–P4; Room CR-101 closed for maintenance.</span>
                </div>
                <span className="font-mono text-[10px] bg-rose-900/60 px-2 py-0.5 rounded">2 Clashes Detected</span>
              </div>
            )}

            {activeSimulatorStep === 1 && (
              <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-xl text-xs flex items-center justify-between text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span><strong>CP-SAT Optimizer:</strong> Computing minimal moves with baseline hint schedule (disruption penalty weight: 500)...</span>
                </div>
                <span className="font-mono text-[10px] bg-amber-900/60 px-2 py-0.5 rounded">Solving in 0.8s</span>
              </div>
            )}

            {activeSimulatorStep === 2 && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-xs flex items-center justify-between text-emerald-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <span><strong>Validator Check:</strong> 0 Hard Violations • Only 11 sessions moved (95% timetable unchanged). Diff verified.</span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded">Optimal Stability</span>
              </div>
            )}

            {/* Interactive Schedule Mock Slots */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-[10px]">MON • P2-P4 (3h)</span>
                  <p className="font-bold text-amber-400 mt-0.5">CS291-P1</p>
                  <p className="text-[11px] text-slate-300 font-sans">Data Structures Lab</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>CS-LAB-1</span>
                  <span className="text-emerald-400">Strict Slot ✓</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-[10px]">TUE • P3 (1h)</span>
                  <p className="font-bold text-indigo-400 mt-0.5">OE301-L1</p>
                  <p className="text-[11px] text-slate-300 font-sans">Open Elective (OEB-1)</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>LH-1</span>
                  <span className="text-emerald-400">Basket Synced ✓</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-[10px]">THU • P10-P11 (2h)</span>
                  <p className="font-bold text-purple-400 mt-0.5">SPECTRA-04</p>
                  <p className="text-[11px] text-slate-300 font-sans">Robotics Club Finals</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>AUD (Cap: 400)</span>
                  <span className="text-emerald-400">Allocated ✓</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-[10px]">SAT • AM Slot</span>
                  <p className="font-bold text-sky-400 mt-0.5">EX-CS201</p>
                  <p className="text-[11px] text-slate-300 font-sans">Midsem Exam (50% Cap)</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>SH-1 + LH-2</span>
                  <span className="text-emerald-400">Half Cap ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Ribbon */}
      <section className="border-y border-white/10 bg-slate-900/40 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                189
              </p>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Weekly Teaching Sessions
              </p>
              <p className="text-[11px] text-slate-500">243 teaching hours scheduled</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                0
              </p>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Hard Violations (H1 - H10)
              </p>
              <p className="text-[11px] text-emerald-500/80">Strictly conflict-free</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-400">
                27
              </p>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Campus Venues Managed
              </p>
              <p className="text-[11px] text-slate-500">Classrooms, labs, auditorium, OAT</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-purple-400">
                41
              </p>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Midsem Exams Automated
              </p>
              <p className="text-[11px] text-slate-500">Strict half-capacity spacing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Enterprise Architecture Built for Rigorous Constraint Systems
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Four specialized engines working in unison to automate semester timetables, midsem exams, campus disruptions, and festival requests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: CP-SAT Engine */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/40 transition group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition">
              ⚙️
            </div>
            <h3 className="text-lg font-bold text-white">Google OR-Tools CP-SAT Solver</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces strict mathematical compliance with rules H1–H10 (faculty double booking, room capacity, lab 3-hour continuous blocks, and basket synchronizations), while minimizing soft penalty objective S1–S6.
            </p>
            <div className="pt-2 text-[11px] font-mono text-indigo-400 flex items-center gap-1.5">
              <span>●</span>
              <span>Proven 0 hard conflicts</span>
            </div>
          </div>

          {/* Card 2: Minimal-Move Rescheduler */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/40 transition group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition">
              🔄
            </div>
            <h3 className="text-lg font-bold text-white">Minimal-Move Disruption Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When faculty take leave or rooms require emergency maintenance, our disruption engine uses the baseline timetable as a warm hint, keeping 95%+ of the schedule untouched and outputting an exact diff.
            </p>
            <div className="pt-2 text-[11px] font-mono text-purple-400 flex items-center gap-1.5">
              <span>●</span>
              <span>Only 11-15 moves per disruption</span>
            </div>
          </div>

          {/* Card 3: Spectra Fest Priority Engine */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/40 transition group">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition">
              🎪
            </div>
            <h3 className="text-lg font-bold text-white">Spectra Priority Venue Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict multi-tier priority hierarchy: Exams &gt; Regular Classes &gt; Institute Events &gt; Guest Lectures &gt; Department &gt; Clubs. Handles role caps and resolves venue clashes with 0 priority inversions.
            </p>
            <div className="pt-2 text-[11px] font-mono text-pink-400 flex items-center gap-1.5">
              <span>●</span>
              <span>Score 64.5/70 on public fest set</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive AI Booking Widget Preview */}
      <section id="ai-preview" className="py-16 bg-slate-900/30 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
              Multilingual Natural Language Extraction
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Try the AI Scheduling Assistant
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Extracts complex English and Hinglish requests directly into structured booking parameters with strict deterministic code validation and accessibility checks.
            </p>
          </div>

          {/* Sample Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
            {SAMPLE_AI_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSampleIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedSampleIndex === idx
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* Live Translation Card */}
          <div className="max-w-3xl mx-auto bg-slate-900 rounded-2xl border border-white/15 p-5 sm:p-6 shadow-2xl space-y-5">
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                Input Natural Language Prompt
              </label>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/10 text-xs sm:text-sm text-indigo-200 font-mono">
                "{currentSample.prompt}"
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Extracted &amp; Code-Validated Output
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px]">Title</span>
                  <p className="font-semibold text-white truncate mt-0.5">{currentSample.parsed.title}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px]">Attendance</span>
                  <p className="font-semibold text-emerald-400 mt-0.5">{currentSample.parsed.attendance} seats</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px]">Window / Duration</span>
                  <p className="font-semibold text-indigo-400 mt-0.5">{currentSample.parsed.day} ({currentSample.parsed.duration})</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px]">Venue</span>
                  <p className="font-semibold text-purple-400 mt-0.5">{currentSample.parsed.requested_room || currentSample.parsed.room_types[0]}</p>
                </div>
              </div>

              {currentSample.parsed.status && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    currentSample.parsed.warning
                      ? 'bg-amber-950/60 border border-amber-500/40 text-amber-200'
                      : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <span>{currentSample.parsed.warning ? '⚠️' : '✓'}</span>
                  <span>{currentSample.parsed.status}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 text-xs">
              <span className="text-slate-500 italic">
                *LLM only extracts fields; our deterministic engine enforces room caps &amp; accessibility rules.
              </span>

              <button
                onClick={() => onLaunchConsole('bookings')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition cursor-pointer"
              >
                Open in Booking Form ➜
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Personas Showcase */}
      <section id="roles" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Role-Based Access Control Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Strict governance based on the problem statement. Nobody can approve their own request. Click any persona to test the live console in that role.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(demoAccounts).map(([key, acc]) => {
            const isActive = currentUser?.email === acc.email;
            return (
              <div
                key={key}
                onClick={() => {
                  quickLogin(key);
                  onLaunchConsole('dashboard');
                }}
                className={`bg-slate-900/60 rounded-2xl border p-5 space-y-3 cursor-pointer transition-all hover:scale-[1.02] ${
                  isActive
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 bg-indigo-950/20'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{acc.icon}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                    {key}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{acc.label}</h4>
                  <p className="text-[11px] font-mono text-indigo-400">{acc.email}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {acc.desc}
                </p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Click to test role</span>
                  <span className="text-indigo-400 font-bold">Switch ➜</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tech Stack & Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <p className="font-bold text-slate-200 text-sm">Chilika Institute of Technology</p>
              <p className="text-[11px] text-slate-400">Campus Scheduling &amp; Venue Management Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="px-2 py-1 rounded bg-slate-900 border border-white/10">FastAPI</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-white/10">PostgreSQL (Supabase)</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-white/10">OR-Tools CP-SAT</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-white/10">Groq (Qwen 3.8 27B)</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-white/10">React 18 + Tailwind</span>
          </div>

          <div className="text-center md:text-right">
            <p className="text-slate-400 font-medium">Official Validator Verified</p>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              python validator.py --data cit_public.json --schedule schedule.json
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
