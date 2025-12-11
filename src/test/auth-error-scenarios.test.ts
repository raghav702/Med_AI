import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthServiceError } from '@/services/auth';
import { 
  createMockSupabaseClient,
  mockUser,
  mockSession,
  mockAuthError,
  resetAllMocks
} from './mocks/supabase';

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

// Mock the error handler
vi.mock('@/lib/error-handler', () => ({
  ErrorHandler: {
    handleAuthError: vi.fn((error) => ({
      code: error.message || 'UNKNOWN_ERROR',
      userMessage: `User friendly: ${error.message}`,
      category: 'AUTHENTICATION',
      severity: 'MEDIUM',
      retryable: error.message?.includes('network') || error.message?.includes('timeout')
    }))
  }
}));

describe('Authentication Error Scenarios', () => {
  let authService: AuthService;
  let mockAuth: any;

  beforeEach(async () => {
    // Get the mocked supabase client
    const { supabase } = await import('@/lib/supabase');
    mockAuth = (supabase as any).auth;
    
    authService = new AuthService();
    resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Error Scenarios', () => {
    it('should handle network timeout during sign in', async () => {
      const timeoutError = new Error('Request timeout');
      mockAuth.signInWithPassword.mockRejectedValue(timeoutError);

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!'
      });
    });

    it('should handle network connection failure', async () => {
      const networkError = new Error('Network connection failed');
      mockAuth.signUp.mockRejectedValue(networkError);

      await expect(
        authService.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('DNS resolution failed');
      mockAuth.resetPasswordForEmail.mockRejectedValue(dnsError);

      await expect(
        authService.resetPassword('test@example.com')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle server unavailable errors', async () => {
      const serverError = { 
        message: 'Service temporarily unavailable',
        status: 503
      };
      mockAuth.refreshSession.mockRejectedValue(serverError);

      await expect(
        authService.refreshSession()
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle invalid credentials error', async () => {
      const invalidCredentialsError = {
        message: 'Invalid login credentials',
        status: 400
      };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: invalidCredentialsError
      });

      await expect(
        authService.signIn('test@example.com', 'wrongpassword')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle user not found error', async () => {
      const userNotFoundError = {
        message: 'User not found',
        status: 404
      };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: userNotFoundError
      });

      await expect(
        authService.signIn('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle email already registered error', async () => {
      const emailExistsError = {
        message: 'User already registered',
        status: 422
      };
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: emailExistsError
      });

      await expect(
        authService.signUp('existing@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle weak password error', async () => {
      const weakPasswordError = {
        message: 'Password should be at least 6 characters',
        status: 422
      };
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: weakPasswordError
      });

      await expect(
        authService.signUp('test@example.com', 'weak')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle email verification required error', async () => {
      const verificationError = {
        message: 'Email not confirmed',
        status: 400
      };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: verificationError
      });

      await expect(
        authService.signIn('unverified@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle account locked error', async () => {
      const accountLockedError = {
        message: 'Account temporarily locked',
        status: 423
      };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: accountLockedError
      });

      await expect(
        authService.signIn('locked@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle rate limiting on sign in attempts', async () => {
      const rateLimitError = {
        message: 'Too many requests',
        status: 429
      };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: rateLimitError
      });

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle rate limiting on password reset requests', async () => {
      const rateLimitError = {
        message: 'Email rate limit exceeded',
        status: 429
      };
      mockAuth.resetPasswordForEmail.mockResolvedValue({
        error: rateLimitError
      });

      await expect(
        authService.resetPassword('test@example.com')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle rate limiting on email verification resend', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const rateLimitError = {
        message: 'Email rate limit exceeded',
        status: 429
      };
      mockAuth.resend.mockResolvedValue({
        error: rateLimitError
      });

      await expect(
        authService.resendEmailVerification()
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('Session Error Scenarios', () => {
    it('should handle expired session error', async () => {
      const expiredSessionError = {
        message: 'JWT expired',
        status: 401
      };
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: expiredSessionError
      });

      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should handle invalid session token', async () => {
      const invalidTokenError = {
        message: 'Invalid JWT',
        status: 401
      };
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: invalidTokenError
      });

      const session = await authService.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should handle session refresh failure', async () => {
      const refreshError = {
        message: 'Refresh token expired',
        status: 401
      };
      mockAuth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: refreshError
      });

      await expect(
        authService.refreshSession()
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle corrupted session data', async () => {
      const corruptedDataError = {
        message: 'Invalid session format',
        status: 400
      };
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: corruptedDataError
      });

      const session = await authService.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('Service Unavailability Scenarios', () => {
    it('should handle Supabase service unavailable', async () => {
      // Mock supabase as null to simulate service unavailability
      vi.doMock('@/lib/supabase', () => ({
        supabase: null
      }), { virtual: true });

      vi.resetModules();
      const { AuthService: TestAuthService } = await import('@/services/auth');
      const testAuthService = new TestAuthService();

      await expect(
        testAuthService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow('Authentication service is not available');
    });

    it('should handle database connection errors', async () => {
      const dbError = {
        message: 'Database connection failed',
        status: 503
      };
      mockAuth.signInWithPassword.mockRejectedValue(dbError);

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle API gateway errors', async () => {
      const gatewayError = {
        message: 'Bad Gateway',
        status: 502
      };
      mockAuth.signUp.mockRejectedValue(gatewayError);

      await expect(
        authService.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('Validation Error Scenarios', () => {
    it('should handle malformed email validation', async () => {
      await expect(
        authService.signIn('not-an-email', 'Password123!')
      ).rejects.toThrow('Please enter a valid email address');
    });

    it('should handle empty email validation', async () => {
      await expect(
        authService.signIn('', 'Password123!')
      ).rejects.toThrow('Email is required');
    });

    it('should handle empty password validation', async () => {
      await expect(
        authService.signIn('test@example.com', '')
      ).rejects.toThrow('Password is required');
    });

    it('should handle password complexity validation', async () => {
      // Test various password validation scenarios
      await expect(
        authService.signUp('test@example.com', 'short')
      ).rejects.toThrow('Password must be at least 8 characters long');

      await expect(
        authService.signUp('test@example.com', 'nouppercase123')
      ).rejects.toThrow('Password must contain at least one uppercase letter');

      await expect(
        authService.signUp('test@example.com', 'NOLOWERCASE123')
      ).rejects.toThrow('Password must contain at least one uppercase letter');

      await expect(
        authService.signUp('test@example.com', 'NoNumbers')
      ).rejects.toThrow('Password must contain at least one uppercase letter');
    });
  });

  describe('Concurrent Operation Scenarios', () => {
    it('should handle concurrent sign in attempts', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Simulate concurrent sign in attempts
      const promises = [
        authService.signIn('test@example.com', 'Password123!'),
        authService.signIn('test@example.com', 'Password123!'),
        authService.signIn('test@example.com', 'Password123!')
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.user).toEqual(mockUser);
        expect(result.session).toEqual(mockSession);
      });

      // Should have made 3 separate calls
      expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(3);
    });

    it('should handle sign in during sign out', async () => {
      mockAuth.signOut.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Start sign out
      const signOutPromise = authService.signOut();
      
      // Immediately try to sign in
      const signInPromise = authService.signIn('test@example.com', 'Password123!');

      // Both should complete
      await Promise.all([signOutPromise, signInPromise]);

      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(mockAuth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('Memory and Resource Error Scenarios', () => {
    it('should handle out of memory errors', async () => {
      const memoryError = new Error('Out of memory');
      mockAuth.signUp.mockRejectedValue(memoryError);

      await expect(
        authService.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = {
        message: 'Quota exceeded',
        status: 429
      };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: quotaError
      });

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('Browser Compatibility Scenarios', () => {
    it('should handle localStorage unavailable', async () => {
      // Mock localStorage as undefined
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Should still work without localStorage
      const result = await authService.signIn('test@example.com', 'Password123!');
      expect(result.user).toEqual(mockUser);

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });

    it('should handle cookies disabled', async () => {
      // Mock document.cookie as empty
      Object.defineProperty(document, 'cookie', {
        value: '',
        writable: false
      });

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Should still work without cookies
      const result = await authService.signIn('test@example.com', 'Password123!');
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle null/undefined responses', async () => {
      mockAuth.signInWithPassword.mockResolvedValue(null);

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle malformed response data', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: null
      });

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle unexpected response structure', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        unexpected: 'structure'
      });

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      
      await expect(
        authService.signIn(longEmail, 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = 'P@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const result = await authService.signIn('test@example.com', specialPassword);
      expect(result.user).toEqual(mockUser);
    });
  });
});