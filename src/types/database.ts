// Database types corresponding to Supabase simplified schema

// Enum types
export type UserRole = 'patient' | 'doctor' | 'admin';
export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

// User Profile types (simplified)
export interface UserProfile {
  id: string;
  email: string;
  user_role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CreateUserProfile {
  id: string;
  email: string;
  user_role: UserRole;
}

export interface UpdateUserProfile {
  email?: string;
  user_role?: UserRole;
}

// Doctor-specific types (matches SIMPLE-SCHEMA.sql)
export interface Doctor {
  id: string;
  name: string;
  address?: string;
  works_for?: string;
  url?: string;
  experience?: number;
  price_range?: number;
  available_service?: string;
  same_as?: string;
  aggregate_rating?: number;
  lng?: number;
  specialty: string;
  lat?: number;
  opening_hours?: string[];
  qualifications?: string;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDoctor {
  id: string;
  name: string;
  address?: string;
  works_for?: string;
  url?: string;
  experience?: number;
  price_range?: number;
  available_service?: string;
  same_as?: string;
  aggregate_rating?: number;
  lng?: number;
  specialty: string;
  lat?: number;
  opening_hours?: string[];
  qualifications?: string;
  review_count?: number;
}

export interface UpdateDoctor {
  name?: string;
  address?: string;
  works_for?: string;
  url?: string;
  experience?: number;
  price_range?: number;
  available_service?: string;
  same_as?: string;
  aggregate_rating?: number;
  lng?: number;
  specialty?: string;
  lat?: number;
  opening_hours?: string[];
  qualifications?: string;
  review_count?: number;
}

// Patient types (simplified)
export interface Patient {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePatient {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface UpdatePatient {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
}

// Appointment types
export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason?: string;
  doctor_notes?: string;
  patient_notes?: string;
  rating?: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointment {
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  patient_notes?: string;
}

export interface UpdateAppointment {
  appointment_date?: string;
  appointment_time?: string;
  status?: AppointmentStatus;
  reason?: string;
  doctor_notes?: string;
  patient_notes?: string;
  rating?: number;
  review_text?: string;
}

// Database response types
export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface DatabaseListResponse<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

// Supabase specific types
export interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

// Extended types with relationships
export interface DoctorWithProfile extends Doctor {
  user_profile: UserProfile;
}

export interface PatientWithProfile extends Patient {
  user_profile: UserProfile;
}

export interface AppointmentWithDetails extends Appointment {
  doctor: DoctorWithProfile;
  patient: PatientWithProfile;
}

// Statistics and analytics types
export interface DoctorStats {
  total_appointments: number;
  completed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
  rejected_appointments: number;
  average_rating: number;
}

export interface PatientStats {
  total_appointments: number;
  completed_appointments: number;
  upcoming_appointments: number;
  cancelled_appointments: number;
}

// Search and filter types
export interface DoctorSearchFilters {
  specialty?: string;
  location?: string;
  min_rating?: number;
  max_price?: number;
}

export interface AppointmentFilters {
  status?: AppointmentStatus;
  date_from?: string;
  date_to?: string;
  doctor_id?: string;
  patient_id?: string;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

