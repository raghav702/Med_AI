import { describe, it, expect } from 'vitest';
import { ValidationService } from '@/services/validation';

describe('Password Reset Validation', () => {
  it('should validate email format correctly', () => {
    const validEmail = { email: 'test@example.com' };
    const invalidEmail = { email: 'invalid-email' };

    // Test valid email
    const validResult = ValidationService.validatePasswordReset(validEmail);
    expect(validResult).toBeDefined();
    expect(validResult.isValid).toBe(true);

    // Test invalid email
    const invalidResult = ValidationService.validatePasswordReset(invalidEmail);
    expect(invalidResult).toBeDefined();
    expect(invalidResult.isValid).toBe(false);
  });

  it('should handle empty email', () => {
    const emptyEmail = { email: '' };
    const result = ValidationService.validatePasswordReset(emptyEmail);
    expect(result).toBeDefined();
    expect(result.isValid).toBe(false);
  });

  it('should validate password reset form data structure', () => {
    const validData = { email: 'user@example.com' };
    const result = ValidationService.validatePasswordReset(validData);
    
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});