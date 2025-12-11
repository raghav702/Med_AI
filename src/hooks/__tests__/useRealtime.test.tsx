import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtime, useRealtimeConnectionStatus } from '../useRealtime';
import { RealtimeConnectionStatus } from '@/services/realtime';

// Mock the auth context
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock the realtime service
const mockRealtimeService = {
  isServiceAvailable: vi.fn(() => true),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getConnectionStatus: vi.fn(() => RealtimeConnectionStatus.DISCONNECTED),
  addConnectionStatusCallback: vi.fn(() => vi.fn()),
};

vi.mock('@/services/realtime', () => ({
  realtimeService: mockRealtimeService,
  RealtimeConnectionStatus: {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    RECONNECTING: 'reconnecting',
  },
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    expect(result.current.connectionStatus).toBe(RealtimeConnectionStatus.DISCONNECTED);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should subscribe when user is available', async () => {
    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');

    const { result } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockRealtimeService.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
        })
      );
    });
  });

  it('should call subscribe manually', async () => {
    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');

    const { result } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockRealtimeService.subscribe).toHaveBeenCalled();
  });

  it('should call unsubscribe manually', async () => {
    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');
    mockRealtimeService.unsubscribe.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    // First subscribe
    await act(async () => {
      await result.current.subscribe();
    });

    // Then unsubscribe
    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockRealtimeService.unsubscribe).toHaveBeenCalledWith('subscription-id');
  });

  it('should handle reconnection', async () => {
    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');
    mockRealtimeService.unsubscribe.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockRealtimeService.unsubscribe).toHaveBeenCalled();
    expect(mockRealtimeService.subscribe).toHaveBeenCalled();
  });

  it('should configure callbacks based on config', async () => {
    const onUserProfileChange = vi.fn();
    const onMedicalRecordChange = vi.fn();

    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');

    renderHook(
      () =>
        useRealtime({
          enableUserProfile: true,
          enableMedicalRecords: true,
          onUserProfileChange,
          onMedicalRecordChange,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(mockRealtimeService.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          onUserProfileChange: expect.any(Function),
          onMedicalRecordChange: expect.any(Function),
        })
      );
    });
  });

  it('should disable callbacks based on config', async () => {
    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');

    renderHook(
      () =>
        useRealtime({
          enableUserProfile: false,
          enableMedicalRecords: false,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(mockRealtimeService.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
        })
      );
    });

    const subscribeCall = mockRealtimeService.subscribe.mock.calls[0][0];
    expect(subscribeCall.onUserProfileChange).toBeUndefined();
    expect(subscribeCall.onMedicalRecordChange).toBeUndefined();
  });

  it('should handle subscription errors', async () => {
    const error = new Error('Subscription failed');
    mockRealtimeService.subscribe.mockRejectedValue(error);

    const { result } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe(RealtimeConnectionStatus.ERROR);
      expect(result.current.hasError).toBe(true);
    });
  });

  it('should not subscribe when service is unavailable', async () => {
    mockRealtimeService.isServiceAvailable.mockReturnValue(false);

    renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    // Wait a bit to ensure subscribe is not called
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockRealtimeService.subscribe).not.toHaveBeenCalled();
  });

  it('should cleanup subscription on unmount', async () => {
    mockRealtimeService.subscribe.mockResolvedValue('subscription-id');
    mockRealtimeService.unsubscribe.mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useRealtime(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockRealtimeService.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockRealtimeService.unsubscribe).toHaveBeenCalledWith('subscription-id');
  });
});

describe('useRealtimeConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial connection status', () => {
    mockRealtimeService.getConnectionStatus.mockReturnValue(RealtimeConnectionStatus.DISCONNECTED);

    const { result } = renderHook(() => useRealtimeConnectionStatus());

    expect(result.current.connectionStatus).toBe(RealtimeConnectionStatus.DISCONNECTED);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should register connection status callback', () => {
    const { result } = renderHook(() => useRealtimeConnectionStatus());

    expect(mockRealtimeService.addConnectionStatusCallback).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('should cleanup callback on unmount', () => {
    const mockCleanup = vi.fn();
    mockRealtimeService.addConnectionStatusCallback.mockReturnValue(mockCleanup);

    const { unmount } = renderHook(() => useRealtimeConnectionStatus());

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should correctly identify connected state', () => {
    mockRealtimeService.getConnectionStatus.mockReturnValue(RealtimeConnectionStatus.CONNECTED);

    const { result } = renderHook(() => useRealtimeConnectionStatus());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should correctly identify connecting states', () => {
    mockRealtimeService.getConnectionStatus.mockReturnValue(RealtimeConnectionStatus.CONNECTING);

    const { result, rerender } = renderHook(() => useRealtimeConnectionStatus());

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.hasError).toBe(false);

    // Test reconnecting state
    mockRealtimeService.getConnectionStatus.mockReturnValue(RealtimeConnectionStatus.RECONNECTING);
    rerender();

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should correctly identify error state', () => {
    mockRealtimeService.getConnectionStatus.mockReturnValue(RealtimeConnectionStatus.ERROR);

    const { result } = renderHook(() => useRealtimeConnectionStatus());

    expect(result.current.hasError).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });
});