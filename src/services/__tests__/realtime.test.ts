import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase import first
vi.mock('@/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };

  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
    },
  };
});

import { RealtimeService, RealtimeConnectionStatus } from '../realtime';

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked supabase instance
    const { supabase } = await import('@/lib/supabase');
    mockSupabase = supabase as any;
    
    // Create a fresh mock channel for each test
    mockChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    
    mockSupabase.channel = vi.fn(() => mockChannel);
    
    realtimeService = new RealtimeService();
  });

  afterEach(async () => {
    await realtimeService.cleanup();
  });

  describe('Service Availability', () => {
    it('should report service as available when supabase is available', () => {
      expect(realtimeService.isServiceAvailable()).toBe(true);
    });

    it('should report correct initial connection status', () => {
      expect(realtimeService.getConnectionStatus()).toBe(RealtimeConnectionStatus.DISCONNECTED);
    });
  });

  describe('Subscription Management', () => {
    it('should create a subscription successfully', async () => {
      const config = {
        userId: 'test-user-id',
        onUserProfileChange: vi.fn(),
        onMedicalRecordChange: vi.fn(),
        onConnectionStatusChange: vi.fn(),
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      const subscriptionId = await realtimeService.subscribe(config);

      expect(subscriptionId).toBeDefined();
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `user_${config.userId}`,
        expect.any(Object)
      );
      expect(mockChannel.on).toHaveBeenCalledTimes(3); // 2 postgres_changes + 1 system
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should throw error when subscribing without user ID', async () => {
      const config = {
        userId: '',
      };

      await expect(realtimeService.subscribe(config)).rejects.toThrow(
        'User ID is required for subscription'
      );
    });

    it('should unsubscribe successfully', async () => {
      const config = {
        userId: 'test-user-id',
        onUserProfileChange: vi.fn(),
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      const subscriptionId = await realtimeService.subscribe(config);
      await realtimeService.unsubscribe(subscriptionId);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle unsubscribing non-existent subscription gracefully', async () => {
      await expect(realtimeService.unsubscribe('non-existent')).resolves.not.toThrow();
    });

    it('should unsubscribe all subscriptions', async () => {
      const config1 = { userId: 'user-1' };
      const config2 = { userId: 'user-2' };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config1);
      await realtimeService.subscribe(config2);

      await realtimeService.unsubscribeAll();

      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Status Management', () => {
    it('should update connection status when subscription succeeds', async () => {
      const config = {
        userId: 'test-user-id',
        onConnectionStatusChange: vi.fn(),
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config);

      expect(config.onConnectionStatusChange).toHaveBeenCalledWith(
        RealtimeConnectionStatus.CONNECTED
      );
    });

    it('should handle subscription errors', async () => {
      const config = {
        userId: 'test-user-id',
        onConnectionStatusChange: vi.fn(),
        enableRetry: false,
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR', new Error('Connection failed'));
        return mockChannel;
      });

      await realtimeService.subscribe(config);

      expect(config.onConnectionStatusChange).toHaveBeenCalledWith(
        RealtimeConnectionStatus.ERROR
      );
    });
  });

  describe('Callback Handling', () => {
    it('should call user profile change callback', async () => {
      const onUserProfileChange = vi.fn();
      const config = {
        userId: 'test-user-id',
        onUserProfileChange,
      };

      let profileChangeCallback: any;
      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (filter.table === 'user_profiles') {
          profileChangeCallback = callback;
        }
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config);

      // Simulate a profile change
      const mockPayload = {
        eventType: 'UPDATE',
        new: { id: 'test-user-id', first_name: 'John' },
        old: { id: 'test-user-id', first_name: 'Jane' },
      };

      profileChangeCallback(mockPayload);

      expect(onUserProfileChange).toHaveBeenCalledWith(mockPayload);
    });

    it('should call medical record change callback', async () => {
      const onMedicalRecordChange = vi.fn();
      const config = {
        userId: 'test-user-id',
        onMedicalRecordChange,
      };

      let recordChangeCallback: any;
      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (filter.table === 'medical_records') {
          recordChangeCallback = callback;
        }
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config);

      // Simulate a record change
      const mockPayload = {
        eventType: 'INSERT',
        new: { id: 'record-1', user_id: 'test-user-id', title: 'Test Record' },
        old: null,
      };

      recordChangeCallback(mockPayload);

      expect(onMedicalRecordChange).toHaveBeenCalledWith(mockPayload);
    });

    it('should handle callback errors gracefully', async () => {
      const onUserProfileChange = vi.fn(() => {
        throw new Error('Callback error');
      });

      const config = {
        userId: 'test-user-id',
        onUserProfileChange,
      };

      let profileChangeCallback: any;
      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (filter.table === 'user_profiles') {
          profileChangeCallback = callback;
        }
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config);

      // This should not throw
      expect(() => {
        profileChangeCallback({
          eventType: 'UPDATE',
          new: { id: 'test-user-id' },
        });
      }).not.toThrow();

      expect(onUserProfileChange).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed subscriptions when enabled', async () => {
      vi.useFakeTimers();

      const config = {
        userId: 'test-user-id',
        enableRetry: true,
        retryInterval: 1000,
        maxRetries: 2,
        onConnectionStatusChange: vi.fn(),
      };

      let subscribeCallback: any;
      mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      });

      const subscriptionId = await realtimeService.subscribe(config);

      // Simulate connection error
      subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'));

      expect(config.onConnectionStatusChange).toHaveBeenCalledWith(
        RealtimeConnectionStatus.RECONNECTING
      );

      // Fast-forward time to trigger retry
      vi.advanceTimersByTime(1000);

      // Should attempt to create new subscription
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should stop retrying after max retries', async () => {
      vi.useFakeTimers();

      const config = {
        userId: 'test-user-id',
        enableRetry: true,
        retryInterval: 1000,
        maxRetries: 1,
        onConnectionStatusChange: vi.fn(),
      };

      let subscribeCallback: any;
      mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      });

      await realtimeService.subscribe(config);

      // Simulate multiple connection errors
      subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'));
      vi.advanceTimersByTime(1000);
      
      subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'));
      vi.advanceTimersByTime(1000);

      expect(config.onConnectionStatusChange).toHaveBeenLastCalledWith(
        RealtimeConnectionStatus.ERROR
      );

      vi.useRealTimers();
    });
  });

  describe('Reconnection', () => {
    it('should reconnect all subscriptions', async () => {
      const config = {
        userId: 'test-user-id',
        onConnectionStatusChange: vi.fn(),
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config);
      await realtimeService.reconnect();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2); // Original + reconnect
    });
  });

  describe('Active Subscriptions', () => {
    it('should track active subscriptions', async () => {
      const config = {
        userId: 'test-user-id',
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      expect(realtimeService.getActiveSubscriptions()).toHaveLength(0);

      await realtimeService.subscribe(config);

      expect(realtimeService.getActiveSubscriptions()).toHaveLength(1);
    });

    it('should remove inactive subscriptions from tracking', async () => {
      const config = {
        userId: 'test-user-id',
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      const subscriptionId = await realtimeService.subscribe(config);
      expect(realtimeService.getActiveSubscriptions()).toHaveLength(1);

      await realtimeService.unsubscribe(subscriptionId);
      expect(realtimeService.getActiveSubscriptions()).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', async () => {
      const config = {
        userId: 'test-user-id',
      };

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      });

      await realtimeService.subscribe(config);
      await realtimeService.cleanup();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(realtimeService.getActiveSubscriptions()).toHaveLength(0);
    });
  });
});