import { supabase } from '@/lib/supabase';
import { AuthResponse, User, Session, AuthError } from '@/types/supabase';
import { ErrorHandler } from '@/lib/error-handler';

/**
 * Authentication service interface
 */
export interface IAuthService {
  signUp(email: string, password: string, userData?: SignUpUserData): Promise<AuthResponse>;
  signIn(email: string, password: string): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getCurrentSession(): Promise<Session | null>;
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  resendEmailVerification(): Promise<void>;
  refreshSession(): Promise<AuthResponse>;
}

/**
 * Additional user data for sign up (simplified)
 */
export interface SignUpUserData {
  userRole: 'patient' | 'doctor';
  // Doctor-specific fields (for CSV import compatibility)
  name?: string;
  address?: string;
  specialty?: string;
  experience?: number;
  price_range?: number;
  lat?: number;
  lng?: number;
  opening_hours?: string[];
  qualifications?: string;
  // Patient-specific fields
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
}

/**
 * Custom error types for authentication
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: AuthError | Error
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

/**
 * Authentication service implementation using Supabase
 */
export class AuthService implements IAuthService {
  /**
   * Sign up a new user with email and password (simplified)
   */
  async signUp(email: string, password: string, userData?: SignUpUserData): Promise<AuthResponse> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      // Validate input
      this.validateEmail(email);
      this.validatePassword(password);

      // Validate that role is provided
      if (!userData?.userRole) {
        throw new AuthServiceError('User role is required', 'INVALID_INPUT');
      }

      // Prepare metadata for user profile
      const metadata = {
        user_role: userData.userRole,
        email: email,
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        throw this.handleAuthError(error);
      }

      // Create user profile and role-specific profile after successful registration
      if (data.user && userData) {
        try {
          // Create user_profiles entry
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: email,
              user_role: userData.userRole,
            });

          if (profileError) {
            console.error('User profile creation failed:', profileError);
            
            // Check if it's a duplicate email/role error
            if (profileError.message?.includes('Email already registered with a different role')) {
              throw new AuthServiceError(
                'An account with this email already exists with a different role',
                'DUPLICATE_EMAIL_ROLE',
                profileError
              );
            }
            
            // For other profile errors, throw a generic error
            throw new AuthServiceError(
              'Failed to create user profile',
              'PROFILE_CREATION_FAILED',
              profileError
            );
          }

          // Create role-specific profile (only if additional data is provided)
          if (userData.userRole === 'doctor' && userData.name && userData.specialty) {
            const { error: doctorError } = await supabase
              .from('doctors')
              .insert({
                id: data.user.id,
                name: userData.name,
                address: userData.address,
                specialty: userData.specialty,
                experience: userData.experience,
                price_range: userData.price_range,
                lat: userData.lat,
                lng: userData.lng,
                opening_hours: userData.opening_hours,
                qualifications: userData.qualifications,
                review_count: 0,
              });

            if (doctorError) {
              console.error('Doctor profile creation failed:', doctorError);
            }
          } else if (userData.userRole === 'patient' && (userData.firstName || userData.lastName)) {
            const { error: patientError } = await supabase
              .from('patients')
              .insert({
                id: data.user.id,
                first_name: userData.firstName,
                last_name: userData.lastName,
                phone: userData.phone,
                date_of_birth: userData.dateOfBirth,
              });

            if (patientError) {
              console.error('Patient profile creation failed:', patientError);
            }
          }
        } catch (profileError) {
          console.error('Profile setup failed:', profileError);
          // Don't throw here as the user was successfully created
          // The profile can be completed later
        }
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred during sign up',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Sign in an existing user with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      // Validate input
      this.validateEmail(email);
      if (!password) {
        throw new AuthServiceError('Password is required', 'INVALID_PASSWORD');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw this.handleAuthError(error);
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred during sign in',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw this.handleAuthError(error);
      }
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred during sign out',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (!supabase) {
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        // Don't throw for user retrieval errors, just return null
        console.warn('Error getting current user:', error.message);
        return null;
      }

      return user;
    } catch (error) {
      console.warn('Unexpected error getting current user:', error);
      return null;
    }
  }

  /**
   * Get the current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      if (!supabase) {
        return null;
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Error getting current session:', error.message);
        return null;
      }

      return session;
    } catch (error) {
      console.warn('Unexpected error getting current session:', error);
      return null;
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      this.validateEmail(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw this.handleAuthError(error);
      }
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred while sending password reset email',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Update user password (requires current session)
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      this.validatePassword(newPassword);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw this.handleAuthError(error);
      }
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred while updating password',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Resend email verification for the current user
   */
  async resendEmailVerification(): Promise<void> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      const user = await this.getCurrentUser();
      if (!user?.email) {
        throw new AuthServiceError(
          'No authenticated user found or user email is missing',
          'USER_NOT_FOUND'
        );
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        throw this.handleAuthError(error);
      }
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred while resending email verification',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<AuthResponse> {
    try {
      if (!supabase) {
        throw new AuthServiceError(
          'Authentication service is not available. Please check your configuration.',
          'SERVICE_UNAVAILABLE'
        );
      }

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw this.handleAuthError(error);
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError(
        'An unexpected error occurred while refreshing session',
        'UNKNOWN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    if (!email) {
      throw new AuthServiceError('Email is required', 'INVALID_EMAIL');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthServiceError('Please enter a valid email address', 'INVALID_EMAIL');
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password) {
      throw new AuthServiceError('Password is required', 'INVALID_PASSWORD');
    }

    if (password.length < 8) {
      throw new AuthServiceError(
        'Password must be at least 8 characters long',
        'WEAK_PASSWORD'
      );
    }

    // Check for at least one uppercase letter, one lowercase letter, and one number
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      throw new AuthServiceError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'WEAK_PASSWORD'
      );
    }
  }

  /**
   * Handle and transform Supabase auth errors using the centralized error handler
   */
  private handleAuthError(error: AuthError): AuthServiceError {
    const appError = ErrorHandler.handleAuthError(error);
    return new AuthServiceError(
      appError.userMessage,
      appError.code,
      error
    );
  }
}

// Export a singleton instance
export const authService = new AuthService();