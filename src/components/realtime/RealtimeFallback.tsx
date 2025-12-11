import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeConnectionStatus } from '@/hooks/useRealtime';
import { RealtimeConnectionStatus } from '@/services/realtime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

/**
 * Fallback mechanism props
 */
export interface RealtimeFallbackProps {
  className?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
  showRefreshButton?: boolean;
  showLastSync?: boolean;
}

/**
 * Fallback mechanism component for when real-time is unavailable
 */
export function RealtimeFallback({
  className,
  enablePolling = true,
  pollingInterval = 30000, // 30 seconds
  showRefreshButton = true,
  showLastSync = true
}: RealtimeFallbackProps) {
  const { user } = useAuth();
  const { connectionStatus, isConnected, hasError } = useRealtimeConnectionStatus();
  const queryClient = useQueryClient();
  
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(enablePolling);

  /**
   * Manual refresh function
   */
  const handleRefresh = useCallback(async () => {
    if (!user?.id || isRefreshing) return;

    setIsRefreshing(true);
    
    try {
      // Invalidate all user-related queries to force refetch
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['userProfile', user.id] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['userProfileSummary', user.id] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['medicalRecords', user.id] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['medicalRecordStats', user.id] 
        }),
      ]);

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, isRefreshing, queryClient]);

  /**
   * Automatic polling when real-time is unavailable
   */
  useEffect(() => {
    if (!pollingEnabled || isConnected || !user?.id) {
      return;
    }

    const interval = setInterval(() => {
      handleRefresh();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingEnabled, isConnected, user?.id, pollingInterval, handleRefresh]);

  /**
   * Update last sync time when connection is restored
   */
  useEffect(() => {
    if (isConnected) {
      setLastSyncTime(new Date());
    }
  }, [isConnected]);

  /**
   * Don't render if real-time is working properly
   */
  if (isConnected) {
    return null;
  }

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case RealtimeConnectionStatus.CONNECTING:
      case RealtimeConnectionStatus.RECONNECTING:
        return {
          icon: RefreshCw,
          title: 'Connecting...',
          description: 'Establishing real-time connection',
          variant: 'default' as const,
          showActions: false
        };
      
      case RealtimeConnectionStatus.ERROR:
        return {
          icon: AlertTriangle,
          title: 'Connection Error',
          description: 'Real-time updates are unavailable. Data will be refreshed manually.',
          variant: 'destructive' as const,
          showActions: true
        };
      
      case RealtimeConnectionStatus.DISCONNECTED:
      default:
        return {
          icon: WifiOff,
          title: 'Offline Mode',
          description: 'Real-time updates are disabled. Using cached data.',
          variant: 'secondary' as const,
          showActions: true
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className={className}>
      <Alert variant={statusInfo.variant}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>{statusInfo.title}</strong>
              <p className="text-sm mt-1">{statusInfo.description}</p>
              {showLastSync && lastSyncTime && (
                <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last synced: {lastSyncTime.toLocaleTimeString()}
                </p>
              )}
            </div>
            
            {statusInfo.showActions && showRefreshButton && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="ml-4"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {statusInfo.showActions && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Offline Mode Settings</CardTitle>
            <CardDescription className="text-xs">
              Configure how data is updated when real-time connection is unavailable
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-polling"
                  checked={pollingEnabled}
                  onChange={(e) => setPollingEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="auto-polling" className="text-sm">
                  Auto-refresh every {pollingInterval / 1000} seconds
                </label>
              </div>
              
              {pollingEnabled && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Simple fallback indicator for navigation bars
 */
export function RealtimeFallbackIndicator() {
  const { connectionStatus, isConnected } = useRealtimeConnectionStatus();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleQuickRefresh = useCallback(async () => {
    if (!user?.id || isRefreshing) return;

    setIsRefreshing(true);
    
    try {
      await queryClient.invalidateQueries({ 
        queryKey: ['userProfile', user.id] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['medicalRecords', user.id] 
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, isRefreshing, queryClient]);

  if (isConnected) {
    return (
      <div className="flex items-center text-xs text-green-600">
        <Wifi className="h-3 w-3 mr-1" />
        Live
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickRefresh}
      disabled={isRefreshing}
      className="h-6 px-2 text-xs"
    >
      <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Syncing' : 'Offline'}
    </Button>
  );
}

/**
 * Connection quality indicator
 */
export function ConnectionQualityIndicator() {
  const { connectionStatus } = useRealtimeConnectionStatus();
  const [connectionHistory, setConnectionHistory] = useState<RealtimeConnectionStatus[]>([]);

  useEffect(() => {
    setConnectionHistory(prev => [...prev.slice(-9), connectionStatus]);
  }, [connectionStatus]);

  const getQualityScore = () => {
    if (connectionHistory.length === 0) return 0;
    
    const connectedCount = connectionHistory.filter(
      status => status === RealtimeConnectionStatus.CONNECTED
    ).length;
    
    return (connectedCount / connectionHistory.length) * 100;
  };

  const qualityScore = getQualityScore();
  
  const getQualityColor = () => {
    if (qualityScore >= 80) return 'text-green-600';
    if (qualityScore >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityText = () => {
    if (qualityScore >= 80) return 'Excellent';
    if (qualityScore >= 60) return 'Good';
    if (qualityScore >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className="flex space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-1 rounded-full ${
              i < qualityScore / 20 
                ? getQualityColor().replace('text-', 'bg-')
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className={getQualityColor()}>
        {getQualityText()}
      </span>
    </div>
  );
}