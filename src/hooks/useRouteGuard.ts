import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Options for route guard hook
 */
export interface UseRouteGuardOptions {
  /** Redirect path for unauthenticated users */
  redirectTo?: string;
  /** Whether to require email verification */
  requireEmailVerification?: boolean;
  /** Whether to redirect authenticated users away from this route */
  redirectAuthenticated?: boolean;
  /** Path to redirect authenticated users to */
  authenticatedRedirectTo?: string;
}

/**
 * Hook for implementing route guards with authentication checks
 * 
 * This hook provides a convenient way to protect routes and handle
 * authentication-based redirects without wrapping components.
 * 
 * @param options - Configuration options for the route guard
 * @returns Object with authentication state and guard status
 */
export const useRouteGuard = (options: UseRouteGuardOptions = {}) => {
  const {
    redirectTo = '/login',
    requireEmailVerification = false,
    redirectAuthenticated = false,
    authenticatedRedirectTo = '/dashboard',
  } = options;

  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !initializing && user !== null;
  const isEmailVerified = user?.email_confirmed_at !== null;
  const shouldRedirectUnauthenticated = !initializing && !user;
  const shouldRedirectAuthenticated = redirectAuthenticated && isAuthenticated;
  const shouldRequireEmailVerification = requireEmailVerification && isAuthenticated && !isEmailVerified;

  useEffect(() => {
    // Don't redirect while still initializing
    if (initializing) return;

    // Redirect unauthenticated users to login
    if (shouldRedirectUnauthenticated) {
      navigate(redirectTo, {
        state: { from: location.pathname + location.search },
        replace: true,
      });
      return;
    }

    // Redirect authenticated users away from auth pages
    if (shouldRedirectAuthenticated) {
      const from = (location.state as any)?.from || authenticatedRedirectTo;
      navigate(from, { replace: true });
      return;
    }

    // Handle email verification requirement
    if (shouldRequireEmailVerification) {
      // This would typically show an email verification prompt
      // For now, we'll just log it - the ProtectedRoute component handles the UI
      console.log('Email verification required');
    }
  }, [
    initializing,
    shouldRedirectUnauthenticated,
    shouldRedirectAuthenticated,
    shouldRequireEmailVerification,
    navigate,
    redirectTo,
    authenticatedRedirectTo,
    location.pathname,
    location.search,
    location.state,
  ]);

  return {
    /** Whether the user is authenticated */
    isAuthenticated,
    /** Whether the user's email is verified */
    isEmailVerified,
    /** Whether authentication is still initializing */
    isLoading: initializing,
    /** Whether the route guard is currently blocking access */
    isBlocked: shouldRedirectUnauthenticated || shouldRedirectAuthenticated || shouldRequireEmailVerification,
    /** Current user object */
    user,
  };
};

/**
 * Hook specifically for protecting routes that require authentication
 */
export const useRequireAuth = (options?: Omit<UseRouteGuardOptions, 'redirectAuthenticated'>) => {
  return useRouteGuard({
    ...options,
    redirectAuthenticated: false,
  });
};

/**
 * Hook specifically for auth pages that should redirect authenticated users
 */
export const useRedirectAuthenticated = (options?: Omit<UseRouteGuardOptions, 'redirectAuthenticated'>) => {
  return useRouteGuard({
    ...options,
    redirectAuthenticated: true,
  });
};