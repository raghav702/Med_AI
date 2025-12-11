import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import type {
  UserProfile,
  CreateUserProfile,
  UpdateUserProfile,
  Patient,
  CreatePatient,
  UpdatePatient,
  PaginationOptions,
  SupabaseError
} from '@/types/database';

/**
 * Custom error class for database operations
 */
export class DatabaseServiceError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DatabaseServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Database service interface (simplified)
 */
export interface IDatabaseService {
  // User Profile methods
  getUserProfile(userId: string): Promise<UserProfile | null>;
  createUserProfile(data: CreateUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: UpdateUserProfile): Promise<UserProfile>;
  deleteUserProfile(userId: string): Promise<void>;

  // Patient methods
  getPatient(patientId: string): Promise<Patient | null>;
  createPatient(data: CreatePatient): Promise<Patient>;
  updatePatient(patientId: string, data: UpdatePatient): Promise<Patient>;

  // Utility methods
  isServiceAvailable(): boolean;
  validateConnection(): Promise<boolean>;
}

/**
 * Database service implementation using Supabase
 */
class DatabaseService implements IDatabaseService {
  /**
   * Check if the database service is available
   */
  isServiceAvailable(): boolean {
    return supabase !== null;
  }

  /**
   * Validate database connection
   */
  async validateConnection(): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    try {
      // Test connection with a simple query
      const { error } = await supabase.from('user_profiles').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Database connection validation failed:', error);
      return false;
    }
  }

  /**
   * Handle Supabase errors using the centralized error handler
   */
  private handleError(error: any, operation: string): never {
    console.error(`Database ${operation} error:`, error);

    if (!supabase) {
      const appError = ErrorHandler.handleConfigurationError(
        new Error('Database service is not available. Please check your configuration.')
      );
      throw new DatabaseServiceError(
        appError.userMessage,
        appError.code,
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new DatabaseServiceError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) {
      throw new DatabaseServiceError('User ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        this.handleError(error, 'getUserProfile');
      }

      return data;
    } catch (error) {
      this.handleError(error, 'getUserProfile');
    }
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(data: CreateUserProfile): Promise<UserProfile> {
    if (!data.id) {
      throw new DatabaseServiceError('User ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert([data])
        .select()
        .single();

      if (error) {
        this.handleError(error, 'createUserProfile');
      }

      return profile;
    } catch (error) {
      this.handleError(error, 'createUserProfile');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: UpdateUserProfile): Promise<UserProfile> {
    if (!userId) {
      throw new DatabaseServiceError('User ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'updateUserProfile');
      }

      return profile;
    } catch (error) {
      this.handleError(error, 'updateUserProfile');
    }
  }

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string): Promise<void> {
    if (!userId) {
      throw new DatabaseServiceError('User ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        this.handleError(error, 'deleteUserProfile');
      }
    } catch (error) {
      this.handleError(error, 'deleteUserProfile');
    }
  }

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<Patient | null> {
    if (!patientId) {
      throw new DatabaseServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        this.handleError(error, 'getPatient');
      }

      return data;
    } catch (error) {
      this.handleError(error, 'getPatient');
    }
  }

  /**
   * Create a new patient profile
   */
  async createPatient(data: CreatePatient): Promise<Patient> {
    if (!data.id) {
      throw new DatabaseServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data: patient, error } = await supabase
        .from('patients')
        .insert([data])
        .select()
        .single();

      if (error) {
        this.handleError(error, 'createPatient');
      }

      return patient;
    } catch (error) {
      this.handleError(error, 'createPatient');
    }
  }

  /**
   * Update patient profile
   */
  async updatePatient(patientId: string, data: UpdatePatient): Promise<Patient> {
    if (!patientId) {
      throw new DatabaseServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DatabaseServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: patient, error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patientId)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'updatePatient');
      }

      return patient;
    } catch (error) {
      this.handleError(error, 'updatePatient');
    }
  }
}

// Create and export the database service instance
export const databaseService = new DatabaseService();

// Export the service class and interface
export { DatabaseService };
export type { IDatabaseService };