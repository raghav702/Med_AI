import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { UserProfile, MedicalRecord } from '@/types/database';

/**
 * Real-time subscription callback types
 */
export type UserProfileChangeCallback = (payload: RealtimePostgresChangesPayload<UserProfile>) => void;
export type MedicalRecordChangeCallback = (payload: RealtimePostgresChangesPayload<MedicalRecord>) => void;
export type ConnectionStatusCallback = (status: RealtimeConnectionStatus) => void;

/**
 * Real-time connection status
 */
export enum RealtimeConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  userId: string;
  onUserProfileChange?: UserProfileChangeCallback;
  onMedicalRecordChange?: MedicalRecordChangeCallback;
  onConnectionStatusChange?: ConnectionStatusCallback;
  enableRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
}

/**
 * Active subscription tracking
 */
export interface ActiveSubscription {
  id: string;
  channel: RealtimeChannel;
  userId: string;
  config: SubscriptionConfig;
  retryCount: number;
  isActive: boolean;
}

/**
 * Real-time service error
 */
export class RealtimeServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RealtimeServiceError';
  }
}

/**
 * Real-time service interface
 */
export interface IRealtimeService {
  // Subscription management
  subscribe(config: SubscriptionConfig): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  unsubscribeAll(): Promise<void>;
  
  // Connection management
  getConnectionStatus(): RealtimeConnectionStatus;
  reconnect(): Promise<void>;
  
  // Utility methods
  isServiceAvailable(): boolean;
  getActiveSubscriptions(): ActiveSubscription[];
}

/**
 * Real-time service implementation using Supabase
 */
class RealtimeService implements IRealtimeService {
  private subscriptions = new Map<string, ActiveSubscription>();
  private connectionStatus = RealtimeConnectionStatus.DISCONNECTED;
  private connectionStatusCallbacks = new Set<ConnectionStatusCallback>();
  private reconnectTimeout?: NodeJS.Timeout;
  private isReconnecting = false;

  constructor() {
    this.initializeConnectionMonitoring();
  }

  /**
   * Check if the real-time service is available
   */
  isServiceAvailable(): boolean {
    return supabase !== null;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): RealtimeConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): ActiveSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  /**
   * Subscribe to real-time updates for a user
   */
  async subscribe(config: SubscriptionConfig): Promise<string> {
    if (!this.isServiceAvailable()) {
      throw new RealtimeServiceError(
        'Real-time service is not available. Please check your configuration.',
        'SERVICE_UNAVAILABLE'
      );
    }

    if (!config.userId) {
      throw new RealtimeServiceError('User ID is required for subscription', 'INVALID_CONFIG');
    }

    try {
      const subscriptionId = this.generateSubscriptionId(config.userId);
      
      // Remove existing subscription for this user if it exists
      const existingSubscription = Array.from(this.subscriptions.values())
        .find(sub => sub.userId === config.userId);
      
      if (existingSubscription) {
        await this.unsubscribe(existingSubscription.id);
      }

      // Create new channel
      const channel = supabase!.channel(`user_${config.userId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: config.userId }
        }
      });

      // Set up user profile subscription
      if (config.onUserProfileChange) {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${config.userId}`
          },
          (payload: RealtimePostgresChangesPayload<UserProfile>) => {
            try {
              config.onUserProfileChange!(payload);
            } catch (error) {
              console.error('Error in user profile change callback:', error);
            }
          }
        );
      }

      // Set up medical records subscription
      if (config.onMedicalRecordChange) {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'medical_records',
            filter: `user_id=eq.${config.userId}`
          },
          (payload: RealtimePostgresChangesPayload<MedicalRecord>) => {
            try {
              config.onMedicalRecordChange!(payload);
            } catch (error) {
              console.error('Error in medical record change callback:', error);
            }
          }
        );
      }

      // Set up channel status monitoring
      channel.on('system', {}, (payload) => {
        this.handleChannelSystemEvent(subscriptionId, payload);
      });

      // Subscribe to the channel
      const subscriptionResponse = channel.subscribe((status, error) => {
        this.handleSubscriptionStatus(subscriptionId, status, error);
      });

      // Create subscription record
      const subscription: ActiveSubscription = {
        id: subscriptionId,
        channel,
        userId: config.userId,
        config,
        retryCount: 0,
        isActive: true
      };

      this.subscriptions.set(subscriptionId, subscription);

      // Update connection status
      this.updateConnectionStatus(RealtimeConnectionStatus.CONNECTING);

      return subscriptionId;
    } catch (error) {
      throw new RealtimeServiceError(
        'Failed to create real-time subscription',
        'SUBSCRIPTION_ERROR',
        error as Error
      );
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      console.warn(`Subscription ${subscriptionId} not found`);
      return;
    }

    try {
      // Mark as inactive
      subscription.isActive = false;

      // Unsubscribe from channel
      await subscription.channel.unsubscribe();

      // Remove from tracking
      this.subscriptions.delete(subscriptionId);

      // Update connection status if no active subscriptions
      if (this.getActiveSubscriptions().length === 0) {
        this.updateConnectionStatus(RealtimeConnectionStatus.DISCONNECTED);
      }
    } catch (error) {
      console.error(`Error unsubscribing from ${subscriptionId}:`, error);
      throw new RealtimeServiceError(
        'Failed to unsubscribe from real-time updates',
        'UNSUBSCRIBE_ERROR',
        error as Error
      );
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  async unsubscribeAll(): Promise<void> {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    
    await Promise.all(
      subscriptionIds.map(id => this.unsubscribe(id).catch(error => {
        console.error(`Error unsubscribing from ${id}:`, error);
      }))
    );

    this.subscriptions.clear();
    this.updateConnectionStatus(RealtimeConnectionStatus.DISCONNECTED);
  }

  /**
   * Reconnect all subscriptions
   */
  async reconnect(): Promise<void> {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.updateConnectionStatus(RealtimeConnectionStatus.RECONNECTING);

    try {
      // Get all current subscription configs
      const subscriptionConfigs = Array.from(this.subscriptions.values())
        .map(sub => ({ id: sub.id, config: sub.config }));

      // Unsubscribe from all current subscriptions
      await this.unsubscribeAll();

      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recreate subscriptions
      for (const { config } of subscriptionConfigs) {
        try {
          await this.subscribe(config);
        } catch (error) {
          console.error('Error reconnecting subscription:', error);
        }
      }
    } catch (error) {
      console.error('Error during reconnection:', error);
      this.updateConnectionStatus(RealtimeConnectionStatus.ERROR);
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Initialize connection monitoring
   */
  private initializeConnectionMonitoring(): void {
    if (!this.isServiceAvailable()) {
      return;
    }

    // Monitor overall connection status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.connectionStatus === RealtimeConnectionStatus.DISCONNECTED) {
          this.scheduleReconnect();
        }
      });

      window.addEventListener('offline', () => {
        this.updateConnectionStatus(RealtimeConnectionStatus.DISCONNECTED);
      });
    }
  }

  /**
   * Handle channel system events
   */
  private handleChannelSystemEvent(subscriptionId: string, payload: any): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    switch (payload.type) {
      case 'system':
        if (payload.message === 'channel_error') {
          this.handleSubscriptionError(subscriptionId, payload.error);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Handle subscription status changes
   */
  private handleSubscriptionStatus(subscriptionId: string, status: string, error?: Error): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    switch (status) {
      case 'SUBSCRIBED':
        subscription.retryCount = 0;
        this.updateConnectionStatus(RealtimeConnectionStatus.CONNECTED);
        break;
      
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.handleSubscriptionError(subscriptionId, error);
        break;
      
      default:
        break;
    }
  }

  /**
   * Handle subscription errors with retry logic
   */
  private handleSubscriptionError(subscriptionId: string, error?: Error): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    console.error(`Subscription ${subscriptionId} error:`, error);

    const maxRetries = subscription.config.maxRetries || 3;
    const retryInterval = subscription.config.retryInterval || 5000;

    if (subscription.config.enableRetry !== false && subscription.retryCount < maxRetries) {
      subscription.retryCount++;
      
      this.updateConnectionStatus(RealtimeConnectionStatus.RECONNECTING);
      
      setTimeout(async () => {
        try {
          await this.retrySubscription(subscriptionId);
        } catch (retryError) {
          console.error(`Retry failed for subscription ${subscriptionId}:`, retryError);
          this.updateConnectionStatus(RealtimeConnectionStatus.ERROR);
        }
      }, retryInterval * subscription.retryCount);
    } else {
      this.updateConnectionStatus(RealtimeConnectionStatus.ERROR);
    }
  }

  /**
   * Retry a specific subscription
   */
  private async retrySubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Unsubscribe current channel
    try {
      await subscription.channel.unsubscribe();
    } catch (error) {
      console.warn('Error unsubscribing during retry:', error);
    }

    // Create new subscription with same config
    await this.subscribe(subscription.config);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnect();
    }, 2000);
  }

  /**
   * Update connection status and notify callbacks
   */
  private updateConnectionStatus(status: RealtimeConnectionStatus): void {
    if (this.connectionStatus === status) return;

    this.connectionStatus = status;

    // Notify all subscription callbacks
    this.subscriptions.forEach(subscription => {
      if (subscription.config.onConnectionStatusChange) {
        try {
          subscription.config.onConnectionStatusChange(status);
        } catch (error) {
          console.error('Error in connection status callback:', error);
        }
      }
    });

    // Notify global callbacks
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in global connection status callback:', error);
      }
    });
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(userId: string): string {
    return `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add global connection status callback
   */
  addConnectionStatusCallback(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusCallbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    await this.unsubscribeAll();
    this.connectionStatusCallbacks.clear();
  }
}

// Create and export the real-time service instance
export const realtimeService = new RealtimeService();

// Export the service class and types
export { RealtimeService };
export type { IRealtimeService, SubscriptionConfig, ActiveSubscription };