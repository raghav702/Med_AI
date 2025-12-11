/**
 * Data Validation and Security Service
 * Provides comprehensive input validation, sanitization, and security measures
 */

import DOMPurify from 'dompurify';
import validator from 'validator';
import { z } from 'zod';

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: []
    });
  }

  /**
   * Sanitize and validate email addresses
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }
    return validator.normalizeEmail(email.trim()) || '';
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }
    // Remove all non-digit characters except + for international numbers
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Sanitize text input (names, descriptions, etc.)
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    // Remove HTML tags and trim whitespace
    return this.sanitizeHtml(input).trim();
  }

  /**
   * Sanitize and validate numeric input
   */
  static sanitizeNumber(input: any): number | null {
    if (input === null || input === undefined || input === '') {
      return null;
    }
    const num = Number(input);
    return isNaN(num) ? null : num;
  }

  /**
   * Sanitize SQL-like input to prevent injection
   */
  static sanitizeSqlInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    // Remove SQL injection patterns
    return input
      .replace(/['";]/g, '') // Remove quotes and semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, '') // Remove block comment end
      .trim();
  }
}

/**
 * Enhanced validation schemas using Zod
 */
export class ValidationSchemas {
  // User profile validation
  static readonly userProfile = z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
    
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
    
    email: z.string()
      .email('Invalid email address')
      .max(254, 'Email must be less than 254 characters'),
    
    phoneNumber: z.string()
      .regex(/^\+?[\d\s()-]+$/, 'Invalid phone number format')
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be less than 20 characters')
      .optional(),
    
    dateOfBirth: z.string()
      .datetime('Invalid date format')
      .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 0 && age <= 150;
      }, 'Invalid date of birth')
      .optional()
  });

  // Doctor profile validation
  static readonly doctorProfile = z.object({
    licenseNumber: z.string()
      .min(5, 'License number must be at least 5 characters')
      .max(20, 'License number must be less than 20 characters')
      .regex(/^[A-Za-z0-9\-_]+$/, 'License number contains invalid characters'),
    
    specialization: z.string()
      .min(2, 'Specialization must be at least 2 characters')
      .max(100, 'Specialization must be less than 100 characters'),
    
    subSpecialization: z.string()
      .max(100, 'Sub-specialization must be less than 100 characters')
      .optional(),
    
    yearsOfExperience: z.number()
      .int('Years of experience must be a whole number')
      .min(0, 'Years of experience cannot be negative')
      .max(70, 'Years of experience cannot exceed 70'),
    
    consultationFee: z.number()
      .min(0, 'Consultation fee cannot be negative')
      .max(10000, 'Consultation fee cannot exceed $10,000'),
    
    bio: z.string()
      .max(1000, 'Bio must be less than 1000 characters')
      .optional(),
    
    education: z.array(z.string().max(200))
      .max(10, 'Cannot have more than 10 education entries')
      .optional(),
    
    certifications: z.array(z.string().max(200))
      .max(20, 'Cannot have more than 20 certifications')
      .optional(),
    
    languagesSpoken: z.array(z.string().max(50))
      .min(1, 'At least one language is required')
      .max(10, 'Cannot speak more than 10 languages'),
    
    officeAddress: z.string()
      .max(500, 'Office address must be less than 500 characters')
      .optional(),
    
    officePhone: z.string()
      .regex(/^\+?[\d\s()-]+$/, 'Invalid office phone format')
      .optional()
  });

  // Patient profile validation
  static readonly patientProfile = z.object({
    emergencyContactName: z.string()
      .max(100, 'Emergency contact name must be less than 100 characters')
      .optional(),
    
    emergencyContactPhone: z.string()
      .regex(/^\+?[\d\s()-]+$/, 'Invalid emergency contact phone format')
      .optional(),
    
    insuranceProvider: z.string()
      .max(100, 'Insurance provider must be less than 100 characters')
      .optional(),
    
    insurancePolicyNumber: z.string()
      .max(50, 'Insurance policy number must be less than 50 characters')
      .optional(),
    
    heightCm: z.number()
      .min(30, 'Height must be at least 30 cm')
      .max(300, 'Height cannot exceed 300 cm')
      .optional(),
    
    weightKg: z.number()
      .min(1, 'Weight must be at least 1 kg')
      .max(500, 'Weight cannot exceed 500 kg')
      .optional(),
    
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .optional(),
    
    preferredLanguage: z.string()
      .max(50, 'Preferred language must be less than 50 characters')
      .optional()
  });

  // Appointment validation
  static readonly appointment = z.object({
    doctorId: z.string()
      .uuid('Invalid doctor ID format'),
    
    patientId: z.string()
      .uuid('Invalid patient ID format'),
    
    appointmentDate: z.string()
      .datetime('Invalid appointment date format')
      .refine((date) => {
        const appointmentDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appointmentDate >= today;
      }, 'Appointment date cannot be in the past'),
    
    appointmentTime: z.string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    
    durationMinutes: z.number()
      .int('Duration must be a whole number')
      .min(15, 'Appointment must be at least 15 minutes')
      .max(480, 'Appointment cannot exceed 8 hours')
      .optional(),
    
    reasonForVisit: z.string()
      .min(5, 'Reason for visit must be at least 5 characters')
      .max(500, 'Reason for visit must be less than 500 characters'),
    
    symptoms: z.string()
      .max(1000, 'Symptoms must be less than 1000 characters')
      .optional(),
    
    consultationFee: z.number()
      .min(0, 'Consultation fee cannot be negative')
      .max(10000, 'Consultation fee cannot exceed $10,000'),
    
    patientNotes: z.string()
      .max(1000, 'Patient notes must be less than 1000 characters')
      .optional(),
    
    doctorNotes: z.string()
      .max(2000, 'Doctor notes must be less than 2000 characters')
      .optional()
  });
}

/**
 * Rate limiting service to prevent abuse
 */
export class RateLimitService {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_REQUESTS = 100; // Max requests per window

  /**
   * Check if request is within rate limit
   */
  static isWithinLimit(identifier: string, maxRequests?: number): boolean {
    const now = Date.now();
    const windowMax = maxRequests || this.MAX_REQUESTS;
    
    const requestData = this.requests.get(identifier);
    
    if (!requestData || now > requestData.resetTime) {
      // New window or expired window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.WINDOW_SIZE
      });
      return true;
    }
    
    if (requestData.count >= windowMax) {
      return false;
    }
    
    // Increment request count
    requestData.count++;
    this.requests.set(identifier, requestData);
    
    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  static getRemainingRequests(identifier: string, maxRequests?: number): number {
    const windowMax = maxRequests || this.MAX_REQUESTS;
    const requestData = this.requests.get(identifier);
    
    if (!requestData || Date.now() > requestData.resetTime) {
      return windowMax;
    }
    
    return Math.max(0, windowMax - requestData.count);
  }

  /**
   * Get time until rate limit resets
   */
  static getResetTime(identifier: string): number {
    const requestData = this.requests.get(identifier);
    
    if (!requestData || Date.now() > requestData.resetTime) {
      return 0;
    }
    
    return requestData.resetTime - Date.now();
  }

  /**
   * Clear expired entries (cleanup)
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Audit logging service for security and compliance
 */
export class AuditLogger {
  private static logs: AuditLogEntry[] = [];
  private static readonly MAX_LOGS = 10000; // Keep last 10k logs in memory

  /**
   * Log security-related events
   */
  static logSecurityEvent(event: SecurityEvent): void {
    const logEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'security',
      event: event.type,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      severity: event.severity || 'medium'
    };

    this.addLog(logEntry);
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', logEntry);
    }
  }

  /**
   * Log data access events
   */
  static logDataAccess(access: DataAccessEvent): void {
    const logEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'data_access',
      event: access.operation,
      userId: access.userId,
      resourceType: access.resourceType,
      resourceId: access.resourceId,
      details: access.details,
      severity: 'low'
    };

    this.addLog(logEntry);
  }

  /**
   * Log appointment-related events
   */
  static logAppointmentEvent(appointment: AppointmentAuditEvent): void {
    const logEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'appointment',
      event: appointment.action,
      userId: appointment.userId,
      resourceType: 'appointment',
      resourceId: appointment.appointmentId,
      details: {
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        previousStatus: appointment.previousStatus,
        newStatus: appointment.newStatus,
        ...appointment.details
      },
      severity: 'medium'
    };

    this.addLog(logEntry);
  }

  /**
   * Add log entry to memory store
   */
  private static addLog(logEntry: AuditLogEntry): void {
    this.logs.push(logEntry);
    
    // Maintain max logs limit
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift(); // Remove oldest log
    }
  }

  /**
   * Get audit logs with filtering
   */
  static getLogs(filters: AuditLogFilters = {}): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters.type) {
      filteredLogs = filteredLogs.filter(log => log.type === filters.type);
    }

    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
    }

    if (filters.fromDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= new Date(filters.fromDate!)
      );
    }

    if (filters.toDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= new Date(filters.toDate!)
      );
    }

    // Sort by timestamp descending (newest first)
    return filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get security alerts (high severity events)
   */
  static getSecurityAlerts(): AuditLogEntry[] {
    return this.getLogs({ 
      type: 'security', 
      severity: 'high',
      fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
    });
  }

  /**
   * Clear old logs (for cleanup)
   */
  static clearOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );
  }
}

/**
 * Comprehensive data validation service
 */
export class DataValidationService {
  /**
   * Validate and sanitize user profile data
   */
  static validateUserProfile(data: any): { isValid: boolean; sanitizedData?: any; errors?: string[] } {
    try {
      // Sanitize input first
      const sanitizedData = {
        firstName: InputSanitizer.sanitizeText(data.firstName),
        lastName: InputSanitizer.sanitizeText(data.lastName),
        email: InputSanitizer.sanitizeEmail(data.email),
        phoneNumber: data.phoneNumber ? InputSanitizer.sanitizePhoneNumber(data.phoneNumber) : undefined,
        dateOfBirth: data.dateOfBirth
      };

      // Validate with schema
      const result = ValidationSchemas.userProfile.safeParse(sanitizedData);
      
      if (result.success) {
        return { isValid: true, sanitizedData: result.data };
      } else {
        return { 
          isValid: false, 
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: ['Validation failed due to invalid input format']
      };
    }
  }

  /**
   * Validate and sanitize doctor profile data
   */
  static validateDoctorProfile(data: any): { isValid: boolean; sanitizedData?: any; errors?: string[] } {
    try {
      const sanitizedData = {
        licenseNumber: InputSanitizer.sanitizeSqlInput(data.licenseNumber),
        specialization: InputSanitizer.sanitizeText(data.specialization),
        subSpecialization: data.subSpecialization ? InputSanitizer.sanitizeText(data.subSpecialization) : undefined,
        yearsOfExperience: InputSanitizer.sanitizeNumber(data.yearsOfExperience),
        consultationFee: InputSanitizer.sanitizeNumber(data.consultationFee),
        bio: data.bio ? InputSanitizer.sanitizeText(data.bio) : undefined,
        education: Array.isArray(data.education) ? data.education.map((edu: any) => InputSanitizer.sanitizeText(edu)) : undefined,
        certifications: Array.isArray(data.certifications) ? data.certifications.map((cert: any) => InputSanitizer.sanitizeText(cert)) : undefined,
        languagesSpoken: Array.isArray(data.languagesSpoken) ? data.languagesSpoken.map((lang: any) => InputSanitizer.sanitizeText(lang)) : ['English'],
        officeAddress: data.officeAddress ? InputSanitizer.sanitizeText(data.officeAddress) : undefined,
        officePhone: data.officePhone ? InputSanitizer.sanitizePhoneNumber(data.officePhone) : undefined
      };

      const result = ValidationSchemas.doctorProfile.safeParse(sanitizedData);
      
      if (result.success) {
        return { isValid: true, sanitizedData: result.data };
      } else {
        return { 
          isValid: false, 
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: ['Validation failed due to invalid input format']
      };
    }
  }

  /**
   * Validate and sanitize appointment data
   */
  static validateAppointment(data: any): { isValid: boolean; sanitizedData?: any; errors?: string[] } {
    try {
      const sanitizedData = {
        doctorId: data.doctorId,
        patientId: data.patientId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        durationMinutes: InputSanitizer.sanitizeNumber(data.durationMinutes),
        reasonForVisit: InputSanitizer.sanitizeText(data.reasonForVisit),
        symptoms: data.symptoms ? InputSanitizer.sanitizeText(data.symptoms) : undefined,
        consultationFee: InputSanitizer.sanitizeNumber(data.consultationFee),
        patientNotes: data.patientNotes ? InputSanitizer.sanitizeText(data.patientNotes) : undefined,
        doctorNotes: data.doctorNotes ? InputSanitizer.sanitizeText(data.doctorNotes) : undefined
      };

      const result = ValidationSchemas.appointment.safeParse(sanitizedData);
      
      if (result.success) {
        return { isValid: true, sanitizedData: result.data };
      } else {
        return { 
          isValid: false, 
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: ['Validation failed due to invalid input format']
      };
    }
  }

  /**
   * Check rate limits for user operations
   */
  static checkRateLimit(userId: string, operation: string): { allowed: boolean; remainingRequests?: number; resetTime?: number } {
    const identifier = `${userId}:${operation}`;
    
    // Different limits for different operations
    const operationLimits: Record<string, number> = {
      'appointment_create': 10, // 10 appointments per 15 minutes
      'profile_update': 5, // 5 profile updates per 15 minutes
      'search': 50, // 50 searches per 15 minutes
      'default': 100 // Default limit
    };

    const maxRequests = operationLimits[operation] || operationLimits.default;
    const allowed = RateLimitService.isWithinLimit(identifier, maxRequests);
    
    return {
      allowed,
      remainingRequests: RateLimitService.getRemainingRequests(identifier, maxRequests),
      resetTime: RateLimitService.getResetTime(identifier)
    };
  }
}

// Type definitions for audit logging
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'security' | 'data_access' | 'appointment' | 'auth';
  event: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityEvent {
  type: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  severity?: 'low' | 'medium' | 'high';
}

export interface DataAccessEvent {
  operation: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
}

export interface AppointmentAuditEvent {
  action: string;
  userId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  previousStatus?: string;
  newStatus?: string;
  details?: any;
}

export interface AuditLogFilters {
  userId?: string;
  type?: 'security' | 'data_access' | 'appointment' | 'auth';
  severity?: 'low' | 'medium' | 'high';
  fromDate?: string;
  toDate?: string;
}

// Export the main service instances
export const inputSanitizer = InputSanitizer;
export const validationSchemas = ValidationSchemas;
export const rateLimitService = RateLimitService;
export const auditLogger = AuditLogger;
export const dataValidationService = DataValidationService;
