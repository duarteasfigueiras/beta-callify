import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, LoginCredentials } from '../types';
import { authApi, usersApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Session timeout: 24 hours in milliseconds
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Helper to get storage based on rememberMe preference
const getStorage = (): Storage => {
  // Check if we're using localStorage (rememberMe was checked)
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  return rememberMe ? localStorage : sessionStorage;
};

// Helper to get token from either storage
const getToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Helper to get user from either storage
const getUser = (): string | null => {
  return localStorage.getItem('user') || sessionStorage.getItem('user');
};

// Helper to get last activity timestamp
const getLastActivity = (): number | null => {
  const timestamp = localStorage.getItem('lastActivity') || sessionStorage.getItem('lastActivity');
  return timestamp ? parseInt(timestamp, 10) : null;
};

// Helper to update last activity timestamp
const updateLastActivity = () => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('lastActivity', Date.now().toString());
};

// Helper to check if session has expired (only for non-rememberMe sessions)
const isSessionExpired = (): boolean => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  // If rememberMe is checked, session never expires due to inactivity
  if (rememberMe) return false;

  const lastActivity = getLastActivity();
  if (!lastActivity) return false;

  return Date.now() - lastActivity > SESSION_TIMEOUT;
};

// Helper to clear both storages
const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('lastActivity');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('lastActivity');
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const token = getToken();
    const userStr = getUser();

    // Check if session has expired due to inactivity
    if (token && userStr && isSessionExpired()) {
      clearAuth();
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Update last activity on session restore
        updateLastActivity();
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        clearAuth();
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Track user activity and check for session expiration
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Update activity on user interactions
    const handleActivity = () => {
      updateLastActivity();
    };

    // Check session expiration periodically (every minute)
    const checkExpiration = () => {
      if (isSessionExpired()) {
        clearAuth();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        window.location.href = '/login';
      }
    };

    // Listen for user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    // Check expiration every minute
    const interval = setInterval(checkExpiration, 60 * 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(interval);
    };
  }, [state.isAuthenticated]);

  const login = useCallback(async (credentials: LoginCredentials, rememberMe: boolean = false) => {
    // Support both email (new) and username (legacy)
    const loginIdentifier = credentials.email || credentials.username;
    const response = await authApi.login(loginIdentifier, credentials.password);
    const { token, user } = response;

    // Clear any existing auth data first
    clearAuth();

    // Store rememberMe preference in localStorage (always persists to remember the choice)
    localStorage.setItem('rememberMe', rememberMe.toString());

    // Use appropriate storage based on rememberMe
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', token);
    storage.setItem('user', JSON.stringify(user));
    // Set initial last activity timestamp
    storage.setItem('lastActivity', Date.now().toString());

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }

    clearAuth();

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await usersApi.getMe();
      const storage = getStorage();
      storage.setItem('user', JSON.stringify(user));
      setState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
