/**
 * Validation service that integrates client-side and server-side validation
 * Provides comprehensive validation for all user inputs
 */

import { z } from 'zod';
import {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  changePasswordSchema,
  userProfileSchema,
  createUserProfileSchema,
  updateUserProfileSchema,
  medicalRecordSchema,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  userProfileFiltersSchema,
  medicalRecordFiltersSchema,
  paginationSchema,
  fileUploadSchema,
  type LoginFormData,
  type RegisterFormData,
  type UserProfileFormData,
  type MedicalRecordFormData
} from '@/lib/validation-schemas';

import {
  sanitizeUserProfile,
  sanitizeMedicalRecord,
  sanitizeAuthData,
  sanitizeFileUpload,
  sanitizeForLogging
} from '@/lib/data-sanitization';

import { supabase } from '@/lib/supabase';

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ServerValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Main validation service class
 */
export class ValidationService {
  /**
   * Validate login form data
   */
  static validateLogin(data: unknown): ValidationResult<LoginFormData> {
    try {
      const sanitizedData = sanitizeAuthData(data);
      const validatedData = loginSchema.parse(sanitizedData);
      
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate registration form data
   */
  static validateRegistration(data: unknown): ValidationResult<RegisterFormData> {
    try {
      const sanitizedData = sanitizeAuthData(data);
      const validatedData = registerSchema.parse(sanitizedData);
      
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate password reset form data
   */
  static validatePasswordReset(data: unknown): ValidationResult {
    try {
      const sanitizedData = sanitizeAuthData(data);
      const validatedData = passwordResetSchema.parse(sanitizedData);
      
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate change password form data
   */
  static validateChangePassword(data: unknown): ValidationResult {
    try {
      const validatedData = changePasswordSchema.parse(data);
      
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate user profile data
   */
  static validateUserProfile(data: unknown, isCreate = false): ValidationResult<UserProfileFormData> {
    try {
      const sanitizedData = sanitizeUserProfile(data);
      const schema = isCreate ? createUserProfileSchema : updateUserProfileSchema;
      const validatedData = schema.parse(sanitizedData);
      
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate medical record data
   */
  static validateMedicalRecord(data: unknown, isCreate = false): ValidationResult<MedicalRecordFormData> {
    try {
      const sanitizedData = sanitizeMedicalRecord(data);
      const schema = isCreate ? createMedicalRecordSchema : updateMedicalRecordSchema;
      const validatedData = schema.parse(sanitizedData);
      
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: File): ValidationResult {
    try {
      const sanitizationResult = sanitizeFileUpload(file);
      
      if (!sanitizationResult.isValid) {
        return {
          isValid: false,
          errors: sanitizationResult.errors.map(error => ({
            field: 'file',
            message: error
          }))
        };
      }

      const validatedData = fileUploadSchema.parse({
        file,
        maxSize: 10 * 1024 * 1024,
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });
      
      return {
        isValid: true,
        data: {
          ...validatedData,
          sanitizedName: sanitizationResult.sanitizedName
        },
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate search filters
   */
  static validateUserProfileFilters(data: unknown): ValidationResult {
    try {
      const validatedData = userProfileFiltersSchema.parse(data);
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate medical record filters
   */
  static validateMedicalRecordFilters(data: unknown): ValidationResult {
    try {
      const validatedData = medicalRecordFiltersSchema.parse(data);
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Validate pagination options
   */
  static validatePagination(data: unknown): ValidationResult {
    try {
      const validatedData = paginationSchema.parse(data);
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  /**
   * Server-side validation for user profile using Supabase functions
   */
  static async validateUserProfileOnServer(profileData: any): Promise<ServerValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_user_profile_data', {
        profile_data: profileData
      });

      if (error) {
        console.error('Server validation error:', error);
        return {
          isValid: false,
          errors: [error.message]
        };
      }

      return {
        isValid: data?.is_valid || false,
        errors: data?.errors || []
      };
    } catch (error) {
      console.error('Server validation failed:', error);
      return {
        isValid: false,
        errors: ['Server validation failed']
      };
    }
  }

  /**
   * Server-side validation for medical record using Supabase functions
   */
  static async validateMedicalRecordOnServer(recordData: any): Promise<ServerValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_medical_record_data', {
        record_data: recordData
      });

      if (error) {
        console.error('Server validation error:', error);
        return {
          isValid: false,
          errors: [error.message]
        };
      }

      return {
        isValid: data?.is_valid || false,
        errors: data?.errors || []
      };
    } catch (error) {
      console.error('Server validation failed:', error);
      return {
        isValid: false,
        errors: ['Server validation failed']
      };
    }
  }

  /**
   * Comprehensive validation that combines client and server validation
   */
  static async validateUserProfileComprehensive(data: unknown, isCreate = false): Promise<ValidationResult> {
    // First, client-side validation
    const clientResult = this.validateUserProfile(data, isCreate);
    
    if (!clientResult.isValid) {
      return clientResult;
    }

    // Then, server-side validation
    try {
      const serverResult = await this.validateUserProfileOnServer(clientResult.data);
      
      if (!serverResult.isValid) {
        return {
          isValid: false,
          data: clientResult.data,
          errors: serverResult.errors.map(error => ({
            field: 'server',
            message: error
          }))
        };
      }

      return clientResult;
    } catch (error) {
      // If server validation fails, still return client validation result
      console.warn('Server validation unavailable, using client validation only');
      return clientResult;
    }
  }

  /**
   * Comprehensive validation for medical records
   */
  static async validateMedicalRecordComprehensive(data: unknown, isCreate = false): Promise<ValidationResult> {
    // First, client-side validation
    const clientResult = this.validateMedicalRecord(data, isCreate);
    
    if (!clientResult.isValid) {
      return clientResult;
    }

    // Then, server-side validation
    try {
      const serverResult = await this.validateMedicalRecordOnServer(clientResult.data);
      
      if (!serverResult.isValid) {
        return {
          isValid: false,
          data: clientResult.data,
          errors: serverResult.errors.map(error => ({
            field: 'server',
            message: error
          }))
        };
      }

      return clientResult;
    } catch (error) {
      // If server validation fails, still return client validation result
      console.warn('Server validation unavailable, using client validation only');
      return clientResult;
    }
  }

  /**
   * Batch validation for multiple items
   */
  static validateBatch<T>(
    items: unknown[],
    validator: (item: unknown) => ValidationResult<T>
  ): { validItems: T[]; errors: Array<{ index: number; errors: ValidationError[] }> } {
    const validItems: T[] = [];
    const errors: Array<{ index: number; errors: ValidationError[] }> = [];

    items.forEach((item, index) => {
      try {
        const result = validator(item);
        if (result.isValid && result.data) {
          validItems.push(result.data);
        } else {
          errors.push({ index, errors: result.errors });
        }
      } catch (error) {
        const errorResult = ValidationService.handleZodError(error);
        errors.push({ index, errors: errorResult.errors });
      }
    });

    return { validItems, errors };
  }

  /**
   * Handle Zod validation errors
   */
  static handleZodError(error: unknown): ValidationResult {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      return {
        isValid: false,
        errors
      };
    }

    return {
      isValid: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
        code: 'UNKNOWN_ERROR'
      }]
    };
  }

  /**
   * Get user-friendly error messages
   */
  static getErrorMessages(errors: ValidationError[]): Record<string, string> {
    const errorMessages: Record<string, string> = {};
    
    errors.forEach(error => {
      errorMessages[error.field] = error.message;
    });

    return errorMessages;
  }

  /**
   * Check if validation errors contain specific field
   */
  static hasFieldError(errors: ValidationError[], field: string): boolean {
    return errors.some(error => error.field === field);
  }

  /**
   * Get errors for specific field
   */
  static getFieldErrors(errors: ValidationError[], field: string): string[] {
    return errors
      .filter(error => error.field === field)
      .map(error => error.message);
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  static sanitizeForLogging(data: any): any {
    return sanitizeForLogging(data);
  }
}

// Export validation functions for direct use
export {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  changePasswordSchema,
  userProfileSchema,
  createUserProfileSchema,
  updateUserProfileSchema,
  medicalRecordSchema,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  userProfileFiltersSchema,
  medicalRecordFiltersSchema,
  paginationSchema,
  fileUploadSchema
};

// Export sanitization functions
export {
  sanitizeUserProfile,
  sanitizeMedicalRecord,
  sanitizeAuthData,
  sanitizeFileUpload,
  sanitizeForLogging
} from '@/lib/data-sanitization';