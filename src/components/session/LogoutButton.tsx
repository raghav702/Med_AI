import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SessionManager } from '@/services/session-manager';
import { LogOut, Loader2 } from 'lucide-react';

/**
 * Props for LogoutButton component
 */
export interface LogoutButtonProps {
  /** Button variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Show loading state */
  showLoading?: boolean;
  /** Custom className */
  className?: string;
  /** Button text (default: "Logout") */
  children?: React.ReactNode;
  /** Redirect path after logout (default: "/login") */
  redirectTo?: string;
  /** Callback after successful logout */
  onLogout?: () => void;
  /** Callback on logout error */
  onError?: (error: Error) => void;
}

/**
 * Enhanced logout button with comprehensive cleanup
 */
export function LogoutButton({
  variant = 'outline',
  size = 'default',
  showLoading = true,
  className,
  children = 'Logout',
  redirectTo = '/login',
  onLogout,
  onError,
  ...props
}: LogoutButtonProps) {
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const loading = authLoading || isLoggingOut;
  
  /**
   * Handle logout with comprehensive cleanup
   */
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Perform comprehensive logout cleanup
      await SessionManager.performLogoutCleanup();
      
      // Sign out through auth context
      await signOut();
      
      // Call success callback
      onLogout?.();
      
      // Navigate to redirect path
      navigate(redirectTo, { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Call error callback
      onError?.(error as Error);
      
      // Even if there's an error, try to navigate to login
      // This ensures the user isn't stuck in a broken state
      navigate(redirectTo, { replace: true });
      
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={loading}
      className={className}
      {...props}
    >
      {loading && showLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4 mr-2" />
          {children}
        </>
      )}
    </Button>
  );
}

/**
 * Compact logout button for navigation bars
 */
export function LogoutIconButton({
  className,
  onLogout,
  onError,
  ...props
}: Omit<LogoutButtonProps, 'children' | 'size'>) {
  return (
    <LogoutButton
      variant="ghost"
      size="icon"
      className={className}
      onLogout={onLogout}
      onError={onError}
      {...props}
    >
      <LogOut className="w-4 h-4" />
      <span className="sr-only">Logout</span>
    </LogoutButton>
  );
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const logout = async (redirectTo: string = '/login') => {
    try {
      setIsLoggingOut(true);
      
      // Perform comprehensive logout cleanup
      await SessionManager.performLogoutCleanup();
      
      // Sign out through auth context
      await signOut();
      
      // Navigate to redirect path
      navigate(redirectTo, { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if there's an error, try to navigate to login
      navigate(redirectTo, { replace: true });
      
      throw error;
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return {
    logout,
    isLoggingOut,
  };
}