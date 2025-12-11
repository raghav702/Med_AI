import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordStrength } from "@/components/ui/password-strength";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAuth } from "@/contexts/AuthContext";
import { useFormSubmission } from "@/hooks/useLoadingState";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuccessFeedback } from "@/components/ui/success-feedback";
import { AuthServiceError } from "@/services/auth";
import { calculatePasswordStrength } from "@/lib/password-validation";
import { Eye, EyeOff, Mail, Lock, Stethoscope, Users } from "lucide-react";
import type { UserRole } from "@/types/database";

type UserType = UserRole;

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { signUp, error, clearError } = useAuth();
  const { showSuccess } = useNotifications();
  const { showSuccess: showSuccessFeedback, hideSuccess, show: showingSuccess } = useSuccessFeedback();
  
  const formSubmission = useFormSubmission();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState<UserType>("patient");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeToTerms?: string;
    userType?: string;
  }>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    
    // Role validation
    if (!userType) {
      errors.userType = "Please select a role (patient or doctor)";
    }
    
    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    // Password validation
    const passwordStrength = calculatePasswordStrength(formData.password);
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (!passwordStrength.isValid) {
      errors.password = "Password does not meet requirements";
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = "You must agree to the terms and conditions";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) {
      return;
    }

    await formSubmission.submitForm(
      async () => {
        const userData = {
          userRole: userType,
        };

        await signUp(formData.email, formData.password, userData);
        return userData;
      },
      {
        successMessage: 'Account created successfully!',
        errorMessage: 'Registration failed. Please try again.',
        onSuccess: () => {
          showSuccess('Account created successfully!');
          showSuccessFeedback('Account created successfully!', 'Redirecting to login...');
          setTimeout(() => {
            navigate("/login", { 
              state: { 
                message: "Account created successfully! Please sign in." 
              } 
            });
          }, 1500);
        },
        onError: (error) => {
          if (error instanceof AuthServiceError) {
            switch (error.code) {
              case "USER_ALREADY_EXISTS":
              case "DUPLICATE_EMAIL_ROLE":
                setFieldErrors({ email: "An account with this email and role already exists" });
                break;
              case "WEAK_PASSWORD":
                setFieldErrors({ password: error.message });
                break;
              case "INVALID_EMAIL":
                setFieldErrors({ email: error.message });
                break;
              default:
                // Other errors will be handled by the notification system
                break;
            }
          }
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Register as <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setUserType("patient");
              if (fieldErrors.userType) {
                setFieldErrors(prev => ({ ...prev, userType: undefined }));
              }
            }}
            className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 ${
              userType === "patient"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            disabled={formSubmission.isLoading}
          >
            <Users className="w-5 h-5 mr-2" />
            <span className="font-medium">Patient</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUserType("doctor");
              if (fieldErrors.userType) {
                setFieldErrors(prev => ({ ...prev, userType: undefined }));
              }
            }}
            className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 ${
              userType === "doctor"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            disabled={formSubmission.isLoading}
          >
            <Stethoscope className="w-5 h-5 mr-2" />
            <span className="font-medium">Doctor</span>
          </button>
        </div>
        {fieldErrors.userType && (
          <p className="text-sm text-red-500">{fieldErrors.userType}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={`medical-input pl-10 h-12 ${
              fieldErrors.email ? "border-red-500 focus:border-red-500" : ""
            }`}
            placeholder="Enter your email"
            disabled={formSubmission.isLoading}
            required
          />
        </div>
        {fieldErrors.email && (
          <p className="text-sm text-red-500">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className={`medical-input pl-10 pr-10 h-12 ${
                fieldErrors.password ? "border-red-500 focus:border-red-500" : ""
              }`}
              placeholder="Create a password"
              disabled={formSubmission.isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={formSubmission.isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-sm text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        {/* Password Strength Indicator */}
        {formData.password && (
          <PasswordStrength 
            password={formData.password} 
            showRequirements={true}
            className="mt-3"
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className={`medical-input pl-10 pr-10 h-12 ${
                fieldErrors.confirmPassword ? "border-red-500 focus:border-red-500" : ""
              }`}
              placeholder="Confirm your password"
              disabled={formSubmission.isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={formSubmission.isLoading}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
          )}
        </div>
      </div>

      {/* Terms Agreement */}
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
            className="mt-1"
            disabled={formSubmission.isLoading}
          />
          <Label htmlFor="terms" className="text-sm text-muted-foreground leading-5">
            I agree to the{" "}
            <button type="button" className="text-primary hover:text-primary/80 underline">
              Terms of Service
            </button>{" "}
            and{" "}
            <button type="button" className="text-primary hover:text-primary/80 underline">
              Privacy Policy
            </button>
          </Label>
        </div>
        {fieldErrors.agreeToTerms && (
          <p className="text-sm text-red-500">{fieldErrors.agreeToTerms}</p>
        )}
      </div>

      {/* Submit Button */}
      <LoadingButton
        type="submit"
        disabled={!formData.agreeToTerms}
        loading={formSubmission.isLoading}
        loadingText="Creating Account..."
        success={showingSuccess}
        successText="Account Created!"
        className="w-full h-12 medical-button text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create Account
      </LoadingButton>
    </form>
  );
};