/**
 * Data sanitization utilities for security
 * Provides functions to clean and sanitize user input data
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  // For server-side environments where DOMPurify might not be available
  if (typeof window === 'undefined') {
    // Simple HTML tag removal for server-side
    return input.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

/**
 * Sanitize text input by removing potentially dangerous characters
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, ''); // Only allow word characters, @, ., and -
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') return '';
  
  return phone
    .trim()
    .replace(/[^\d+\-\s()]/g, '') // Only allow digits, +, -, spaces, and parentheses
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize name fields (first name, last name, etc.)
 */
export function sanitizeName(name: string): string {
  if (typeof name !== 'string') return '';
  
  return name
    .trim()
    // Remove HTML tags first
    .replace(/<[^>]*>/g, '')
    // Only allow letters, spaces, hyphens, apostrophes, and periods
    .replace(/[^a-zA-Z\s\-'\.]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Remove multiple consecutive special characters
    .replace(/[-'\.]{2,}/g, (match) => match[0])
    .trim();
}

/**
 * Sanitize medical text fields (descriptions, conditions, etc.)
 */
export function sanitizeMedicalText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    // Remove HTML tags first
    .replace(/<[^>]*>/g, '')
    // Remove null bytes and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Allow basic punctuation and medical symbols but remove dangerous characters
    .replace(/[^\w\s.,;:!?()[\]{}\-+=/\\@#$%^&*"'`~|]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') return '';
  
  return fileName
    .trim()
    // Remove HTML tags first
    .replace(/<[^>]*>/g, '')
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Only allow safe characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores and dots
    .replace(/^[._-]+|[._-]+$/g, '')
    .trim();
}

/**
 * Sanitize URL inputs
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    return urlObj.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
  array: unknown,
  sanitizer: (str: string) => string = sanitizeText
): string[] {
  if (!Array.isArray(array)) return [];
  
  return array
    .filter((item): item is string => typeof item === 'string')
    .map(sanitizer)
    .filter(item => item.length > 0);
}

/**
 * Deep sanitize an object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizers: Partial<Record<keyof T, (value: any) => any>> = {}
): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  for (const [key, value] of Object.entries(sanitized)) {
    const sanitizer = sanitizers[key as keyof T];
    
    if (sanitizer) {
      sanitized[key as keyof T] = sanitizer(value);
    } else if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeText(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeStringArray(value) as T[keyof T];
    } else if (value && typeof value === 'object') {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    }
  }
  
  return sanitized;
}

/**
 * Sanitize user profile data
 */
export function sanitizeUserProfile(profile: any): any {
  if (!profile || typeof profile !== 'object') return profile;
  
  const sanitized = { ...profile };
  
  // Sanitize specific fields
  if (typeof sanitized.first_name === 'string') {
    sanitized.first_name = sanitizeName(sanitized.first_name);
  }
  
  if (typeof sanitized.last_name === 'string') {
    sanitized.last_name = sanitizeName(sanitized.last_name);
  }
  
  if (typeof sanitized.phone_number === 'string') {
    sanitized.phone_number = sanitizePhoneNumber(sanitized.phone_number);
  }
  
  if (typeof sanitized.emergency_contact === 'string') {
    sanitized.emergency_contact = sanitizeText(sanitized.emergency_contact);
  }
  
  // Handle arrays
  if (Array.isArray(sanitized.medical_conditions)) {
    sanitized.medical_conditions = sanitizeStringArray(sanitized.medical_conditions, sanitizeMedicalText);
  }
  
  if (Array.isArray(sanitized.allergies)) {
    sanitized.allergies = sanitizeStringArray(sanitized.allergies, sanitizeMedicalText);
  }
  
  if (Array.isArray(sanitized.medications)) {
    sanitized.medications = sanitizeStringArray(sanitized.medications, sanitizeMedicalText);
  }
  
  return sanitized;
}

/**
 * Sanitize medical record data
 */
export function sanitizeMedicalRecord(record: any): any {
  if (!record || typeof record !== 'object') return record;
  
  const sanitized = { ...record };
  
  // Sanitize specific fields without affecting others like dates
  if (typeof sanitized.title === 'string') {
    sanitized.title = sanitizeText(sanitized.title);
  }
  
  if (typeof sanitized.description === 'string') {
    sanitized.description = sanitizeMedicalText(sanitized.description);
  }
  
  if (typeof sanitized.provider_name === 'string') {
    sanitized.provider_name = sanitizeName(sanitized.provider_name);
  }
  
  // Handle attachments array
  if (Array.isArray(sanitized.attachments)) {
    sanitized.attachments = sanitized.attachments.map(attachment => {
      if (typeof attachment !== 'object' || !attachment) return attachment;
      return {
        ...attachment,
        name: sanitizeFileName(attachment.name || ''),
        url: sanitizeUrl(attachment.url || '')
      };
    });
  }
  
  return sanitized;
}

/**
 * Sanitize authentication data
 */
export function sanitizeAuthData(authData: any): any {
  return sanitizeObject(authData, {
    email: sanitizeEmail,
    firstName: sanitizeName,
    lastName: sanitizeName,
    specialization: sanitizeText,
    licenseNumber: (license: string) => {
      if (typeof license !== 'string') return '';
      return license.trim().replace(/[^a-zA-Z0-9\-]/g, '');
    }
  });
}

/**
 * Validate and sanitize file upload data
 */
export function sanitizeFileUpload(file: File): { isValid: boolean; sanitizedName: string; errors: string[] } {
  const errors: string[] = [];
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 10MB limit');
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }
  
  // Sanitize file name
  const sanitizedName = sanitizeFileName(file.name);
  if (!sanitizedName) {
    errors.push('Invalid file name');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedName,
    errors
  };
}

/**
 * Remove sensitive information from objects for logging
 */
export function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'licenseNumber',
    'ssn',
    'socialSecurityNumber'
  ];
  
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value);
    }
  }
  
  return sanitized;
}

/**
 * Escape special characters for SQL-like queries (though Supabase handles this)
 */
export function escapeSqlLikePattern(pattern: string): string {
  if (typeof pattern !== 'string') return '';
  
  return pattern
    .replace(/[%_\\]/g, '\\$&') // Escape SQL LIKE wildcards
    .replace(/'/g, "''"); // Escape single quotes
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  
  return query
    .trim()
    .replace(/[^\w\s\-'".]/g, '') // Only allow word characters, spaces, hyphens, apostrophes, quotes, and periods
    .replace(/\s+/g, ' ')
    .slice(0, 100) // Limit length
    .trim();
}