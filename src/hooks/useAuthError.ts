import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthServiceError } from '@/services/auth';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Processed error interface
 */
export interface ProcessedError {
  message: string;
  code: string;
  severity: ErrorSeverity;
  actionable: boolean;
  suggestedAction?: string;
}

/**
 * Hook for handling authentication errors
 */
export function useAuthError() {
  const { error, clearError } = useAuth();

  /**
   * Process authentication error into user-friendly format
   */
  const processError = useCallback((error: unknown): ProcessedError => {
    if (error instanceof AuthServiceError) {
      return processAuthServiceError(error);
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        severity: 'error',
        actionable: false,
      };
    }

    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      severity: 'error',
      actionable: false,
    };
  }, []);

  /**
   * Get current processed error
   */
  const currentError = error ? processError(new Error(error)) : null;

  /**
   * Check if error is recoverable
   */
  const isRecoverable = useCallback((error: ProcessedError): boolean => {
    const recoverableCodes = [
      'INVALID_CREDENTIALS',
      'WEAK_PASSWORD',
      'INVALID_EMAIL',
      'NETWORK_ERROR',
      'RATE_LIMIT_EXCEEDED',
    ];
    return recoverableCodes.includes(error.code);
  }, []);

  /**
   * Get retry delay for rate limited errors
   */
  const getRetryDelay = useCallback((error: ProcessedError): number => {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return 60000; // 1 minute
    }
    if (error.code === 'NETWORK_ERROR') {
      return 5000; // 5 seconds
    }
    return 0;
  }, []);

  return {
    error: currentError,
    clearError,
    processError,
    isRecoverable,
    getRetryDelay,
    hasError: !!currentError,
  };
}

/**
 * Process AuthServiceError into user-friendly format
 */
function processAuthServiceError(error: AuthServiceError): ProcessedError {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return {
        message: error.message,
        code: error.code,
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Please check your email and password, or try resetting your password.',
      };

    case 'USER_ALREADY_EXISTS':
      return {
        message: error.message,
        code: error.code,
        severity: 'info',
        actionable: true,
        suggestedAction: 'Try signing in instead, or use a different email address.',
      };

    case 'EMAIL_NOT_CONFIRMED':
      return {
        message: error.message,
        code: error.code,
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Check your email for a verification link, or request a new one.',
      };

    case 'WEAK_PASSWORD':
      return {
        message: error.message,
        code: error.code,
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Choose a password with at least 8 characters, including uppercase, lowercase, and numbers.',
      };

    case 'INVALID_EMAIL':
      return {
        message: error.message,
        code: error.code,
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Please enter a valid email address.',
      };

    case 'RATE_LIMIT_EXCEEDED':
      return {
        message: error.message,
        code: error.code,
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Please wait a moment before trying again.',
      };

    case 'NETWORK_ERROR':
      return {
        message: error.message,
        code: error.code,
        severity: 'error',
        actionable: true,
        suggestedAction: 'Check your internet connection and try again.',
      };

    case 'SERVICE_UNAVAILABLE':
      return {
        message: error.message,
        code: error.code,
        severity: 'critical',
        actionable: false,
        suggestedAction: 'The service is temporarily unavailable. Please try again later.',
      };

    case 'SIGNUP_DISABLED':
      return {
        message: error.message,
        code: error.code,
        severity: 'error',
        actionable: false,
        suggestedAction: 'Account registration is currently disabled. Please contact support.',
      };

    default:
      return {
        message: error.message,
        code: error.code,
        severity: 'error',
        actionable: false,
      };
  }
}

/**
 * Hook for displaying error messages with auto-dismiss
 */
export function useAuthErrorDisplay(autoDismissDelay: number = 5000) {
  const { error, clearError } = useAuthError();

  /**
   * Auto-dismiss error after delay
   */
  const autoDismiss = useCallback(() => {
    if (error && autoDismissDelay > 0) {
      const timeoutId = setTimeout(() => {
        clearError();
      }, autoDismissDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [error, clearError, autoDismissDelay]);

  return {
    error,
    clearError,
    autoDismiss,
    shouldAutoDismiss: error?.severity === 'info' || error?.severity === 'warning',
  };
}