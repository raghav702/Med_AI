import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import { appointmentStatusManager } from './appointment-status-manager';
import type {
  AppointmentTimeSlot,
  CreateAppointmentTimeSlot,
  UpdateAppointmentTimeSlot,
  DoctorAvailability,
  AvailabilityDay
} from '@/types/database';

/**
 * Time slot with availability information
 */
export interface AvailableTimeSlot {
  date: string;
  time: string;
  duration: number;
  isAvailable: boolean;
  isBlocked: boolean;
  blockReason?: string;
  hasConflict: boolean;
}

/**
 * Scheduling preferences
 */
export interface SchedulingPreferences {
  preferredDays?: AvailabilityDay[];
  preferredTimeRanges?: {
    start: string;
    end: string;
  }[];
  minDuration?: number;
  maxDuration?: number;
  bufferTime?: number; // minutes between appointments
}

/**
 * Bulk scheduling request
 */
export interface BulkSchedulingRequest {
  doctorId: string;
  startDate: string;
  endDate: string;
  slotDuration: number;
  bufferTime?: number;
  excludeDates?: string[];
  customAvailability?: {
    date: string;
    startTime: string;
    endTime: string;
  }[];
}

/**
 * Scheduling statistics
 */
export interface SchedulingStats {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  utilizationRate: number;
  peakHours: string[];
  averageBookingLead: number; // days
}

/**
 * Custom error for scheduling operations
 */
export class AppointmentSchedulerError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AppointmentSchedulerError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Comprehensive appointment scheduling service
 */
export class AppointmentSchedulerService {
  /**
   * Handle errors consistently
   */
  private handleError(error: any, operation: string): never {
    console.error(`Appointment scheduler ${operation} error:`, error);

    if (!supabase) {
      throw new AppointmentSchedulerError(
        'Database service is not available',
        'SERVICE_UNAVAILABLE',
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new AppointmentSchedulerError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Get available time slots for a doctor within a date range
   */
  async getAvailableTimeSlots(
    doctorId: string,
    startDate: string,
    endDate: string,
    patientId?: string,
    preferences?: SchedulingPreferences
  ): Promise<AvailableTimeSlot[]> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const availableSlots: AvailableTimeSlot[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Iterate through each date in the range
      for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
        const dateString = currentDate.toISOString().split('T')[0];
        const daySlots = await this.getAvailableSlotsForDate(doctorId, dateString, patientId, preferences);
        availableSlots.push(...daySlots);
      }

      return availableSlots;
    } catch (error) {
      if (error instanceof AppointmentSchedulerError) {
        throw error;
      }
      this.handleError(error, 'getAvailableTimeSlots');
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlotsForDate(
    doctorId: string,
    date: string,
    patientId?: string,
    preferences?: SchedulingPreferences
  ): Promise<AvailableTimeSlot[]> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const dayOfWeek = this.getDayOfWeek(date);
      
      // Get doctor's availability for this day
      const { data: availability, error: availError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (availError) {
        this.handleError(availError, 'getAvailableSlotsForDate - availability');
      }

      if (!availability || availability.length === 0) {
        return []; // Doctor not available on this day
      }

      // Get existing time slots
      const { data: timeSlots, error: slotsError } = await supabase
        .from('appointment_time_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('slot_date', date);

      if (slotsError) {
        this.handleError(slotsError, 'getAvailableSlotsForDate - slots');
      }

      // Get existing appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'approved']);

      if (appointmentsError) {
        this.handleError(appointmentsError, 'getAvailableSlotsForDate - appointments');
      }

      // Generate available slots
      const availableSlots: AvailableTimeSlot[] = [];

      for (const avail of availability) {
        const slots = await this.generateSlotsForAvailability(
          doctorId,
          date,
          avail,
          timeSlots || [],
          appointments || [],
          patientId,
          preferences
        );
        availableSlots.push(...slots);
      }

      return availableSlots.sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      if (error instanceof AppointmentSchedulerError) {
        throw error;
      }
      this.handleError(error, 'getAvailableSlotsForDate');
    }
  }

  /**
   * Generate time slots for a specific availability window
   */
  private async generateSlotsForAvailability(
    doctorId: string,
    date: string,
    availability: DoctorAvailability,
    existingSlots: AppointmentTimeSlot[],
    existingAppointments: any[],
    patientId?: string,
    preferences?: SchedulingPreferences
  ): Promise<AvailableTimeSlot[]> {
    const slots: AvailableTimeSlot[] = [];
    const slotDuration = preferences?.minDuration || 30;
    const bufferTime = preferences?.bufferTime || 0;
    const totalSlotTime = slotDuration + bufferTime;

    // Convert time strings to minutes for easier calculation
    const startMinutes = this.timeToMinutes(availability.start_time);
    const endMinutes = this.timeToMinutes(availability.end_time);

    for (let currentMinutes = startMinutes; currentMinutes + slotDuration <= endMinutes; currentMinutes += totalSlotTime) {
      const timeString = this.minutesToTime(currentMinutes);
      
      // Check if this time slot exists in the database
      const existingSlot = existingSlots.find(slot => slot.slot_time === timeString);
      
      // Check if there's an existing appointment at this time
      const hasAppointment = existingAppointments.some(apt => apt.appointment_time === timeString);

      // Check for conflicts if patient ID is provided
      let hasConflict = false;
      if (patientId) {
        const conflictResult = await appointmentStatusManager.detectConflicts(
          doctorId,
          patientId,
          date,
          timeString,
          slotDuration
        );
        hasConflict = conflictResult.hasConflict;
      }

      // Apply preferences filter
      if (preferences && !this.matchesPreferences(timeString, preferences)) {
        continue;
      }

      const slot: AvailableTimeSlot = {
        date,
        time: timeString,
        duration: slotDuration,
        isAvailable: existingSlot ? existingSlot.is_available : true,
        isBlocked: existingSlot ? existingSlot.is_blocked : false,
        blockReason: existingSlot?.block_reason,
        hasConflict: hasConflict || hasAppointment
      };

      slots.push(slot);
    }

    return slots;
  }

  /**
   * Create time slots in bulk for a doctor
   */
  async createBulkTimeSlots(request: BulkSchedulingRequest): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
        const dateString = currentDate.toISOString().split('T')[0];

        // Skip excluded dates
        if (request.excludeDates?.includes(dateString)) {
          continue;
        }

        try {
          const dayResult = await this.createTimeSlotsForDate(
            request.doctorId,
            dateString,
            request.slotDuration,
            request.bufferTime || 0,
            request.customAvailability?.find(ca => ca.date === dateString)
          );

          created += dayResult.created;
          skipped += dayResult.skipped;
        } catch (error) {
          errors.push(`${dateString}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { created, skipped, errors };
    } catch (error) {
      if (error instanceof AppointmentSchedulerError) {
        throw error;
      }
      this.handleError(error, 'createBulkTimeSlots');
    }
  }

  /**
   * Create time slots for a specific date
   */
  private async createTimeSlotsForDate(
    doctorId: string,
    date: string,
    slotDuration: number,
    bufferTime: number,
    customAvailability?: { startTime: string; endTime: string }
  ): Promise<{ created: number; skipped: number }> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    let created = 0;
    let skipped = 0;

    // Get availability for this date
    let availabilityWindows: { start_time: string; end_time: string }[] = [];

    if (customAvailability) {
      availabilityWindows = [{
        start_time: customAvailability.startTime,
        end_time: customAvailability.endTime
      }];
    } else {
      const dayOfWeek = this.getDayOfWeek(date);
      const { data: availability, error } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (error) {
        throw new AppointmentSchedulerError('Failed to get doctor availability', 'AVAILABILITY_ERROR');
      }

      availabilityWindows = availability || [];
    }

    // Generate and insert time slots
    for (const window of availabilityWindows) {
      const startMinutes = this.timeToMinutes(window.start_time);
      const endMinutes = this.timeToMinutes(window.end_time);
      const totalSlotTime = slotDuration + bufferTime;

      for (let currentMinutes = startMinutes; currentMinutes + slotDuration <= endMinutes; currentMinutes += totalSlotTime) {
        const timeString = this.minutesToTime(currentMinutes);

        try {
          const { error } = await supabase
            .from('appointment_time_slots')
            .insert({
              doctor_id: doctorId,
              slot_date: date,
              slot_time: timeString,
              duration_minutes: slotDuration,
              is_available: true,
              is_blocked: false
            });

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              skipped++;
            } else {
              throw error;
            }
          } else {
            created++;
          }
        } catch (error) {
          console.warn(`Failed to create slot ${date} ${timeString}:`, error);
          skipped++;
        }
      }
    }

    return { created, skipped };
  }

  /**
   * Block time slots
   */
  async blockTimeSlots(
    doctorId: string,
    slots: { date: string; time: string }[],
    reason: string
  ): Promise<{ blocked: number; errors: string[] }> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      let blocked = 0;
      const errors: string[] = [];

      for (const slot of slots) {
        try {
          const { error } = await supabase
            .from('appointment_time_slots')
            .upsert({
              doctor_id: doctorId,
              slot_date: slot.date,
              slot_time: slot.time,
              is_blocked: true,
              block_reason: reason,
              duration_minutes: 30
            });

          if (error) {
            errors.push(`${slot.date} ${slot.time}: ${error.message}`);
          } else {
            blocked++;
          }
        } catch (error) {
          errors.push(`${slot.date} ${slot.time}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { blocked, errors };
    } catch (error) {
      if (error instanceof AppointmentSchedulerError) {
        throw error;
      }
      this.handleError(error, 'blockTimeSlots');
    }
  }

  /**
   * Unblock time slots
   */
  async unblockTimeSlots(
    doctorId: string,
    slots: { date: string; time: string }[]
  ): Promise<{ unblocked: number; errors: string[] }> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      let unblocked = 0;
      const errors: string[] = [];

      for (const slot of slots) {
        try {
          const { error } = await supabase
            .from('appointment_time_slots')
            .update({
              is_blocked: false,
              block_reason: null
            })
            .eq('doctor_id', doctorId)
            .eq('slot_date', slot.date)
            .eq('slot_time', slot.time);

          if (error) {
            errors.push(`${slot.date} ${slot.time}: ${error.message}`);
          } else {
            unblocked++;
          }
        } catch (error) {
          errors.push(`${slot.date} ${slot.time}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { unblocked, errors };
    } catch (error) {
      if (error instanceof AppointmentSchedulerError) {
        throw error;
      }
      this.handleError(error, 'unblockTimeSlots');
    }
  }

  /**
   * Get scheduling statistics for a doctor
   */
  async getSchedulingStats(
    doctorId: string,
    startDate: string,
    endDate: string
  ): Promise<SchedulingStats> {
    if (!supabase) {
      throw new AppointmentSchedulerError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Get time slots
      const { data: timeSlots, error: slotsError } = await supabase
        .from('appointment_time_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('slot_date', startDate)
        .lte('slot_date', endDate);

      if (slotsError) {
        this.handleError(slotsError, 'getSchedulingStats - slots');
      }

      // Get appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, status, created_at')
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      if (appointmentsError) {
        this.handleError(appointmentsError, 'getSchedulingStats - appointments');
      }

      const totalSlots = timeSlots?.length || 0;
      const availableSlots = timeSlots?.filter(slot => slot.is_available && !slot.is_blocked).length || 0;
      const blockedSlots = timeSlots?.filter(slot => slot.is_blocked).length || 0;
      const bookedSlots = appointments?.filter(apt => ['pending', 'approved', 'completed'].includes(apt.status)).length || 0;

      // Calculate utilization rate
      const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

      // Find peak hours
      const hourCounts: { [hour: string]: number } = {};
      appointments?.forEach(apt => {
        const hour = apt.appointment_time.split(':')[0];
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => `${hour}:00`);

      // Calculate average booking lead time
      const leadTimes = appointments?.map(apt => {
        const appointmentDate = new Date(apt.appointment_date);
        const bookingDate = new Date(apt.created_at);
        return Math.floor((appointmentDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
      }) || [];

      const averageBookingLead = leadTimes.length > 0 
        ? leadTimes.reduce((sum, lead) => sum + lead, 0) / leadTimes.length 
        : 0;

      return {
        totalSlots,
        availableSlots,
        bookedSlots,
        blockedSlots,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        peakHours,
        averageBookingLead: Math.round(averageBookingLead * 100) / 100
      };
    } catch (error) {
      if (error instanceof AppointmentSchedulerError) {
        throw error;
      }
      this.handleError(error, 'getSchedulingStats');
    }
  }

  /**
   * Utility: Convert day of week to enum
   */
  private getDayOfWeek(date: string): AvailabilityDay {
    const dayIndex = new Date(date).getDay();
    const days: AvailabilityDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }

  /**
   * Utility: Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Utility: Convert minutes to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Utility: Check if time matches preferences
   */
  private matchesPreferences(time: string, preferences: SchedulingPreferences): boolean {
    if (!preferences.preferredTimeRanges || preferences.preferredTimeRanges.length === 0) {
      return true;
    }

    const timeMinutes = this.timeToMinutes(time);

    return preferences.preferredTimeRanges.some(range => {
      const startMinutes = this.timeToMinutes(range.start);
      const endMinutes = this.timeToMinutes(range.end);
      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    });
  }
}

// Create and export the appointment scheduler service instance
export const appointmentSchedulerService = new AppointmentSchedulerService();

// Export types
export type {
  AvailableTimeSlot,
  SchedulingPreferences,
  BulkSchedulingRequest,
  SchedulingStats
};