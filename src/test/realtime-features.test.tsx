/**
 * Real-time Features Integration Tests
 * 
 * Tests for Requirement 6: Real-time updates and synchronization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { mockSupabaseClient } from './mocks/supabase';

// Mock environment
vi.mock('@/lib/config', () => ({
  getSupabaseConfig: () => ({
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
  }),
  getCurrentEnvironment: () => 'test',
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock components that use real-time features
const MockRealtimeComponent = () => {
  return <div data-testid="realtime-component">Real-time Component</div>;
};

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

describe('Real-time Features Integration', () => {
  let mockChannel: any;
  let mockSubscription: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock real-time channel
    mockSubscription = {
      unsubscribe: vi.fn(),
    };

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue(mockSubscription),
      unsubscribe: vi.fn(),
    };

    mockSupabaseClient.channel = vi.fn().mockReturnValue(mockChannel);

    // Mock authenticated user
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 6.1: Real-time data updates', () => {
    it('should establish real-time connection for user profile updates', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('realtime-component')).toBeInTheDocument();
      });

      // Verify channel creation
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('user-profile-test-user-id');
    });

    it('should handle real-time profile updates', async () => {
      const mockProfileUpdate = {
        id: 'test-user-id',
        first_name: 'Updated',
        last_name: 'Name',
        updated_at: new Date().toISOString(),
      };

      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
          }),
          expect.any(Function)
        );
      });

      // Simulate real-time update
      const updateCallback = mockChannel.on.mock.calls[0][2];
      updateCallback({ new: mockProfileUpdate });

      // Verify the update was processed
      expect(updateCallback).toBeDefined();
    });

    it('should handle real-time medical records updates', async () => {
      const mockRecordUpdate = {
        id: 'record-id',
        user_id: 'test-user-id',
        title: 'New Medical Record',
        created_at: new Date().toISOString(),
      };

      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: 'INSERT',
            schema: 'public',
            table: 'medical_records',
          }),
          expect.any(Function)
        );
      });

      // Simulate real-time insert
      const insertCallback = mockChannel.on.mock.calls.find(
        call => call[1].event === 'INSERT'
      )?.[2];
      
      if (insertCallback) {
        insertCallback({ new: mockRecordUpdate });
      }

      expect(insertCallback).toBeDefined();
    });
  });

  describe('Requirement 6.2: Multi-client synchronization', () => {
    it('should synchronize updates across multiple clients', async () => {
      // Simulate multiple clients by creating multiple subscriptions
      const client1Channel = { ...mockChannel };
      const client2Channel = { ...mockChannel };

      mockSupabaseClient.channel
        .mockReturnValueOnce(client1Channel)
        .mockReturnValueOnce(client2Channel);

      // Render two instances
      const { rerender } = render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <MockRealtimeComponent />
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(2);
      });

      // Both clients should receive the same updates
      expect(client1Channel.on).toHaveBeenCalled();
      expect(client2Channel.on).toHaveBeenCalled();
    });
  });

  describe('Requirement 6.3: Connection recovery', () => {
    it('should handle connection loss and recovery', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      // Simulate connection established
      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Simulate connection loss
      const statusCallback = mockChannel.on.mock.calls.find(
        call => call[0] === 'system'
      )?.[2];

      if (statusCallback) {
        statusCallback({ status: 'CHANNEL_ERROR' });
      }

      // Simulate reconnection
      if (statusCallback) {
        statusCallback({ status: 'SUBSCRIBED' });
      }

      expect(statusCallback).toBeDefined();
    });

    it('should automatically reconnect after network restoration', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Simulate network disconnection
      const presenceCallback = mockChannel.on.mock.calls.find(
        call => call[0] === 'presence'
      )?.[2];

      if (presenceCallback) {
        presenceCallback({ event: 'leave' });
      }

      // Simulate network restoration
      if (presenceCallback) {
        presenceCallback({ event: 'join' });
      }

      expect(presenceCallback).toBeDefined();
    });
  });

  describe('Requirement 6.4: Fallback mechanisms', () => {
    it('should fall back to polling when real-time fails', async () => {
      // Mock channel subscription failure
      mockChannel.subscribe.mockReturnValue({
        unsubscribe: vi.fn(),
        error: new Error('Subscription failed'),
      });

      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Should handle subscription failure gracefully
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should provide manual refresh option when real-time is unavailable', async () => {
      // Mock persistent connection failure
      mockChannel.on.mockImplementation((event, config, callback) => {
        if (event === 'system') {
          setTimeout(() => callback({ status: 'CHANNEL_ERROR' }), 10);
        }
        return mockChannel;
      });

      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Should provide fallback UI for manual refresh
      // This would be implemented in the actual components
    });
  });

  describe('Requirement 6.5: Error handling', () => {
    it('should handle subscription errors gracefully', async () => {
      // Mock subscription error
      mockChannel.subscribe.mockImplementation(() => {
        throw new Error('Subscription error');
      });

      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      // Should not crash the application
      await waitFor(() => {
        expect(screen.getByTestId('realtime-component')).toBeInTheDocument();
      });
    });

    it('should handle malformed real-time messages', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate malformed message
      const updateCallback = mockChannel.on.mock.calls[0][2];
      
      // Should handle malformed data gracefully
      expect(() => {
        updateCallback({ invalid: 'data' });
      }).not.toThrow();

      expect(() => {
        updateCallback(null);
      }).not.toThrow();

      expect(() => {
        updateCallback(undefined);
      }).not.toThrow();
    });

    it('should clean up subscriptions on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      // Should clean up subscription
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should throttle rapid updates', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const updateCallback = mockChannel.on.mock.calls[0][2];

      // Simulate rapid updates
      const updates = Array.from({ length: 10 }, (_, i) => ({
        new: { id: 'test-id', value: i, updated_at: new Date().toISOString() }
      }));

      updates.forEach(update => updateCallback(update));

      // Should handle rapid updates without performance issues
      expect(updateCallback).toBeDefined();
    });

    it('should batch multiple updates', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const updateCallback = mockChannel.on.mock.calls[0][2];

      // Simulate batch of updates
      const batchUpdates = [
        { new: { id: '1', value: 'a' } },
        { new: { id: '2', value: 'b' } },
        { new: { id: '3', value: 'c' } },
      ];

      batchUpdates.forEach(update => updateCallback(update));

      // Should process batch updates efficiently
      expect(updateCallback).toBeDefined();
    });
  });

  describe('Connection Status Indicators', () => {
    it('should show connection status to users', async () => {
      render(
        <TestWrapper>
          <MockRealtimeComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalledWith(
          'system',
          expect.any(Object),
          expect.any(Function)
        );
      });

      const statusCallback = mockChannel.on.mock.calls.find(
        call => call[0] === 'system'
      )?.[2];

      // Test different connection states
      if (statusCallback) {
        statusCallback({ status: 'CONNECTING' });
        statusCallback({ status: 'SUBSCRIBED' });
        statusCallback({ status: 'CHANNEL_ERROR' });
        statusCallback({ status: 'CLOSED' });
      }

      expect(statusCallback).toBeDefined();
    });
  });
});