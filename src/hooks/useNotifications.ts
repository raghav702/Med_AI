import { useToast } from './use-toast';

export interface NotificationOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useNotifications = () => {
  const { toast } = useToast();

  const showSuccess = (message: string, options?: NotificationOptions) => {
    toast({
      title: options?.title || 'Success',
      description: options?.description || message,
      variant: 'default',
    });
  };

  const showError = (message: string, options?: NotificationOptions) => {
    toast({
      title: options?.title || 'Error',
      description: options?.description || message,
      variant: 'destructive',
    });
  };

  const showInfo = (message: string, options?: NotificationOptions) => {
    toast({
      title: options?.title || 'Info',
      description: options?.description || message,
    });
  };

  const showWarning = (message: string, options?: NotificationOptions) => {
    toast({
      title: options?.title || 'Warning',
      description: options?.description || message,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};
