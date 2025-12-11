import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  variant?: 'default' | 'overlay' | 'inline';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
  variant = 'default'
}) => {
  const spinnerContent = (
    <div className={cn(
      'flex items-center justify-center',
      variant === 'inline' ? 'flex-row space-x-2' : 'flex-col space-y-2',
      className
    )}>
      <Loader2 className={cn(
        'animate-spin text-primary',
        sizeClasses[size]
      )} />
      {text && (
        <span className={cn(
          'text-muted-foreground',
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

// Specialized loading components for common use cases
export const ButtonLoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center space-x-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{text}</span>
  </div>
);

export const PageLoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

export const InlineLoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner size="sm" text={text} variant="inline" />
);