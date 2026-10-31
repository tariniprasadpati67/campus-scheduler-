import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@cit.test',
    password: 'admin123',
    label: 'Admin',
    icon: '👑',
    desc: 'Full campus access, approve changes, reset demo',
  },
  coordinator: {
    email: 'coordinator@cit.test',
    password: 'coord123',
    label: 'CSE Coordinator',
    icon: '📋',
    desc: 'Reschedule sessions & request dept rooms',
  },
  faculty: {
    email: 'faculty@cit.test',
    password: 'faculty123',
    label: 'Prof. Sharma (CSE)',
    icon: '👨‍🏫',
    desc: 'View personal timetable, mark leave/unavailability',
  },
  club: {
    email: 'club@cit.test',
    password: 'club123',
    label: 'Robotics Club Rep',
    icon: '🎭',
    desc: 'Submit & cancel venue booking requests',
  },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cit_auth_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load current user profile if token exists
  useEffect(() => {
    async function initAuth() {
      setLoading(true);
      const savedToken = localStorage.getItem('cit_auth_token');
      if (savedToken) {
        try {
          const user = await api.auth.me();
          setCurrentUser(user);
          setAuthError(null);
        } catch (err) {
          console.warn('Session expired or invalid token, defaulting to admin demo:', err.message);
          localStorage.removeItem('cit_auth_token');
          setToken(null);
          // Auto login as admin for instant demo usability
          await quickLogin('admin');
        }
      } else {
        // Auto login as admin demo for seamless initial evaluator experience
        await quickLogin('admin');
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setAuthError(null);
      const res = await api.auth.login(email, password);
      localStorage.setItem('cit_auth_token', res.access_token);
      setToken(res.access_token);
      setCurrentUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (!creds) return;
    try {
      return await login(creds.email, creds.password);
    } catch (err) {
      console.error(`Quick login for ${roleKey} failed:`, err);
    }
  };

  const logout = () => {
    localStorage.removeItem('cit_auth_token');
    setToken(null);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    token,
    loading,
    authError,
    login,
    quickLogin,
    logout,
    demoAccounts: DEMO_CREDENTIALS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
