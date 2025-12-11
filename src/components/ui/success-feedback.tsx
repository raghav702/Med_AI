import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface SuccessFeedbackProps {
  show: boolean;
  message: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
  variant?: 'toast' | 'banner' | 'inline';
  className?: string;
}

export const SuccessFeedback: React.FC<SuccessFeedbackProps> = ({
  show,
  message,
  description,
  duration = 5000,
  onClose,
  variant = 'toast',
  className
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!visible) return null;

  const baseClasses = 'flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg';
  
  const variantClasses = {
    toast: 'fixed top-4 right-4 z-50 shadow-lg max-w-md',
    banner: 'w-full',
    inline: 'w-full'
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-800">{message}</p>
        {description && (
          <p className="text-sm text-green-700 mt-1">{description}</p>
        )}
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="h-6 w-6 p-0 text-green-600 hover:text-green-800 hover:bg-green-100"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

// Hook for managing success feedback state
export const useSuccessFeedback = () => {
  const [feedback, setFeedback] = useState<{
    show: boolean;
    message: string;
    description?: string;
  }>({
    show: false,
    message: ''
  });

  const showSuccess = (message: string, description?: string) => {
    setFeedback({ show: true, message, description });
  };

  const hideSuccess = () => {
    setFeedback(prev => ({ ...prev, show: false }));
  };

  return {
    ...feedback,
    showSuccess,
    hideSuccess
  };
};

// Specialized success components
export const SaveSuccessFeedback: React.FC<{
  show: boolean;
  itemName?: string;
  onClose?: () => void;
}> = ({ show, itemName = 'item', onClose }) => (
  <SuccessFeedback
    show={show}
    message={`${itemName} saved successfully`}
    description={`Your ${itemName.toLowerCase()} has been saved and is now available.`}
    onClose={onClose}
  />
);

export const UploadSuccessFeedback: React.FC<{
  show: boolean;
  fileName?: string;
  onClose?: () => void;
}> = ({ show, fileName, onClose }) => (
  <SuccessFeedback
    show={show}
    message="Upload completed"
    description={fileName ? `${fileName} has been uploaded successfully.` : 'Your file has been uploaded successfully.'}
    onClose={onClose}
  />
);

export const ActionSuccessFeedback: React.FC<{
  show: boolean;
  action: string;
  onClose?: () => void;
}> = ({ show, action, onClose }) => (
  <SuccessFeedback
    show={show}
    message={`${action} completed`}
    description={`The ${action.toLowerCase()} operation was successful.`}
    onClose={onClose}
  />
);