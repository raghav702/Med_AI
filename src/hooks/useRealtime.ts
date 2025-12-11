import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  realtimeService, 
  RealtimeConnectionStatus, 
  type SubscriptionConfig,
  type UserProfileChangeCallback,
  type MedicalRecordChangeCallback,
  type ConnectionStatusCallback
} from '@/services/realtime';
import type { UserProfile, MedicalRecord } from '@/types/database';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Real-time hook configuration
 */
export interface UseRealtimeConfig {
  enableUserProfile?: boolean;
  enableMedicalRecords?: boolean;
  enableRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  onUserProfileChange?: (profile: UserProfile, eventType: string) => void;
  onMedicalRecordChange?: (record: MedicalRecord, eventType: string) => void;
  onConnectionStatusChange?: (status: RealtimeConnectionStatus) => void;
}

/**
 * Real-time hook return type
 */
export interface UseRealtimeReturn {
  connectionStatus: RealtimeConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  reconnect: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Hook for managing real-time subscriptions
 */
export function useRealtime(config: UseRealtimeConfig = {}): UseRealtimeReturn {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>(
    RealtimeConnectionStatus.DISCONNECTED
  );
  
  const subscriptionIdRef = useRef<string | null>(null);
  const configRef = useRef(config);
  const isSubscribedRef = useRef(false);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  /**
   * Handle user profile changes
   */
  const handleUserProfileChange: UserProfileChangeCallback = useCallback(
    (payload: RealtimePostgresChangesPayload<UserProfile>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const profile = newRecord || oldRecord;
      
      if (profile && configRef.current.onUserProfileChange) {
        configRef.current.onUserProfileChange(profile, eventType);
      }
    },
    []
  );

  /**
   * Handle medical record changes
   */
  const handleMedicalRecordChange: MedicalRecordChangeCallback = useCallback(
    (payload: RealtimePostgresChangesPayload<MedicalRecord>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const record = newRecord || oldRecord;
      
      if (record && configRef.current.onMedicalRecordChange) {
        configRef.current.onMedicalRecordChange(record, eventType);
      }
    },
    []
  );

  /**
   * Handle connection status changes
   */
  const handleConnectionStatusChange: ConnectionStatusCallback = useCallback(
    (status: RealtimeConnectionStatus) => {
      setConnectionStatus(status);
      
      if (configRef.current.onConnectionStatusChange) {
        configRef.current.onConnectionStatusChange(status);
      }
    },
    []
  );

  /**
   * Subscribe to real-time updates
   */
  const subscribe = useCallback(async () => {
    if (!user?.id || !realtimeService.isServiceAvailable() || isSubscribedRef.current) {
      return;
    }

    try {
      const subscriptionConfig: SubscriptionConfig = {
        userId: user.id,
        enableRetry: configRef.current.enableRetry,
        retryInterval: configRef.current.retryInterval,
        maxRetries: configRef.current.maxRetries,
        onConnectionStatusChange: handleConnectionStatusChange,
      };

      // Add callbacks based on configuration
      if (configRef.current.enableUserProfile !== false) {
        subscriptionConfig.onUserProfileChange = handleUserProfileChange;
      }

      if (configRef.current.enableMedicalRecords !== false) {
        subscriptionConfig.onMedicalRecordChange = handleMedicalRecordChange;
      }

      const subscriptionId = await realtimeService.subscribe(subscriptionConfig);
      subscriptionIdRef.current = subscriptionId;
      isSubscribedRef.current = true;
    } catch (error) {
      console.error('Failed to subscribe to real-time updates:', error);
      setConnectionStatus(RealtimeConnectionStatus.ERROR);
    }
  }, [user?.id, handleUserProfileChange, handleMedicalRecordChange, handleConnectionStatusChange]);

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribe = useCallback(async () => {
    if (!subscriptionIdRef.current || !isSubscribedRef.current) {
      return;
    }

    try {
      await realtimeService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      isSubscribedRef.current = false;
      setConnectionStatus(RealtimeConnectionStatus.DISCONNECTED);
    } catch (error) {
      console.error('Failed to unsubscribe from real-time updates:', error);
    }
  }, []);

  /**
   * Reconnect to real-time updates
   */
  const reconnect = useCallback(async () => {
    await unsubscribe();
    await subscribe();
  }, [unsubscribe, subscribe]);

  /**
   * Auto-subscribe when user is available
   */
  useEffect(() => {
    if (user?.id && realtimeService.isServiceAvailable()) {
      subscribe();
    }

    return () => {
      if (isSubscribedRef.current) {
        unsubscribe();
      }
    };
  }, [user?.id, subscribe, unsubscribe]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current).catch(error => {
          console.error('Error cleaning up real-time subscription:', error);
        });
      }
    };
  }, []);

  // Derived state
  const isConnected = connectionStatus === RealtimeConnectionStatus.CONNECTED;
  const isConnecting = connectionStatus === RealtimeConnectionStatus.CONNECTING || 
                      connectionStatus === RealtimeConnectionStatus.RECONNECTING;
  const hasError = connectionStatus === RealtimeConnectionStatus.ERROR;

  return {
    connectionStatus,
    isConnected,
    isConnecting,
    hasError,
    reconnect,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook for real-time user profile updates
 */
export function useRealtimeUserProfile(
  onProfileChange?: (profile: UserProfile, eventType: string) => void
): UseRealtimeReturn {
  return useRealtime({
    enableUserProfile: true,
    enableMedicalRecords: false,
    onUserProfileChange: onProfileChange,
  });
}

/**
 * Hook for real-time medical records updates
 */
export function useRealtimeMedicalRecords(
  onRecordChange?: (record: MedicalRecord, eventType: string) => void
): UseRealtimeReturn {
  return useRealtime({
    enableUserProfile: false,
    enableMedicalRecords: true,
    onMedicalRecordChange: onRecordChange,
  });
}

/**
 * Hook for connection status monitoring only
 */
export function useRealtimeConnectionStatus(): {
  connectionStatus: RealtimeConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
} {
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>(
    realtimeService.getConnectionStatus()
  );

  useEffect(() => {
    const cleanup = realtimeService.addConnectionStatusCallback(setConnectionStatus);
    return cleanup;
  }, []);

  const isConnected = connectionStatus === RealtimeConnectionStatus.CONNECTED;
  const isConnecting = connectionStatus === RealtimeConnectionStatus.CONNECTING || 
                      connectionStatus === RealtimeConnectionStatus.RECONNECTING;
  const hasError = connectionStatus === RealtimeConnectionStatus.ERROR;

  return {
    connectionStatus,
    isConnected,
    isConnecting,
    hasError,
  };
}