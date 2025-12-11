import React from 'react';
import { AppError, ErrorSeverity, ErrorCategory } from '@/lib/error-handler';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Wifi, 
  Shield, 
  Database, 
  Settings,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Error display props
 */
export interface ErrorDisplayProps {
  error: AppError | Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
  variant?: 'inline' | 'toast' | 'banner';
  retryLabel?: string;
  dismissLabel?: string;
}

/**
 * Get icon for error category
 */
function getErrorIcon(category: ErrorCategory, severity: ErrorSeverity) {
  switch (category) {
    case ErrorCategory.NETWORK:
      return <Wifi className="h-4 w-4" />;
    case ErrorCategory.AUTHENTICATION:
      return <Shield className="h-4 w-4" />;
    case ErrorCategory.DATABASE:
      return <Database className="h-4 w-4" />;
    case ErrorCategory.CONFIGURATION:
      return <Settings className="h-4 w-4" />;
    default:
      switch (severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          return <AlertTriangle className="h-4 w-4" />;
        case ErrorSeverity.MEDIUM:
          return <AlertCircle className="h-4 w-4" />;
        case ErrorSeverity.LOW:
          return <Info className="h-4 w-4" />;
        default:
          return <AlertCircle className="h-4 w-4" />;
      }
  }
}

/**
 * Get alert variant based on error severity
 */
function getAlertVariant(severity: ErrorSeverity): 'default' | 'destructive' {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'destructive';
    default:
      return 'default';
  }
}

/**
 * Normalize error to AppError format
 */
function normalizeError(error: AppError | Error | string): AppError {
  if (typeof error === 'string') {
    return {
      code: 'GENERIC_ERROR',
      message: error,
      userMessage: error,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
      retryable: false
    };
  }

  if (error instanceof Error && !('category' in error)) {
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      userMessage: error.message,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
      retryable: false,
      originalError: error
    };
  }

  return error as AppError;
}

/**
 * Error display component for showing user-friendly error messages
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className,
  variant = 'inline',
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss'
}: ErrorDisplayProps) {
  if (!error) return null;

  const appError = normalizeError(error);
  const icon = getErrorIcon(appError.category, appError.severity);
  const alertVariant = getAlertVariant(appError.severity);

  const baseClasses = cn(
    'relative',
    {
      'mb-4': variant === 'inline',
      'fixed top-4 right-4 z-50 max-w-md': variant === 'toast',
      'w-full border-l-4 rounded-none': variant === 'banner'
    },
    className
  );

  return (
    <Alert variant={alertVariant} className={baseClasses}>
      {icon}
      <div className="flex-1">
        <AlertDescription className="mb-2">
          {appError.userMessage}
        </AlertDescription>

        {showDetails && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
            <div><strong>Code:</strong> {appError.code}</div>
            <div><strong>Category:</strong> {appError.category}</div>
            <div><strong>Severity:</strong> {appError.severity}</div>
            <div><strong>Time:</strong> {appError.timestamp.toLocaleString()}</div>
            {appError.details && (
              <div><strong>Details:</strong> {JSON.stringify(appError.details, null, 2)}</div>
            )}
          </div>
        )}

        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-3">
            {onRetry && appError.retryable && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {retryLabel}
              </Button>
            )}
            
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-8"
              >
                <X className="w-3 h-3 mr-1" />
                {dismissLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {variant === 'toast' && onDismiss && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </Alert>
  );
}

/**
 * Inline error display for forms and components
 */
export function InlineError({ error, onRetry, className }: {
  error: AppError | Error | string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      variant="inline"
      className={className}
    />
  );
}

/**
 * Toast error display for notifications
 */
export function ToastError({ error, onDismiss, className }: {
  error: AppError | Error | string | null;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <ErrorDisplay
      error={error}
      onDismiss={onDismiss}
      variant="toast"
      className={className}
    />
  );
}

/**
 * Banner error display for page-level errors
 */
export function BannerError({ error, onRetry, onDismiss, className }: {
  error: AppError | Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      variant="banner"
      className={className}
    />
  );
}

/**
 * Hook for managing error display state
 */
export function useErrorDisplay() {
  const [error, setError] = React.useState<AppError | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  const showError = React.useCallback((error: AppError | Error | string) => {
    const appError = normalizeError(error);
    setError(appError);
    setIsVisible(true);
  }, []);

  const hideError = React.useCallback(() => {
    setIsVisible(false);
    // Clear error after animation
    setTimeout(() => setError(null), 300);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setIsVisible(false);
  }, []);

  return {
    error: isVisible ? error : null,
    showError,
    hideError,
    clearError,
    isVisible
  };
}