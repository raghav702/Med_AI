import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import type {
  Appointment,
  AppointmentStatus,
  UpdateAppointment,
  AppointmentWithDetails
} from '@/types/database';

/**
 * Appointment status transitions and business rules
 */
export interface AppointmentStatusTransition {
  from: AppointmentStatus;
  to: AppointmentStatus;
  allowedBy: ('doctor' | 'patient' | 'system')[];
  conditions?: (appointment: Appointment) => boolean;
  autoTransition?: {
    trigger: 'time' | 'action';
    delay?: number; // minutes
  };
}

/**
 * Appointment state machine configuration
 */
export const APPOINTMENT_STATUS_TRANSITIONS: AppointmentStatusTransition[] = [
  // From pending
  {
    from: 'pending',
    to: 'approved',
    allowedBy: ['doctor'],
    conditions: (apt) => new Date(apt.appointment_date) > new Date()
  },
  {
    from: 'pending',
    to: 'rejected',
    allowedBy: ['doctor'],
    conditions: (apt) => new Date(apt.appointment_date) > new Date()
  },
  {
    from: 'pending',
    to: 'cancelled',
    allowedBy: ['patient', 'doctor'],
    conditions: (apt) => new Date(apt.appointment_date) > new Date()
  },
  
  // From approved
  {
    from: 'approved',
    to: 'completed',
    allowedBy: ['doctor'],
    conditions: (apt) => new Date(apt.appointment_date) <= new Date()
  },
  {
    from: 'approved',
    to: 'cancelled',
    allowedBy: ['patient', 'doctor'],
    conditions: (apt) => {
      const appointmentDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilAppointment > 2; // Allow cancellation up to 2 hours before
    }
  },
  {
    from: 'approved',
    to: 'no_show',
    allowedBy: ['system', 'doctor'],
    autoTransition: {
      trigger: 'time',
      delay: 30 // 30 minutes after appointment time
    }
  },
  
  // From completed
  {
    from: 'completed',
    to: 'completed', // Allow updates to completed appointments (for notes, ratings)
    allowedBy: ['doctor', 'patient']
  },
  
  // From cancelled - generally final state
  {
    from: 'cancelled',
    to: 'pending',
    allowedBy: ['patient'], // Allow rebooking
    conditions: (apt) => new Date(apt.appointment_date) > new Date()
  },
  
  // From rejected - allow rebooking
  {
    from: 'rejected',
    to: 'pending',
    allowedBy: ['patient'],
    conditions: (apt) => new Date(apt.appointment_date) > new Date()
  }
];

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: 'doctor_busy' | 'patient_busy' | 'time_slot_unavailable' | 'outside_availability';
  conflictDetails?: string;
  suggestedAlternatives?: {
    date: string;
    time: string;
  }[];
}

/**
 * Appointment modification request
 */
export interface AppointmentModificationRequest {
  appointmentId: string;
  newDate?: string;
  newTime?: string;
  newDuration?: number;
  reason?: string;
  requestedBy: 'doctor' | 'patient';
}

/**
 * Custom error for appointment status operations
 */
export class AppointmentStatusError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AppointmentStatusError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Comprehensive appointment status management service
 */
export class AppointmentStatusManager {
  /**
   * Handle errors consistently
   */
  private handleError(error: any, operation: string): never {
    console.error(`Appointment status manager ${operation} error:`, error);

    if (!supabase) {
      throw new AppointmentStatusError(
        'Database service is not available',
        'SERVICE_UNAVAILABLE',
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new AppointmentStatusError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Validate if a status transition is allowed
   */
  validateStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    requestedBy: 'doctor' | 'patient' | 'system',
    appointment: Appointment
  ): boolean {
    const transition = APPOINTMENT_STATUS_TRANSITIONS.find(
      t => t.from === currentStatus && t.to === newStatus
    );

    if (!transition) {
      return false;
    }

    // Check if the requester is allowed to make this transition
    if (!transition.allowedBy.includes(requestedBy)) {
      return false;
    }

    // Check additional conditions if any
    if (transition.conditions && !transition.conditions(appointment)) {
      return false;
    }

    return true;
  }

  /**
   * Get allowed status transitions for an appointment
   */
  getAllowedTransitions(
    appointment: Appointment,
    requestedBy: 'doctor' | 'patient' | 'system'
  ): AppointmentStatus[] {
    return APPOINTMENT_STATUS_TRANSITIONS
      .filter(t => 
        t.from === appointment.status &&
        t.allowedBy.includes(requestedBy) &&
        (!t.conditions || t.conditions(appointment))
      )
      .map(t => t.to);
  }

  /**
   * Update appointment status with validation
   */
  async updateAppointmentStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    requestedBy: 'doctor' | 'patient' | 'system',
    notes?: string,
    additionalData?: Partial<UpdateAppointment>
  ): Promise<Appointment> {
    if (!appointmentId) {
      throw new AppointmentStatusError('Appointment ID is required', 'INVALID_INPUT');
    }

    if (!supabase) {
      throw new AppointmentStatusError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Get current appointment
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        this.handleError(fetchError, 'updateAppointmentStatus - fetch');
      }

      if (!currentAppointment) {
        throw new AppointmentStatusError('Appointment not found', 'NOT_FOUND');
      }

      // Validate the status transition
      if (!this.validateStatusTransition(
        currentAppointment.status,
        newStatus,
        requestedBy,
        currentAppointment
      )) {
        throw new AppointmentStatusError(
          `Invalid status transition from ${currentAppointment.status} to ${newStatus} by ${requestedBy}`,
          'INVALID_TRANSITION'
        );
      }

      // Prepare update data
      const updateData: UpdateAppointment = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      // Add notes based on who is updating
      if (notes) {
        if (requestedBy === 'doctor') {
          updateData.doctor_notes = notes;
        } else if (requestedBy === 'patient') {
          updateData.patient_notes = notes;
        }
      }

      // Update the appointment
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateError) {
        this.handleError(updateError, 'updateAppointmentStatus - update');
      }

      return updatedAppointment;
    } catch (error) {
      if (error instanceof AppointmentStatusError) {
        throw error;
      }
      this.handleError(error, 'updateAppointmentStatus');
    }
  }

  /**
   * Detect conflicts for appointment booking or modification
   */
  async detectConflicts(
    doctorId: string,
    patientId: string,
    appointmentDate: string,
    appointmentTime: string,
    duration: number = 30,
    excludeAppointmentId?: string
  ): Promise<ConflictDetectionResult> {
    if (!supabase) {
      throw new AppointmentStatusError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const endTime = new Date(appointmentDateTime.getTime() + duration * 60000);

      // Check doctor availability
      const dayOfWeek = appointmentDateTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      const { data: availability, error: availabilityError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (availabilityError) {
        this.handleError(availabilityError, 'detectConflicts - availability');
      }

      // Check if time falls within doctor's availability
      const timeString = appointmentTime;
      const isWithinAvailability = availability?.some(avail => 
        avail.start_time <= timeString && avail.end_time > timeString
      );

      if (!isWithinAvailability) {
        return {
          hasConflict: true,
          conflictType: 'outside_availability',
          conflictDetails: 'Requested time is outside doctor\'s availability hours'
        };
      }

      // Check for doctor conflicts
      let doctorConflictQuery = supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', appointmentDate)
        .in('status', ['pending', 'approved']);

      if (excludeAppointmentId) {
        doctorConflictQuery = doctorConflictQuery.neq('id', excludeAppointmentId);
      }

      const { data: doctorConflicts, error: doctorError } = await doctorConflictQuery;

      if (doctorError) {
        this.handleError(doctorError, 'detectConflicts - doctor');
      }

      // Check for time overlap with doctor's existing appointments
      const doctorTimeConflict = doctorConflicts?.some(apt => {
        const existingStart = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        const existingEnd = new Date(existingStart.getTime() + apt.duration_minutes * 60000);
        
        return (appointmentDateTime < existingEnd && endTime > existingStart);
      });

      if (doctorTimeConflict) {
        return {
          hasConflict: true,
          conflictType: 'doctor_busy',
          conflictDetails: 'Doctor already has an appointment at this time'
        };
      }

      // Check for patient conflicts
      let patientConflictQuery = supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('appointment_date', appointmentDate)
        .in('status', ['pending', 'approved']);

      if (excludeAppointmentId) {
        patientConflictQuery = patientConflictQuery.neq('id', excludeAppointmentId);
      }

      const { data: patientConflicts, error: patientError } = await patientConflictQuery;

      if (patientError) {
        this.handleError(patientError, 'detectConflicts - patient');
      }

      // Check for time overlap with patient's existing appointments
      const patientTimeConflict = patientConflicts?.some(apt => {
        const existingStart = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        const existingEnd = new Date(existingStart.getTime() + apt.duration_minutes * 60000);
        
        return (appointmentDateTime < existingEnd && endTime > existingStart);
      });

      if (patientTimeConflict) {
        return {
          hasConflict: true,
          conflictType: 'patient_busy',
          conflictDetails: 'Patient already has an appointment at this time'
        };
      }

      // Check time slot availability
      const { data: timeSlot, error: slotError } = await supabase
        .from('appointment_time_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('slot_date', appointmentDate)
        .eq('slot_time', appointmentTime)
        .single();

      if (slotError && slotError.code !== 'PGRST116') {
        this.handleError(slotError, 'detectConflicts - time slot');
      }

      if (timeSlot && (!timeSlot.is_available || timeSlot.is_blocked)) {
        return {
          hasConflict: true,
          conflictType: 'time_slot_unavailable',
          conflictDetails: timeSlot.block_reason || 'Time slot is not available'
        };
      }

      return { hasConflict: false };
    } catch (error) {
      if (error instanceof AppointmentStatusError) {
        throw error;
      }
      this.handleError(error, 'detectConflicts');
    }
  }

  /**
   * Get suggested alternative appointment times
   */
  async getSuggestedAlternatives(
    doctorId: string,
    patientId: string,
    preferredDate: string,
    duration: number = 30,
    maxSuggestions: number = 5
  ): Promise<{ date: string; time: string }[]> {
    if (!supabase) {
      throw new AppointmentStatusError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const suggestions: { date: string; time: string }[] = [];
      const startDate = new Date(preferredDate);
      
      // Look for alternatives within the next 14 days
      for (let dayOffset = 0; dayOffset < 14 && suggestions.length < maxSuggestions; dayOffset++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(startDate.getDate() + dayOffset);
        const dateString = checkDate.toISOString().split('T')[0];

        // Get available time slots for this date
        const { data: availableSlots, error } = await supabase
          .rpc('get_available_time_slots', {
            p_doctor_id: doctorId,
            p_date: dateString
          });

        if (error) {
          console.warn(`Error getting available slots for ${dateString}:`, error);
          continue;
        }

        // Check each slot for conflicts
        for (const slot of availableSlots || []) {
          if (suggestions.length >= maxSuggestions) break;

          const conflictResult = await this.detectConflicts(
            doctorId,
            patientId,
            dateString,
            slot.slot_time,
            duration
          );

          if (!conflictResult.hasConflict) {
            suggestions.push({
              date: dateString,
              time: slot.slot_time
            });
          }
        }
      }

      return suggestions;
    } catch (error) {
      if (error instanceof AppointmentStatusError) {
        throw error;
      }
      this.handleError(error, 'getSuggestedAlternatives');
    }
  }

  /**
   * Process appointment modification request
   */
  async processModificationRequest(
    request: AppointmentModificationRequest
  ): Promise<{ success: boolean; appointment?: Appointment; conflicts?: ConflictDetectionResult }> {
    if (!supabase) {
      throw new AppointmentStatusError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Get current appointment
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', request.appointmentId)
        .single();

      if (fetchError) {
        this.handleError(fetchError, 'processModificationRequest - fetch');
      }

      if (!currentAppointment) {
        throw new AppointmentStatusError('Appointment not found', 'NOT_FOUND');
      }

      // Check if modification is allowed based on current status
      const allowedStatuses: AppointmentStatus[] = ['pending', 'approved'];
      if (!allowedStatuses.includes(currentAppointment.status)) {
        throw new AppointmentStatusError(
          `Cannot modify appointment with status: ${currentAppointment.status}`,
          'INVALID_STATUS'
        );
      }

      // Use current values if not provided in request
      const newDate = request.newDate || currentAppointment.appointment_date;
      const newTime = request.newTime || currentAppointment.appointment_time;
      const newDuration = request.newDuration || currentAppointment.duration_minutes;

      // Check for conflicts with the new time
      const conflictResult = await this.detectConflicts(
        currentAppointment.doctor_id,
        currentAppointment.patient_id,
        newDate,
        newTime,
        newDuration,
        request.appointmentId
      );

      if (conflictResult.hasConflict) {
        return {
          success: false,
          conflicts: conflictResult
        };
      }

      // Update the appointment
      const updateData: UpdateAppointment = {
        appointment_date: newDate,
        appointment_time: newTime,
        duration_minutes: newDuration,
        updated_at: new Date().toISOString()
      };

      // Add modification reason as notes
      if (request.reason) {
        if (request.requestedBy === 'doctor') {
          updateData.doctor_notes = `Modified: ${request.reason}`;
        } else {
          updateData.patient_notes = `Modification requested: ${request.reason}`;
        }
      }

      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', request.appointmentId)
        .select()
        .single();

      if (updateError) {
        this.handleError(updateError, 'processModificationRequest - update');
      }

      return {
        success: true,
        appointment: updatedAppointment
      };
    } catch (error) {
      if (error instanceof AppointmentStatusError) {
        throw error;
      }
      this.handleError(error, 'processModificationRequest');
    }
  }

  /**
   * Process automatic status transitions (called by scheduled job)
   */
  async processAutomaticTransitions(): Promise<void> {
    if (!supabase) {
      throw new AppointmentStatusError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const now = new Date();
      
      // Mark approved appointments as no-show if they're more than 30 minutes past appointment time
      const noShowCutoff = new Date(now.getTime() - 30 * 60000); // 30 minutes ago
      
      const { data: overdueAppointments, error: overdueError } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'approved')
        .lt('appointment_date', now.toISOString().split('T')[0])
        .or(`appointment_date.lt.${noShowCutoff.toISOString().split('T')[0]},and(appointment_date.eq.${now.toISOString().split('T')[0]},appointment_time.lt.${noShowCutoff.toTimeString().split(' ')[0]})`);

      if (overdueError) {
        this.handleError(overdueError, 'processAutomaticTransitions - overdue');
      }

      // Update overdue appointments to no-show
      for (const appointment of overdueAppointments || []) {
        await this.updateAppointmentStatus(
          appointment.id,
          'no_show',
          'system',
          'Automatically marked as no-show due to missed appointment'
        );
      }

      console.log(`Processed ${overdueAppointments?.length || 0} automatic status transitions`);
    } catch (error) {
      if (error instanceof AppointmentStatusError) {
        throw error;
      }
      this.handleError(error, 'processAutomaticTransitions');
    }
  }
}

// Create and export the appointment status manager instance
export const appointmentStatusManager = new AppointmentStatusManager();

// Export types and constants
export type { ConflictDetectionResult, AppointmentModificationRequest };
export { APPOINTMENT_STATUS_TRANSITIONS };