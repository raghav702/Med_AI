import React from 'react';
import { LoadingSpinner, PageLoadingSpinner } from './loading-spinner';
import { LoadingOverlay } from './loading-overlay';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateManagerProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  
  // Loading options
  loadingText?: string;
  loadingVariant?: 'spinner' | 'overlay' | 'page';
  
  // Error options
  showError?: boolean;
  errorTitle?: string;
  onRetry?: () => void;
  retryText?: string;
  
  // Skeleton options
  skeleton?: React.ReactNode;
  showSkeletonOnInitialLoad?: boolean;
  
  // Layout options
  className?: string;
  minHeight?: string;
}

export const LoadingStateManager: React.FC<LoadingStateManagerProps> = ({
  loading,
  error,
  children,
  loadingText = 'Loading...',
  loadingVariant = 'spinner',
  showError = true,
  errorTitle = 'Something went wrong',
  onRetry,
  retryText = 'Try again',
  skeleton,
  showSkeletonOnInitialLoad = false,
  className,
  minHeight = 'min-h-[200px]'
}) => {
  // Show skeleton on initial load if provided and enabled
  if (loading && skeleton && showSkeletonOnInitialLoad) {
    return (
      <div className={cn(className, minHeight)}>
        {skeleton}
      </div>
    );
  }

  // Show error state
  if (error && showError) {
    return (
      <div className={cn(className, minHeight)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">{errorTitle}</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryText}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    const loadingComponent = (() => {
      switch (loadingVariant) {
        case 'page':
          return <PageLoadingSpinner text={loadingText} />;
        case 'overlay':
          return (
            <LoadingOverlay isLoading={true} text={loadingText}>
              <div className={minHeight} />
            </LoadingOverlay>
          );
        default:
          return (
            <div className={cn('flex items-center justify-center', minHeight)}>
              <LoadingSpinner text={loadingText} />
            </div>
          );
      }
    })();

    return (
      <div className={cn(className)}>
        {loadingComponent}
      </div>
    );
  }

  // Show content
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
};

// Specialized loading state managers for common use cases
export const DataLoadingManager: React.FC<{
  loading: boolean;
  error?: string | null;
  data?: any;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}> = ({
  loading,
  error,
  data,
  children,
  skeleton,
  emptyState,
  onRetry,
  className
}) => {
  // Show skeleton while loading
  if (loading && !data && skeleton) {
    return <div className={className}>{skeleton}</div>;
  }

  // Show error state
  if (error) {
    return (
      <LoadingStateManager
        loading={false}
        error={error}
        onRetry={onRetry}
        className={className}
      >
        {children}
      </LoadingStateManager>
    );
  }

  // Show empty state if no data
  if (!loading && !data && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  // Show loading spinner if still loading
  if (loading) {
    return (
      <LoadingStateManager
        loading={true}
        error={null}
        className={className}
      >
        {children}
      </LoadingStateManager>
    );
  }

  // Show content
  return <div className={className}>{children}</div>;
};

// Form loading manager
export const FormLoadingManager: React.FC<{
  loading: boolean;
  error?: string | null;
  success?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({
  loading,
  error,
  success,
  children,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {loading && (
        <LoadingOverlay isLoading={true} text="Processing..." />
      )}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mt-4">
          <AlertDescription className="text-green-600">
            Operation completed successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};