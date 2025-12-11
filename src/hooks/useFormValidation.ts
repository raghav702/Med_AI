/**
 * Enhanced form validation hooks that integrate with the comprehensive validation system
 */

import { useState, useCallback, useEffect } from 'react';
import { useForm, UseFormProps, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ValidationService, ValidationResult, ValidationError } from '@/services/validation';
import {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  changePasswordSchema,
  userProfileSchema,
  medicalRecordSchema,
  type LoginFormData,
  type RegisterFormData,
  type UserProfileFormData,
  type MedicalRecordFormData
} from '@/lib/validation-schemas';

export interface FormValidationOptions<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  enableServerValidation?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface FormValidationResult<T extends FieldValues> {
  form: UseFormReturn<T>;
  isValidating: boolean;
  serverErrors: Record<string, string>;
  validateField: (field: Path<T>, value: any) => Promise<void>;
  validateForm: () => Promise<boolean>;
  clearServerErrors: () => void;
  setServerError: (field: Path<T>, message: string) => void;
}

/**
 * Enhanced form validation hook with server-side validation support
 */
export function useFormValidation<T extends FieldValues>(
  options: FormValidationOptions<T>,
  formOptions?: UseFormProps<T>
): FormValidationResult<T> {
  const [isValidating, setIsValidating] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const form = useForm<T>({
    resolver: zodResolver(options.schema),
    mode: options.validateOnChange ? 'onChange' : 'onSubmit',
    ...formOptions
  });

  const clearServerErrors = useCallback(() => {
    setServerErrors({});
  }, []);

  const setServerError = useCallback((field: Path<T>, message: string) => {
    setServerErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const validateField = useCallback(async (field: Path<T>, value: any) => {
    if (!options.enableServerValidation) return;

    try {
      setIsValidating(true);
      
      // Clear previous server error for this field
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      // Perform server-side validation based on field type
      // This is a simplified example - you'd implement specific validation logic
      // based on your field types and validation requirements
      
    } catch (error) {
      console.error('Field validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [options.enableServerValidation]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    const isClientValid = await form.trigger();
    
    if (!isClientValid || !options.enableServerValidation) {
      return isClientValid;
    }

    try {
      setIsValidating(true);
      clearServerErrors();

      const formData = form.getValues();
      
      // Perform comprehensive server validation
      // This would be implemented based on your specific validation needs
      
      return true;
    } catch (error) {
      console.error('Form validation error:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [form, options.enableServerValidation, clearServerErrors]);

  return {
    form,
    isValidating,
    serverErrors,
    validateField,
    validateForm,
    clearServerErrors,
    setServerError
  };
}

/**
 * Login form validation hook
 */
export function useLoginFormValidation(options?: Partial<UseFormProps<LoginFormData>>) {
  const validation = useFormValidation({
    schema: loginSchema,
    enableServerValidation: false,
    validateOnChange: false
  }, options);

  const validateLogin = useCallback(async (data: LoginFormData): Promise<ValidationResult> => {
    return ValidationService.validateLogin(data);
  }, []);

  return {
    ...validation,
    validateLogin
  };
}

/**
 * Registration form validation hook
 */
export function useRegistrationFormValidation(options?: Partial<UseFormProps<RegisterFormData>>) {
  const validation = useFormValidation({
    schema: registerSchema,
    enableServerValidation: true,
    validateOnChange: false
  }, options);

  const validateRegistration = useCallback(async (data: RegisterFormData): Promise<ValidationResult> => {
    return ValidationService.validateRegistration(data);
  }, []);

  const checkEmailUniqueness = useCallback(async (email: string): Promise<boolean> => {
    try {
      validation.setServerError('email' as Path<RegisterFormData>, '');
      
      // This would call your server validation service
      // const result = await ValidationService.checkEmailUniqueness(email);
      
      return true; // Placeholder
    } catch (error) {
      validation.setServerError('email' as Path<RegisterFormData>, 'Unable to verify email availability');
      return false;
    }
  }, [validation]);

  return {
    ...validation,
    validateRegistration,
    checkEmailUniqueness
  };
}

/**
 * User profile form validation hook
 */
export function useUserProfileFormValidation(
  isCreate = false,
  options?: Partial<UseFormProps<UserProfileFormData>>
) {
  const validation = useFormValidation({
    schema: userProfileSchema,
    enableServerValidation: true,
    validateOnChange: false
  }, options);

  const validateUserProfile = useCallback(async (data: UserProfileFormData): Promise<ValidationResult> => {
    if (validation.isValidating) return { isValid: false, errors: [] };
    
    return ValidationService.validateUserProfileComprehensive(data, isCreate);
  }, [isCreate, validation.isValidating]);

  return {
    ...validation,
    validateUserProfile
  };
}

/**
 * Medical record form validation hook
 */
export function useMedicalRecordFormValidation(
  isCreate = false,
  options?: Partial<UseFormProps<MedicalRecordFormData>>
) {
  const validation = useFormValidation({
    schema: medicalRecordSchema,
    enableServerValidation: true,
    validateOnChange: false
  }, options);

  const validateMedicalRecord = useCallback(async (data: MedicalRecordFormData): Promise<ValidationResult> => {
    if (validation.isValidating) return { isValid: false, errors: [] };
    
    return ValidationService.validateMedicalRecordComprehensive(data, isCreate);
  }, [isCreate, validation.isValidating]);

  return {
    ...validation,
    validateMedicalRecord
  };
}

/**
 * Password reset form validation hook
 */
export function usePasswordResetFormValidation(options?: Partial<UseFormProps<{ email: string }>>) {
  const validation = useFormValidation({
    schema: passwordResetSchema,
    enableServerValidation: false,
    validateOnChange: false
  }, options);

  const validatePasswordReset = useCallback(async (data: { email: string }): Promise<ValidationResult> => {
    return ValidationService.validatePasswordReset(data);
  }, []);

  return {
    ...validation,
    validatePasswordReset
  };
}

/**
 * Password validation hook with strength checking
 */
export function usePasswordValidation() {
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
    isValid: boolean;
  }>({ score: 0, feedback: [], isValid: false });

  const validatePassword = useCallback(async (password: string) => {
    try {
      // This would call your password validation service
      // const result = await ValidationService.validatePasswordStrength(password);
      // setPasswordStrength(result);
      
      // Placeholder implementation
      setPasswordStrength({
        score: password.length >= 8 ? 3 : 1,
        feedback: password.length >= 8 ? ['Good password'] : ['Password too short'],
        isValid: password.length >= 8
      });
    } catch (error) {
      console.error('Password validation error:', error);
    }
  }, []);

  return {
    passwordStrength,
    validatePassword
  };
}

/**
 * File upload validation hook
 */
export function useFileUploadValidation() {
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  const validateFile = useCallback(async (file: File, fileId: string): Promise<ValidationResult> => {
    const result = ValidationService.validateFileUpload(file);
    
    setValidationResults(prev => ({
      ...prev,
      [fileId]: result
    }));

    return result;
  }, []);

  const clearValidation = useCallback((fileId: string) => {
    setValidationResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
  }, []);

  const getValidationResult = useCallback((fileId: string): ValidationResult | undefined => {
    return validationResults[fileId];
  }, [validationResults]);

  return {
    validateFile,
    clearValidation,
    getValidationResult,
    validationResults
  };
}

/**
 * Real-time validation hook for form fields
 */
export function useRealTimeValidation<T extends FieldValues>(
  form: UseFormReturn<T>,
  validationFn: (data: T) => Promise<ValidationResult>,
  debounceMs = 500
) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const subscription = form.watch(async (data) => {
      if (!data) return;

      setIsValidating(true);
      
      try {
        const result = await validationFn(data as T);
        setValidationErrors(result.errors);
      } catch (error) {
        console.error('Real-time validation error:', error);
        setValidationErrors([]);
      } finally {
        setIsValidating(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, validationFn]);

  return {
    isValidating,
    validationErrors,
    hasErrors: validationErrors.length > 0
  };
}

/**
 * Batch validation hook for multiple items
 */
export function useBatchValidation<T>() {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<{
    validItems: T[];
    errors: Array<{ index: number; errors: ValidationError[] }>;
  }>({ validItems: [], errors: [] });

  const validateBatch = useCallback(async (
    items: unknown[],
    validator: (item: unknown) => ValidationResult<T>
  ) => {
    setIsValidating(true);
    
    try {
      const batchResults = ValidationService.validateBatch(items, validator);
      setResults(batchResults);
      return batchResults;
    } catch (error) {
      console.error('Batch validation error:', error);
      setResults({ validItems: [], errors: [] });
      return { validItems: [], errors: [] };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    isValidating,
    results,
    validateBatch
  };
}