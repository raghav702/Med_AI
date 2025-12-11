import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '@/services/auth';
import { supabase } from '@/lib/supabase';

// Mock the auth service
vi.mock('@/services/auth');
vi.mock('@/lib/supabase');

// Test component that uses the auth context
function TestComponent() {
  const { 
    user, 
    session, 
    loading, 
    initializing, 
    signIn, 
    signUp, 
    signOut, 
    error 
  } = useAuth();

  return (
    <div>
      <div data-testid="user">{user?.email || 'No user'}</div>
      <div data-testid="session">{session?.access_token ? 'Has session' : 'No session'}</div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="initializing">{initializing ? 'Initializing' : 'Initialized'}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    confirmation_sent_at: '2023-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth service methods
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
    vi.mocked(authService.getCurrentSession).mockResolvedValue(null);
    vi.mocked(authService.signIn).mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null,
    });
    vi.mocked(authService.signUp).mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null,
    });
    vi.mocked(authService.signOut).mockResolvedValue();

    // Mock Supabase auth listener
    const mockSubscription = { unsubscribe: vi.fn() };
    vi.mocked(supabase).auth = {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: mockSubscription } }),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide initial auth state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should start with initializing state
    expect(screen.getByTestId('initializing')).toHaveTextContent('Initializing');
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('session')).toHaveTextContent('No session');

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('Initialized');
    });
  });

  it('should handle successful sign in', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('Initialized');
    });

    // Click sign in button
    const signInButton = screen.getByText('Sign In');
    
    act(() => {
      signInButton.click();
    });

    // Wait for sign in to complete
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });

    // Verify auth service was called
    expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle successful sign up', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('Initialized');
    });

    // Click sign up button
    const signUpButton = screen.getByText('Sign Up');
    
    await act(async () => {
      signUpButton.click();
    });

    // Wait for sign up to complete
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });

    // Verify auth service was called
    expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'password', undefined);
  });

  it('should handle sign out', async () => {
    // Start with authenticated state
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(authService.getCurrentSession).mockResolvedValue(mockSession);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization with user
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    // Click sign out button
    const signOutButton = screen.getByText('Sign Out');
    
    await act(async () => {
      signOutButton.click();
    });

    // Wait for sign out to complete
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    // Verify auth service was called
    expect(authService.signOut).toHaveBeenCalled();
  });

  it('should handle authentication errors', async () => {
    const mockError = new Error('Invalid credentials');
    vi.mocked(authService.signIn).mockRejectedValue(mockError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('Initialized');
    });

    // Click sign in button
    const signInButton = screen.getByText('Sign In');
    
    await act(async () => {
      try {
        signInButton.click();
      } catch (error) {
        // Expected error, ignore
      }
    });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });
  });

  it('should restore session on initialization', async () => {
    // Mock existing session
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(authService.getCurrentSession).mockResolvedValue(mockSession);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization to complete with restored session
    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('Initialized');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });
  });

  it('should handle auth state changes from Supabase listener', async () => {
    let authStateCallback: (event: string, session: any) => void;

    // Mock the auth state listener to capture the callback
    vi.mocked(supabase).auth.onAuthStateChange = vi.fn().mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('Initialized');
    });

    // Simulate SIGNED_IN event
    await act(async () => {
      authStateCallback!('SIGNED_IN', mockSession);
    });

    // Should update state
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });

    // Simulate SIGNED_OUT event
    await act(async () => {
      authStateCallback!('SIGNED_OUT', null);
    });

    // Should clear state
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});