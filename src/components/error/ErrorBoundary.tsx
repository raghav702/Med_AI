import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler, AppError, ErrorSeverity } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Bug, Home } from 'lucide-react';

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'section';
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary component for graceful error recovery
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  /**
   * Static method to derive state from error
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const appError = ErrorHandler.categorizeError(error);
    ErrorHandler.logError(appError);
    
    return {
      hasError: true,
      error: appError
    };
  }

  /**
   * Component did catch error
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = ErrorHandler.categorizeError(error);
    
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details
    ErrorHandler.logError(appError);
    
    // Report to error tracking service in production
    if (import.meta.env.PROD) {
      this.reportError(appError, errorInfo);
    }
  }

  /**
   * Report error to external service (placeholder)
   */
  private reportError(error: AppError, errorInfo: ErrorInfo) {
    // In a real application, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    console.log('Reporting error to tracking service:', {
      error,
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Retry the component rendering
   */
  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  /**
   * Reset error boundary state
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  /**
   * Navigate to home page
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Render error UI based on error severity and level
   */
  private renderErrorUI() {
    const { error, retryCount } = this.state;
    const { level = 'component', showDetails = false } = this.props;
    
    if (!error) return null;

    const canRetry = retryCount < this.maxRetries && error.retryable;
    const isPageLevel = level === 'page';
    const isCritical = error.severity === ErrorSeverity.CRITICAL;

    // Page-level error UI
    if (isPageLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {isCritical ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {error.userMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showDetails && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="text-sm font-mono">
                    {error.code}: {error.message}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
                
                {!canRetry && (
                  <Button 
                    variant="secondary" 
                    onClick={this.handleReset}
                    className="w-full"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Component-level error UI
    return (
      <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-destructive mb-1">
              Error in Component
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {error.userMessage}
            </p>
            
            {showDetails && (
              <div className="mb-3 p-2 bg-muted rounded text-xs font-mono">
                {error.code}: {error.message}
              </div>
            )}
            
            <div className="flex gap-2">
              {canRetry && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={this.handleRetry}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry ({this.maxRetries - retryCount})
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="ghost"
                onClick={this.handleReset}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<AppError | null>(null);

  const handleError = React.useCallback((error: any) => {
    const appError = ErrorHandler.categorizeError(error);
    ErrorHandler.logError(appError);
    setError(appError);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback((operation: () => void | Promise<void>) => {
    clearError();
    try {
      const result = operation();
      if (result instanceof Promise) {
        result.catch(handleError);
      }
    } catch (err) {
      handleError(err);
    }
  }, [clearError, handleError]);

  return {
    error,
    handleError,
    clearError,
    retry
  };
}