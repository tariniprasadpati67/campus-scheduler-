import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage({ onLoginSuccess, isModal = false, onClose }) {
  const { login, quickLogin, demoAccounts } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      if (onLoginSuccess) onLoginSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (roleKey) => {
    setError(null);
    setQuickLoadingRole(roleKey);
    try {
      await quickLogin(roleKey);
      if (onLoginSuccess) onLoginSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(`Demo login failed: ${err.message}`);
    } finally {
      setQuickLoadingRole(null);
    }
  };

  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Brand & Supabase connection badge */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-3xl shadow-inner">
          🏛️
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            CIT Campus Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chilika Institute of Technology • Timetabling & Venue Intelligence
          </p>
        </div>

        {/* Security & Database Status Badges */}
        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Supabase PostgreSQL
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            🔒 JWT Authentication
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
          <span className="text-sm">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Authentication Error</p>
            <p className="mt-0.5 text-[11px] leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manual Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email or Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              ✉️
            </span>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@cit.test or admin"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔑
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying with Supabase...</span>
            </>
          ) : (
            <span>Sign In with JWT</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
        <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Or 1-Click Demo Accounts
        </span>
        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
      </div>

      {/* 1-Click Demo Roles Grid */}
      <div className="grid grid-cols-2 gap-2 text-left">
        {Object.entries(demoAccounts).map(([key, acc]) => {
          const isSelected = quickLoadingRole === key;
          return (
            <button
              key={key}
              type="button"
              disabled={loading || quickLoadingRole !== null}
              onClick={() => handleDemoClick(key)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-800 transition text-left flex flex-col justify-between group disabled:opacity-50"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base">{acc.icon}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {key === 'admin' ? 'admin123' : key === 'coordinator' ? 'coord123' : `${key}123`}
                </span>
              </div>
              <div className="mt-1">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {acc.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {acc.email}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Close button if in modal mode */}
      {isModal && onClose && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
          >
            Cancel / Close
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        {content}
      </div>
    );
  }

  // Full Screen Standalone View
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {content}

      <div className="mt-6 text-center text-xs text-slate-400 space-y-1 select-none">
        <p className="font-semibold text-slate-300">
          Chilika Institute of Technology • Campus Scheduling Portal
        </p>
        <p className="text-[11px] text-slate-500">
          🔒 Secure Access Gate • Connected to Supabase Cloud PostgreSQL
        </p>
      </div>
    </div>
  );
}

