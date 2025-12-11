import { vi } from 'vitest';
import type { SupabaseClient, AuthResponse, User, Session, AuthError } from '@supabase/supabase-js';

// Mock user data
export const mockUser: User = {
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

// Mock session data
export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

// Mock successful auth response
export const mockAuthResponse: AuthResponse = {
  data: {
    user: mockUser,
    session: mockSession,
  },
  error: null,
};

// Mock auth error
export const mockAuthError: AuthError = {
  name: 'AuthError',
  message: 'Invalid login credentials',
  status: 400,
};

// Create mock Supabase client
export const createMockSupabaseClient = () => {
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
  } as unknown as SupabaseClient;

  return { mockClient, mockAuth };
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
};

// Mock successful responses
export const mockSuccessfulSignUp = (mockAuth: any) => {
  mockAuth.signUp.mockResolvedValue(mockAuthResponse);
};

export const mockSuccessfulSignIn = (mockAuth: any) => {
  mockAuth.signInWithPassword.mockResolvedValue(mockAuthResponse);
};

export const mockSuccessfulSignOut = (mockAuth: any) => {
  mockAuth.signOut.mockResolvedValue({ error: null });
};

export const mockSuccessfulGetUser = (mockAuth: any) => {
  mockAuth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
};

export const mockSuccessfulGetSession = (mockAuth: any) => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });
};

export const mockSuccessfulPasswordReset = (mockAuth: any) => {
  mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
};

export const mockSuccessfulPasswordUpdate = (mockAuth: any) => {
  mockAuth.updateUser.mockResolvedValue(mockAuthResponse);
};

export const mockSuccessfulEmailResend = (mockAuth: any) => {
  mockAuth.resend.mockResolvedValue({ error: null });
};

export const mockSuccessfulRefreshSession = (mockAuth: any) => {
  mockAuth.refreshSession.mockResolvedValue(mockAuthResponse);
};

// Mock error responses
export const mockAuthErrorResponse = (mockAuth: any, method: string, error: AuthError) => {
  (mockAuth[method] as any).mockResolvedValue({
    data: { user: null, session: null },
    error,
  });
};

export const mockNetworkError = (mockAuth: any, method: string) => {
  (mockAuth[method] as any).mockRejectedValue(new Error('Network error'));
};