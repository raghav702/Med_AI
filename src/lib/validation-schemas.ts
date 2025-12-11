/**
 * Comprehensive validation schemas using Zod
 * Provides client-side validation for all user inputs
 */

import { z } from 'zod';
import { MedicalRecordType } from '@/types/database';

// Common validation patterns
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email must be less than 254 characters')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods')
  .trim();

const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val), {
    message: 'Please enter a valid phone number'
  });

const dateSchema = z
  .date()
  .refine((date) => date <= new Date(), {
    message: 'Date cannot be in the future'
  })
  .refine((date) => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    return date >= minDate;
  }, {
    message: 'Date cannot be more than 150 years ago'
  });

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, {
    message: 'Please enter a valid date'
  })
  .refine((dateStr) => {
    const date = new Date(dateStr);
    return date <= new Date();
  }, {
    message: 'Date cannot be in the future'
  });

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  userType: z.enum(['patient', 'doctor']),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine((data) => {
  if (data.userType === 'doctor') {
    return data.specialization && data.specialization.trim().length > 0;
  }
  return true;
}, {
  message: 'Specialization is required for doctors',
  path: ['specialization']
}).refine((data) => {
  if (data.userType === 'doctor') {
    return data.licenseNumber && data.licenseNumber.trim().length > 0;
  }
  return true;
}, {
  message: 'Medical license number is required for doctors',
  path: ['licenseNumber']
});

export const passwordResetSchema = z.object({
  email: emailSchema
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
});

// User profile schemas
export const userProfileSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  date_of_birth: dateStringSchema.optional(),
  phone_number: phoneSchema,
  emergency_contact: z
    .string()
    .max(100, 'Emergency contact must be less than 100 characters')
    .optional(),
  medical_conditions: z
    .array(z.string().max(100, 'Medical condition must be less than 100 characters'))
    .max(20, 'Maximum 20 medical conditions allowed')
    .optional(),
  allergies: z
    .array(z.string().max(100, 'Allergy must be less than 100 characters'))
    .max(20, 'Maximum 20 allergies allowed')
    .optional(),
  medications: z
    .array(z.string().max(100, 'Medication must be less than 100 characters'))
    .max(50, 'Maximum 50 medications allowed')
    .optional()
});

export const createUserProfileSchema = userProfileSchema.extend({
  id: z.string().uuid('Invalid user ID format')
});

export const updateUserProfileSchema = userProfileSchema.partial();

// Medical record schemas
const medicalRecordTypeSchema = z.enum([
  'lab_result',
  'prescription',
  'diagnosis',
  'appointment',
  'imaging',
  'vaccination',
  'other'
] as const);

const attachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  url: z.string().url('Invalid file URL'),
  type: z.string().regex(/^[a-zA-Z0-9\/\-\+\.]+$/, 'Invalid file type'),
  size: z.number().min(1).max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  uploaded_at: z.string().datetime()
});

export const medicalRecordSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform(val => val.trim()),
  record_type: medicalRecordTypeSchema,
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  date_recorded: dateSchema,
  provider_name: z
    .string()
    .max(100, 'Provider name must be less than 100 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  attachments: z
    .array(attachmentSchema)
    .max(10, 'Maximum 10 attachments allowed')
    .optional()
    .default([])
});

export const createMedicalRecordSchema = medicalRecordSchema.extend({
  user_id: z.string().uuid('Invalid user ID format')
}).transform(data => ({
  ...data,
  date_recorded: data.date_recorded.toISOString().split('T')[0] // Convert to YYYY-MM-DD
}));

export const updateMedicalRecordSchema = medicalRecordSchema.partial().omit({ user_id: true });

// Search and filter schemas
export const userProfileFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  has_conditions: z.boolean().optional(),
  has_allergies: z.boolean().optional(),
  has_medications: z.boolean().optional()
});

export const medicalRecordFiltersSchema = z.object({
  record_type: medicalRecordTypeSchema.optional(),
  date_from: dateStringSchema.optional(),
  date_to: dateStringSchema.optional(),
  provider_name: z.string().max(100).optional(),
  search: z.string().max(100).optional()
});

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).optional()
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default([
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ])
}).refine((data) => data.file.size <= data.maxSize, {
  message: 'File size exceeds maximum allowed size'
}).refine((data) => data.allowedTypes.includes(data.file.type), {
  message: 'File type not allowed'
});

// Simplified schema validation for medical app

// User role validation
export const userRoleSchema = z.enum(['patient', 'doctor', 'admin'], {
  errorMap: () => ({ message: 'Please select a valid user role' })
});

// Appointment status validation
export const appointmentStatusSchema = z.enum(
  ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
  { errorMap: () => ({ message: 'Invalid appointment status' }) }
);

// Doctor profile validation
export const doctorProfileSchema = z.object({
  name: z.string()
    .min(1, 'Doctor name is required')
    .max(200, 'Name must be less than 200 characters')
    .trim(),
  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  specialty: z.string()
    .min(1, 'Specialty is required')
    .max(100, 'Specialty must be less than 100 characters')
    .trim(),
  experience: z.number()
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative')
    .max(70, 'Experience seems too high')
    .optional(),
  price_range: z.number()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price seems too high')
    .optional(),
  lat: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
  lng: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
  opening_hours: z.array(
    z.string().regex(
      /^(Mo|Tu|We|Th|Fr|Sa|Su)\s\d{2}:\d{2}-\d{2}:\d{2}$/,
      'Opening hours must be in format "Mo 09:30-21:00"'
    )
  ).optional(),
  qualifications: z.string()
    .max(1000, 'Qualifications must be less than 1000 characters')
    .optional(),
  works_for: z.string()
    .max(200, 'Organization name must be less than 200 characters')
    .optional(),
  url: z.string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  available_service: z.string()
    .max(500, 'Service description must be less than 500 characters')
    .optional(),
  same_as: z.string()
    .max(500, 'Reference must be less than 500 characters')
    .optional(),
  aggregate_rating: z.number()
    .min(0, 'Rating cannot be negative')
    .max(5, 'Rating cannot exceed 5')
    .optional(),
  review_count: z.number()
    .int('Review count must be a whole number')
    .min(0, 'Review count cannot be negative')
    .optional()
});

export const createDoctorSchema = doctorProfileSchema.extend({
  id: z.string().uuid('Invalid user ID format')
});

export const updateDoctorSchema = doctorProfileSchema.partial();

// Patient profile validation
export const patientProfileSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  phone: phoneSchema,
  date_of_birth: dateStringSchema.optional()
});

export const createPatientSchema = patientProfileSchema.extend({
  id: z.string().uuid('Invalid user ID format')
});

export const updatePatientSchema = patientProfileSchema.partial();

// Appointment validation
export const appointmentSchema = z.object({
  doctor_id: z.string()
    .uuid('Invalid doctor ID format')
    .min(1, 'Doctor selection is required'),
  patient_id: z.string()
    .uuid('Invalid patient ID format')
    .min(1, 'Patient ID is required'),
  appointment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, {
      message: 'Appointment date cannot be in the past'
    })
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6); // Max 6 months in advance
      return date <= maxDate;
    }, {
      message: 'Appointment date cannot be more than 6 months in advance'
    }),
  appointment_time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM format')
    .refine((timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
    }, {
      message: 'Invalid time format'
    }),
  reason: z.string()
    .min(10, 'Please provide a detailed reason (at least 10 characters)')
    .max(1000, 'Reason must be less than 1000 characters')
    .optional(),
  patient_notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
});

export const createAppointmentSchema = appointmentSchema;

export const updateAppointmentSchema = z.object({
  appointment_date: appointmentSchema.shape.appointment_date.optional(),
  appointment_time: appointmentSchema.shape.appointment_time.optional(),
  status: appointmentStatusSchema.optional(),
  reason: z.string()
    .max(1000, 'Reason must be less than 1000 characters')
    .optional(),
  doctor_notes: z.string()
    .max(2000, 'Doctor notes must be less than 2000 characters')
    .optional(),
  patient_notes: z.string()
    .max(2000, 'Patient notes must be less than 2000 characters')
    .optional(),
  rating: z.number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5')
    .optional(),
  review_text: z.string()
    .max(1000, 'Review must be less than 1000 characters')
    .optional()
});

// Appointment rating validation
export const appointmentRatingSchema = z.object({
  rating: z.number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  review_text: z.string()
    .max(1000, 'Review must be less than 1000 characters')
    .optional()
}).refine((data) => {
  // If rating is provided, it must be valid
  return data.rating >= 1 && data.rating <= 5;
}, {
  message: 'Please provide a rating between 1 and 5',
  path: ['rating']
});

// Doctor search filters validation
export const doctorSearchFiltersSchema = z.object({
  specialty: z.string()
    .max(100, 'Specialty filter too long')
    .optional(),
  location: z.string()
    .max(200, 'Location filter too long')
    .optional(),
  min_rating: z.number()
    .min(0, 'Minimum rating cannot be negative')
    .max(5, 'Minimum rating cannot exceed 5')
    .optional(),
  max_price: z.number()
    .min(0, 'Maximum price cannot be negative')
    .optional(),
  search: z.string()
    .max(200, 'Search query too long')
    .optional()
});

// Appointment filters validation
export const appointmentFiltersSchema = z.object({
  status: appointmentStatusSchema.optional(),
  date_from: dateStringSchema.optional(),
  date_to: dateStringSchema.optional(),
  doctor_id: z.string().uuid('Invalid doctor ID').optional(),
  patient_id: z.string().uuid('Invalid patient ID').optional()
}).refine((data) => {
  // If both dates are provided, date_from must be before date_to
  if (data.date_from && data.date_to) {
    return new Date(data.date_from) <= new Date(data.date_to);
  }
  return true;
}, {
  message: 'Start date must be before end date',
  path: ['date_to']
});

// AI Assistant message validation
export const aiMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters')
    .trim()
});

// Export type inference helpers
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;
export type CreateMedicalRecordData = z.infer<typeof createMedicalRecordSchema>;
export type UpdateMedicalRecordData = z.infer<typeof updateMedicalRecordSchema>;
export type UserProfileFilters = z.infer<typeof userProfileFiltersSchema>;
export type MedicalRecordFilters = z.infer<typeof medicalRecordFiltersSchema>;
export type PaginationOptions = z.infer<typeof paginationSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;

// Simplified schema types
export type UserRole = z.infer<typeof userRoleSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type DoctorProfileData = z.infer<typeof doctorProfileSchema>;
export type CreateDoctorData = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorData = z.infer<typeof updateDoctorSchema>;
export type PatientProfileData = z.infer<typeof patientProfileSchema>;
export type CreatePatientData = z.infer<typeof createPatientSchema>;
export type UpdatePatientData = z.infer<typeof updatePatientSchema>;
export type AppointmentData = z.infer<typeof appointmentSchema>;
export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;
export type AppointmentRatingData = z.infer<typeof appointmentRatingSchema>;
export type DoctorSearchFilters = z.infer<typeof doctorSearchFiltersSchema>;
export type AppointmentFilters = z.infer<typeof appointmentFiltersSchema>;
export type AIMessageData = z.infer<typeof aiMessageSchema>;