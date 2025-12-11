/**
 * Validation Service
 * 
 * Centralized validation service using Zod schemas
 */

import { ZodSchema, ZodError } from 'zod';
import {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  changePasswordSchema,
  userProfileSchema,
  createUserProfileSchema,
  updateUserProfileSchema,
  doctorProfileSchema,
  createDoctorSchema,
  updateDoctorSchema,
  patientProfileSchema,
  createPatientSchema,
  updatePatientSchema,
  appointmentSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentRatingSchema,
  doctorSearchFiltersSchema,
  appointmentFiltersSchema,
  aiMessageSchema,
  userRoleSchema,
  appointmentStatusSchema
} from '@/lib/validation-schemas';
import { ErrorHandler } from '@/lib/error-handler';

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation Service class
 */
export class ValidationService {
  /**
   * Validate data against a Zod schema
   */
  static validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return {
          success: false,
          errors
        };
      }
      
      return {
        success: false,
        errors: [{
          field: 'unknown',
          message: 'Validation failed',
          code: 'UNKNOWN_ERROR'
        }]
      };
    }
  }

  /**
   * Validate and throw on error
   */
  static validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = this.validate(schema, data);
    if (!result.success) {
      const errorMessage = result.errors?.map(e => `${e.field}: ${e.message}`).join(', ') || 'Validation failed';
      throw ErrorHandler.handleValidationError(new Error(errorMessage));
    }
    return result.data!;
  }

  /**
   * Validate login form data
   */
  static validateLogin(data: unknown): ValidationResult<any> {
    return this.validate(loginSchema, data);
  }

  /**
   * Validate registration form data
   */
  static validateRegister(data: unknown): ValidationResult<any> {
    return this.validate(registerSchema, data);
  }

  /**
   * Validate password reset form data
   */
  static validatePasswordReset(data: unknown): ValidationResult<any> {
    return this.validate(passwordResetSchema, data);
  }

  /**
   * Validate change password form data
   */
  static validateChangePassword(data: unknown): ValidationResult<any> {
    return this.validate(changePasswordSchema, data);
  }

  /**
   * Validate user profile data
   */
  static validateUserProfile(data: unknown): ValidationResult<any> {
    return this.validate(userProfileSchema, data);
  }

  /**
   * Validate create user profile data
   */
  static validateCreateUserProfile(data: unknown): ValidationResult<any> {
    return this.validate(createUserProfileSchema, data);
  }

  /**
   * Validate update user profile data
   */
  static validateUpdateUserProfile(data: unknown): ValidationResult<any> {
    return this.validate(updateUserProfileSchema, data);
  }

  /**
   * Validate doctor profile data
   */
  static validateDoctorProfile(data: unknown): ValidationResult<any> {
    return this.validate(doctorProfileSchema, data);
  }

  /**
   * Validate create doctor data
   */
  static validateCreateDoctor(data: unknown): ValidationResult<any> {
    return this.validate(createDoctorSchema, data);
  }

  /**
   * Validate update doctor data
   */
  static validateUpdateDoctor(data: unknown): ValidationResult<any> {
    return this.validate(updateDoctorSchema, data);
  }

  /**
   * Validate patient profile data
   */
  static validatePatientProfile(data: unknown): ValidationResult<any> {
    return this.validate(patientProfileSchema, data);
  }

  /**
   * Validate create patient data
   */
  static validateCreatePatient(data: unknown): ValidationResult<any> {
    return this.validate(createPatientSchema, data);
  }

  /**
   * Validate update patient data
   */
  static validateUpdatePatient(data: unknown): ValidationResult<any> {
    return this.validate(updatePatientSchema, data);
  }

  /**
   * Validate appointment data
   */
  static validateAppointment(data: unknown): ValidationResult<any> {
    return this.validate(appointmentSchema, data);
  }

  /**
   * Validate create appointment data
   */
  static validateCreateAppointment(data: unknown): ValidationResult<any> {
    return this.validate(createAppointmentSchema, data);
  }

  /**
   * Validate update appointment data
   */
  static validateUpdateAppointment(data: unknown): ValidationResult<any> {
    return this.validate(updateAppointmentSchema, data);
  }

  /**
   * Validate appointment rating data
   */
  static validateAppointmentRating(data: unknown): ValidationResult<any> {
    return this.validate(appointmentRatingSchema, data);
  }

  /**
   * Validate doctor search filters
   */
  static validateDoctorSearchFilters(data: unknown): ValidationResult<any> {
    return this.validate(doctorSearchFiltersSchema, data);
  }

  /**
   * Validate appointment filters
   */
  static validateAppointmentFilters(data: unknown): ValidationResult<any> {
    return this.validate(appointmentFiltersSchema, data);
  }

  /**
   * Validate AI message
   */
  static validateAIMessage(data: unknown): ValidationResult<any> {
    return this.validate(aiMessageSchema, data);
  }

  /**
   * Validate user role
   */
  static validateUserRole(data: unknown): ValidationResult<any> {
    return this.validate(userRoleSchema, data);
  }

  /**
   * Validate appointment status
   */
  static validateAppointmentStatus(data: unknown): ValidationResult<any> {
    return this.validate(appointmentStatusSchema, data);
  }

  /**
   * Get first error message from validation result
   */
  static getFirstError(result: ValidationResult<any>): string | null {
    if (result.success || !result.errors || result.errors.length === 0) {
      return null;
    }
    return result.errors[0].message;
  }

  /**
   * Get all error messages from validation result
   */
  static getAllErrors(result: ValidationResult<any>): string[] {
    if (result.success || !result.errors) {
      return [];
    }
    return result.errors.map(e => e.message);
  }

  /**
   * Get errors grouped by field
   */
  static getErrorsByField(result: ValidationResult<any>): Record<string, string[]> {
    if (result.success || !result.errors) {
      return {};
    }

    const errorsByField: Record<string, string[]> = {};
    result.errors.forEach(error => {
      if (!errorsByField[error.field]) {
        errorsByField[error.field] = [];
      }
      errorsByField[error.field].push(error.message);
    });

    return errorsByField;
  }

  /**
   * Check if a field has errors
   */
  static hasFieldError(result: ValidationResult<any>, field: string): boolean {
    if (result.success || !result.errors) {
      return false;
    }
    return result.errors.some(e => e.field === field);
  }

  /**
   * Get error message for a specific field
   */
  static getFieldError(result: ValidationResult<any>, field: string): string | null {
    if (result.success || !result.errors) {
      return null;
    }
    const error = result.errors.find(e => e.field === field);
    return error ? error.message : null;
  }

  /**
   * Sanitize input data (remove extra fields, trim strings)
   */
  static sanitizeInput(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate email format (simple check)
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  static isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  /**
   * Validate time format (HH:MM)
   */
  static isValidTime(time: string): boolean {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return false;
    }
    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
  }
}

// Export singleton instance
export const validationService = ValidationService;

// Export types
export type { ValidationResult, ValidationError };
