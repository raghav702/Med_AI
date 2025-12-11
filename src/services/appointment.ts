import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import { RLSErrorHandler } from '@/lib/rls-error-handler';
import { ValidationService } from './validation-service';
import type {
  Appointment,
  CreateAppointment,
  UpdateAppointment,
  AppointmentWithDetails,
  AppointmentFilters,
  PaginationOptions,
  PaginatedResponse,
  AppointmentStatus,
  DoctorStats
} from '@/types/database';

/**
 * Custom error class for appointment service operations
 */
export class AppointmentServiceError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AppointmentServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Appointment service interface (simplified)
 */
export interface IAppointmentService {
  // Appointment CRUD methods
  getAppointment(appointmentId: string): Promise<Appointment | null>;
  createAppointment(data: CreateAppointment): Promise<Appointment>;
  updateAppointment(appointmentId: string, data: UpdateAppointment): Promise<Appointment>;
  cancelAppointment(appointmentId: string): Promise<Appointment>;
  
  // Appointment queries with relationships
  getAppointmentWithDetails(appointmentId: string): Promise<AppointmentWithDetails | null>;
  getAppointmentsByDoctor(doctorId: string, filters?: AppointmentFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<AppointmentWithDetails>>;
  getAppointmentsByPatient(patientId: string, filters?: AppointmentFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<AppointmentWithDetails>>;
  
  // Appointment status management
  updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, notes?: string): Promise<Appointment>;
  approveAppointment(appointmentId: string, doctorNotes?: string): Promise<Appointment>;
  rejectAppointment(appointmentId: string, reason?: string): Promise<Appointment>;
  completeAppointment(appointmentId: string, doctorNotes?: string): Promise<Appointment>;
  
  // Utility methods
  validateAppointmentData(data: CreateAppointment | UpdateAppointment): void;
}

/**
 * Appointment service implementation using Supabase
 */
class AppointmentService implements IAppointmentService {
  /**
   * Get current user role for RLS context
   */
  private async getCurrentUserRole(): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return undefined;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      return profile?.user_role;
    } catch {
      return undefined;
    }
  }

  /**
   * Handle Supabase errors using the centralized error handler with RLS support
   */
  private async handleError(error: any, operation: string, table: string = 'appointments'): Promise<never> {
    console.error(`Appointment service ${operation} error:`, error);

    if (!supabase) {
      const appError = ErrorHandler.handleConfigurationError(
        new Error('Database service is not available. Please check your configuration.')
      );
      throw new AppointmentServiceError(
        appError.userMessage,
        appError.code,
        error
      );
    }

    // Check if this is an RLS error
    if (RLSErrorHandler.isRLSError(error)) {
      const userRole = await this.getCurrentUserRole();
      const appError = RLSErrorHandler.handleRLSError(error, {
        table,
        operation,
        userRole
      });
      throw new AppointmentServiceError(
        appError.userMessage,
        appError.code,
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new AppointmentServiceError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Validate appointment data using validation service
   */
  validateAppointmentData(data: CreateAppointment | UpdateAppointment): void {
    // Use validation service for comprehensive validation
    const isCreate = 'doctor_id' in data && 'patient_id' in data;
    const schema = isCreate ? 'createAppointment' : 'updateAppointment';
    
    const result = isCreate 
      ? ValidationService.validateCreateAppointment(data)
      : ValidationService.validateUpdateAppointment(data);

    if (!result.success) {
      const errorMessage = ValidationService.getFirstError(result) || 'Invalid appointment data';
      throw new AppointmentServiceError(errorMessage, 'VALIDATION_ERROR', result.errors);
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    if (!appointmentId) {
      throw new AppointmentServiceError('Appointment ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        await this.handleError(error, 'SELECT');
      }

      return data;
    } catch (error) {
      await this.handleError(error, 'SELECT');
    }
  }

  /**
   * Create a new appointment (simplified - always starts with pending status)
   */
  async createAppointment(data: CreateAppointment): Promise<Appointment> {
    this.validateAppointmentData(data);

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const appointmentData = {
        ...data,
        status: 'pending' as AppointmentStatus
      };

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) {
        await this.handleError(error, 'INSERT');
      }

      return appointment;
    } catch (error) {
      await this.handleError(error, 'INSERT');
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: string, data: UpdateAppointment): Promise<Appointment> {
    if (!appointmentId) {
      throw new AppointmentServiceError('Appointment ID is required', 'INVALID_INPUT');
    }

    this.validateAppointmentData(data);

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        await this.handleError(error, 'UPDATE');
      }

      return appointment;
    } catch (error) {
      await this.handleError(error, 'UPDATE');
    }
  }

  /**
   * Cancel appointment (update status to cancelled)
   */
  async cancelAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'cancelled');
  }

  /**
   * Get appointment with details (doctor and patient info)
   */
  async getAppointmentWithDetails(appointmentId: string): Promise<AppointmentWithDetails | null> {
    if (!appointmentId) {
      throw new AppointmentServiceError('Appointment ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors!appointments_doctor_id_fkey(
            *,
            user_profile:user_profiles(*)
          ),
          patient:patients!appointments_patient_id_fkey(
            *,
            user_profile:user_profiles(*)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        this.handleError(error, 'getAppointmentWithDetails');
      }

      return data as AppointmentWithDetails;
    } catch (error) {
      this.handleError(error, 'getAppointmentWithDetails');
    }
  }

  /**
   * Get appointments by doctor with filters and pagination
   */
  async getAppointmentsByDoctor(
    doctorId: string, 
    filters?: AppointmentFilters, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AppointmentWithDetails>> {
    if (!doctorId) {
      throw new AppointmentServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors!appointments_doctor_id_fkey(
            *,
            user_profile:user_profiles(*)
          ),
          patient:patients!appointments_patient_id_fkey(
            *,
            user_profile:user_profiles(*)
          )
        `, { count: 'exact' })
        .eq('doctor_id', doctorId);

      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.date_from) {
          query = query.gte('appointment_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('appointment_date', filters.date_to);
        }
        if (filters.patient_id) {
          query = query.eq('patient_id', filters.patient_id);
        }
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = pagination?.offset || (page - 1) * limit;

      query = query
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        this.handleError(error, 'getAppointmentsByDoctor');
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: (data as AppointmentWithDetails[]) || [],
        count: totalCount,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      };
    } catch (error) {
      this.handleError(error, 'getAppointmentsByDoctor');
    }
  }

  /**
   * Get appointments by patient with filters and pagination
   */
  async getAppointmentsByPatient(
    patientId: string, 
    filters?: AppointmentFilters, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AppointmentWithDetails>> {
    if (!patientId) {
      throw new AppointmentServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors!appointments_doctor_id_fkey(
            *,
            user_profile:user_profiles(*)
          ),
          patient:patients!appointments_patient_id_fkey(
            *,
            user_profile:user_profiles(*)
          )
        `, { count: 'exact' })
        .eq('patient_id', patientId);

      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.date_from) {
          query = query.gte('appointment_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('appointment_date', filters.date_to);
        }
        if (filters.doctor_id) {
          query = query.eq('doctor_id', filters.doctor_id);
        }
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = pagination?.offset || (page - 1) * limit;

      query = query
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        this.handleError(error, 'getAppointmentsByPatient');
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: (data as AppointmentWithDetails[]) || [],
        count: totalCount,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      };
    } catch (error) {
      this.handleError(error, 'getAppointmentsByPatient');
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, notes?: string): Promise<Appointment> {
    if (!appointmentId) {
      throw new AppointmentServiceError('Appointment ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new AppointmentServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const updateData: UpdateAppointment = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.doctor_notes = notes;
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'updateAppointmentStatus');
      }

      return appointment;
    } catch (error) {
      this.handleError(error, 'updateAppointmentStatus');
    }
  }

  /**
   * Approve appointment
   */
  async approveAppointment(appointmentId: string, doctorNotes?: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'approved', doctorNotes);
  }

  /**
   * Reject appointment
   */
  async rejectAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'rejected', reason);
  }

  /**
   * Complete appointment
   */
  async completeAppointment(appointmentId: string, doctorNotes?: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'completed', doctorNotes);
  }
}

// Create and export the appointment service instance
export const appointmentService = new AppointmentService();

// Export the service class and interface
export { AppointmentService };
export type { IAppointmentService };