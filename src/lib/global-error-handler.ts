import { ErrorHandler, AppError, ErrorSeverity } from './error-handler';

/**
 * Global error handler configuration
 */
export interface GlobalErrorHandlerConfig {
  enableConsoleLogging?: boolean;
  enableErrorReporting?: boolean;
  enableUserNotification?: boolean;
  reportingEndpoint?: string;
  maxErrorsPerSession?: number;
  ignoredErrors?: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: GlobalErrorHandlerConfig = {
  enableConsoleLogging: true,
  enableErrorReporting: import.meta.env.PROD,
  enableUserNotification: true,
  maxErrorsPerSession: 50,
  ignoredErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Script error.',
    'Network request failed'
  ]
};

/**
 * Global error handler class
 */
class GlobalErrorHandler {
  private config: GlobalErrorHandlerConfig;
  private errorCount = 0;
  private reportedErrors = new Set<string>();
  private isInitialized = false;

  constructor(config: Partial<GlobalErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize global error handling
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // Handle JavaScript errors
    window.addEventListener('error', this.handleError.bind(this));

    // Handle resource loading errors
    window.addEventListener('error', this.handleResourceError.bind(this), true);

    this.isInitialized = true;
    console.log('Global error handler initialized');
  }

  /**
   * Cleanup global error handlers
   */
  cleanup(): void {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    window.removeEventListener('error', this.handleError.bind(this));
    window.removeEventListener('error', this.handleResourceError.bind(this), true);

    this.isInitialized = false;
    console.log('Global error handler cleaned up');
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason;
    const appError = ErrorHandler.categorizeError(error);
    
    // Prevent default browser behavior
    event.preventDefault();

    this.processError(appError, {
      type: 'unhandledrejection',
      promise: event.promise
    });
  }

  /**
   * Handle JavaScript errors
   */
  private handleError(event: ErrorEvent): void {
    const error = event.error || new Error(event.message);
    const appError = ErrorHandler.categorizeError(error);

    this.processError(appError, {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  /**
   * Handle resource loading errors
   */
  private handleResourceError(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target && target !== window) {
      const tagName = target.tagName?.toLowerCase();
      const src = (target as any).src || (target as any).href;
      
      if (src && ['img', 'script', 'link', 'iframe'].includes(tagName)) {
        const appError: AppError = {
          code: 'RESOURCE_LOAD_ERROR',
          message: `Failed to load ${tagName}: ${src}`,
          userMessage: `Failed to load resource. Some features may not work properly.`,
          category: ErrorHandler.categorizeError(new Error()).category,
          severity: ErrorSeverity.LOW,
          timestamp: new Date(),
          retryable: true,
          details: { tagName, src }
        };

        this.processError(appError, {
          type: 'resource',
          element: tagName,
          source: src
        });
      }
    }
  }

  /**
   * Process and handle errors
   */
  private processError(appError: AppError, context: any): void {
    // Check if we should ignore this error
    if (this.shouldIgnoreError(appError)) {
      return;
    }

    // Check error count limit
    if (this.errorCount >= (this.config.maxErrorsPerSession || 50)) {
      console.warn('Maximum errors per session reached. Suppressing further error handling.');
      return;
    }

    this.errorCount++;

    // Log error
    if (this.config.enableConsoleLogging) {
      ErrorHandler.logError(appError);
      console.error('Global error context:', context);
    }

    // Report error
    if (this.config.enableErrorReporting) {
      this.reportError(appError, context);
    }

    // Notify user for critical errors
    if (this.config.enableUserNotification && appError.severity === ErrorSeverity.CRITICAL) {
      this.notifyUser(appError);
    }
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(appError: AppError): boolean {
    const ignoredErrors = this.config.ignoredErrors || [];
    
    return ignoredErrors.some(ignored => 
      appError.message.includes(ignored) || 
      appError.code.includes(ignored)
    );
  }

  /**
   * Report error to external service
   */
  private async reportError(appError: AppError, context: any): Promise<void> {
    const errorKey = `${appError.code}-${appError.message}`;
    
    // Avoid reporting duplicate errors
    if (this.reportedErrors.has(errorKey)) {
      return;
    }

    this.reportedErrors.add(errorKey);

    const errorReport = {
      error: {
        code: appError.code,
        message: appError.message,
        userMessage: appError.userMessage,
        category: appError.category,
        severity: appError.severity,
        timestamp: appError.timestamp,
        retryable: appError.retryable,
        details: appError.details
      },
      context,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      session: {
        errorCount: this.errorCount,
        sessionId: this.getSessionId()
      }
    };

    try {
      if (this.config.reportingEndpoint) {
        await fetch(this.config.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorReport)
        });
      } else {
        // Log to console in development
        console.log('Error report (no endpoint configured):', errorReport);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Notify user of critical errors
   */
  private notifyUser(appError: AppError): void {
    // This would integrate with your notification system
    // For now, we'll use a simple alert for critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      setTimeout(() => {
        alert(`Critical Error: ${appError.userMessage}\n\nPlease refresh the page or contact support.`);
      }, 100);
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GlobalErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get error statistics
   */
  getStats(): {
    errorCount: number;
    reportedErrorsCount: number;
    isInitialized: boolean;
  } {
    return {
      errorCount: this.errorCount,
      reportedErrorsCount: this.reportedErrors.size,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Reset error tracking
   */
  reset(): void {
    this.errorCount = 0;
    this.reportedErrors.clear();
  }
}

// Create and export singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

// Export class and types
export { GlobalErrorHandler };
export type { GlobalErrorHandlerConfig };