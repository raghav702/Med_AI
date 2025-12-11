import React from 'react';
import { cn } from '@/lib/utils';
import { useRealtimeConnectionStatus } from '@/hooks/useRealtime';
import { RealtimeConnectionStatus } from '@/services/realtime';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';

/**
 * Connection status indicator props
 */
export interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed';
}

/**
 * Connection status indicator component
 */
export function ConnectionStatus({ 
  className,
  showText = true,
  size = 'md',
  variant = 'minimal'
}: ConnectionStatusProps) {
  const { connectionStatus, isConnected, isConnecting, hasError } = useRealtimeConnectionStatus();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case RealtimeConnectionStatus.CONNECTED:
        return {
          icon: CheckCircle,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Real-time updates are active'
        };
      
      case RealtimeConnectionStatus.CONNECTING:
        return {
          icon: Loader2,
          text: 'Connecting',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Establishing real-time connection'
        };
      
      case RealtimeConnectionStatus.RECONNECTING:
        return {
          icon: Loader2,
          text: 'Reconnecting',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          description: 'Attempting to restore connection'
        };
      
      case RealtimeConnectionStatus.ERROR:
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Real-time updates unavailable'
        };
      
      case RealtimeConnectionStatus.DISCONNECTED:
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          description: 'Real-time updates disabled'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'h-3 w-3',
          text: 'text-xs',
          container: 'px-2 py-1 gap-1'
        };
      case 'lg':
        return {
          icon: 'h-5 w-5',
          text: 'text-sm',
          container: 'px-3 py-2 gap-2'
        };
      case 'md':
      default:
        return {
          icon: 'h-4 w-4',
          text: 'text-sm',
          container: 'px-2.5 py-1.5 gap-1.5'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeClasses = getSizeClasses();
  const Icon = statusConfig.icon;

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full',
          sizeClasses.container,
          statusConfig.bgColor,
          className
        )}
        title={statusConfig.description}
      >
        <Icon 
          className={cn(
            sizeClasses.icon,
            statusConfig.color,
            isConnecting && 'animate-spin'
          )}
        />
        {showText && (
          <span className={cn(sizeClasses.text, statusConfig.color)}>
            {statusConfig.text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border p-3 space-x-3',
        statusConfig.bgColor,
        'border-current border-opacity-20',
        className
      )}
    >
      <Icon 
        className={cn(
          'h-5 w-5',
          statusConfig.color,
          isConnecting && 'animate-spin'
        )}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', statusConfig.color)}>
          {statusConfig.text}
        </p>
        <p className={cn('text-sm opacity-75', statusConfig.color)}>
          {statusConfig.description}
        </p>
      </div>
    </div>
  );
}

/**
 * Simple connection status dot
 */
export function ConnectionStatusDot({ className }: { className?: string }) {
  const { isConnected, isConnecting, hasError } = useRealtimeConnectionStatus();

  const getStatusColor = () => {
    if (hasError) return 'bg-red-500';
    if (isConnecting) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  };

  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full',
        getStatusColor(),
        isConnecting && 'animate-pulse',
        className
      )}
      title={
        hasError ? 'Connection error' :
        isConnecting ? 'Connecting...' :
        isConnected ? 'Connected' :
        'Disconnected'
      }
    />
  );
}

/**
 * Connection status banner for critical states
 */
export function ConnectionStatusBanner() {
  const { connectionStatus, hasError } = useRealtimeConnectionStatus();

  // Only show banner for error states
  if (!hasError) {
    return null;
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            <strong>Connection Issue:</strong> Real-time updates are currently unavailable. 
            Your data will sync when the connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
}