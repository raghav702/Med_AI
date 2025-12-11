// Database schema validation and type guards

import { 
  UserProfile, 
  MedicalRecord, 
  MedicalRecordType, 
  CreateUserProfile, 
  CreateMedicalRecord,
  UpdateUserProfile,
  UpdateMedicalRecord
} from '../types/database';

// Valid medical record types
export const MEDICAL_RECORD_TYPES: MedicalRecordType[] = [
  'lab_result',
  'prescription', 
  'diagnosis',
  'appointment',
  'imaging',
  'vaccination',
  'other'
];

// Validation functions
export const validateUserProfile = (profile: Partial<UserProfile>): string[] => {
  const errors: string[] = [];

  if (profile.first_name !== undefined) {
    if (typeof profile.first_name !== 'string' || profile.first_name.length < 1 || profile.first_name.length > 50) {
      errors.push('First name must be between 1 and 50 characters');
    }
  }

  if (profile.last_name !== undefined) {
    if (typeof profile.last_name !== 'string' || profile.last_name.length < 1 || profile.last_name.length > 50) {
      errors.push('Last name must be between 1 and 50 characters');
    }
  }

  if (profile.date_of_birth !== undefined) {
    const birthDate = new Date(profile.date_of_birth);
    const today = new Date();
    const maxAge = new Date();
    maxAge.setFullYear(today.getFullYear() - 150);

    if (isNaN(birthDate.getTime()) || birthDate > today || birthDate < maxAge) {
      errors.push('Invalid date of birth');
    }
  }

  if (profile.phone_number !== undefined && profile.phone_number !== null) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(profile.phone_number)) {
      errors.push('Invalid phone number format');
    }
  }

  return errors;
};

export const validateMedicalRecord = (record: Partial<MedicalRecord>): string[] => {
  const errors: string[] = [];

  if (record.title !== undefined) {
    if (typeof record.title !== 'string' || record.title.length < 1 || record.title.length > 200) {
      errors.push('Title must be between 1 and 200 characters');
    }
  }

  if (record.description !== undefined && record.description !== null) {
    if (typeof record.description !== 'string' || record.description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }
  }

  if (record.provider_name !== undefined && record.provider_name !== null) {
    if (typeof record.provider_name !== 'string' || record.provider_name.length > 100) {
      errors.push('Provider name must be 100 characters or less');
    }
  }

  if (record.record_type !== undefined) {
    if (!MEDICAL_RECORD_TYPES.includes(record.record_type)) {
      errors.push(`Invalid record type. Must be one of: ${MEDICAL_RECORD_TYPES.join(', ')}`);
    }
  }

  if (record.date_recorded !== undefined) {
    const recordDate = new Date(record.date_recorded);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (isNaN(recordDate.getTime()) || recordDate > today) {
      errors.push('Record date cannot be in the future');
    }
  }

  if (record.attachments !== undefined) {
    if (!Array.isArray(record.attachments)) {
      errors.push('Attachments must be an array');
    } else if (record.attachments.length > 10) {
      errors.push('Maximum 10 attachments allowed per medical record');
    }
  }

  return errors;
};

// Type guards
export const isUserProfile = (obj: any): obj is UserProfile => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
};

export const isMedicalRecord = (obj: any): obj is MedicalRecord => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.title === 'string' &&
    MEDICAL_RECORD_TYPES.includes(obj.record_type) &&
    typeof obj.date_recorded === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string' &&
    Array.isArray(obj.attachments)
  );
};

export const isCreateUserProfile = (obj: any): obj is CreateUserProfile => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string'
  );
};

export const isCreateMedicalRecord = (obj: any): obj is CreateMedicalRecord => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.user_id === 'string' &&
    typeof obj.title === 'string' &&
    MEDICAL_RECORD_TYPES.includes(obj.record_type) &&
    typeof obj.date_recorded === 'string'
  );
};

// Schema constants
export const USER_PROFILE_CONSTRAINTS = {
  FIRST_NAME_MAX_LENGTH: 50,
  LAST_NAME_MAX_LENGTH: 50,
  PHONE_NUMBER_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  MAX_AGE_YEARS: 150
} as const;

export const MEDICAL_RECORD_CONSTRAINTS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  PROVIDER_NAME_MAX_LENGTH: 100,
  MAX_ATTACHMENTS: 10
} as const;

// Helper functions for form validation
export const getRecordTypeDisplayName = (type: MedicalRecordType): string => {
  const displayNames: Record<MedicalRecordType, string> = {
    'lab_result': 'Lab Result',
    'prescription': 'Prescription',
    'diagnosis': 'Diagnosis',
    'appointment': 'Appointment',
    'imaging': 'Imaging',
    'vaccination': 'Vaccination',
    'other': 'Other'
  };
  return displayNames[type];
};

export const getRecordTypeOptions = () => {
  return MEDICAL_RECORD_TYPES.map(type => ({
    value: type,
    label: getRecordTypeDisplayName(type)
  }));
};