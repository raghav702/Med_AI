import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Props for ProtectedRoute component
 */
export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireEmailVerification?: boolean;
}

/**
 * Loading component for authentication state
 */
const AuthLoadingState = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-full max-w-md space-y-4">
      <div className="text-center mb-8">
        <Skeleton className="h-8 w-16 mx-auto mb-2" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
);

/**
 * Email verification prompt component
 */
const EmailVerificationPrompt = () => {
  const { user, resendEmailVerification, loading } = useAuth();

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification();
      // Could add toast notification here
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="medical-card p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Verify Your Email
            </h2>
            <p className="text-muted-foreground">
              Please check your email and click the verification link to access your account.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verification email sent to: <br />
              <span className="font-medium text-foreground">{user?.email}</span>
            </p>

            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-4 rounded-md font-medium transition-colors"
            >
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </button>

            <p className="text-xs text-muted-foreground">
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ProtectedRoute component that guards routes requiring authentication
 * 
 * This component implements authentication guards by:
 * - Checking if user is authenticated
 * - Redirecting unauthenticated users to login
 * - Optionally requiring email verification
 * - Preserving the intended destination for post-login redirect
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requireEmailVerification = false,
}) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Show loading state while authentication is initializing
  if (initializing) {
    return <AuthLoadingState />;
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    // Preserve the current location so we can redirect back after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname + location.search }} 
        replace 
      />
    );
  }

  // Check email verification if required
  if (requireEmailVerification && !user.email_confirmed_at) {
    return <EmailVerificationPrompt />;
  }

  // User is authenticated and verified (if required), render the protected content
  return <>{children}</>;
};

/**
 * Higher-order component version of ProtectedRoute
 */
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ProtectedRoute;