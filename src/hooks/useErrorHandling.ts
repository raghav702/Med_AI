import { useState, useCallback, useRef } from 'react';
import { ErrorHandler, AppError, safeAsync } from '@/lib/error-handler';

/**
 * Error handling hook options
 */
export interface UseErrorHandlingOptions {
  onError?: (error: AppError) => void;
  showToast?: boolean;
  logErrors?: boolean;
  retryable?: boolean;
  maxRetries?: number;
}

/**
 * Error handling hook return type
 */
export interface UseErrorHandlingReturn {
  error: AppError | null;
  isLoading: boolean;
  retryCount: number;
  
  // Error management
  setError: (error: AppError | Error | string | null) => void;
  clearError: () => void;
  handleError: (error: any) => void;
  
  // Async operation wrapper
  executeAsync: <T>(operation: () => Promise<T>) => Promise<T | null>;
  
  // Retry functionality
  retry: (operation: () => Promise<void> | void) => Promise<void>;
  canRetry: boolean;
  
  // Safe execution
  safeExecute: <T>(operation: () => T, fallback?: T) => T | null;
}

/**
 * Comprehensive error handling hook
 */
export function useErrorHandling(options: UseErrorHandlingOptions = {}): UseErrorHandlingReturn {
  const {
    onError,
    showToast = false,
    logErrors = true,
    retryable = true,
    maxRetries = 3
  } = options;

  const [error, setErrorState] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastOperationRef = useRef<(() => Promise<void> | void) | null>(null);

  /**
   * Set error with proper handling
   */
  const setError = useCallback((error: AppError | Error | string | null) => {
    if (!error) {
      setErrorState(null);
      return;
    }

    const appError = typeof error === 'string' 
      ? ErrorHandler.handleGenericError(new Error(error))
      : ErrorHandler.categorizeError(error);

    if (logErrors) {
      ErrorHandler.logError(appError);
    }

    setErrorState(appError);

    if (onError) {
      onError(appError);
    }

    // Show toast notification if enabled
    if (showToast && typeof window !== 'undefined') {
      // This would integrate with your toast system
      console.warn('Toast notification:', appError.userMessage);
    }
  }, [onError, logErrors, showToast]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setErrorState(null);
    setRetryCount(0);
  }, []);

  /**
   * Handle error (alias for setError)
   */
  const handleError = useCallback((error: any) => {
    setError(error);
  }, [setError]);

  /**
   * Execute async operation with error handling
   */
  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    clearError();

    try {
      const result = await operation();
      return result;
    } catch (error) {
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setError, clearError]);

  /**
   * Retry the last operation
   */
  const retry = useCallback(async (operation?: () => Promise<void> | void) => {
    if (retryCount >= maxRetries) {
      return;
    }

    const operationToRetry = operation || lastOperationRef.current;
    if (!operationToRetry) {
      return;
    }

    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    clearError();

    try {
      await operationToRetry();
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, maxRetries, clearError, setError]);

  /**
   * Check if retry is possible
   */
  const canRetry = retryable && 
                  retryCount < maxRetries && 
                  error?.retryable === true;

  /**
   * Safe execution wrapper for sync operations
   */
  const safeExecute = useCallback(<T>(
    operation: () => T,
    fallback?: T
  ): T | null => {
    try {
      return operation();
    } catch (error) {
      setError(error);
      return fallback || null;
    }
  }, [setError]);

  return {
    error,
    isLoading,
    retryCount,
    setError,
    clearError,
    handleError,
    executeAsync,
    retry,
    canRetry,
    safeExecute
  };
}

/**
 * Hook for handling async operations with automatic retry
 */
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  dependencies: any[] = [],
  options: UseErrorHandlingOptions & {
    immediate?: boolean;
    retryDelay?: number;
  } = {}
) {
  const { immediate = false, retryDelay = 1000, ...errorOptions } = options;
  const errorHandling = useErrorHandling(errorOptions);
  const [data, setData] = useState<T | null>(null);
  const operationRef = useRef(operation);

  // Update operation ref when dependencies change
  operationRef.current = operation;

  /**
   * Execute the operation
   */
  const execute = useCallback(async (): Promise<T | null> => {
    const result = await errorHandling.executeAsync(operationRef.current);
    if (result !== null) {
      setData(result);
    }
    return result;
  }, [errorHandling]);

  /**
   * Retry with delay
   */
  const retryWithDelay = useCallback(async () => {
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    return execute();
  }, [execute, retryDelay]);

  // Execute immediately if requested
  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return {
    data,
    execute,
    retry: retryWithDelay,
    ...errorHandling
  };
}

/**
 * Hook for form error handling
 */
export function useFormErrorHandling() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorHandling = useErrorHandling();

  /**
   * Set field-specific error
   */
  const setFieldError = useCallback((field: string, error: string | null) => {
    setFieldErrors(prev => {
      if (!error) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: error };
    });
  }, []);

  /**
   * Clear field error
   */
  const clearFieldError = useCallback((field: string) => {
    setFieldError(field, null);
  }, [setFieldError]);

  /**
   * Clear all field errors
   */
  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * Validate form and handle errors
   */
  const validateForm = useCallback(async (
    validator: () => Promise<void> | void
  ): Promise<boolean> => {
    try {
      clearAllFieldErrors();
      errorHandling.clearError();
      await validator();
      return true;
    } catch (error) {
      errorHandling.handleError(error);
      return false;
    }
  }, [clearAllFieldErrors, errorHandling]);

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    validateForm,
    ...errorHandling
  };
}

// Re-export for convenience
export { safeAsync } from '@/lib/error-handler';