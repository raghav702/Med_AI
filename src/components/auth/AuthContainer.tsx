import { useState, useEffect } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { PasswordResetForm } from "./PasswordResetForm";

export const AuthContainer = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // Listen for password reset event from LoginForm
  useEffect(() => {
    const handleShowPasswordReset = () => {
      setShowPasswordReset(true);
    };

    window.addEventListener('showPasswordReset', handleShowPasswordReset);
    return () => window.removeEventListener('showPasswordReset', handleShowPasswordReset);
  }, []);

  const handleBackToLogin = () => {
    setShowPasswordReset(false);
    setIsLogin(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      {/* Main Content */}
      <div className="w-full max-w-md">
        <div className="medical-card p-8 fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">
              MED
            </h1>
            <p className="text-muted-foreground">
              {showPasswordReset 
                ? "Reset your password" 
                : isLogin 
                  ? "Sign in to your medical account" 
                  : "Create your medical account"
              }
            </p>
          </div>

          {/* Auth Toggle - Hide when showing password reset */}
          {!showPasswordReset && (
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
                  isLogin
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
                  !isLogin
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Forms */}
          <div className="slide-up">
            {showPasswordReset ? (
              <PasswordResetForm onBackToLogin={handleBackToLogin} />
            ) : isLogin ? (
              <LoginForm />
            ) : (
              <RegisterForm />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};