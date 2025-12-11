import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, AuthServiceError } from '../auth';

// Mock the supabase module with a simple mock
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

describe('AuthService - Basic Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should throw error for invalid email in signUp', async () => {
      await expect(authService.signUp('invalid-email', 'Password123')).rejects.toThrow(
        new AuthServiceError('Please enter a valid email address', 'INVALID_EMAIL')
      );
    });

    it('should throw error for empty email in signUp', async () => {
      await expect(authService.signUp('', 'Password123')).rejects.toThrow(
        new AuthServiceError('Email is required', 'INVALID_EMAIL')
      );
    });

    it('should throw error for weak password in signUp', async () => {
      await expect(authService.signUp('test@example.com', 'weak')).rejects.toThrow(
        new AuthServiceError('Password must be at least 8 characters long', 'WEAK_PASSWORD')
      );
    });

    it('should throw error for password without uppercase', async () => {
      await expect(authService.signUp('test@example.com', 'password123')).rejects.toThrow(
        new AuthServiceError(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          'WEAK_PASSWORD'
        )
      );
    });

    it('should throw error for password without lowercase', async () => {
      await expect(authService.signUp('test@example.com', 'PASSWORD123')).rejects.toThrow(
        new AuthServiceError(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          'WEAK_PASSWORD'
        )
      );
    });

    it('should throw error for password without number', async () => {
      await expect(authService.signUp('test@example.com', 'Password')).rejects.toThrow(
        new AuthServiceError(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          'WEAK_PASSWORD'
        )
      );
    });

    it('should throw error for invalid email in signIn', async () => {
      await expect(authService.signIn('invalid-email', 'Password123')).rejects.toThrow(
        new AuthServiceError('Please enter a valid email address', 'INVALID_EMAIL')
      );
    });

    it('should throw error for empty password in signIn', async () => {
      await expect(authService.signIn('test@example.com', '')).rejects.toThrow(
        new AuthServiceError('Password is required', 'INVALID_PASSWORD')
      );
    });

    it('should throw error for invalid email in resetPassword', async () => {
      await expect(authService.resetPassword('invalid-email')).rejects.toThrow(
        new AuthServiceError('Please enter a valid email address', 'INVALID_EMAIL')
      );
    });

    it('should throw error for weak password in updatePassword', async () => {
      await expect(authService.updatePassword('weak')).rejects.toThrow(
        new AuthServiceError('Password must be at least 8 characters long', 'WEAK_PASSWORD')
      );
    });
  });

  describe('AuthServiceError', () => {
    it('should create error with correct properties', () => {
      const error = new AuthServiceError('Test message', 'TEST_CODE');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AuthServiceError');
      expect(error.originalError).toBeUndefined();
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original error');
      const error = new AuthServiceError('Test message', 'TEST_CODE', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });
});