import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, AuthServiceError } from '../auth';

// Mock user and session data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: null,
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {
    first_name: 'Test',
    last_name: 'User',
    user_type: 'patient',
  },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_anonymous: false,
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

const mockAuthResponse = {
  data: {
    user: mockUser,
    session: mockSession,
  },
  error: null,
};

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      resend: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

describe('AuthService - Integration Tests', () => {
  let authService: AuthService;
  let mockAuth: any;

  beforeEach(async () => {
    authService = new AuthService();
    // Get the mocked supabase instance
    const { supabase } = await import('@/lib/supabase');
    mockAuth = supabase?.auth;
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a user with valid credentials', async () => {
      mockAuth.signUp.mockResolvedValue(mockAuthResponse);

      const result = await authService.signUp('test@example.com', 'Password123');

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
        options: {
          data: {},
        },
      });
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should sign up a user with additional metadata', async () => {
      mockAuth.signUp.mockResolvedValue(mockAuthResponse);

      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        userType: 'patient' as const,
      };

      await authService.signUp('test@example.com', 'Password123', userData);

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            user_type: 'patient',
            specialization: undefined,
            license_number: undefined,
          },
        },
      });
    });

    it('should handle user already exists error', async () => {
      const error = { message: 'User already registered', status: 400 };
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.signUp('test@example.com', 'Password123')).rejects.toThrow(
        expect.objectContaining({
          message: 'An account with this email already exists. Please sign in instead.',
          code: 'USER_ALREADY_EXISTS',
        })
      );
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user with valid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue(mockAuthResponse);

      const result = await authService.signIn('test@example.com', 'Password123');

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should handle invalid credentials error', async () => {
      const error = { message: 'Invalid login credentials', status: 400 };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.signIn('test@example.com', 'wrongpassword')).rejects.toThrow(
        expect.objectContaining({
          message: 'Invalid email or password. Please check your credentials and try again.',
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('should handle email not confirmed error', async () => {
      const error = { message: 'Email not confirmed', status: 400 };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.signIn('test@example.com', 'Password123')).rejects.toThrow(
        expect.objectContaining({
          message: 'Please check your email and click the verification link before signing in.',
          code: 'EMAIL_NOT_CONFIRMED',
        })
      );
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      await authService.signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const error = { message: 'Sign out failed', status: 400 };
      mockAuth.signOut.mockResolvedValue({ error });

      await expect(authService.signOut()).rejects.toThrow(AuthServiceError);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await authService.getCurrentUser();

      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null on error', async () => {
      const error = { message: 'User not found', status: 404 };
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error,
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session when authenticated', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await authService.getCurrentSession();

      expect(mockAuth.getSession).toHaveBeenCalled();
      expect(session).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await authService.getCurrentSession();

      expect(session).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should successfully send password reset email', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      await authService.resetPassword('test@example.com');

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'http://localhost:3000/reset-password',
      });
    });

    it('should handle reset password errors', async () => {
      const error = { message: 'Reset failed', status: 400 };
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error });

      await expect(authService.resetPassword('test@example.com')).rejects.toThrow(AuthServiceError);
    });
  });

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      mockAuth.updateUser.mockResolvedValue(mockAuthResponse);

      await authService.updatePassword('NewPassword123');

      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: 'NewPassword123',
      });
    });

    it('should handle update password errors', async () => {
      const error = { message: 'Update failed', status: 400 };
      mockAuth.updateUser.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.updatePassword('NewPassword123')).rejects.toThrow(AuthServiceError);
    });
  });

  describe('resendEmailVerification', () => {
    it('should successfully resend email verification', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAuth.resend.mockResolvedValue({ error: null });

      await authService.resendEmailVerification();

      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(mockAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: mockUser.email,
      });
    });

    it('should throw error when no user is authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(authService.resendEmailVerification()).rejects.toThrow(
        new AuthServiceError(
          'No authenticated user found or user email is missing',
          'USER_NOT_FOUND'
        )
      );
    });
  });

  describe('refreshSession', () => {
    it('should successfully refresh session', async () => {
      mockAuth.refreshSession.mockResolvedValue(mockAuthResponse);

      const result = await authService.refreshSession();

      expect(mockAuth.refreshSession).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should handle refresh session errors', async () => {
      const error = { message: 'Refresh failed', status: 400 };
      mockAuth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.refreshSession()).rejects.toThrow(AuthServiceError);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit exceeded error', async () => {
      const error = { message: 'Too many requests', status: 429 };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.signIn('test@example.com', 'Password123')).rejects.toThrow(
        expect.objectContaining({
          message: 'Too many requests. Please wait a moment before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
        })
      );
    });

    it('should handle signup disabled error', async () => {
      const error = { message: 'Signup disabled', status: 400 };
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.signUp('test@example.com', 'Password123')).rejects.toThrow(
        expect.objectContaining({
          message: 'Account registration is currently disabled. Please contact support.',
          code: 'SIGNUP_DISABLED',
        })
      );
    });

    it('should handle generic auth errors', async () => {
      const error = { message: 'Some other error', status: 400 };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      await expect(authService.signIn('test@example.com', 'Password123')).rejects.toThrow(
        expect.objectContaining({
          message: 'Some other error',
          code: 'AUTH_ERROR',
        })
      );
    });

    it('should handle network errors', async () => {
      mockAuth.signUp.mockRejectedValue(new Error('Network error'));

      await expect(authService.signUp('test@example.com', 'Password123')).rejects.toThrow(
        expect.objectContaining({
          message: 'An unexpected error occurred during sign up',
          code: 'UNKNOWN_ERROR',
        })
      );
    });
  });
});