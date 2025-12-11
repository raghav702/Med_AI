import { AuthError } from '@supabase/supabase-js';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

/**
 * Standardized error interface
 */
export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  originalError?: Error;
}

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMIT_EXCEEDED',
    'CONNECTION_ERROR'
  ]
};

/**
 * Comprehensive error handler utility class
 */
export class ErrorHandler {
  private static retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;

  /**
   * Configure retry behavior
   */
  static configureRetry(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: AuthError | Error | any): AppError {
    const errorMessage = error?.message || 'Unknown authentication error';
    const errorCode = error?.status?.toString() || error?.code || 'AUTH_ERROR';

    // Map specific authentication errors to user-friendly messages
    const authErrorMap: Record<string, { message: string; severity: ErrorSeverity; retryable: boolean }> = {
      'Invalid login credentials': {
        message: 'Invalid email or password. Please check your credentials and try again.',
        severity: ErrorSeverity.LOW,
        retryable: false
      },
      'User already registered': {
        message: 'An account with this email already exists. Please sign in instead.',
        severity: ErrorSeverity.LOW,
        retryable: false
      },
      'Email not confirmed': {
        message: 'Please check your email and click the verification link before signing in.',
        severity: ErrorSeverity.MEDIUM,
        retryable: false
      },
      'Invalid email': {
        message: 'Please enter a valid email address.',
        severity: ErrorSeverity.LOW,
        retryable: false
      },
      'Weak password': {
        message: 'Password is too weak. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.',
        severity: ErrorSeverity.LOW,
        retryable: false
      },
      'Signup disabled': {
        message: 'Account registration is currently disabled. Please contact support.',
        severity: ErrorSeverity.HIGH,
        retryable: false
      },
      'Too many requests': {
        message: 'Too many requests. Please wait a moment before trying again.',
        severity: ErrorSeverity.MEDIUM,
        retryable: true
      },
      'Network error': {
        message: 'Network error. Please check your internet connection and try again.',
        severity: ErrorSeverity.MEDIUM,
        retryable: true
      },
      'SERVICE_UNAVAILABLE': {
        message: 'Authentication service is temporarily unavailable. Please try again later.',
        severity: ErrorSeverity.HIGH,
        retryable: true
      }
    };

    const errorInfo = authErrorMap[errorMessage] || authErrorMap[errorCode] || {
      message: 'An unexpected authentication error occurred. Please try again.',
      severity: ErrorSeverity.MEDIUM,
      retryable: false
    };

    return {
      code: errorMessage || errorCode, // Use the original error message as code for better identification
      message: errorMessage,
      userMessage: errorInfo.message,
      category: ErrorCategory.AUTHENTICATION,
      severity: errorInfo.severity,
      timestamp: new Date(),
      retryable: errorInfo.retryable,
      originalError: error
    };
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(error: any): AppError {
    const errorMessage = error?.message || 'Unknown database error';
    const errorCode = error?.code || 'DATABASE_ERROR';

    // Map specific database errors to user-friendly messages
    const dbErrorMap: Record<string, { message: string; severity: ErrorSeverity; retryable: boolean }> = {
      'PGRST116': {
        message: 'The requested record was not found.',
        severity: ErrorSeverity.LOW,
        retryable: false
      },
      '23505': {
        message: 'This record already exists. Please check your data.',
        severity: ErrorSeverity.LOW,
        retryable: false
      },
      '23503': {
        message: 'Cannot complete this operation due to missing related data.',
        severity: ErrorSeverity.MEDIUM,
        retryable: false
      },
      '42501': {
        message: 'You do not have permission to perform this operation.',
        severity: ErrorSeverity.HIGH,
        retryable: false
      },
      'PGRST301': {
        message: 'You do not have permission to access this data. Row-level security policies prevent this operation.',
        severity: ErrorSeverity.HIGH,
        retryable: false
      },
      '42P01': {
        message: 'The requested table or resource does not exist.',
        severity: ErrorSeverity.HIGH,
        retryable: false
      },
      'SERVICE_UNAVAILABLE': {
        message: 'Database service is temporarily unavailable. Please try again later.',
        severity: ErrorSeverity.HIGH,
        retryable: true
      },
      'CONNECTION_ERROR': {
        message: 'Unable to connect to the database. Please check your connection.',
        severity: ErrorSeverity.HIGH,
        retryable: true
      }
    };

    const errorInfo = dbErrorMap[errorCode] || {
      message: 'A database error occurred. Please try again or contact support if the problem persists.',
      severity: ErrorSeverity.MEDIUM,
      retryable: true
    };

    return {
      code: errorCode,
      message: errorMessage,
      userMessage: errorInfo.message,
      category: ErrorCategory.DATABASE,
      severity: errorInfo.severity,
      timestamp: new Date(),
      retryable: errorInfo.retryable,
      originalError: error
    };
  }

  /**
   * Handle Row-Level Security (RLS) violations
   */
  static handleRLSViolation(error: any, resource?: string): AppError {
    const errorMessage = error?.message || 'Access denied by security policy';
    const resourceInfo = resource ? ` for ${resource}` : '';
    
    // Check if this is an RLS violation
    const isRLSViolation = 
      error?.code === 'PGRST301' || 
      error?.code === '42501' ||
      errorMessage.toLowerCase().includes('row-level security') ||
      errorMessage.toLowerCase().includes('policy') ||
      errorMessage.toLowerCase().includes('permission denied');

    if (!isRLSViolation) {
      return this.handleDatabaseError(error);
    }

    return {
      code: 'RLS_VIOLATION',
      message: errorMessage,
      userMessage: `You do not have permission to access${resourceInfo}. This data belongs to another user or you don't have the required role.`,
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date(),
      retryable: false,
      details: { resource, isRLSViolation: true },
      originalError: error
    };
  }

  /**
   * Handle AI Assistant errors
   */
  static handleAIError(error: any): AppError {
    const errorMessage = error?.message || 'AI Assistant error occurred';
    let errorCode = 'AI_ERROR';
    let userMessage = 'The AI Assistant is experiencing difficulties. Please try again.';
    let severity = ErrorSeverity.MEDIUM;
    let retryable = true;

    // Check for specific AI error types
    if (errorMessage.toLowerCase().includes('timeout')) {
      errorCode = 'AI_TIMEOUT';
      userMessage = 'The AI Assistant took too long to respond. Please try again with a shorter message.';
      severity = ErrorSeverity.LOW;
    } else if (errorMessage.toLowerCase().includes('unavailable') || errorMessage.toLowerCase().includes('connection')) {
      errorCode = 'AI_UNAVAILABLE';
      userMessage = 'The AI Assistant is temporarily unavailable. Please try again in a moment.';
      severity = ErrorSeverity.HIGH;
    } else if (errorMessage.toLowerCase().includes('rate limit')) {
      errorCode = 'AI_RATE_LIMIT';
      userMessage = 'Too many requests to the AI Assistant. Please wait a moment before trying again.';
      severity = ErrorSeverity.MEDIUM;
    } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('parse')) {
      errorCode = 'AI_INVALID_RESPONSE';
      userMessage = 'The AI Assistant returned an invalid response. Please try rephrasing your question.';
      severity = ErrorSeverity.LOW;
      retryable = false;
    } else if (error?.status === 500 || error?.status === 503) {
      errorCode = 'AI_SERVER_ERROR';
      userMessage = 'The AI Assistant server is experiencing issues. Please try again later.';
      severity = ErrorSeverity.HIGH;
    }

    return {
      code: errorCode,
      message: errorMessage,
      userMessage,
      category: ErrorCategory.NETWORK,
      severity,
      timestamp: new Date(),
      retryable,
      originalError: error
    };
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: Error | any): AppError {
    const errorMessage = error?.message || 'Network error occurred';
    let errorCode = 'NETWORK_ERROR';
    let userMessage = 'Network error. Please check your internet connection and try again.';
    let severity = ErrorSeverity.MEDIUM;

    // Detect specific network error types
    if (errorMessage.includes('fetch')) {
      errorCode = 'FETCH_ERROR';
      userMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (errorMessage.includes('timeout')) {
      errorCode = 'TIMEOUT_ERROR';
      userMessage = 'The request timed out. Please try again.';
      severity = ErrorSeverity.LOW;
    } else if (errorMessage.includes('abort')) {
      errorCode = 'REQUEST_ABORTED';
      userMessage = 'The request was cancelled. Please try again.';
      severity = ErrorSeverity.LOW;
    }

    return {
      code: errorCode,
      message: errorMessage,
      userMessage,
      category: ErrorCategory.NETWORK,
      severity,
      timestamp: new Date(),
      retryable: true,
      originalError: error
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error: any, field?: string): AppError {
    const errorMessage = error?.message || 'Validation error occurred';
    const fieldInfo = field ? ` for ${field}` : '';
    
    return {
      code: 'VALIDATION_ERROR',
      message: errorMessage,
      userMessage: `Invalid input${fieldInfo}. Please check your data and try again.`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      timestamp: new Date(),
      retryable: false,
      details: { field },
      originalError: error
    };
  }

  /**
   * Handle permission errors
   */
  static handlePermissionError(error: any, resource?: string): AppError {
    const errorMessage = error?.message || 'Permission denied';
    const resourceInfo = resource ? ` to ${resource}` : '';
    
    return {
      code: 'PERMISSION_DENIED',
      message: errorMessage,
      userMessage: `You do not have permission to access${resourceInfo}. Please contact support if you believe this is an error.`,
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date(),
      retryable: false,
      details: { resource },
      originalError: error
    };
  }

  /**
   * Handle configuration errors
   */
  static handleConfigurationError(error: any): AppError {
    const errorMessage = error?.message || 'Configuration error occurred';
    
    return {
      code: 'CONFIGURATION_ERROR',
      message: errorMessage,
      userMessage: 'The application is not properly configured. Please contact support.',
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      timestamp: new Date(),
      retryable: false,
      originalError: error
    };
  }

  /**
   * Generic error handler that attempts to categorize unknown errors
   */
  static handleGenericError(error: any): AppError {
    const errorMessage = error?.message || 'An unexpected error occurred';
    const errorCode = error?.code || 'UNKNOWN_ERROR';

    // Try to categorize based on error message patterns
    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('fetch') || 
        errorMessage.toLowerCase().includes('connection')) {
      return this.handleNetworkError(error);
    }
    
    if (errorMessage.toLowerCase().includes('permission') || 
        errorMessage.toLowerCase().includes('unauthorized') || 
        errorMessage.toLowerCase().includes('forbidden')) {
      return this.handlePermissionError(error);
    }
    
    if (errorMessage.toLowerCase().includes('validation') || 
        errorMessage.toLowerCase().includes('invalid')) {
      return this.handleValidationError(error);
    }
    
    if (errorMessage.toLowerCase().includes('config') || 
        errorMessage.toLowerCase().includes('environment')) {
      return this.handleConfigurationError(error);
    }

    return {
      code: errorCode,
      message: errorMessage,
      userMessage: errorMessage.toLowerCase().includes('network') ? 
        `Network error: ${errorMessage}` : 
        'An unexpected error occurred. Please try again or contact support if the problem persists.',
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
      retryable: false,
      originalError: error
    };
  }

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config };
    let lastError: any;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const appError = this.categorizeError(error);
        
        // If this is the last attempt or error is not retryable, throw
        if (attempt === retryConfig.maxAttempts || !this.shouldRetry(appError)) {
          throw appError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );
        
        console.warn(`Operation failed (attempt ${attempt}/${retryConfig.maxAttempts}). Retrying in ${delay}ms...`, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw this.categorizeError(lastError);
  }

  /**
   * Categorize an error based on its type and content
   */
  static categorizeError(error: any): AppError {
    // Handle specific error types
    if (error?.name === 'AuthError' || error?.message?.includes('auth')) {
      return this.handleAuthError(error);
    }
    
    if (error?.code && (error.code.startsWith('PG') || error.code.startsWith('23'))) {
      return this.handleDatabaseError(error);
    }
    
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return this.handleNetworkError(error);
    }
    
    // Handle custom error types
    if (error?.category) {
      return error as AppError;
    }
    
    return this.handleGenericError(error);
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: AppError): void {
    const logData = {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      timestamp: error.timestamp,
      retryable: error.retryable,
      details: error.details
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL ERROR:', logData, error.originalError);
        break;
      case ErrorSeverity.HIGH:
        console.error('HIGH SEVERITY ERROR:', logData, error.originalError);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM SEVERITY ERROR:', logData, error.originalError);
        break;
      case ErrorSeverity.LOW:
        console.info('LOW SEVERITY ERROR:', logData);
        break;
      default:
        console.log('ERROR:', logData);
    }
  }

  /**
   * Check if an error should trigger a retry
   */
  static shouldRetry(error: AppError): boolean {
    return error.retryable && this.retryConfig.retryableErrors.includes(error.code);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    if (error?.userMessage) {
      return error.userMessage;
    }
    
    const appError = this.categorizeError(error);
    return appError.userMessage;
  }

  /**
   * Create a timeout wrapper for promises
   */
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }
}

/**
 * Utility function to safely execute async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const appError = ErrorHandler.categorizeError(error);
    ErrorHandler.logError(appError);
    return { data: fallback || null, error: appError };
  }
}

/**
 * Utility function to safely execute sync operations with error handling
 */
export function safeSync<T>(
  operation: () => T,
  fallback?: T
): { data: T | null; error: AppError | null } {
  try {
    const data = operation();
    return { data, error: null };
  } catch (error) {
    const appError = ErrorHandler.categorizeError(error);
    ErrorHandler.logError(appError);
    return { data: fallback || null, error: appError };
  }
}