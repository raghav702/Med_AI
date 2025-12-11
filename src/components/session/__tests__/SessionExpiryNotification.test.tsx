import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionExpiryNotification } from '../SessionExpiryNotification';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionExpiry } from '@/hooks/useSession';

// Mock the hooks
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useSession');
vi.mock('@/services/session-manager', () => ({
  SessionManager: {
    formatTimeUntilExpiry: vi.fn((timeMs: number) => {
      const minutes = Math.floor(timeMs / (60 * 1000));
      const seconds = Math.floor((timeMs % (60 * 1000)) / 1000);
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    }),
    performLogoutCleanup: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseSessionExpiry = vi.mocked(useSessionExpiry);

describe('SessionExpiryNotification', () => {
  const mockRefreshSession = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      refreshSession: mockRefreshSession,
      signOut: mockSignOut,
      loading: false,
      user: null,
      session: null,
      initializing: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      resendEmailVerification: vi.fn(),
      error: null,
      clearError: vi.fn(),
    });
  });

  it('should not render when no warning is needed', () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: false,
      timeUntilExpiry: null,
      minutesUntilExpiry: null,
    });

    const { container } = render(<SessionExpiryNotification />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render warning when session is close to expiry', () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 5 * 60 * 1000, // 5 minutes
      minutesUntilExpiry: 5,
    });

    render(<SessionExpiryNotification />);
    
    expect(screen.getByText(/Your session will expire in 5 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extend Session/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/ })).toBeInTheDocument();
  });

  it('should show countdown when enabled', () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 5 * 60 * 1000 + 30 * 1000, // 5 minutes 30 seconds
      minutesUntilExpiry: 5,
    });

    render(<SessionExpiryNotification showCountdown />);
    
    expect(screen.getByText(/\(5m 30s\)/)).toBeInTheDocument();
  });

  it('should handle refresh session button click', async () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 5 * 60 * 1000,
      minutesUntilExpiry: 5,
    });

    mockRefreshSession.mockResolvedValue(undefined);

    render(<SessionExpiryNotification />);
    
    const refreshButton = screen.getByRole('button', { name: /Extend Session/ });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalled();
    });
  });

  it('should handle logout button click', async () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 5 * 60 * 1000,
      minutesUntilExpiry: 5,
    });

    mockSignOut.mockResolvedValue(undefined);

    render(<SessionExpiryNotification />);
    
    const logoutButton = screen.getByRole('button', { name: /Logout/ });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('should show loading state when refreshing', async () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 5 * 60 * 1000,
      minutesUntilExpiry: 5,
    });

    // Mock a slow refresh
    mockRefreshSession.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<SessionExpiryNotification />);
    
    const refreshButton = screen.getByRole('button', { name: /Extend Session/ });
    fireEvent.click(refreshButton);

    expect(screen.getByText(/Refreshing.../)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Extend Session/)).toBeInTheDocument();
    });
  });

  it('should handle refresh session error gracefully', async () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 5 * 60 * 1000,
      minutesUntilExpiry: 5,
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRefreshSession.mockRejectedValue(new Error('Refresh failed'));

    render(<SessionExpiryNotification />);
    
    const refreshButton = screen.getByRole('button', { name: /Extend Session/ });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh session:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('should use singular form for 1 minute', () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 1 * 60 * 1000,
      minutesUntilExpiry: 1,
    });

    render(<SessionExpiryNotification />);
    
    expect(screen.getByText(/Your session will expire in 1 minute$/)).toBeInTheDocument();
  });

  it('should use plural form for multiple minutes', () => {
    mockUseSessionExpiry.mockReturnValue({
      showWarning: true,
      timeUntilExpiry: 3 * 60 * 1000,
      minutesUntilExpiry: 3,
    });

    render(<SessionExpiryNotification />);
    
    expect(screen.getByText(/Your session will expire in 3 minutes/)).toBeInTheDocument();
  });
});