import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
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
const mockAuthService = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentSession: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  resendEmailVerification: vi.fn(),
  refreshSession: vi.fn()
};

vi.mock('@/services/auth', () => ({
  authService: mockAuthService,
  AuthServiceError: class AuthServiceError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'AuthServiceError';
    }
  }
}));

// Mock other services
vi.mock('@/services/session-manager', () => ({
  SessionManager: {
    configureSessionPersistence: vi.fn(),
    performLogoutCleanup: vi.fn(),
    shouldAutoRefresh: vi.fn(() => true)
  }
}));

vi.mock('@/lib/error-handler', () => ({
  ErrorHandler: {
    categorizeError: vi.fn((error) => ({
      code: error.message || 'UNKNOWN_ERROR',
      userMessage: error.message,
      category: 'AUTHENTICATION',
      severity: 'MEDIUM',
      retryable: false,
      timestamp: new Date()
    })),
    logError: vi.fn()
  }
}));

// Mock form components
const MockLoginForm = ({ onSubmit }: { onSubmit: (email: string, password: string) => void }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button type="submit" data-testid="login-button">Login</button>
    </form>
  );
};

const MockRegisterForm = ({ onSubmit }: { onSubmit: (email: string, password: string) => void }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="register-form">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="register-email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="register-password-input"
      />
      <button type="submit" data-testid="register-button">Register</button>
    </form>
  );
};

// Integration test component that simulates the full auth flow
function AuthIntegrationApp() {
  const [currentView, setCurrentView] = React.useState<'login' | 'register' | 'dashboard'>('login');
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockAuthService.signIn(email, password);
      setUser(response.user);
      setCurrentView('dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockAuthService.signUp(email, password);
      setUser(response.user);
      setCurrentView('dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await mockAuthService.signOut();
      setUser(null);
      setCurrentView('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      
      {currentView === 'login' && (
        <div data-testid="login-view">
          <h1>Login</h1>
          <MockLoginForm onSubmit={handleLogin} />
          <button onClick={() => setCurrentView('register')} data-testid="go-to-register">
            Go to Register
          </button>
        </div>
      )}
      
      {currentView === 'register' && (
        <div data-testid="register-view">
          <h1>Register</h1>
          <MockRegisterForm onSubmit={handleRegister} />
          <button onClick={() => setCurrentView('login')} data-testid="go-to-login">
            Go to Login
          </button>
        </div>
      )}
      
      {currentView === 'dashboard' && (
        <div data-testid="dashboard-view">
          <h1>Dashboard</h1>
          <div data-testid="user-email">{user?.email}</div>
          <button onClick={handleLogout} data-testid="logout-button">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

describe('Authentication Integration Tests', () => {
  const user = userEvent.setup();
  let mockAuth: any;

  beforeEach(async () => {
    resetAllMocks();
    
    // Get the mocked supabase client
    const { supabase } = await import('@/lib/supabase');
    mockAuth = (supabase as any).auth;
    
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue(null);
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should complete successful login flow', async () => {
      mockAuthService.signIn.mockResolvedValue(mockAuthResponse);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Should start on login view
      expect(screen.getByTestId('login-view')).toBeInTheDocument();

      // Fill in login form
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password123!');

      // Submit form
      await user.click(screen.getByTestId('login-button'));

      // Should show loading state
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for login to complete
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
      });

      // Should show user email
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');

      // Verify auth service was called correctly
      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'Password123!');
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.signIn.mockRejectedValue(error);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Fill in login form
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'wrongpassword');

      // Submit form
      await user.click(screen.getByTestId('login-button'));

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });

      // Should remain on login view
      expect(screen.getByTestId('login-view')).toBeInTheDocument();
    });

    it('should handle network errors during login', async () => {
      const networkError = new Error('Network error');
      mockAuthService.signIn.mockRejectedValue(networkError);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      });
    });
  });

  describe('Registration Flow', () => {
    it('should complete successful registration flow', async () => {
      mockAuthService.signUp.mockResolvedValue(mockAuthResponse);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Navigate to register view
      await user.click(screen.getByTestId('go-to-register'));
      expect(screen.getByTestId('register-view')).toBeInTheDocument();

      // Fill in registration form
      await user.type(screen.getByTestId('register-email-input'), 'newuser@example.com');
      await user.type(screen.getByTestId('register-password-input'), 'Password123!');

      // Submit form
      await user.click(screen.getByTestId('register-button'));

      // Wait for registration to complete
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
      });

      // Should show user email
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');

      // Verify auth service was called correctly
      expect(mockAuthService.signUp).toHaveBeenCalledWith('newuser@example.com', 'Password123!');
    });

    it('should handle registration errors', async () => {
      const error = new Error('Email already exists');
      mockAuthService.signUp.mockRejectedValue(error);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Navigate to register view
      await user.click(screen.getByTestId('go-to-register'));

      // Fill in registration form
      await user.type(screen.getByTestId('register-email-input'), 'existing@example.com');
      await user.type(screen.getByTestId('register-password-input'), 'Password123!');

      // Submit form
      await user.click(screen.getByTestId('register-button'));

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
      });

      // Should remain on register view
      expect(screen.getByTestId('register-view')).toBeInTheDocument();
    });
  });

  describe('Logout Flow', () => {
    it('should complete successful logout flow', async () => {
      // Start with successful login
      mockAuthService.signIn.mockResolvedValue(mockAuthResponse);
      mockAuthService.signOut.mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Login first
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
      });

      // Now logout
      await user.click(screen.getByTestId('logout-button'));

      // Should return to login view
      await waitFor(() => {
        expect(screen.getByTestId('login-view')).toBeInTheDocument();
      });

      // Verify auth service was called
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      // Start with successful login
      mockAuthService.signIn.mockResolvedValue(mockAuthResponse);
      const logoutError = new Error('Logout failed');
      mockAuthService.signOut.mockRejectedValue(logoutError);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Login first
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
      });

      // Now logout
      await user.click(screen.getByTestId('logout-button'));

      // Should show error but still return to login view
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');
        expect(screen.getByTestId('login-view')).toBeInTheDocument();
      });
    });
  });

  describe('Session Persistence', () => {
    it('should restore session on app initialization', async () => {
      // Mock existing session
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getCurrentSession.mockResolvedValue(mockSession);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Should automatically show dashboard with restored session
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    it('should handle session restoration errors', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Session expired'));
      mockAuthService.getCurrentSession.mockRejectedValue(new Error('Session expired'));

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Should show login view when session restoration fails
      await waitFor(() => {
        expect(screen.getByTestId('login-view')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation Integration', () => {
    it('should handle empty form submission', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Try to submit empty form
      await user.click(screen.getByTestId('login-button'));

      // Form should prevent submission (no API call should be made)
      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('should handle invalid email format', async () => {
      const validationError = new Error('Please enter a valid email address');
      mockAuthService.signIn.mockRejectedValue(validationError);

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      await user.type(screen.getByTestId('email-input'), 'invalid-email');
      await user.type(screen.getByTestId('password-input'), 'Password123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Please enter a valid email address');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during authentication operations', async () => {
      let resolveLogin: any;
      mockAuthService.signIn.mockReturnValue(new Promise(resolve => {
        resolveLogin = resolve;
      }));

      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password123!');
      await user.click(screen.getByTestId('login-button'));

      // Should show loading state
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Resolve the login
      resolveLogin(mockAuthResponse);

      // Loading should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate between login and register views', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AuthIntegrationApp />
          </AuthProvider>
        </BrowserRouter>
      );

      // Start on login view
      expect(screen.getByTestId('login-view')).toBeInTheDocument();

      // Navigate to register
      await user.click(screen.getByTestId('go-to-register'));
      expect(screen.getByTestId('register-view')).toBeInTheDocument();

      // Navigate back to login
      await user.click(screen.getByTestId('go-to-login'));
      expect(screen.getByTestId('login-view')).toBeInTheDocument();
    });
  });
});