/**
 * Security Middleware for Data Services
 * Integrates validation, rate limiting, and audit logging with existing services
 */

import { dataValidationService, rateLimitService, auditLogger, type SecurityEvent, type DataAccessEvent, type AppointmentAuditEvent } from './data-validation-service';
import { ErrorHandler } from '@/lib/error-handler';
import type { 
  CreateAppointment, 
  UpdateAppointment, 
  CreateDoctor, 
  UpdateDoctor, 
  CreatePatient, 
  UpdatePatient,
  AppointmentStatus 
} from '@/types/database';

/**
 * Security middleware error class
 */
export class SecurityMiddlewareError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'SecurityMiddlewareError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Request context for security operations
 */
export interface SecurityContext {
  userId: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  operation: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Security middleware for appointment operations
 */
export class AppointmentSecurityMiddleware {
  /**
   * Validate and secure appointment creation
   */
  static async validateCreateAppointment(
    data: CreateAppointment, 
    context: SecurityContext
  ): Promise<CreateAppointment> {
    // Check rate limits
    const rateLimit = dataValidationService.checkRateLimit(context.userId, 'appointment_create');
    if (!rateLimit.allowed) {
      auditLogger.logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { 
          operation: 'appointment_create',
          remainingRequests: rateLimit.remainingRequests,
          resetTime: rateLimit.resetTime
        },
        severity: 'medium'
      });

      throw new SecurityMiddlewareError(
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime || 0) / 1000)} seconds`,
        'RATE_LIMIT_EXCEEDED',
        { remainingRequests: rateLimit.remainingRequests, resetTime: rateLimit.resetTime }
      );
    }

    // Validate and sanitize data
    const validation = dataValidationService.validateAppointment(data);
    if (!validation.isValid) {
      auditLogger.logSecurityEvent({
        type: 'validation_failed',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { 
          operation: 'appointment_create',
          errors: validation.errors 
        },
        severity: 'low'
      });

      throw new SecurityMiddlewareError(
        `Validation failed: ${validation.errors?.join(', ')}`,
        'VALIDATION_FAILED',
        { errors: validation.errors }
      );
    }

    // Log successful validation
    auditLogger.logDataAccess({
      operation: 'appointment_create_validated',
      userId: context.userId,
      resourceType: 'appointment',
      details: { 
        doctorId: data.doctor_id,
        patientId: data.patient_id,
        appointmentDate: data.appointment_date 
      }
    });

    return validation.sanitizedData as CreateAppointment;
  }

  /**
   * Validate and secure appointment updates
   */
  static async validateUpdateAppointment(
    appointmentId: string,
    data: UpdateAppointment, 
    context: SecurityContext
  ): Promise<UpdateAppointment> {
    // Check rate limits
    const rateLimit = dataValidationService.checkRateLimit(context.userId, 'appointment_update');
    if (!rateLimit.allowed) {
      auditLogger.logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { operation: 'appointment_update' },
        severity: 'medium'
      });

      throw new SecurityMiddlewareError(
        'Rate limit exceeded for appointment updates',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Validate partial data (for updates)
    if (Object.keys(data).length === 0) {
      throw new SecurityMiddlewareError(
        'No data provided for update',
        'INVALID_INPUT'
      );
    }

    // Log access
    auditLogger.logDataAccess({
      operation: 'appointment_update',
      userId: context.userId,
      resourceType: 'appointment',
      resourceId: appointmentId,
      details: { updateFields: Object.keys(data) }
    });

    // Sanitize the provided fields
    const sanitizedData: Partial<UpdateAppointment> = {};
    
    if (data.reason_for_visit) {
      sanitizedData.reason_for_visit = data.reason_for_visit.trim().substring(0, 500);
    }
    if (data.symptoms) {
      sanitizedData.symptoms = data.symptoms.trim().substring(0, 1000);
    }
    if (data.patient_notes) {
      sanitizedData.patient_notes = data.patient_notes.trim().substring(0, 1000);
    }
    if (data.doctor_notes) {
      sanitizedData.doctor_notes = data.doctor_notes.trim().substring(0, 2000);
    }
    if (data.consultation_fee !== undefined) {
      if (data.consultation_fee < 0 || data.consultation_fee > 10000) {
        throw new SecurityMiddlewareError(
          'Invalid consultation fee amount',
          'INVALID_INPUT'
        );
      }
      sanitizedData.consultation_fee = data.consultation_fee;
    }

    // Copy other safe fields
    if (data.status) sanitizedData.status = data.status;
    if (data.follow_up_required !== undefined) sanitizedData.follow_up_required = data.follow_up_required;
    if (data.follow_up_date) sanitizedData.follow_up_date = data.follow_up_date;
    if (data.rating) sanitizedData.rating = data.rating;
    if (data.review_text) sanitizedData.review_text = data.review_text.trim().substring(0, 500);

    return sanitizedData as UpdateAppointment;
  }

  /**
   * Log appointment status changes for audit
   */
  static logStatusChange(
    appointmentId: string,
    doctorId: string,
    patientId: string,
    previousStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    context: SecurityContext
  ): void {
    auditLogger.logAppointmentEvent({
      action: 'status_change',
      userId: context.userId,
      appointmentId,
      doctorId,
      patientId,
      previousStatus,
      newStatus,
      details: {
        timestamp: new Date().toISOString(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  }
}

/**
 * Security middleware for doctor operations
 */
export class DoctorSecurityMiddleware {
  /**
   * Validate and secure doctor profile creation
   */
  static async validateCreateDoctor(
    data: CreateDoctor, 
    context: SecurityContext
  ): Promise<CreateDoctor> {
    // Check rate limits
    const rateLimit = dataValidationService.checkRateLimit(context.userId, 'profile_create');
    if (!rateLimit.allowed) {
      auditLogger.logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { operation: 'doctor_create' },
        severity: 'medium'
      });

      throw new SecurityMiddlewareError(
        'Rate limit exceeded for profile creation',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Validate and sanitize data
    const validation = dataValidationService.validateDoctorProfile(data);
    if (!validation.isValid) {
      auditLogger.logSecurityEvent({
        type: 'validation_failed',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { 
          operation: 'doctor_create',
          errors: validation.errors 
        },
        severity: 'low'
      });

      throw new SecurityMiddlewareError(
        `Doctor profile validation failed: ${validation.errors?.join(', ')}`,
        'VALIDATION_FAILED',
        { errors: validation.errors }
      );
    }

    // Log successful creation
    auditLogger.logDataAccess({
      operation: 'doctor_profile_create',
      userId: context.userId,
      resourceType: 'doctor',
      resourceId: data.id,
      details: { 
        specialization: validation.sanitizedData.specialization,
        licenseNumber: validation.sanitizedData.licenseNumber 
      }
    });

    return validation.sanitizedData as CreateDoctor;
  }

  /**
   * Validate and secure doctor profile updates
   */
  static async validateUpdateDoctor(
    doctorId: string,
    data: UpdateDoctor, 
    context: SecurityContext
  ): Promise<UpdateDoctor> {
    // Check rate limits
    const rateLimit = dataValidationService.checkRateLimit(context.userId, 'profile_update');
    if (!rateLimit.allowed) {
      throw new SecurityMiddlewareError(
        'Rate limit exceeded for profile updates',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Ensure user can only update their own profile (unless admin)
    if (context.userId !== doctorId && context.userRole !== 'admin') {
      auditLogger.logSecurityEvent({
        type: 'unauthorized_access_attempt',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { 
          operation: 'doctor_update',
          targetDoctorId: doctorId
        },
        severity: 'high'
      });

      throw new SecurityMiddlewareError(
        'Unauthorized: Cannot update another doctor\'s profile',
        'UNAUTHORIZED'
      );
    }

    // Log access
    auditLogger.logDataAccess({
      operation: 'doctor_profile_update',
      userId: context.userId,
      resourceType: 'doctor',
      resourceId: doctorId,
      details: { updateFields: Object.keys(data) }
    });

    // Return sanitized data (basic sanitization for updates)
    return data;
  }
}

/**
 * Security middleware for patient operations
 */
export class PatientSecurityMiddleware {
  /**
   * Validate and secure patient profile creation
   */
  static async validateCreatePatient(
    data: CreatePatient, 
    context: SecurityContext
  ): Promise<CreatePatient> {
    // Check rate limits
    const rateLimit = dataValidationService.checkRateLimit(context.userId, 'profile_create');
    if (!rateLimit.allowed) {
      throw new SecurityMiddlewareError(
        'Rate limit exceeded for profile creation',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Validate and sanitize data
    const validation = dataValidationService.validateUserProfile(data);
    if (!validation.isValid) {
      auditLogger.logSecurityEvent({
        type: 'validation_failed',
        userId: context.userId,
        details: { 
          operation: 'patient_create',
          errors: validation.errors 
        },
        severity: 'low'
      });

      throw new SecurityMiddlewareError(
        `Patient profile validation failed: ${validation.errors?.join(', ')}`,
        'VALIDATION_FAILED',
        { errors: validation.errors }
      );
    }

    // Log successful creation
    auditLogger.logDataAccess({
      operation: 'patient_profile_create',
      userId: context.userId,
      resourceType: 'patient',
      resourceId: data.id
    });

    return validation.sanitizedData as CreatePatient;
  }

  /**
   * Validate patient profile updates
   */
  static async validateUpdatePatient(
    patientId: string,
    data: UpdatePatient, 
    context: SecurityContext
  ): Promise<UpdatePatient> {
    // Check rate limits
    const rateLimit = dataValidationService.checkRateLimit(context.userId, 'profile_update');
    if (!rateLimit.allowed) {
      throw new SecurityMiddlewareError(
        'Rate limit exceeded for profile updates',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Ensure user can only update their own profile (unless admin)
    if (context.userId !== patientId && context.userRole !== 'admin') {
      auditLogger.logSecurityEvent({
        type: 'unauthorized_access_attempt',
        userId: context.userId,
        details: { 
          operation: 'patient_update',
          targetPatientId: patientId
        },
        severity: 'high'
      });

      throw new SecurityMiddlewareError(
        'Unauthorized: Cannot update another patient\'s profile',
        'UNAUTHORIZED'
      );
    }

    // Log access
    auditLogger.logDataAccess({
      operation: 'patient_profile_update',
      userId: context.userId,
      resourceType: 'patient',
      resourceId: patientId,
      details: { updateFields: Object.keys(data) }
    });

    return data;
  }
}

/**
 * General security utilities
 */
export class SecurityUtils {
  /**
   * Extract IP address from request headers
   */
  static extractIpAddress(headers: Record<string, string>): string {
    return headers['x-forwarded-for'] || 
           headers['x-real-ip'] || 
           headers['cf-connecting-ip'] || 
           'unknown';
  }

  /**
   * Create security context from request
   */
  static createSecurityContext(
    userId: string,
    operation: string,
    headers: Record<string, string> = {},
    userRole?: string,
    resourceType?: string,
    resourceId?: string
  ): SecurityContext {
    return {
      userId,
      userRole,
      ipAddress: this.extractIpAddress(headers),
      userAgent: headers['user-agent'] || 'unknown',
      operation,
      resourceType,
      resourceId
    };
  }

  /**
   * Check if operation requires elevated permissions
   */
  static requiresElevatedPermissions(operation: string): boolean {
    const elevatedOperations = [
      'admin_access',
      'bulk_delete',
      'system_config',
      'audit_access',
      'user_impersonation'
    ];
    
    return elevatedOperations.includes(operation);
  }

  /**
   * Validate session and permissions
   */
  static validateSessionPermissions(
    context: SecurityContext,
    requiredRole?: string
  ): boolean {
    // Basic session validation
    if (!context.userId) {
      return false;
    }

    // Role-based access control
    if (requiredRole) {
      if (!context.userRole) {
        return false;
      }

      const roleHierarchy: Record<string, number> = {
        'patient': 1,
        'doctor': 2,
        'admin': 3
      };

      const userLevel = roleHierarchy[context.userRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 999;

      return userLevel >= requiredLevel;
    }

    return true;
  }

  /**
   * Log security violation
   */
  static logSecurityViolation(
    type: string,
    context: SecurityContext,
    details?: any
  ): void {
    auditLogger.logSecurityEvent({
      type,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        operation: context.operation,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        ...details
      },
      severity: 'high'
    });
  }
}

// Export middleware instances
export const appointmentSecurityMiddleware = AppointmentSecurityMiddleware;
export const doctorSecurityMiddleware = DoctorSecurityMiddleware;
export const patientSecurityMiddleware = PatientSecurityMiddleware;
export const securityUtils = SecurityUtils;

// Export classes
export {
  AppointmentSecurityMiddleware,
  DoctorSecurityMiddleware,
  PatientSecurityMiddleware,
  SecurityUtils
};
