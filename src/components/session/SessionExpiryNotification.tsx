import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionExpiry } from '@/hooks/useSession';
import { SessionManager } from '@/services/session-manager';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

/**
 * Props for SessionExpiryNotification component
 */
export interface SessionExpiryNotificationProps {
  /** Warning threshold in milliseconds (default: 10 minutes) */
  warningThreshold?: number;
  /** Show countdown timer */
  showCountdown?: boolean;
  /** Auto-refresh when close to expiry */
  autoRefresh?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Component that displays session expiry warnings and handles session refresh
 */
export function SessionExpiryNotification({
  warningThreshold = 10 * 60 * 1000, // 10 minutes
  showCountdown = true,
  autoRefresh = true,
  className,
}: SessionExpiryNotificationProps) {
  const { refreshSession, signOut, loading } = useAuth();
  const { showWarning, timeUntilExpiry, minutesUntilExpiry } = useSessionExpiry(warningThreshold);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  
  /**
   * Update countdown display
   */
  useEffect(() => {
    if (!showCountdown || !timeUntilExpiry) {
      setCountdown('');
      return;
    }
    
    const updateCountdown = () => {
      const formatted = SessionManager.formatTimeUntilExpiry(timeUntilExpiry);
      setCountdown(formatted);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [timeUntilExpiry, showCountdown]);
  
  /**
   * Auto-refresh session when very close to expiry
   */
  useEffect(() => {
    if (!autoRefresh || !timeUntilExpiry || isRefreshing) return;
    
    // Auto-refresh when 2 minutes remaining
    const autoRefreshThreshold = 2 * 60 * 1000;
    
    if (timeUntilExpiry <= autoRefreshThreshold && timeUntilExpiry > 0) {
      handleRefreshSession();
    }
  }, [timeUntilExpiry, autoRefresh, isRefreshing]);
  
  /**
   * Handle manual session refresh
   */
  const handleRefreshSession = async () => {
    try {
      setIsRefreshing(true);
      await refreshSession();
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // If refresh fails, the user will need to sign in again
    } finally {
      setIsRefreshing(false);
    }
  };
  
  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await SessionManager.performLogoutCleanup();
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      await signOut();
    }
  };
  
  // Don't show if no warning needed
  if (!showWarning) {
    return null;
  }
  
  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-amber-800">
            Your session will expire in {minutesUntilExpiry} minute{minutesUntilExpiry !== 1 ? 's' : ''}
            {showCountdown && countdown && (
              <span className="ml-1 font-mono text-sm">({countdown})</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSession}
            disabled={loading || isRefreshing}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Extend Session
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loading}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook for managing session expiry notifications
 */
export function useSessionExpiryNotification(warningThreshold?: number) {
  const { showWarning, timeUntilExpiry, minutesUntilExpiry } = useSessionExpiry(warningThreshold);
  
  return {
    showWarning,
    timeUntilExpiry,
    minutesUntilExpiry,
    shouldShowNotification: showWarning,
  };
}