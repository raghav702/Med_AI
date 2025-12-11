import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import type {
  Patient,
  CreatePatient,
  UpdatePatient,
  PatientWithProfile,
  PaginationOptions,
  PaginatedResponse
} from '@/types/database';

/**
 * Custom error class for patient service operations
 */
export class PatientServiceError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'PatientServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Patient service interface (simplified)
 */
export interface IPatientService {
  // Patient profile methods
  getPatientProfile(patientId: string): Promise<Patient | null>;
  createPatientProfile(data: CreatePatient): Promise<Patient>;
  updatePatientProfile(patientId: string, data: UpdatePatient): Promise<Patient>;
  deletePatientProfile(patientId: string): Promise<void>;
  getPatientWithProfile(patientId: string): Promise<PatientWithProfile | null>;

  // Patient search and discovery
  getPatientsByDoctor(doctorId: string, pagination?: PaginationOptions): Promise<PaginatedResponse<PatientWithProfile>>;

  // Utility methods
  validatePatientData(data: CreatePatient | UpdatePatient): void;
}

/**
 * Patient service implementation using Supabase
 */
class PatientService implements IPatientService {
  /**
   * Handle Supabase errors using the centralized error handler
   */
  private handleError(error: any, operation: string): never {
    console.error(`Patient service ${operation} error:`, error);

    if (!supabase) {
      const appError = ErrorHandler.handleConfigurationError(
        new Error('Database service is not available. Please check your configuration.')
      );
      throw new PatientServiceError(
        appError.userMessage,
        appError.code,
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new PatientServiceError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Validate patient data (simplified)
   */
  validatePatientData(data: CreatePatient | UpdatePatient): void {
    if ('phone' in data && data.phone && data.phone.trim() && !/^\+?[\d\s\-()]+$/.test(data.phone)) {
      throw new PatientServiceError('Invalid phone number format', 'INVALID_INPUT');
    }

    if ('date_of_birth' in data && data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      const today = new Date();
      if (dob > today) {
        throw new PatientServiceError('Date of birth cannot be in the future', 'INVALID_INPUT');
      }
    }
  }

  /**
   * Get patient profile by ID
   */
  async getPatientProfile(patientId: string): Promise<Patient | null> {
    if (!patientId) {
      throw new PatientServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
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
        this.handleError(error, 'getPatientProfile');
      }

      return data;
    } catch (error) {
      this.handleError(error, 'getPatientProfile');
    }
  }

  /**
   * Create a new patient profile
   */
  async createPatientProfile(data: CreatePatient): Promise<Patient> {
    if (!data.id) {
      throw new PatientServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    this.validatePatientData(data);

    if (!supabase) {
      throw new PatientServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data: patient, error } = await supabase
        .from('patients')
        .insert([data])
        .select()
        .single();

      if (error) {
        this.handleError(error, 'createPatientProfile');
      }

      return patient;
    } catch (error) {
      this.handleError(error, 'createPatientProfile');
    }
  }

  /**
   * Update patient profile
   */
  async updatePatientProfile(patientId: string, data: UpdatePatient): Promise<Patient> {
    if (!patientId) {
      throw new PatientServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    this.validatePatientData(data);

    if (!supabase) {
      throw new PatientServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
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
        this.handleError(error, 'updatePatientProfile');
      }

      return patient;
    } catch (error) {
      this.handleError(error, 'updatePatientProfile');
    }
  }

  /**
   * Delete patient profile
   */
  async deletePatientProfile(patientId: string): Promise<void> {
    if (!patientId) {
      throw new PatientServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) {
        this.handleError(error, 'deletePatientProfile');
      }
    } catch (error) {
      this.handleError(error, 'deletePatientProfile');
    }
  }

  /**
   * Get patient with user profile
   */
  async getPatientWithProfile(patientId: string): Promise<PatientWithProfile | null> {
    if (!patientId) {
      throw new PatientServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('id', patientId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        this.handleError(error, 'getPatientWithProfile');
      }

      return data as PatientWithProfile;
    } catch (error) {
      this.handleError(error, 'getPatientWithProfile');
    }
  }



  /**
   * Get patients by doctor (patients who have appointments with the doctor)
   */
  async getPatientsByDoctor(doctorId: string, pagination?: PaginationOptions): Promise<PaginatedResponse<PatientWithProfile>> {
    if (!doctorId) {
      throw new PatientServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Get unique patient IDs from appointments with this doctor
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorId);

      if (appointmentError) {
        this.handleError(appointmentError, 'getPatientsByDoctor');
      }

      const patientIds = [...new Set(appointmentData?.map(a => a.patient_id) || [])];

      if (patientIds.length === 0) {
        return {
          data: [],
          count: 0,
          page: 1,
          limit: pagination?.limit || 10,
          total_pages: 0,
          has_next: false,
          has_previous: false
        };
      }

      // Get patients with profiles
      let query = supabase
        .from('patients')
        .select(`
          *,
          user_profile:user_profiles(*)
        `, { count: 'exact' })
        .in('id', patientIds);

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = pagination?.offset || (page - 1) * limit;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        this.handleError(error, 'getPatientsByDoctor');
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: (data as PatientWithProfile[]) || [],
        count: totalCount,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      };
    } catch (error) {
      this.handleError(error, 'getPatientsByDoctor');
    }
  }
}

// Create and export the patient service instance
export const patientService = new PatientService();

// Export the service class and interface
export { PatientService };
export type { IPatientService };