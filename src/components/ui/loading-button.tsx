import React from 'react';
import { Button, ButtonProps } from './button';
import { Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  successDuration?: number;
  icon?: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  success = false,
  successText,
  successDuration = 2000,
  icon,
  children,
  disabled,
  className,
  ...props
}) => {
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [success, successDuration]);

  const isDisabled = disabled || loading || showSuccess;

  const getButtonContent = () => {
    if (showSuccess) {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>{successText || 'Success!'}</span>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText || 'Loading...'}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        {icon && <span>{icon}</span>}
        <span>{children}</span>
      </div>
    );
  };

  return (
    <Button
      {...props}
      disabled={isDisabled}
      className={cn(
        'transition-all duration-200',
        showSuccess && 'bg-green-600 hover:bg-green-600',
        className
      )}
    >
      {getButtonContent()}
    </Button>
  );
};