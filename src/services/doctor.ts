import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import type {
  Doctor,
  CreateDoctor,
  UpdateDoctor,
  DoctorWithProfile,
  DoctorSearchFilters,
  PaginationOptions,
  PaginatedResponse
} from '@/types/database';

/**
 * Custom error class for doctor service operations
 */
export class DoctorServiceError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DoctorServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Doctor service interface (simplified)
 */
export interface IDoctorService {
  // Doctor profile methods
  getDoctorProfile(doctorId: string): Promise<Doctor | null>;
  createDoctorProfile(data: CreateDoctor): Promise<Doctor>;
  updateDoctorProfile(doctorId: string, data: UpdateDoctor): Promise<Doctor>;
  deleteDoctorProfile(doctorId: string): Promise<void>;
  getDoctorWithProfile(doctorId: string): Promise<DoctorWithProfile | null>;

  // Doctor search and discovery
  searchDoctors(filters?: DoctorSearchFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<DoctorWithProfile>>;
  getDoctorsBySpecialization(specialization: string, pagination?: PaginationOptions): Promise<PaginatedResponse<DoctorWithProfile>>;
  getAllDoctors(pagination?: PaginationOptions): Promise<PaginatedResponse<DoctorWithProfile>>;

  // Utility methods
  validateDoctorData(data: CreateDoctor | UpdateDoctor): void;
}

/**
 * Doctor service implementation using Supabase
 */
class DoctorService implements IDoctorService {
  /**
   * Handle Supabase errors using the centralized error handler
   */
  private handleError(error: any, operation: string): never {
    console.error(`Doctor service ${operation} error:`, error);

    if (!supabase) {
      const appError = ErrorHandler.handleConfigurationError(
        new Error('Database service is not available. Please check your configuration.')
      );
      throw new DoctorServiceError(
        appError.userMessage,
        appError.code,
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new DoctorServiceError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Validate doctor data (simplified)
   */
  validateDoctorData(data: CreateDoctor | UpdateDoctor): void {
    if ('specialty' in data && data.specialty && !data.specialty.trim()) {
      throw new DoctorServiceError('Specialty cannot be empty', 'INVALID_INPUT');
    }

    if ('name' in data && data.name && !data.name.trim()) {
      throw new DoctorServiceError('Name cannot be empty', 'INVALID_INPUT');
    }

    if ('price_range' in data && data.price_range !== undefined) {
      if (data.price_range < 0) {
        throw new DoctorServiceError('Price range cannot be negative', 'INVALID_INPUT');
      }
      if (data.price_range > 10000) {
        throw new DoctorServiceError('Price range cannot exceed $10,000', 'INVALID_INPUT');
      }
    }

    if ('experience' in data && data.experience !== undefined) {
      if (data.experience < 0) {
        throw new DoctorServiceError('Experience cannot be negative', 'INVALID_INPUT');
      }
      if (data.experience > 70) {
        throw new DoctorServiceError('Experience cannot exceed 70 years', 'INVALID_INPUT');
      }
    }
  }

  /**
   * Get doctor profile by ID
   */
  async getDoctorProfile(doctorId: string): Promise<Doctor | null> {
    if (!doctorId) {
      throw new DoctorServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DoctorServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        this.handleError(error, 'getDoctorProfile');
      }

      return data;
    } catch (error) {
      this.handleError(error, 'getDoctorProfile');
    }
  }

  /**
   * Create a new doctor profile
   */
  async createDoctorProfile(data: CreateDoctor): Promise<Doctor> {
    if (!data.id) {
      throw new DoctorServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    this.validateDoctorData(data);

    if (!supabase) {
      throw new DoctorServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const doctorData = {
        ...data,
        review_count: data.review_count ?? 0
      };

      const { data: doctor, error } = await supabase
        .from('doctors')
        .insert([doctorData])
        .select()
        .single();

      if (error) {
        this.handleError(error, 'createDoctorProfile');
      }

      return doctor;
    } catch (error) {
      this.handleError(error, 'createDoctorProfile');
    }
  }

  /**
   * Update doctor profile
   */
  async updateDoctorProfile(doctorId: string, data: UpdateDoctor): Promise<Doctor> {
    if (!doctorId) {
      throw new DoctorServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    this.validateDoctorData(data);

    if (!supabase) {
      throw new DoctorServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: doctor, error } = await supabase
        .from('doctors')
        .update(updateData)
        .eq('id', doctorId)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'updateDoctorProfile');
      }

      return doctor;
    } catch (error) {
      this.handleError(error, 'updateDoctorProfile');
    }
  }

  /**
   * Delete doctor profile
   */
  async deleteDoctorProfile(doctorId: string): Promise<void> {
    if (!doctorId) {
      throw new DoctorServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DoctorServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) {
        this.handleError(error, 'deleteDoctorProfile');
      }
    } catch (error) {
      this.handleError(error, 'deleteDoctorProfile');
    }
  }

  /**
   * Get doctor with user profile
   */
  async getDoctorWithProfile(doctorId: string): Promise<DoctorWithProfile | null> {
    if (!doctorId) {
      throw new DoctorServiceError('Doctor ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new DoctorServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('id', doctorId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        this.handleError(error, 'getDoctorWithProfile');
      }

      return data as DoctorWithProfile;
    } catch (error) {
      this.handleError(error, 'getDoctorWithProfile');
    }
  }



  /**
   * Search doctors with filters and pagination (simplified)
   * Implements client-side filtering for specialty as per requirements
   */
  async searchDoctors(filters?: DoctorSearchFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<DoctorWithProfile>> {
    if (!supabase) {
      throw new DoctorServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Fetch all doctors (visible to all authenticated users per requirement 4.4)
      let query = supabase
        .from('doctors')
        .select(`
          *,
          user_profile:user_profiles(*)
        `, { count: 'exact' });

      // Apply server-side filters for performance
      if (filters) {
        // Specialty filtering - case insensitive match
        if (filters.specialty) {
          query = query.eq('specialty', filters.specialty);
        }
        
        // Location filtering - search in address field
        if (filters.location) {
          query = query.ilike('address', `%${filters.location}%`);
        }
        
        // Rating filter
        if (filters.min_rating !== undefined && filters.min_rating > 0) {
          query = query.gte('aggregate_rating', filters.min_rating);
        }
        
        // Price filter
        if (filters.max_price !== undefined) {
          query = query.lte('price_range', filters.max_price);
        }
      }

      // Order by rating (highest first)
      query = query.order('aggregate_rating', { ascending: false, nullsFirst: false });

      const { data: allDoctors, error, count } = await query;

      if (error) {
        this.handleError(error, 'searchDoctors');
      }

      let filteredDoctors = (allDoctors as DoctorWithProfile[]) || [];

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = pagination?.offset || (page - 1) * limit;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedDoctors = filteredDoctors.slice(offset, offset + limit);

      return {
        data: paginatedDoctors,
        count: totalCount,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      };
    } catch (error) {
      this.handleError(error, 'searchDoctors');
    }
  }

  /**
   * Get doctors by specialization
   */
  async getDoctorsBySpecialization(specialization: string, pagination?: PaginationOptions): Promise<PaginatedResponse<DoctorWithProfile>> {
    return this.searchDoctors({ specialty: specialization }, pagination);
  }

  /**
   * Get all doctors (visible to all authenticated users)
   */
  async getAllDoctors(pagination?: PaginationOptions): Promise<PaginatedResponse<DoctorWithProfile>> {
    return this.searchDoctors({}, pagination);
  }
}

// Create and export the doctor service instance
export const doctorService = new DoctorService();

// Export the service class and interface
export { DoctorService };
export type { IDoctorService };