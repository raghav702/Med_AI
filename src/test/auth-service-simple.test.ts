import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, AuthServiceError } from '@/services/auth';

// Mock data
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
    user: mockUser,
    session: mockSession,
    error: null,
};

const mockAuthError = {
    name: 'AuthError',
    message: 'Invalid login credentials',
    status: 400,
};

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

    return {
        supabase: {
            auth: mockAuth,
            from: vi.fn(() => ({
                select: vi.fn(),
                insert: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            })),
            channel: vi.fn(),
        }
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
            retryable: false
        }))
    }
}));

describe('AuthService - Core Functionality', () => {
    let authService: AuthService;
    let mockAuth: any;

    beforeEach(async () => {
        // Get the mocked supabase client
        const { supabase } = await import('@/lib/supabase');
        mockAuth = (supabase as any).auth;

        authService = new AuthService();
        vi.clearAllMocks();
    });

    describe('signUp', () => {
        it('should successfully sign up a new user', async () => {
            mockAuth.signUp.mockResolvedValue({
                data: mockAuthResponse,
                error: null
            });

            const result = await authService.signUp('test@example.com', 'Password123!', { userRole: 'patient' });

            expect(mockAuth.signUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'Password123!',
                options: {
                    data: {
                        user_role: 'patient',
                        email: 'test@example.com'
                    }
                }
            });
            expect(result.user).toEqual(mockUser);
            expect(result.session).toEqual(mockSession);
            expect(result.error).toBeNull();
        });

        it('should validate email format', async () => {
            await expect(
                authService.signUp('invalid-email', 'Password123!')
            ).rejects.toThrow('Please enter a valid email address');
        });

        it('should validate password requirements', async () => {
            await expect(
                authService.signUp('test@example.com', 'short')
            ).rejects.toThrow('Password must be at least 8 characters long');
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
    });

    describe('signIn', () => {
        it('should successfully sign in a user', async () => {
            mockAuth.signInWithPassword.mockResolvedValue({
                data: mockAuthResponse,
                error: null
            });

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
            mockAuth.signInWithPassword.mockResolvedValue({
                data: { user: null, session: null },
                error: mockAuthError
            });

            await expect(
                authService.signIn('test@example.com', 'Password123!')
            ).rejects.toThrow(AuthServiceError);
        });
    });

    describe('signOut', () => {
        it('should successfully sign out a user', async () => {
            mockAuth.signOut.mockResolvedValue({ error: null });

            await authService.signOut();

            expect(mockAuth.signOut).toHaveBeenCalled();
        });

        it('should handle signout errors', async () => {
            mockAuth.signOut.mockResolvedValue({ error: mockAuthError });

            await expect(authService.signOut()).rejects.toThrow(AuthServiceError);
        });
    });

    describe('getCurrentUser', () => {
        it('should return current user', async () => {
            mockAuth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });

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
    });

    describe('getCurrentSession', () => {
        it('should return current session', async () => {
            mockAuth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null
            });

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
    });

    describe('resetPassword', () => {
        it('should send password reset email', async () => {
            mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

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
    });

    describe('updatePassword', () => {
        it('should update user password', async () => {
            mockAuth.updateUser.mockResolvedValue({
                data: mockAuthResponse,
                error: null
            });

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
    });

    describe('refreshSession', () => {
        it('should refresh current session', async () => {
            mockAuth.refreshSession.mockResolvedValue({
                data: mockAuthResponse,
                error: null
            });

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