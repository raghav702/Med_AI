import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  realtimeService, 
  RealtimeConnectionStatus,
  type IRealtimeService 
} from '@/services/realtime';
import type { UserProfile, MedicalRecord } from '@/types/database';

/**
 * Real-time context interface
 */
export interface RealtimeContextType {
  // Connection state
  connectionStatus: RealtimeConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  
  // Service access
  service: IRealtimeService;
  
  // Connection management
  reconnect: () => Promise<void>;
  
  // Event handlers (can be overridden by consumers)
  onUserProfileChange?: (profile: UserProfile, eventType: string) => void;
  onMedicalRecordChange?: (record: MedicalRecord, eventType: string) => void;
  setUserProfileChangeHandler: (handler?: (profile: UserProfile, eventType: string) => void) => void;
  setMedicalRecordChangeHandler: (handler?: (record: MedicalRecord, eventType: string) => void) => void;
}

/**
 * Real-time context
 */
const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

/**
 * Real-time provider props
 */
export interface RealtimeProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  enableRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
}

/**
 * Real-time provider component
 */
export function RealtimeProvider({ 
  children,
  autoConnect = true,
  enableRetry = true,
  retryInterval = 5000,
  maxRetries = 3
}: RealtimeProviderProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>(
    RealtimeConnectionStatus.DISCONNECTED
  );
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  
  // Event handlers
  const [userProfileChangeHandler, setUserProfileChangeHandler] = useState<
    ((profile: UserProfile, eventType: string) => void) | undefined
  >();
  const [medicalRecordChangeHandler, setMedicalRecordChangeHandler] = useState<
    ((record: MedicalRecord, eventType: string) => void) | undefined
  >();

  /**
   * Handle connection status changes
   */
  const handleConnectionStatusChange = useCallback((status: RealtimeConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  /**
   * Handle user profile changes
   */
  const handleUserProfileChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const profile = newRecord || oldRecord;
    
    if (profile && userProfileChangeHandler) {
      userProfileChangeHandler(profile, eventType);
    }
  }, [userProfileChangeHandler]);

  /**
   * Handle medical record changes
   */
  const handleMedicalRecordChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const record = newRecord || oldRecord;
    
    if (record && medicalRecordChangeHandler) {
      medicalRecordChangeHandler(record, eventType);
    }
  }, [medicalRecordChangeHandler]);

  /**
   * Connect to real-time updates
   */
  const connect = useCallback(async () => {
    if (!user?.id || !realtimeService.isServiceAvailable() || subscriptionId) {
      return;
    }

    try {
      const newSubscriptionId = await realtimeService.subscribe({
        userId: user.id,
        enableRetry,
        retryInterval,
        maxRetries,
        onConnectionStatusChange: handleConnectionStatusChange,
        onUserProfileChange: handleUserProfileChange,
        onMedicalRecordChange: handleMedicalRecordChange,
      });

      setSubscriptionId(newSubscriptionId);
    } catch (error) {
      console.error('Failed to connect to real-time updates:', error);
      setConnectionStatus(RealtimeConnectionStatus.ERROR);
    }
  }, [
    user?.id,
    subscriptionId,
    enableRetry,
    retryInterval,
    maxRetries,
    handleConnectionStatusChange,
    handleUserProfileChange,
    handleMedicalRecordChange
  ]);

  /**
   * Disconnect from real-time updates
   */
  const disconnect = useCallback(async () => {
    if (!subscriptionId) {
      return;
    }

    try {
      await realtimeService.unsubscribe(subscriptionId);
      setSubscriptionId(null);
      setConnectionStatus(RealtimeConnectionStatus.DISCONNECTED);
    } catch (error) {
      console.error('Failed to disconnect from real-time updates:', error);
    }
  }, [subscriptionId]);

  /**
   * Reconnect to real-time updates
   */
  const reconnect = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  /**
   * Auto-connect when user is available
   */
  useEffect(() => {
    if (autoConnect && user?.id && realtimeService.isServiceAvailable()) {
      connect();
    }

    return () => {
      if (subscriptionId) {
        disconnect();
      }
    };
  }, [user?.id, autoConnect, connect, disconnect, subscriptionId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (subscriptionId) {
        realtimeService.unsubscribe(subscriptionId).catch(error => {
          console.error('Error cleaning up real-time subscription:', error);
        });
      }
    };
  }, [subscriptionId]);

  // Derived state
  const isConnected = connectionStatus === RealtimeConnectionStatus.CONNECTED;
  const isConnecting = connectionStatus === RealtimeConnectionStatus.CONNECTING || 
                      connectionStatus === RealtimeConnectionStatus.RECONNECTING;
  const hasError = connectionStatus === RealtimeConnectionStatus.ERROR;

  // Context value
  const value: RealtimeContextType = {
    // Connection state
    connectionStatus,
    isConnected,
    isConnecting,
    hasError,
    
    // Service access
    service: realtimeService,
    
    // Connection management
    reconnect,
    
    // Event handlers
    onUserProfileChange: userProfileChangeHandler,
    onMedicalRecordChange: medicalRecordChangeHandler,
    setUserProfileChangeHandler: (handler) => setUserProfileChangeHandler(() => handler),
    setMedicalRecordChangeHandler: (handler) => setMedicalRecordChangeHandler(() => handler),
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access real-time context
 */
export function useRealtimeContext(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  
  if (context === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  
  return context;
}

/**
 * Hook to check if real-time is connected
 */
export function useIsRealtimeConnected(): boolean {
  const { isConnected } = useRealtimeContext();
  return isConnected;
}

/**
 * Hook for real-time connection status only
 */
export function useRealtimeStatus() {
  const { connectionStatus, isConnected, isConnecting, hasError } = useRealtimeContext();
  
  return {
    connectionStatus,
    isConnected,
    isConnecting,
    hasError,
  };
}