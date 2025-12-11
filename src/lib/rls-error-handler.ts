/**
 * Row-Level Security (RLS) Error Handler
 * 
 * Specialized error handling for Supabase RLS policy violations
 */

import { ErrorHandler, AppError } from './error-handler';

/**
 * RLS error types
 */
export enum RLSErrorType {
  APPOINTMENT_ACCESS = 'appointment_access',
  PROFILE_ACCESS = 'profile_access',
  DOCTOR_MODIFICATION = 'doctor_modification',
  PATIENT_MODIFICATION = 'patient_modification',
  UNAUTHORIZED_ROLE = 'unauthorized_role',
  MISSING_AUTH = 'missing_auth',
  UNKNOWN = 'unknown'
}

/**
 * RLS error details
 */
export interface RLSErrorDetails {
  type: RLSErrorType;
  resource: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  userRole?: string;
  requiredRole?: string;
  suggestion: string;
}

/**
 * RLS Error Handler class
 */
export class RLSErrorHandler {
  /**
   * Detect if an error is an RLS violation
   */
  static isRLSError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || '';

    // Check for RLS-specific error codes
    if (errorCode === 'PGRST301' || errorCode === '42501') {
      return true;
    }

    // Check for RLS-related keywords in error message
    const rlsKeywords = [
      'row-level security',
      'policy',
      'permission denied',
      'insufficient privilege',
      'violates row-level security',
      'rls'
    ];

    return rlsKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Classify RLS error type based on context
   */
  static classifyRLSError(error: any, context?: {
    table?: string;
    operation?: string;
    userRole?: string;
  }): RLSErrorDetails {
    const table = context?.table?.toLowerCase() || '';
    const operation = (context?.operation?.toUpperCase() || 'SELECT') as RLSErrorDetails['operation'];
    const userRole = context?.userRole;

    // Appointment access errors
    if (table.includes('appointment')) {
      if (operation === 'SELECT') {
        return {
          type: RLSErrorType.APPOINTMENT_ACCESS,
          resource: 'appointments',
          operation,
          userRole,
          suggestion: 'You can only view appointments where you are the patient or doctor. Make sure you are logged in with the correct account.'
        };
      } else if (operation === 'UPDATE') {
        return {
          type: RLSErrorType.APPOINTMENT_ACCESS,
          resource: 'appointments',
          operation,
          userRole,
          requiredRole: 'doctor or patient',
          suggestion: 'Only the doctor or patient involved in an appointment can modify it.'
        };
      } else if (operation === 'DELETE') {
        return {
          type: RLSErrorType.APPOINTMENT_ACCESS,
          resource: 'appointments',
          operation,
          userRole,
          suggestion: 'Appointments cannot be deleted. You can cancel them instead.'
        };
      }
    }

    // User profile access errors
    if (table.includes('user_profile') || table.includes('users')) {
      return {
        type: RLSErrorType.PROFILE_ACCESS,
        resource: 'user profiles',
        operation,
        userRole,
        suggestion: 'You can only view and edit your own profile. Admin users can view all profiles.'
      };
    }

    // Doctor profile modification errors
    if (table.includes('doctor')) {
      if (operation === 'UPDATE' || operation === 'DELETE') {
        return {
          type: RLSErrorType.DOCTOR_MODIFICATION,
          resource: 'doctor profiles',
          operation,
          userRole,
          requiredRole: 'doctor',
          suggestion: 'Only doctors can modify their own profile. Make sure you are logged in as a doctor.'
        };
      }
    }

    // Patient profile modification errors
    if (table.includes('patient')) {
      if (operation === 'UPDATE' || operation === 'DELETE') {
        return {
          type: RLSErrorType.PATIENT_MODIFICATION,
          resource: 'patient profiles',
          operation,
          userRole,
          requiredRole: 'patient',
          suggestion: 'Only patients can modify their own profile. Make sure you are logged in as a patient.'
        };
      }
    }

    // Check for missing authentication
    if (!userRole || userRole === 'anonymous') {
      return {
        type: RLSErrorType.MISSING_AUTH,
        resource: table || 'resource',
        operation,
        suggestion: 'You must be logged in to perform this action. Please sign in and try again.'
      };
    }

    // Generic RLS error
    return {
      type: RLSErrorType.UNKNOWN,
      resource: table || 'resource',
      operation,
      userRole,
      suggestion: 'You do not have permission to perform this action. Contact support if you believe this is an error.'
    };
  }

  /**
   * Handle RLS error and return user-friendly AppError
   */
  static handleRLSError(
    error: any,
    context?: {
      table?: string;
      operation?: string;
      userRole?: string;
    }
  ): AppError {
    // First check if this is actually an RLS error
    if (!this.isRLSError(error)) {
      return ErrorHandler.handleDatabaseError(error);
    }

    // Classify the error
    const details = this.classifyRLSError(error, context);

    // Build user-friendly message
    let userMessage = `Access denied: ${details.suggestion}`;

    if (details.requiredRole) {
      userMessage = `This action requires ${details.requiredRole} role. ${details.suggestion}`;
    }

    return {
      code: 'RLS_VIOLATION',
      message: error?.message || 'Row-level security policy violation',
      userMessage,
      category: 'permission' as any,
      severity: 'high' as any,
      timestamp: new Date(),
      retryable: false,
      details: {
        rlsError: true,
        ...details
      },
      originalError: error
    };
  }

  /**
   * Get user-friendly message for RLS error
   */
  static getUserMessage(error: any, context?: {
    table?: string;
    operation?: string;
    userRole?: string;
  }): string {
    if (!this.isRLSError(error)) {
      return ErrorHandler.getUserMessage(error);
    }

    const appError = this.handleRLSError(error, context);
    return appError.userMessage;
  }

  /**
   * Check if user has required role for operation
   */
  static checkRolePermission(
    userRole: string | undefined,
    requiredRole: string | string[]
  ): { allowed: boolean; message?: string } {
    if (!userRole) {
      return {
        allowed: false,
        message: 'You must be logged in to perform this action.'
      };
    }

    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!required.includes(userRole)) {
      return {
        allowed: false,
        message: `This action requires ${required.join(' or ')} role. You are currently logged in as ${userRole}.`
      };
    }

    return { allowed: true };
  }

  /**
   * Wrap database operation with RLS error handling
   */
  static async withRLSHandling<T>(
    operation: () => Promise<T>,
    context?: {
      table?: string;
      operation?: string;
      userRole?: string;
    }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isRLSError(error)) {
        throw this.handleRLSError(error, context);
      }
      throw error;
    }
  }
}

/**
 * Utility function to safely execute database operations with RLS handling
 */
export async function safeDBOperation<T>(
  operation: () => Promise<T>,
  context?: {
    table?: string;
    operation?: string;
    userRole?: string;
  }
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await RLSErrorHandler.withRLSHandling(operation, context);
    return { data, error: null };
  } catch (error) {
    const appError = RLSErrorHandler.isRLSError(error)
      ? RLSErrorHandler.handleRLSError(error, context)
      : ErrorHandler.categorizeError(error);
    
    ErrorHandler.logError(appError);
    return { data: null, error: appError };
  }
}

// Export for convenience
export { ErrorHandler };
