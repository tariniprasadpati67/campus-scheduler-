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
    user: {
      id: 1,
      name: 'Admin User',
      email: 'admin@cit.test',
      role: 'admin',
      department: 'ADMIN',
      faculty_id: null,
      club_name: null,
    },
  },
  coordinator: {
    email: 'coordinator@cit.test',
    password: 'coord123',
    label: 'CSE Coordinator',
    icon: '📋',
    desc: 'Reschedule sessions & request dept rooms',
    user: {
      id: 2,
      name: 'Department Coordinator',
      email: 'coordinator@cit.test',
      role: 'coordinator',
      department: 'CSE',
      faculty_id: null,
      club_name: null,
    },
  },
  faculty: {
    email: 'faculty@cit.test',
    password: 'faculty123',
    label: 'Prof. Sharma (CSE)',
    icon: '👨‍🏫',
    desc: 'View personal timetable, mark leave/unavailability',
    user: {
      id: 3,
      name: 'Prof. Sharma',
      email: 'faculty@cit.test',
      role: 'faculty',
      department: 'CSE',
      faculty_id: 'F01',
      club_name: null,
    },
  },
  club: {
    email: 'club@cit.test',
    password: 'club123',
    label: 'Robotics Club Rep',
    icon: '🎭',
    desc: 'Submit & cancel venue booking requests',
    user: {
      id: 4,
      name: 'Club Representative',
      email: 'club@cit.test',
      role: 'club',
      department: 'CLUBS',
      faculty_id: null,
      club_name: 'Robotics Club',
    },
  },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => DEMO_CREDENTIALS.admin.user);
  const [token, setToken] = useState(() => localStorage.getItem('cit_auth_token'));
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Load current user profile if token exists or initialize admin
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('cit_auth_token');
      if (savedToken) {
        try {
          const user = await api.auth.me();
          setCurrentUser(user);
          setAuthError(null);
        } catch (err) {
          console.warn('Saved token expired or invalid, switching to admin demo:', err.message);
          localStorage.removeItem('cit_auth_token');
          setToken(null);
          await quickLogin('admin');
        }
      } else {
        await quickLogin('admin');
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      const res = await api.auth.login(email, password);
      if (res?.access_token) {
        localStorage.setItem('cit_auth_token', res.access_token);
        setToken(res.access_token);
      }
      if (res?.user) {
        setCurrentUser(res.user);
      }
      return res?.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const quickLogin = async (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (!creds) return;
    // Set immediate state so UI button highlights and activates INSTANTLY on click with zero delay!
    setCurrentUser(creds.user);
    try {
      const res = await api.auth.login(creds.email, creds.password);
      if (res?.access_token) {
        localStorage.setItem('cit_auth_token', res.access_token);
        setToken(res.access_token);
      }
      if (res?.user) {
        setCurrentUser(res.user);
      }
      return res?.user || creds.user;
    } catch (err) {
      console.warn(`Backend login offline for ${roleKey}, using local session:`, err.message);
      return creds.user;
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
