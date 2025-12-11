import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { InlineError } from "@/components/error";
import { LoadingButton } from "@/components/ui/loading-button";
import { useFormSubmission } from "@/hooks/useLoadingState";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuccessFeedback } from "@/components/ui/success-feedback";
import { usePasswordResetFormValidation } from "@/hooks/useFormValidation";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

interface PasswordResetFormProps {
  onBackToLogin?: () => void;
}

export const PasswordResetForm = ({ onBackToLogin }: PasswordResetFormProps) => {
  const { resetPassword, error } = useAuth();
  const { showSuccess } = useNotifications();
  const { showSuccess: showSuccessFeedback, hideSuccess, show: showingSuccess } = useSuccessFeedback();
  
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState<string>("");
  
  const formSubmission = useFormSubmission();

  const { form, validatePasswordReset } = usePasswordResetFormValidation({
    defaultValues: {
      email: ""
    }
  });

  const handleSubmit = async (data: { email: string }) => {
    setFormError(null);
    
    await formSubmission.submitForm(
      async () => {
        // Validate form data
        const validationResult = await validatePasswordReset(data);
        if (!validationResult.isValid) {
          throw new Error("Please enter a valid email address");
        }

        await resetPassword(data.email);
        return data;
      },
      {
        successMessage: 'Password reset email sent!',
        errorMessage: 'Failed to send password reset email. Please try again.',
        onSuccess: (data) => {
          setSentEmail(data.email);
          setEmailSent(true);
          showSuccess('Password reset email sent successfully');
          showSuccessFeedback(
            'Email sent!', 
            `We've sent password reset instructions to ${data.email}`
          );
        },
        onError: (error) => {
          setFormError(error.message || "Failed to send password reset email. Please try again.");
        }
      }
    );
  };

  const handleResendEmail = async () => {
    if (!sentEmail) return;
    
    setFormError(null);
    
    await formSubmission.submitForm(
      async () => {
        await resetPassword(sentEmail);
        return { email: sentEmail };
      },
      {
        successMessage: 'Password reset email resent!',
        errorMessage: 'Failed to resend email. Please try again.',
        onSuccess: () => {
          showSuccess('Password reset email resent successfully');
          showSuccessFeedback(
            'Email resent!', 
            `We've sent another password reset email to ${sentEmail}`
          );
        },
        onError: (error) => {
          setFormError(error.message || "Failed to resend email. Please try again.");
        }
      }
    );
  };

  const handleBackToLogin = () => {
    setEmailSent(false);
    setSentEmail("");
    setFormError(null);
    form.reset();
    if (onBackToLogin) {
      onBackToLogin();
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6">
        {/* Success State */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Check your email
            </h2>
            <p className="text-muted-foreground text-sm">
              We've sent password reset instructions to
            </p>
            <p className="text-foreground font-medium">
              {sentEmail}
            </p>
          </div>
        </div>

        {/* Error Message */}
        <InlineError 
          error={formError || error} 
          onRetry={() => setFormError(null)}
        />

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-foreground text-sm">
            What to do next:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Check your email inbox and spam folder</li>
            <li>• Click the reset link in the email</li>
            <li>• Follow the instructions to set a new password</li>
            <li>• The link will expire in 1 hour for security</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <LoadingButton
            type="button"
            variant="outline"
            onClick={handleResendEmail}
            loading={formSubmission.isLoading}
            loadingText="Resending..."
            className="w-full h-12"
          >
            Resend email
          </LoadingButton>
          
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackToLogin}
            className="w-full h-12"
            disabled={formSubmission.isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Reset your password
          </h2>
          <p className="text-muted-foreground text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

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
                Email address
              </FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <FormControl>
                  <Input
                    type="email"
                    className="medical-input pl-10 h-12"
                    placeholder="Enter your email address"
                    disabled={formSubmission.isLoading}
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <LoadingButton
          type="submit"
          loading={formSubmission.isLoading}
          loadingText="Sending reset email..."
          success={showingSuccess}
          successText="Email sent!"
          className="w-full h-12 medical-button text-white font-medium"
        >
          Send reset email
        </LoadingButton>

        {/* Back to Login */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleBackToLogin}
          className="w-full h-12"
          disabled={formSubmission.isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </form>
    </Form>
  );
};