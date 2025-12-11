import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth, useIsAuthenticated, useCurrentUser, useAuthActions } from '@/contexts/AuthContext';
import { 
  createMockSupabaseClient,
  mockUser,
  mockSession,
  mockAuthResponse,
  mockAuthError,
  resetAllMocks
} from './mocks/supabase';
import React from 'react';

// Mock the supabase client
vi.mock('@/lib/supabase', () => {
  const mockAuth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    resend: vi.fn(),
    refreshSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  const mockClient = {
    auth: mockAuth,
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    channel: vi.fn(),
  };

  return {
    supabase: mockClient
  };
});

// Mock the auth service
vi.mock('@/services/auth', () => ({
  authService: {
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn(),
    getCurrentSession: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    resendEmailVerification: vi.fn(),
    refreshSession: vi.fn()
  },
  AuthServiceError: class AuthServiceError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'AuthServiceError';
    }
  }
}));

// Mock the session manager
vi.mock('@/services/session-manager', () => ({
  SessionManager: {
    configureSessionPersistence: vi.fn(),
    performLogoutCleanup: vi.fn(),
    shouldAutoRefresh: vi.fn(() => true)
  }
}));

// Mock the error handler
vi.mock('@/lib/error-handler', () => ({
  ErrorHandler: {
    categorizeError: vi.fn((error) => ({
      code: error.message || 'UNKNOWN_ERROR',
      userMessage: `User friendly: ${error.message}`,
      category: 'AUTHENTICATION',
      severity: 'MEDIUM',
      retryable: false,
      timestamp: new Date()
    })),
    logError: vi.fn()
  }
}));

// Test component that uses auth context
function TestComponent() {
  const { user, loading, signIn, signOut, error } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="error">{error ? error.userMessage : 'No error'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

// Test component for useIsAuthenticated hook
function AuthStatusComponent() {
  const isAuthenticated = useIsAuthenticated();
  return <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
}

// Test component for useCurrentUser hook
function CurrentUserComponent() {
  const { user, loading } = useCurrentUser();
  return (
    <div>
      <div data-testid="current-user">{user ? user.email : 'No user'}</div>
      <div data-testid="current-user-loading">{loading ? 'Loading' : 'Not loading'}</div>
    </div>
  );
}

// Test component for useAuthActions hook
function AuthActionsComponent() {
  const { signIn, signOut } = useAuthActions();
  return (
    <div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  let mockAuthService: any;
  let mockAuth: any;

  beforeEach(async () => {
    resetAllMocks();
    mockAuthService = require('@/services/auth').authService;
    
    // Get the mocked supabase client
    const { supabase } = await import('@/lib/supabase');
    mockAuth = (supabase as any).auth;
    
    // Setup default mocks
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue(null);
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should provide initial auth state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });
    });

    it('should initialize with authenticated user', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getCurrentSession.mockResolvedValue(mockSession);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!);
      });
    });

    it('should handle initialization errors gracefully', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Init error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should set up auth state change listener', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
    });

    it('should handle auth state changes', async () => {
      let authStateCallback: any;
      mockAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate sign in event
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!);
      });

      // Simulate sign out event
      act(() => {
        authStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide auth methods', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should handle successful sign in', async () => {
      mockAuthService.signIn.mockResolvedValue(mockAuthResponse);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      
      await act(async () => {
        signInButton.click();
      });

      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password');
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!);
      });
    });

    it('should handle sign in errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.signIn.mockRejectedValue(error);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      
      await act(async () => {
        signInButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('User friendly: Invalid credentials');
      });
    });

    it('should handle successful sign out', async () => {
      // Start with authenticated user
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getCurrentSession.mockResolvedValue(mockSession);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!);
      });

      const signOutButton = screen.getByText('Sign Out');
      
      await act(async () => {
        signOutButton.click();
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should handle sign out errors', async () => {
      const error = new Error('Sign out failed');
      mockAuthService.signOut.mockRejectedValue(error);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signOutButton = screen.getByText('Sign Out');
      
      await act(async () => {
        signOutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('User friendly: Sign out failed');
        // Should still clear auth state even on error
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should show loading state during operations', async () => {
      let resolveSignIn: any;
      mockAuthService.signIn.mockReturnValue(new Promise(resolve => {
        resolveSignIn = resolve;
      }));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      
      act(() => {
        signInButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      });

      act(() => {
        resolveSignIn(mockAuthResponse);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });
  });

  describe('useIsAuthenticated hook', () => {
    it('should return false when not authenticated', async () => {
      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
      });
    });

    it('should return true when authenticated', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getCurrentSession.mockResolvedValue(mockSession);

      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });
    });

    it('should return false during initialization', () => {
      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });

  describe('useCurrentUser hook', () => {
    it('should return user and loading state', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getCurrentSession.mockResolvedValue(mockSession);

      render(
        <AuthProvider>
          <CurrentUserComponent />
        </AuthProvider>
      );

      // Initially loading
      expect(screen.getByTestId('current-user-loading')).toHaveTextContent('Loading');

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent(mockUser.email!);
        expect(screen.getByTestId('current-user-loading')).toHaveTextContent('Not loading');
      });
    });
  });

  describe('useAuthActions hook', () => {
    it('should provide auth actions without state', () => {
      render(
        <AuthProvider>
          <AuthActionsComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  describe('session management', () => {
    it('should configure session persistence on sign in with remember me', async () => {
      const { SessionManager } = require('@/services/session-manager');
      mockAuthService.signIn.mockResolvedValue(mockAuthResponse);

      function TestSignInComponent() {
        const { signIn } = useAuth();
        return (
          <button onClick={() => signIn('test@example.com', 'password', true)}>
            Sign In with Remember Me
          </button>
        );
      }

      render(
        <AuthProvider>
          <TestSignInComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In with Remember Me');
      
      await act(async () => {
        signInButton.click();
      });

      expect(SessionManager.configureSessionPersistence).toHaveBeenCalledWith(true);
    });

    it('should perform logout cleanup on sign out', async () => {
      const { SessionManager } = require('@/services/session-manager');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signOutButton = screen.getByText('Sign Out');
      
      await act(async () => {
        signOutButton.click();
      });

      expect(SessionManager.performLogoutCleanup).toHaveBeenCalled();
    });

    it('should auto-refresh session when needed', async () => {
      const { SessionManager } = require('@/services/session-manager');
      
      // Mock session that needs refresh
      const expiringSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 30 // Expires in 30 seconds
      };

      mockAuthService.getCurrentSession.mockResolvedValue(expiringSession);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      SessionManager.shouldAutoRefresh.mockReturnValue(true);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!);
      });

      // Wait for auto-refresh timeout (mocked to be immediate)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockAuthService.refreshSession).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should clear errors', async () => {
      const error = new Error('Test error');
      mockAuthService.signIn.mockRejectedValue(error);

      function TestErrorComponent() {
        const { signIn, error, clearError } = useAuth();
        return (
          <div>
            <div data-testid="error">{error ? error.userMessage : 'No error'}</div>
            <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
            <button onClick={clearError}>Clear Error</button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestErrorComponent />
        </AuthProvider>
      );

      // Trigger error
      const signInButton = screen.getByText('Sign In');
      await act(async () => {
        signInButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('User friendly: Test error');
      });

      // Clear error
      const clearErrorButton = screen.getByText('Clear Error');
      act(() => {
        clearErrorButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });
    });
  });
});