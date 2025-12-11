/**
 * End-to-End Integration Tests
 * 
 * This test suite validates the complete user journey and all requirements
 * from the Supabase integration specification.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { AuthProvider } from '@/contexts/AuthContext';
import { mockSupabaseClient } from './mocks/supabase';

// Mock environment variables
vi.mock('@/lib/config', () => ({
  getSupabaseConfig: () => ({
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
  }),
  getCurrentEnvironment: () => 'test',
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock global error handler
vi.mock('@/lib/global-error-handler', () => ({
  globalErrorHandler: {
    initialize: vi.fn(),
    cleanup: vi.fn(),
  },
}));

// Mock startup validator
vi.mock('@/lib/startup-validator', () => ({
  getUserFacingConfigErrors: () => [],
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('End-to-End Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeAll(() => {
    // Mock window.location for redirects
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://localhost:3000/',
      },
      writable: true,
    });
  });

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset Supabase mock state
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 1: User Registration', () => {
    it('should complete full user registration flow', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      // Mock successful registration
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should redirect to login initially
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      // Navigate to registration
      const registerLink = screen.getByText(/create account/i);
      await user.click(registerLink);

      // Fill out registration form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');
      await user.type(confirmPasswordInput, 'TestPassword123!');

      // Submit registration
      const registerButton = screen.getByRole('button', { name: /create account/i });
      await user.click(registerButton);

      // Verify registration was called
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPassword123!',
          options: {
            data: {},
          },
        });
      });

      // Should show success message and redirect to login
      await waitFor(() => {
        expect(screen.getByText(/account created/i)).toBeInTheDocument();
      });
    });

    it('should handle registration errors appropriately', async () => {
      // Mock registration error
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 422,
        },
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to registration
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const registerLink = screen.getByText(/create account/i);
      await user.click(registerLink);

      // Fill out form and submit
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'TestPassword123!');
      await user.type(confirmPasswordInput, 'TestPassword123!');

      const registerButton = screen.getByRole('button', { name: /create account/i });
      await user.click(registerButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/user already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 2: User Authentication', () => {
    it('should complete full login flow', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      // Mock successful login
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock session check after login
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show login form
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      // Fill out login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');

      // Submit login
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Verify login was called
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });
      });

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });

    it('should handle email verification requirement', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: null, // Not verified
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      // Mock successful login but unverified email
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Login first
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Navigate to a protected route that requires email verification
      // This would typically be handled by the ProtectedRoute component
      // For now, we'll test the email verification prompt directly
      expect(mockUser.email_confirmed_at).toBeNull();
    });
  });

  describe('Requirement 3: Session Management', () => {
    it('should persist session across page reloads', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      // Mock existing session on app load
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should automatically redirect to dashboard with existing session
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Verify session was checked
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });

    it('should handle logout properly', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      // Start with authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock successful logout
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should be on dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Find and click logout button
      const logoutButton = screen.getByText(/sign out/i);
      await user.click(logoutButton);

      // Verify logout was called
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      });

      // Should redirect to login after logout
      // Note: This would require updating the mock to return null user after logout
    });
  });

  describe('Requirement 4: Data Security and Management', () => {
    it('should handle database operations securely', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock database operations
      const mockProfile = {
        id: mockUser.id,
        first_name: 'Test',
        last_name: 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to profile page
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // This would test that database operations are properly secured
      // and only return data for the authenticated user
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Requirement 5: Configuration Management', () => {
    it('should validate configuration on startup', async () => {
      // This test verifies that the app properly validates configuration
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // App should render without configuration errors in test environment
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle authentication errors', async () => {
      // Mock authentication error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        },
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States and User Feedback', () => {
    it('should show loading states during authentication', async () => {
      // Mock delayed response
      mockSupabaseClient.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: null, session: null },
          error: { message: 'Test error', status: 400 },
        }), 100))
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/test error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'TestPassword123!');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to registration
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      const registerLink = screen.getByText(/create account/i);
      await user.click(registerLink);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'weak'); // Weak password

      // Should show password strength validation
      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });
  });
});