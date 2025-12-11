import React from 'react';
import { useSession } from '@/hooks/useSession';
import { SessionManager } from '@/services/session-manager';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

/**
 * Props for SessionStatusIndicator component
 */
export interface SessionStatusIndicatorProps {
  /** Show detailed tooltip */
  showTooltip?: boolean;
  /** Show countdown timer */
  showCountdown?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Component that displays current session status
 */
export function SessionStatusIndicator({
  showTooltip = true,
  showCountdown = false,
  className,
}: SessionStatusIndicatorProps) {
  const { session, status, isAuthenticated, isExpired, expiresAt, timeUntilExpiry } = useSession();
  
  /**
   * Get status display info
   */
  const getStatusInfo = () => {
    switch (status) {
      case 'loading':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: 'Loading...',
          color: 'text-muted-foreground',
        };
      
      case 'authenticated':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: 'Active',
          color: 'text-green-600',
        };
      
      case 'expired':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: 'Expired',
          color: 'text-red-600',
        };
      
      case 'unauthenticated':
      default:
        return {
          variant: 'secondary' as const,
          icon: AlertCircle,
          text: 'Not signed in',
          color: 'text-muted-foreground',
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;
  
  /**
   * Get tooltip content
   */
  const getTooltipContent = () => {
    if (!session) {
      return 'No active session';
    }
    
    const rememberMe = SessionManager.isRememberMeEnabled();
    const timeRemaining = timeUntilExpiry ? SessionManager.formatTimeUntilExpiry(timeUntilExpiry) : null;
    
    return (
      <div className="space-y-1 text-sm">
        <div>Status: {statusInfo.text}</div>
        {expiresAt && (
          <div>Expires: {expiresAt.toLocaleString()}</div>
        )}
        {timeRemaining && (
          <div>Time remaining: {timeRemaining}</div>
        )}
        <div>Remember me: {rememberMe ? 'Enabled' : 'Disabled'}</div>
      </div>
    );
  };
  
  const badge = (
    <Badge variant={statusInfo.variant} className={`${className} flex items-center space-x-1`}>
      <Icon className="w-3 h-3" />
      <span>{statusInfo.text}</span>
      {showCountdown && timeUntilExpiry && isAuthenticated && (
        <span className="ml-1 font-mono text-xs">
          ({SessionManager.formatTimeUntilExpiry(timeUntilExpiry)})
        </span>
      )}
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact session status indicator for navigation bars
 */
export function CompactSessionStatus({ className }: { className?: string }) {
  const { status, timeUntilExpiry } = useSession();
  
  const getStatusColor = () => {
    switch (status) {
      case 'authenticated':
        return 'bg-green-500';
      case 'expired':
        return 'bg-red-500';
      case 'loading':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            {timeUntilExpiry && status === 'authenticated' && (
              <span className="text-xs font-mono text-muted-foreground">
                {SessionManager.formatTimeUntilExpiry(timeUntilExpiry)}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            Session status: {status}
            {timeUntilExpiry && status === 'authenticated' && (
              <div>Expires in: {SessionManager.formatTimeUntilExpiry(timeUntilExpiry)}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}