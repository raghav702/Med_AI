import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { InlineError } from "@/components/error";
import { ButtonLoadingSpinner } from "@/components/ui/loading-spinner";
import { LoadingButton } from "@/components/ui/loading-button";
import { useFormSubmission } from "@/hooks/useLoadingState";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuccessFeedback } from "@/components/ui/success-feedback";
import { useLoginFormValidation } from "@/hooks/useFormValidation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn, error } = useAuth();
  const { showSuccess } = useNotifications();
  const { showSuccess: showSuccessFeedback, hideSuccess, show: showingSuccess } = useSuccessFeedback();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const formSubmission = useFormSubmission();

  const { form, validateLogin } = useLoginFormValidation({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  });

  const handleSubmit = async (data: any) => {
    setFormError(null);
    
    await formSubmission.submitForm(
      async () => {
        // Validate form data
        const validationResult = await validateLogin(data);
        if (!validationResult.isValid) {
          throw new Error("Please check your input and try again");
        }

        await signIn(data.email, data.password, data.rememberMe);
        return data;
      },
      {
        successMessage: 'Welcome back!',
        errorMessage: 'Login failed. Please try again.',
        onSuccess: async () => {
          showSuccess('Successfully signed in');
          showSuccessFeedback('Welcome back!', 'You have been successfully signed in.');
          
          // Get user profile to determine role and redirect accordingly
          try {
            const { databaseService } = await import('@/services/database');
            const { authService } = await import('@/services/auth');
            
            const user = await authService.getCurrentUser();
            if (user) {
              const profile = await databaseService.getUserProfile(user.id);
              
              if (profile) {
                // Redirect based on user role
                const redirectPath = profile.user_role === 'doctor' 
                  ? '/doctor/dashboard' 
                  : profile.user_role === 'admin'
                  ? '/admin/dashboard'
                  : '/dashboard';
                
                setTimeout(() => navigate(redirectPath), 1500);
              } else {
                // Fallback to default dashboard if profile not found
                setTimeout(() => navigate("/dashboard"), 1500);
              }
            } else {
              setTimeout(() => navigate("/dashboard"), 1500);
            }
          } catch (error) {
            console.error('Error fetching user profile for redirect:', error);
            // Fallback to default dashboard on error
            setTimeout(() => navigate("/dashboard"), 1500);
          }
        },
        onError: (error) => {
          setFormError(error.message || "Login failed. Please try again.");
        }
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Error Message */}
        <InlineError 
          error={formError || error} 
          onRetry={() => setFormError(null)}
        />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Email
              </FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <FormControl>
                  <Input
                    type="email"
                    className="medical-input pl-10 h-12"
                    placeholder="Enter your email"
                    disabled={formSubmission.isLoading}
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Password
              </FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="medical-input pl-10 pr-10 h-12"
                    placeholder="Enter your password"
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

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={formSubmission.isLoading}
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground">
                  Remember me
                </Label>
              </div>
            )}
          />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('showPasswordReset'))}
            className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            disabled={formSubmission.isLoading}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <LoadingButton
          type="submit"
          loading={formSubmission.isLoading}
          loadingText="Signing In..."
          success={showingSuccess}
          successText="Welcome back!"
          className="w-full h-12 medical-button text-white font-medium"
        >
          Sign In
        </LoadingButton>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 border-border hover:bg-muted transition-colors"
          disabled={formSubmission.isLoading}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 border-border hover:bg-muted transition-colors"
          disabled={formSubmission.isLoading}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
          </svg>
          Twitter
        </Button>
      </div>
    </form>
  </Form>
  );
};