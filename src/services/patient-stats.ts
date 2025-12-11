import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import type { PatientStats } from '@/types/database';

/**
 * Custom error class for patient statistics service operations
 */
export class PatientStatsServiceError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'PatientStatsServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Patient statistics service interface
 */
export interface IPatientStatsService {
  getPatientStats(patientId: string): Promise<PatientStats>;
  getAppointmentTrends(patientId: string, months?: number): Promise<{
    month: string;
    appointments: number;
    completed: number;
    cancelled: number;
  }[]>;
  getFavoriteDoctors(patientId: string, limit?: number): Promise<{
    doctorId: string;
    doctorName: string;
    specialization: string;
    appointmentCount: number;
    averageRating: number;
  }[]>;
}

/**
 * Patient statistics service implementation using Supabase
 */
class PatientStatsService implements IPatientStatsService {
  /**
   * Handle Supabase errors using the centralized error handler
   */
  private handleError(error: any, operation: string): never {
    console.error(`Patient stats service ${operation} error:`, error);

    if (!supabase) {
      const appError = ErrorHandler.handleConfigurationError(
        new Error('Database service is not available. Please check your configuration.')
      );
      throw new PatientStatsServiceError(
        appError.userMessage,
        appError.code,
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new PatientStatsServiceError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Get comprehensive patient statistics
   */
  async getPatientStats(patientId: string): Promise<PatientStats> {
    if (!patientId) {
      throw new PatientStatsServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientStatsServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Get all appointments for the patient
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            user_profile:user_profiles(first_name, last_name)
          )
        `)
        .eq('patient_id', patientId);

      if (appointmentsError) {
        this.handleError(appointmentsError, 'getPatientStats');
      }

      const appointmentList = appointments || [];

      // Calculate statistics
      const totalAppointments = appointmentList.length;
      const completedAppointments = appointmentList.filter(a => a.status === 'completed').length;
      const upcomingAppointments = appointmentList.filter(a => 
        ['pending', 'approved'].includes(a.status) && 
        new Date(a.appointment_date) >= new Date()
      ).length;
      const cancelledAppointments = appointmentList.filter(a => a.status === 'cancelled').length;
      
      const totalSpent = appointmentList
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.consultation_fee || 0), 0);

      // Get favorite doctors (most frequently visited)
      const doctorCounts = appointmentList.reduce((acc, apt) => {
        if (apt.status === 'completed') {
          const doctorId = apt.doctor_id;
          acc[doctorId] = (acc[doctorId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const favoriteDoctors = Object.entries(doctorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([doctorId]) => doctorId);

      const stats: PatientStats = {
        total_appointments: totalAppointments,
        completed_appointments: completedAppointments,
        upcoming_appointments: upcomingAppointments,
        cancelled_appointments: cancelledAppointments,
        total_spent: totalSpent,
        favorite_doctors: favoriteDoctors
      };

      return stats;
    } catch (error) {
      this.handleError(error, 'getPatientStats');
    }
  }

  /**
   * Get appointment trends over time
   */
  async getAppointmentTrends(patientId: string, months: number = 6): Promise<{
    month: string;
    appointments: number;
    completed: number;
    cancelled: number;
  }[]> {
    if (!patientId) {
      throw new PatientStatsServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientStatsServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('appointment_date, status')
        .eq('patient_id', patientId)
        .gte('appointment_date', startDate.toISOString().split('T')[0]);

      if (error) {
        this.handleError(error, 'getAppointmentTrends');
      }

      const appointmentList = appointments || [];

      // Group by month
      const monthlyData = appointmentList.reduce((acc, apt) => {
        const date = new Date(apt.appointment_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            appointments: 0,
            completed: 0,
            cancelled: 0
          };
        }

        acc[monthKey].appointments++;
        if (apt.status === 'completed') {
          acc[monthKey].completed++;
        } else if (apt.status === 'cancelled') {
          acc[monthKey].cancelled++;
        }

        return acc;
      }, {} as Record<string, any>);

      return Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
    } catch (error) {
      this.handleError(error, 'getAppointmentTrends');
    }
  }

  /**
   * Get favorite doctors based on appointment frequency and ratings
   */
  async getFavoriteDoctors(patientId: string, limit: number = 5): Promise<{
    doctorId: string;
    doctorName: string;
    specialization: string;
    appointmentCount: number;
    averageRating: number;
  }[]> {
    if (!patientId) {
      throw new PatientStatsServiceError('Patient ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new PatientStatsServiceError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          doctor_id,
          rating,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            user_profile:user_profiles(first_name, last_name)
          )
        `)
        .eq('patient_id', patientId)
        .eq('status', 'completed');

      if (error) {
        this.handleError(error, 'getFavoriteDoctors');
      }

      const appointmentList = appointments || [];

      // Group by doctor and calculate stats
      const doctorStats = appointmentList.reduce((acc, apt) => {
        const doctorId = apt.doctor_id;
        const doctor = apt.doctor;
        
        if (!acc[doctorId]) {
          acc[doctorId] = {
            doctorId,
            doctorName: `${doctor.user_profile.first_name} ${doctor.user_profile.last_name}`,
            specialization: doctor.specialization,
            appointmentCount: 0,
            totalRating: 0,
            ratingCount: 0
          };
        }

        acc[doctorId].appointmentCount++;
        if (apt.rating) {
          acc[doctorId].totalRating += apt.rating;
          acc[doctorId].ratingCount++;
        }

        return acc;
      }, {} as Record<string, any>);

      // Calculate average ratings and sort by appointment count
      const favoriteDoctors = Object.values(doctorStats)
        .map((doctor: any) => ({
          doctorId: doctor.doctorId,
          doctorName: doctor.doctorName,
          specialization: doctor.specialization,
          appointmentCount: doctor.appointmentCount,
          averageRating: doctor.ratingCount > 0 ? doctor.totalRating / doctor.ratingCount : 0
        }))
        .sort((a, b) => b.appointmentCount - a.appointmentCount)
        .slice(0, limit);

      return favoriteDoctors;
    } catch (error) {
      this.handleError(error, 'getFavoriteDoctors');
    }
  }
}

// Create and export the patient stats service instance
export const patientStatsService = new PatientStatsService();

// Export the service class and interface
export { PatientStatsService };
export type { IPatientStatsService };