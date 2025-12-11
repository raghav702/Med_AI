import { User, Session, AuthError } from '@supabase/supabase-js';

/**
 * Re-export commonly used Supabase types
 */
export type { User, Session, AuthError };

/**
 * Authentication response interface
 */
export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * User profile interface matching the database schema
 */
export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  phone_number?: string;
  emergency_contact?: string;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Medical record interface matching the database schema
 */
export interface MedicalRecord {
  id: string;
  user_id: string;
  record_type: string;
  title: string;
  description?: string;
  date_recorded: string;
  provider_name?: string;
  attachments?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for creating a new medical record
 */
export interface CreateMedicalRecord {
  record_type: string;
  title: string;
  description?: string;
  date_recorded: string;
  provider_name?: string;
  attachments?: any;
}

/**
 * Database error interface
 */
export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
}

/**
 * Application error interface
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Real-time subscription interface
 */
export interface RealtimeSubscription {
  id: string;
  unsubscribe: () => void;
}

/**
 * Connection status for real-time features
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Real-time event types
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Real-time payload interface
 */
export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  new: T;
  old: T;
  errors: any[];
}

/**
 * Configuration for real-time subscriptions
 */
export interface RealtimeConfig {
  table: string;
  event?: RealtimeEventType | '*';
  schema?: string;
  filter?: string;
}