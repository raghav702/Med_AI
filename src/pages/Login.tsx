import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { supabase } from '@/lib/supabase';

/**
 * Login page component
 * 
 * This page handles user authentication and redirects authenticated users
 * to their intended destination or the appropriate role-based dashboard.
 */
const Login = () => {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingRole, setCheckingRole] = useState(false);

  // Get the intended destination from location state
  const from = (location.state as any)?.from;

  useEffect(() => {
    const redirectUser = async () => {
      if (initializing || !user) return;

      setCheckingRole(true);

      try {
        // If there's a specific intended destination, use it
        if (from && from !== '/login') {
          navigate(from, { replace: true });
          return;
        }

        // Otherwise, redirect based on user role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_role')
          .eq('id', user.id)
          .single();

        if (profile?.user_role === 'doctor') {
          navigate('/doctor/dashboard', { replace: true });
        } else if (profile?.user_role === 'admin') {
          navigate('/dashboard', { replace: true }); // Admin dashboard will be implemented later
        } else {
          // Default to patient dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        // Fallback to default dashboard
        navigate('/dashboard', { replace: true });
      } finally {
        setCheckingRole(false);
      }
    };

    redirectUser();
  }, [user, initializing, navigate, from]);

  // Show loading state while checking authentication or role
  if (initializing || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {checkingRole ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated
  if (user) {
    return null;
  }

  return <AuthContainer />;
};

export default Login;