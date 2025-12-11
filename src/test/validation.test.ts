/**
 * Comprehensive tests for the validation system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationService } from '@/services/validation';
import {
  sanitizeText,
  sanitizeEmail,
  sanitizeName,
  sanitizePhoneNumber,
  sanitizeMedicalText,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeUserProfile,
  sanitizeMedicalRecord,
  sanitizeAuthData,
  sanitizeFileUpload
} from '@/lib/data-sanitization';

describe('ValidationService', () => {
  describe('validateLogin', () => {
    it('should validate correct login data', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      };

      const result = ValidationService.validateLogin(loginData);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      });
    });

    it('should reject invalid email', () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const result = ValidationService.validateLogin(loginData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should reject empty password', () => {
      const loginData = {
        email: 'test@example.com',
        password: ''
      };

      const result = ValidationService.validateLogin(loginData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('password');
    });
  });

  describe('validateRegistration', () => {
    it('should validate correct registration data', () => {
      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        userType: 'patient',
        agreeToTerms: true
      };

      const result = ValidationService.validateRegistration(registrationData);
      expect(result.isValid).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        userType: 'patient',
        agreeToTerms: true
      };

      const result = ValidationService.validateRegistration(registrationData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'confirmPassword')).toBe(true);
    });

    it('should require specialization for doctors', () => {
      const registrationData = {
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        userType: 'doctor',
        agreeToTerms: true
      };

      const result = ValidationService.validateRegistration(registrationData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'specialization')).toBe(true);
    });

    it('should require license number for doctors', () => {
      const registrationData = {
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        userType: 'doctor',
        specialization: 'cardiology',
        agreeToTerms: true
      };

      const result = ValidationService.validateRegistration(registrationData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'licenseNumber')).toBe(true);
    });
  });

  describe('validateUserProfile', () => {
    it('should validate correct user profile data', () => {
      const profileData = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        phone_number: '+1234567890',
        emergency_contact: 'Jane Doe - Wife',
        medical_conditions: ['Hypertension'],
        allergies: ['Peanuts'],
        medications: ['Lisinopril']
      };

      const result = ValidationService.validateUserProfile(profileData);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid date of birth', () => {
      const profileData = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '2030-01-01' // Future date
      };

      const result = ValidationService.validateUserProfile(profileData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date_of_birth')).toBe(true);
    });

    it('should reject too many medical conditions', () => {
      const profileData = {
        first_name: 'John',
        last_name: 'Doe',
        medical_conditions: new Array(25).fill('Condition') // More than 20
      };

      const result = ValidationService.validateUserProfile(profileData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'medical_conditions')).toBe(true);
    });
  });

  describe('validateMedicalRecord', () => {
    it('should validate correct medical record data', () => {
      const recordData = {
        title: 'Annual Physical Exam',
        record_type: 'appointment' as const,
        description: 'Routine annual physical examination',
        date_recorded: new Date('2023-01-01'),
        provider_name: 'Dr. Smith',
        attachments: []
      };

      const result = ValidationService.validateMedicalRecord(recordData);
      if (!result.isValid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
    });

    it('should reject empty title', () => {
      const recordData = {
        title: '',
        record_type: 'appointment',
        date_recorded: new Date('2023-01-01')
      };

      const result = ValidationService.validateMedicalRecord(recordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should reject future date', () => {
      const recordData = {
        title: 'Future Appointment',
        record_type: 'appointment',
        date_recorded: new Date('2030-01-01') // Future date
      };

      const result = ValidationService.validateMedicalRecord(recordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date_recorded')).toBe(true);
    });

    it('should reject invalid record type', () => {
      const recordData = {
        title: 'Test Record',
        record_type: 'invalid_type',
        date_recorded: new Date('2023-01-01')
      };

      const result = ValidationService.validateMedicalRecord(recordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'record_type')).toBe(true);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct file', () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = ValidationService.validateFileUpload(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized file', () => {
      // Create a mock file that's too large
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      const result = ValidationService.validateFileUpload(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('size'))).toBe(true);
    });

    it('should reject invalid file type', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      
      const result = ValidationService.validateFileUpload(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('type'))).toBe(true);
    });
  });

  describe('batch validation', () => {
    it('should validate multiple items', () => {
      const items = [
        { email: 'test1@example.com', password: 'password123' },
        { email: 'test2@example.com', password: 'password456' },
        { email: 'invalid-email', password: 'password789' }
      ];

      const result = ValidationService.validateBatch(items, ValidationService.validateLogin);
      
      expect(result.validItems).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(2);
    });
  });
});

describe('Data Sanitization', () => {
  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00\x01World\x1F';
      const result = sanitizeText(input);
      expect(result).toBe('HelloWorld');
    });

    it('should normalize whitespace', () => {
      const input = '  Hello    World  ';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText('   ')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should remove invalid characters', () => {
      const input = 'test<script>@example.com';
      const result = sanitizeEmail(input);
      expect(result).toBe('testscript@example.com');
    });
  });

  describe('sanitizeName', () => {
    it('should allow valid name characters', () => {
      const input = "John O'Connor-Smith Jr.";
      const result = sanitizeName(input);
      expect(result).toBe("John O'Connor-Smith Jr.");
    });

    it('should remove invalid characters', () => {
      const input = 'John123<script>Smith';
      const result = sanitizeName(input);
      expect(result).toBe('JohnSmith');
    });

    it('should normalize multiple spaces', () => {
      const input = 'John    Smith';
      const result = sanitizeName(input);
      expect(result).toBe('John Smith');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should allow valid phone characters', () => {
      const input = '+1 (555) 123-4567';
      const result = sanitizePhoneNumber(input);
      expect(result).toBe('+1 (555) 123-4567');
    });

    it('should remove invalid characters', () => {
      const input = '+1abc(555)def123-4567';
      const result = sanitizePhoneNumber(input);
      expect(result).toBe('+1(555)123-4567');
    });
  });

  describe('sanitizeFileName', () => {
    it('should create safe file names', () => {
      const input = 'my document<script>.pdf';
      const result = sanitizeFileName(input);
      expect(result).toBe('my_document.pdf');
    });

    it('should handle path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFileName(input);
      expect(result).toBe('etcpasswd');
    });

    it('should remove multiple underscores', () => {
      const input = 'file___name.txt';
      const result = sanitizeFileName(input);
      expect(result).toBe('file_name.txt');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      const input = 'https://example.com/path';
      const result = sanitizeUrl(input);
      expect(result).toBe('https://example.com/path');
    });

    it('should allow valid HTTP URLs', () => {
      const input = 'http://example.com/path';
      const result = sanitizeUrl(input);
      expect(result).toBe('http://example.com/path');
    });

    it('should reject invalid protocols', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should reject malformed URLs', () => {
      const input = 'not-a-url';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeUserProfile', () => {
    it('should sanitize all profile fields', () => {
      const input = {
        first_name: 'John<script>',
        last_name: 'Doe</script>',
        phone_number: '+1abc555def1234',
        emergency_contact: 'Jane\x00Doe',
        medical_conditions: ['Condition\x01One', 'Condition<script>Two'],
        allergies: ['Allergy\x1FOne'],
        medications: ['Med\x00One']
      };

      const result = sanitizeUserProfile(input);
      
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.phone_number).toBe('+15551234');
      expect(result.emergency_contact).toBe('JaneDoe');
      expect(result.medical_conditions).toEqual(['ConditionOne', 'ConditionTwo']);
      expect(result.allergies).toEqual(['AllergyOne']);
      expect(result.medications).toEqual(['MedOne']);
    });
  });

  describe('sanitizeMedicalRecord', () => {
    it('should sanitize medical record fields', () => {
      const input = {
        title: 'Record<script>Title',
        description: 'Description\x00with\x01control\x1Fchars',
        provider_name: 'Dr.<script>Smith',
        attachments: [
          { name: 'file<script>.pdf', url: 'javascript:alert("xss")' },
          { name: 'valid_file.pdf', url: 'https://example.com/file.pdf' }
        ]
      };

      const result = sanitizeMedicalRecord(input);
      
      expect(result.title).toBe('RecordTitle');
      expect(result.description).toBe('Descriptionwithcontrolchars');
      expect(result.provider_name).toBe('Dr.Smith');
      expect(result.attachments[0].name).toBe('file.pdf');
      expect(result.attachments[0].url).toBe('');
      expect(result.attachments[1].name).toBe('valid_file.pdf');
      expect(result.attachments[1].url).toBe('https://example.com/file.pdf');
    });
  });

  describe('sanitizeFileUpload', () => {
    it('should validate and sanitize file upload', () => {
      const file = new File(['content'], 'my file<script>.pdf', { type: 'application/pdf' });
      
      const result = sanitizeFileUpload(file);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedName).toBe('my_file.pdf');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject oversized files', () => {
      // Mock a large file
      Object.defineProperty(File.prototype, 'size', {
        value: 11 * 1024 * 1024, // 11MB
        writable: false
      });
      
      const file = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      
      const result = sanitizeFileUpload(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('size'))).toBe(true);
    });
  });
});

describe('Error Handling', () => {
  describe('getErrorMessages', () => {
    it('should convert validation errors to field messages', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];

      const result = ValidationService.getErrorMessages(errors);
      
      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Password too short'
      });
    });
  });

  describe('hasFieldError', () => {
    it('should check if field has error', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];

      expect(ValidationService.hasFieldError(errors, 'email')).toBe(true);
      expect(ValidationService.hasFieldError(errors, 'username')).toBe(false);
    });
  });

  describe('getFieldErrors', () => {
    it('should get all errors for a field', () => {
      const errors = [
        { field: 'password', message: 'Password too short' },
        { field: 'password', message: 'Password needs uppercase' },
        { field: 'email', message: 'Invalid email' }
      ];

      const result = ValidationService.getFieldErrors(errors, 'password');
      
      expect(result).toEqual([
        'Password too short',
        'Password needs uppercase'
      ]);
    });
  });
});