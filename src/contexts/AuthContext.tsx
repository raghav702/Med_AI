import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@/types/supabase';
import { authService, AuthServiceError } from '@/services/auth';
import { supabase } from '@/lib/supabase';
import { ErrorHandler, AppError } from '@/lib/error-handler';
import { SessionManager } from '@/services/session-manager';

/**
 * Authentication context interface
 */
export interface AuthContextType {
  // User state
  user: User | null;
  session: Session | null;
  
  // Loading states
  loading: boolean;
  initializing: boolean;
  
  // Authentication methods
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  
  // Session management
  refreshSession: () => Promise<void>;
  
  // Error state
  error: AppError | null;
  clearError: () => void;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle authentication errors using centralized error handler
   */
  const handleAuthError = useCallback((error: unknown) => {
    const appError = ErrorHandler.categorizeError(error);
    ErrorHandler.logError(appError);
    setError(appError);
  }, []);

  /**
   * Update user and session state
   */
  const updateAuthState = useCallback((user: User | null, session: Session | null) => {
    setUser(user);
    setSession(session);
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.signIn(email, password);
      
      // Configure session persistence based on remember me preference
      if (rememberMe !== undefined) {
        await SessionManager.configureSessionPersistence(rememberMe);
      }
      
      updateAuthState(response.user, response.session);
    } catch (error) {
      handleAuthError(error);
      throw error; // Re-throw so components can handle it if needed
    } finally {
      setLoading(false);
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.signUp(email, password, userData);
      updateAuthState(response.user, response.session);
    } catch (error) {
      handleAuthError(error);
      throw error; // Re-throw so components can handle it if needed
    } finally {
      setLoading(false);
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Sign out current user with comprehensive cleanup
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Perform comprehensive logout cleanup
      await SessionManager.performLogoutCleanup();
      
      // Update auth state
      updateAuthState(null, null);
    } catch (error) {
      handleAuthError(error);
      // Even if there's an error, clear the auth state
      updateAuthState(null, null);
      throw error; // Re-throw so components can handle it if needed
    } finally {
      setLoading(false);
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.resetPassword(email);
    } catch (error) {
      handleAuthError(error);
      throw error; // Re-throw so components can handle it if needed
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  /**
   * Update password
   */
  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.updatePassword(newPassword);
    } catch (error) {
      handleAuthError(error);
      throw error; // Re-throw so components can handle it if needed
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  /**
   * Resend email verification
   */
  const resendEmailVerification = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.resendEmailVerification();
    } catch (error) {
      handleAuthError(error);
      throw error; // Re-throw so components can handle it if needed
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  /**
   * Refresh current session
   */
  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.refreshSession();
      updateAuthState(response.user, response.session);
    } catch (error) {
      handleAuthError(error);
      // Don't re-throw for refresh errors as they're often automatic
    } finally {
      setLoading(false);
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Initialize authentication state and set up session listener
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (!supabase) {
          console.warn('Supabase client not available');
          return;
        }

        // Get initial session
        const session = await authService.getCurrentSession();
        const user = await authService.getCurrentUser();

        if (mounted) {
          updateAuthState(user, session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          updateAuthState(null, null);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    // Set up auth state listener
    const setupAuthListener = () => {
      if (!supabase) {
        return () => {}; // Return empty cleanup function
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.id);

          if (!mounted) return;

          switch (event) {
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              updateAuthState(session?.user || null, session);
              break;
            
            case 'SIGNED_OUT':
              updateAuthState(null, null);
              break;
            
            case 'PASSWORD_RECOVERY':
              // Handle password recovery if needed
              break;
            
            case 'USER_UPDATED':
              // Update user data
              if (session?.user) {
                updateAuthState(session.user, session);
              }
              break;
            
            default:
              break;
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    // Initialize auth and set up listener
    initializeAuth();
    const unsubscribe = setupAuthListener();

    // Cleanup function
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [updateAuthState]);

  /**
   * Auto-refresh session before expiry (enhanced with SessionManager)
   */
  useEffect(() => {
    if (!session || !supabase) return;

    // Check if auto-refresh should be performed based on user preferences
    if (!SessionManager.shouldAutoRefresh(session)) return;

    const refreshThreshold = 60 * 1000; // 1 minute before expiry
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilRefresh = expiresAt - now - refreshThreshold;

    if (timeUntilRefresh > 0 && timeUntilRefresh < 24 * 60 * 60 * 1000) { // Only if within 24 hours
      const timeoutId = setTimeout(() => {
        console.log('Auto-refreshing session based on user preferences');
        refreshSession();
      }, timeUntilRefresh);

      return () => clearTimeout(timeoutId);
    }
  }, [session, refreshSession]);

  // Context value
  const value: AuthContextType = {
    // User state
    user,
    session,
    
    // Loading states
    loading,
    initializing,
    
    // Authentication methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendEmailVerification,
    
    // Session management
    refreshSession,
    
    // Error state
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { user, initializing } = useAuth();
  return !initializing && user !== null;
}

/**
 * Hook to get current user with loading state
 */
export function useCurrentUser(): { user: User | null; loading: boolean } {
  const { user, initializing } = useAuth();
  return { user, loading: initializing };
}

/**
 * Hook for authentication actions only (no state)
 */
export function useAuthActions() {
  const {
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendEmailVerification,
    refreshSession,
    clearError,
  } = useAuth();

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendEmailVerification,
    refreshSession,
    clearError,
  };
}