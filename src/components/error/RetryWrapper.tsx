import React, { useState, useCallback, useEffect } from 'react';
import { ErrorHandler, AppError } from '@/lib/error-handler';
import { ErrorDisplay } from './ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Retry wrapper props
 */
export interface RetryWrapperProps {
  children: React.ReactNode;
  onRetry: () => Promise<void> | void;
  maxRetries?: number;
  retryDelay?: number;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: AppError, retry: () => void) => React.ReactNode;
  showRetryButton?: boolean;
  autoRetry?: boolean;
  retryableErrors?: string[];
  className?: string;
}

/**
 * Retry wrapper state
 */
interface RetryState {
  isLoading: boolean;
  error: AppError | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Retry wrapper component that handles automatic and manual retries
 */
export function RetryWrapper({
  children,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  fallback,
  loadingComponent,
  errorComponent,
  showRetryButton = true,
  autoRetry = false,
  retryableErrors = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
  className
}: RetryWrapperProps) {
  const [state, setState] = useState<RetryState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    isRetrying: false
  });

  /**
   * Execute retry operation
   */
  const executeRetry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: true,
      error: null
    }));

    try {
      await onRetry();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: null,
        retryCount: prev.retryCount + 1
      }));
    } catch (error) {
      const appError = ErrorHandler.categorizeError(error);
      ErrorHandler.logError(appError);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: appError,
        retryCount: prev.retryCount + 1
      }));

      // Auto retry if enabled and error is retryable
      if (autoRetry && 
          appError.retryable && 
          retryableErrors.includes(appError.code) &&
          prev.retryCount + 1 < maxRetries) {
        setTimeout(() => {
          executeRetry();
        }, retryDelay * Math.pow(2, prev.retryCount)); // Exponential backoff
      }
    }
  }, [onRetry, state.retryCount, maxRetries, autoRetry, retryableErrors, retryDelay]);

  /**
   * Manual retry handler
   */
  const handleManualRetry = useCallback(() => {
    executeRetry();
  }, [executeRetry]);

  /**
   * Reset retry state
   */
  const resetRetry = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      isRetrying: false
    });
  }, []);

  // Auto retry on mount if enabled
  useEffect(() => {
    if (autoRetry && state.error && state.retryCount < maxRetries) {
      const shouldAutoRetry = state.error.retryable && 
                             retryableErrors.includes(state.error.code);
      
      if (shouldAutoRetry) {
        const delay = retryDelay * Math.pow(2, state.retryCount);
        const timeoutId = setTimeout(executeRetry, delay);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [state.error, state.retryCount, maxRetries, autoRetry, retryableErrors, retryDelay, executeRetry]);

  // Show loading state
  if (state.isLoading || state.isRetrying) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{state.isRetrying ? 'Retrying...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (state.error) {
    if (errorComponent) {
      return <>{errorComponent(state.error, handleManualRetry)}</>;
    }

    const canRetry = state.retryCount < maxRetries && 
                    state.error.retryable && 
                    retryableErrors.includes(state.error.code);

    return (
      <div className={className}>
        <ErrorDisplay
          error={state.error}
          onRetry={canRetry && showRetryButton ? handleManualRetry : undefined}
          showDetails={import.meta.env.DEV}
        />
        
        {!canRetry && state.retryCount >= maxRetries && (
          <div className="mt-2 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground mb-2">
              Maximum retry attempts reached. Please try again later or contact support.
            </p>
            <Button size="sm" variant="outline" onClick={resetRetry}>
              Reset
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show children on success
  return <>{children}</>;
}

/**
 * Hook for using retry functionality
 */
export function useRetry(
  operation: () => Promise<void> | void,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    autoRetry?: boolean;
    retryableErrors?: string[];
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    autoRetry = false,
    retryableErrors = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE']
  } = options;

  const [state, setState] = useState<RetryState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    isRetrying: false
  });

  const execute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      await operation();
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      const appError = ErrorHandler.categorizeError(error);
      ErrorHandler.logError(appError);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: appError
      }));
    }
  }, [operation]);

  const retry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: true,
      error: null,
      retryCount: prev.retryCount + 1
    }));

    try {
      await operation();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: null
      }));
    } catch (error) {
      const appError = ErrorHandler.categorizeError(error);
      ErrorHandler.logError(appError);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: appError
      }));
    }
  }, [operation, state.retryCount, maxRetries]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      isRetrying: false
    });
  }, []);

  const canRetry = state.error?.retryable && 
                  retryableErrors.includes(state.error.code) && 
                  state.retryCount < maxRetries;

  return {
    ...state,
    execute,
    retry,
    reset,
    canRetry
  };
}

/**
 * Higher-order component for adding retry functionality
 */
export function withRetry<P extends object>(
  Component: React.ComponentType<P>,
  retryProps?: Omit<RetryWrapperProps, 'children' | 'onRetry'>
) {
  return function WrappedComponent(props: P & { onRetry?: () => Promise<void> | void }) {
    const { onRetry, ...componentProps } = props;
    
    if (!onRetry) {
      return <Component {...(componentProps as P)} />;
    }

    return (
      <RetryWrapper onRetry={onRetry} {...retryProps}>
        <Component {...(componentProps as P)} />
      </RetryWrapper>
    );
  };
}