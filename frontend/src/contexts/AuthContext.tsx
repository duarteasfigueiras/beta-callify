import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthState, LoginCredentials } from '../types';
import { authApi, usersApi, stripeApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  subscriptionStatus: string | null;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// SECURITY: Session timeout - 2 hours for regular sessions, 8 hours for rememberMe
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;
const REMEMBER_ME_TIMEOUT = 8 * 60 * 60 * 1000;

// SECURITY: Only store essential user fields in client storage (no sensitive data)
const sanitizeUserForStorage = (user: any) => ({
  id: user.id,
  company_id: user.company_id,
  username: user.username,
  email: user.email,
  role: user.role,
  custom_role_name: user.custom_role_name,
  display_name: user.display_name,
  language_preference: user.language_preference,
  theme_preference: user.theme_preference,
  categories: user.categories,
});

// Helper to get storage based on rememberMe preference
const getStorage = (): Storage => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  return rememberMe ? localStorage : sessionStorage;
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

// Helper to check if session has expired
// SECURITY: Both regular and rememberMe sessions have timeouts
const isSessionExpired = (): boolean => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  const timeout = rememberMe ? REMEMBER_ME_TIMEOUT : SESSION_TIMEOUT;

  const lastActivity = getLastActivity();
  if (!lastActivity) return false;

  return Date.now() - lastActivity > timeout;
};

// Helper to clear auth data from storage (tokens are in httpOnly cookies, cleared by server)
const clearAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('lastActivity');
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const userStr = getUser();

    // Check if session has expired due to inactivity
    if (userStr && isSessionExpired()) {
      clearAuth();
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        updateLastActivity();

        // Verify session is still valid by calling /auth/me
        authApi.me().then(async (freshUser) => {
          const storage = getStorage();
          storage.setItem('user', JSON.stringify(sanitizeUserForStorage(freshUser)));
          setState({
            user: freshUser,
            token: null, // Tokens are in httpOnly cookies
            isAuthenticated: true,
            isLoading: false,
          });
          // Fetch subscription status (admin and developer bypass)
          if (freshUser.role === 'developer' || freshUser.role === 'admin_manager') {
            setSubscriptionStatus('active');
          } else {
            try {
              const sub = await stripeApi.getSubscriptionStatus();
              setSubscriptionStatus(sub.status);
            } catch {
              setSubscriptionStatus('none');
            }
          }
        }).catch(() => {
          // Token expired or invalid - clear auth
          clearAuth();
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        });

        // Set optimistic state while verifying
        setState({
          user,
          token: null,
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

    const handleActivity = () => {
      updateLastActivity();
    };

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

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    const interval = setInterval(checkExpiration, 60 * 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(interval);
    };
  }, [state.isAuthenticated]);

  const login = useCallback(async (credentials: LoginCredentials, rememberMe: boolean = false) => {
    const loginIdentifier = credentials.email || credentials.username || '';
    const response = await authApi.login(loginIdentifier, credentials.password, rememberMe);
    const { user } = response;

    // Clear any existing auth data first
    clearAuth();

    // Store rememberMe preference
    localStorage.setItem('rememberMe', rememberMe.toString());

    // Store user data (tokens are in httpOnly cookies set by server)
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));
    storage.setItem('lastActivity', Date.now().toString());

    setState({
      user,
      token: null, // Tokens are in httpOnly cookies
      isAuthenticated: true,
      isLoading: false,
    });

    // Fetch subscription status after login (admin and developer bypass)
    if (user.role === 'developer' || user.role === 'admin_manager') {
      setSubscriptionStatus('active');
    } else {
      try {
        const sub = await stripeApi.getSubscriptionStatus();
        setSubscriptionStatus(sub.status);
      } catch {
        setSubscriptionStatus('none');
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Server clears httpOnly cookies
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }

    clearAuth();
    setSubscriptionStatus(null);

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
      storage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));
      setState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await stripeApi.getSubscriptionStatus();
      setSubscriptionStatus(sub.status);
    } catch {
      setSubscriptionStatus('none');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, subscriptionStatus, refreshSubscription }}>
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
