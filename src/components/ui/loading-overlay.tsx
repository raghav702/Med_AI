import React from 'react';
import { LoadingSpinner } from './loading-spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  className?: string;
  children: React.ReactNode;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  text = 'Loading...',
  className,
  children,
  blur = true
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center z-50',
          blur ? 'bg-background/80 backdrop-blur-sm' : 'bg-background/90'
        )}>
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  );
};