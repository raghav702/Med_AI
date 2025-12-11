import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InlineError } from '@/components/error';
import { LoadingButton } from '@/components/ui/loading-button';
import { useFormSubmission } from '@/hooks/useLoadingState';
import { useToast } from '@/hooks/use-toast';
import { useSuccessFeedback } from '@/components/ui/success-feedback';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Password reset confirmation page
 * 
 * This page handles the password reset process when users click the reset link
 * from their email. It validates the reset token and allows users to set a new password.
 */
const ResetPassword = () => {
  const { updatePassword, user, initializing } = useAuth();
  const { toast } = useToast();
  const { showSuccess: showSuccessFeedback, hideSuccess, show: showingSuccess } = useSuccessFeedback();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  
  const formSubmission = useFormSubmission();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  // Check if we have the required parameters and validate the session
  useEffect(() => {
    const checkResetToken = async () => {
      // Check if we have the required URL parameters
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      if (!accessToken || !refreshToken || type !== 'recovery') {
        setTokenValid(false);
        return;
      }

      // If we have a user session, the token is valid
      if (!initializing && user) {
        setTokenValid(true);
      } else if (!initializing && !user) {
        setTokenValid(false);
      }
    };

    checkResetToken();
  }, [searchParams, user, initializing]);

  const handleSubmit = async (data: ResetPasswordFormData) => {
    setFormError(null);
    
    await formSubmission.submitForm(
      async () => {
        await updatePassword(data.password);
        return data;
      },
      {
        successMessage: 'Password updated successfully!',
        errorMessage: 'Failed to update password. Please try again.',
        onSuccess: () => {
          setPasswordUpdated(true);
          toast({
            title: 'Password updated successfully',
            description: 'You can now sign in with your new password.'
          });
          showSuccessFeedback(
            'Password updated!', 
            'Your password has been successfully updated. You can now sign in with your new password.'
          );
          // Redirect to login after a delay
          setTimeout(() => navigate('/login'), 3000);
        },
        onError: (error) => {
          setFormError(error.message || "Failed to update password. Please try again.");
        }
      }
    );
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Show loading state while checking authentication
  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="medical-card p-8 fade-in">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Invalid or Expired Link
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  This password reset link is invalid or has expired. Please request a new password reset.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-foreground text-sm">
                  Possible reasons:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• The link has expired (links expire after 1 hour)</li>
                  <li>• The link has already been used</li>
                  <li>• The link was copied incorrectly</li>
                </ul>
              </div>

              <Button
                onClick={handleBackToLogin}
                className="w-full h-12 medical-button text-white font-medium"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success state after password is updated
  if (passwordUpdated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="medical-card p-8 fade-in">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Password Updated Successfully
                </h2>
                <p className="text-muted-foreground text-sm">
                  Your password has been updated. You will be redirected to the sign in page shortly.
                </p>
              </div>

              <Button
                onClick={handleBackToLogin}
                className="w-full h-12 medical-button text-white font-medium"
              >
                Continue to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show the password reset form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="medical-card p-8 fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">
              MED
            </h1>
            <p className="text-muted-foreground">
              Set your new password
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Error Message */}
              <InlineError 
                error={formError} 
                onRetry={() => setFormError(null)}
              />

              {/* New Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      New Password
                    </FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="medical-input pl-10 pr-10 h-12"
                          placeholder="Enter your new password"
                          disabled={formSubmission.isLoading}
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={formSubmission.isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Confirm New Password
                    </FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          className="medical-input pl-10 pr-10 h-12"
                          placeholder="Confirm your new password"
                          disabled={formSubmission.isLoading}
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={formSubmission.isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Requirements */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-foreground text-sm">
                  Password requirements:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                </ul>
              </div>

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={formSubmission.isLoading}
                loadingText="Updating password..."
                success={showingSuccess}
                successText="Password updated!"
                className="w-full h-12 medical-button text-white font-medium"
              >
                Update Password
              </LoadingButton>

              {/* Back to Login */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full h-12"
                disabled={formSubmission.isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;