import { useEffect, useState, useCallback } from 'react';
import { Session } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SessionManager } from '@/services/session-manager';

/**
 * Session status type
 */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired';

/**
 * Session hook return type
 */
export interface UseSessionReturn {
  session: Session | null;
  status: SessionStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null;
  refreshSession: () => Promise<void>;
}

/**
 * Hook for managing session state and expiry
 */
export function useSession(): UseSessionReturn {
  const { session, loading, initializing, refreshSession } = useAuth();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  /**
   * Calculate session status
   */
  const getSessionStatus = useCallback((): SessionStatus => {
    if (loading || initializing) {
      return 'loading';
    }

    if (!session) {
      return 'unauthenticated';
    }

    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;

    if (expiresAt > 0 && now >= expiresAt) {
      return 'expired';
    }

    return 'authenticated';
  }, [session, loading, initializing]);

  const status = getSessionStatus();

  /**
   * Get expiry date
   */
  const expiresAt = session?.expires_at 
    ? new Date(session.expires_at * 1000) 
    : null;

  /**
   * Check if session is expired using SessionManager
   */
  const isExpired = SessionManager.isSessionExpired(session);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = status === 'authenticated';

  /**
   * Check if session is loading
   */
  const isLoading = status === 'loading';

  /**
   * Update time until expiry using SessionManager
   */
  useEffect(() => {
    const updateTimer = () => {
      const remaining = SessionManager.getTimeUntilExpiry(session);
      setTimeUntilExpiry(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second if there's a session
    if (session?.expires_at) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.expires_at]);

  /**
   * Auto-refresh session when close to expiry (using SessionManager)
   */
  useEffect(() => {
    if (!session?.expires_at || isExpired) return;

    // Check if auto-refresh should be performed based on user preferences
    if (!SessionManager.shouldAutoRefresh(session)) return;

    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilRefresh = expiresAt - now - refreshThreshold;

    if (timeUntilRefresh > 0 && timeUntilRefresh < 24 * 60 * 60 * 1000) { // Only if within 24 hours
      const timeoutId = setTimeout(() => {
        console.log('Auto-refreshing session via useSession hook');
        refreshSession();
      }, timeUntilRefresh);

      return () => clearTimeout(timeoutId);
    }
  }, [session?.expires_at, isExpired, refreshSession]);

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    isExpired,
    expiresAt,
    timeUntilExpiry,
    refreshSession,
  };
}

/**
 * Hook for session expiry warnings
 */
export function useSessionExpiry(warningThreshold: number = 10 * 60 * 1000) { // 10 minutes default
  const { session, timeUntilExpiry } = useSession();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!session || !timeUntilExpiry) {
      setShowWarning(false);
      return;
    }

    const shouldShowWarning = timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0;
    setShowWarning(shouldShowWarning);
  }, [timeUntilExpiry, warningThreshold, session]);

  return {
    showWarning,
    timeUntilExpiry,
    minutesUntilExpiry: timeUntilExpiry ? Math.ceil(timeUntilExpiry / (60 * 1000)) : null,
  };
}

/**
 * Hook for persistent session storage
 */
export function usePersistentSession() {
  const { session, user } = useAuth();
  const [hasStoredSession, setHasStoredSession] = useState(false);

  /**
   * Check if there's a stored session on mount
   */
  useEffect(() => {
    const checkStoredSession = () => {
      try {
        const stored = localStorage.getItem('supabase.auth.token');
        setHasStoredSession(!!stored);
      } catch (error) {
        console.warn('Error checking stored session:', error);
        setHasStoredSession(false);
      }
    };

    checkStoredSession();
  }, []);

  /**
   * Update stored session flag when session changes
   */
  useEffect(() => {
    setHasStoredSession(!!session);
  }, [session]);

  /**
   * Clear stored session
   */
  const clearStoredSession = useCallback(() => {
    try {
      localStorage.removeItem('supabase.auth.token');
      setHasStoredSession(false);
    } catch (error) {
      console.warn('Error clearing stored session:', error);
    }
  }, []);

  return {
    hasStoredSession,
    clearStoredSession,
    isSessionPersisted: !!session && hasStoredSession,
  };
}