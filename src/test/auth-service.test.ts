import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthServiceError } from '@/services/auth';
import { 
  mockUser,
  mockSession,
  mockAuthResponse,
  mockAuthError,
  resetAllMocks
} from './mocks/supabase';

// Create a mock supabase client
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

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: mockClient
}));

// Mock the error handler
vi.mock('@/lib/error-handler', () => ({
  ErrorHandler: {
    handleAuthError: vi.fn((error) => ({
      code: error.message || 'UNKNOWN_ERROR',
      userMessage: `User friendly: ${error.message}`,
      category: 'AUTHENTICATION',
      severity: 'MEDIUM',
      retryable: false
    }))
  }
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    resetAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      mockAuth.signUp.mockResolvedValue(mockAuthResponse);

      const result = await authService.signUp('test@example.com', 'Password123!');

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          data: {}
        }
      });
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should sign up with additional user data', async () => {
      mockAuth.signUp.mockResolvedValue(mockAuthResponse);

      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        userType: 'patient' as const
      };

      await authService.signUp('test@example.com', 'Password123!', userData);

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            user_type: 'patient',
            specialization: undefined,
            license_number: undefined
          }
        }
      });
    });

    it('should validate email format', async () => {
      await expect(
        authService.signUp('invalid-email', 'Password123!')
      ).rejects.toThrow(AuthServiceError);

      await expect(
        authService.signUp('invalid-email', 'Password123!')
      ).rejects.toThrow('Please enter a valid email address');
    });

    it('should validate password requirements', async () => {
      // Test empty password
      await expect(
        authService.signUp('test@example.com', '')
      ).rejects.toThrow('Password is required');

      // Test short password
      await expect(
        authService.signUp('test@example.com', 'short')
      ).rejects.toThrow('Password must be at least 8 characters long');

      // Test password without uppercase
      await expect(
        authService.signUp('test@example.com', 'password123')
      ).rejects.toThrow('Password must contain at least one uppercase letter');

      // Test password without lowercase
      await expect(
        authService.signUp('test@example.com', 'PASSWORD123')
      ).rejects.toThrow('Password must contain at least one uppercase letter');

      // Test password without number
      await expect(
        authService.signUp('test@example.com', 'Password')
      ).rejects.toThrow('Password must contain at least one uppercase letter');
    });

    it('should handle signup errors', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError
      });

      await expect(
        authService.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle network errors', async () => {
      mockAuth.signUp.mockRejectedValue(new Error('Network error'));

      await expect(
        authService.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should throw service unavailable error when supabase is null', async () => {
      // Create a new auth service instance with null supabase
      vi.doMock('@/lib/supabase', () => ({
        supabase: null
      }), { virtual: true });

      // Clear module cache and re-import
      vi.resetModules();
      const { AuthService: TestAuthService } = await import('@/services/auth');
      const testAuthService = new TestAuthService();

      await expect(
        testAuthService.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow('Authentication service is not available');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      mockSuccessfulSignIn(mockAuth);

      const result = await authService.signIn('test@example.com', 'Password123!');

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!'
      });
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should validate email format', async () => {
      await expect(
        authService.signIn('invalid-email', 'Password123!')
      ).rejects.toThrow('Please enter a valid email address');
    });

    it('should validate password is provided', async () => {
      await expect(
        authService.signIn('test@example.com', '')
      ).rejects.toThrow('Password is required');
    });

    it('should handle signin errors', async () => {
      mockAuthErrorResponse(mockAuth, 'signInWithPassword', mockAuthError);

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });

    it('should handle network errors', async () => {
      mockNetworkError(mockAuth, 'signInWithPassword');

      await expect(
        authService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      mockSuccessfulSignOut(mockAuth);

      await authService.signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should handle signout errors', async () => {
      mockAuth.signOut.mockResolvedValue({ error: mockAuthError });

      await expect(authService.signOut()).rejects.toThrow(AuthServiceError);
    });

    it('should handle network errors', async () => {
      mockNetworkError(mockAuth, 'signOut');

      await expect(authService.signOut()).rejects.toThrow(AuthServiceError);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      mockSuccessfulGetUser(mockAuth);

      const user = await authService.getCurrentUser();

      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user is authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null on error', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockAuthError
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null when supabase is unavailable', async () => {
      // Create a new auth service instance with null supabase
      vi.doMock('@/lib/supabase', () => ({
        supabase: null
      }), { virtual: true });

      vi.resetModules();
      const { AuthService: TestAuthService } = await import('@/services/auth');
      const testAuthService = new TestAuthService();

      const user = await testAuthService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session', async () => {
      mockSuccessfulGetSession(mockAuth);

      const session = await authService.getCurrentSession();

      expect(mockAuth.getSession).toHaveBeenCalled();
      expect(session).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const session = await authService.getCurrentSession();

      expect(session).toBeNull();
    });

    it('should return null on error', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockAuthError
      });

      const session = await authService.getCurrentSession();

      expect(session).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockSuccessfulPasswordReset(mockAuth);

      await authService.resetPassword('test@example.com');

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'http://localhost:3000/reset-password'
        }
      );
    });

    it('should validate email format', async () => {
      await expect(
        authService.resetPassword('invalid-email')
      ).rejects.toThrow('Please enter a valid email address');
    });

    it('should handle reset password errors', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: mockAuthError });

      await expect(
        authService.resetPassword('test@example.com')
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockSuccessfulPasswordUpdate(mockAuth);

      await authService.updatePassword('NewPassword123!');

      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: 'NewPassword123!'
      });
    });

    it('should validate password requirements', async () => {
      await expect(
        authService.updatePassword('short')
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should handle update password errors', async () => {
      mockAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error: mockAuthError
      });

      await expect(
        authService.updatePassword('NewPassword123!')
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend email verification', async () => {
      mockSuccessfulGetUser(mockAuth);
      mockSuccessfulEmailResend(mockAuth);

      await authService.resendEmailVerification();

      expect(mockAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: mockUser.email
      });
    });

    it('should handle missing user', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(
        authService.resendEmailVerification()
      ).rejects.toThrow('No authenticated user found');
    });

    it('should handle resend errors', async () => {
      mockSuccessfulGetUser(mockAuth);
      mockAuth.resend.mockResolvedValue({ error: mockAuthError });

      await expect(
        authService.resendEmailVerification()
      ).rejects.toThrow(AuthServiceError);
    });
  });

  describe('refreshSession', () => {
    it('should refresh current session', async () => {
      mockSuccessfulRefreshSession(mockAuth);

      const result = await authService.refreshSession();

      expect(mockAuth.refreshSession).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle refresh session errors', async () => {
      mockAuth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError
      });

      await expect(
        authService.refreshSession()
      ).rejects.toThrow(AuthServiceError);
    });
  });
});