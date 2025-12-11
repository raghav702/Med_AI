import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/lib/error-handler';
import { appointmentStatusManager, type AppointmentModificationRequest } from './appointment-status-manager';
import type {
  Appointment,
  CreateAppointment,
  UpdateAppointment,
  AppointmentStatus,
  AppointmentWithDetails
} from '@/types/database';

/**
 * Appointment workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  completedAt?: string;
  data?: any;
}

/**
 * Appointment workflow state
 */
export interface AppointmentWorkflow {
  appointmentId: string;
  currentStep: string;
  steps: WorkflowStep[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

/**
 * Rescheduling request
 */
export interface RescheduleRequest {
  appointmentId: string;
  newDate: string;
  newTime: string;
  reason: string;
  requestedBy: 'doctor' | 'patient';
  requiresApproval?: boolean;
}

/**
 * Appointment cancellation request
 */
export interface CancellationRequest {
  appointmentId: string;
  reason: string;
  cancelledBy: 'doctor' | 'patient';
  refundRequested?: boolean;
}

/**
 * Custom error for workflow operations
 */
export class AppointmentWorkflowError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AppointmentWorkflowError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Comprehensive appointment workflow management service
 */
export class AppointmentWorkflowService {
  /**
   * Handle errors consistently
   */
  private handleError(error: any, operation: string): never {
    console.error(`Appointment workflow ${operation} error:`, error);

    if (!supabase) {
      throw new AppointmentWorkflowError(
        'Database service is not available',
        'SERVICE_UNAVAILABLE',
        error
      );
    }

    const appError = ErrorHandler.handleDatabaseError(error);
    throw new AppointmentWorkflowError(
      appError.userMessage,
      appError.code,
      error
    );
  }

  /**
   * Create a new appointment with full workflow validation
   */
  async createAppointmentWithWorkflow(
    appointmentData: CreateAppointment,
    createdBy: string
  ): Promise<{ appointment: Appointment; workflow: AppointmentWorkflow }> {
    if (!supabase) {
      throw new AppointmentWorkflowError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      // Step 1: Validate appointment data
      await this.validateAppointmentCreation(appointmentData);

      // Step 2: Check for conflicts
      const conflictResult = await appointmentStatusManager.detectConflicts(
        appointmentData.doctor_id,
        appointmentData.patient_id,
        appointmentData.appointment_date,
        appointmentData.appointment_time,
        appointmentData.duration_minutes || 30
      );

      if (conflictResult.hasConflict) {
        throw new AppointmentWorkflowError(
          `Appointment conflict detected: ${conflictResult.conflictDetails}`,
          'APPOINTMENT_CONFLICT',
          conflictResult
        );
      }

      // Step 3: Create the appointment
      const { data: appointment, error: createError } = await supabase
        .from('appointments')
        .insert([{
          ...appointmentData,
          duration_minutes: appointmentData.duration_minutes || 30,
          status: 'pending' as AppointmentStatus,
          follow_up_required: false
        }])
        .select()
        .single();

      if (createError) {
        this.handleError(createError, 'createAppointmentWithWorkflow - create');
      }

      // Step 4: Create workflow
      const workflow = await this.initializeWorkflow(appointment.id, createdBy);

      // Step 5: Mark time slot as unavailable if it exists
      await this.updateTimeSlotAvailability(
        appointmentData.doctor_id,
        appointmentData.appointment_date,
        appointmentData.appointment_time,
        false
      );

      return { appointment, workflow };
    } catch (error) {
      if (error instanceof AppointmentWorkflowError) {
        throw error;
      }
      this.handleError(error, 'createAppointmentWithWorkflow');
    }
  }

  /**
   * Validate appointment creation data
   */
  private async validateAppointmentCreation(data: CreateAppointment): Promise<void> {
    // Validate appointment date is in the future
    const appointmentDate = new Date(data.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      throw new AppointmentWorkflowError(
        'Appointment date cannot be in the past',
        'INVALID_DATE'
      );
    }

    // Validate appointment time is during business hours
    const appointmentTime = data.appointment_time;
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    if (timeInMinutes < 8 * 60 || timeInMinutes > 18 * 60) { // 8 AM to 6 PM
      throw new AppointmentWorkflowError(
        'Appointment time must be during business hours (8 AM - 6 PM)',
        'INVALID_TIME'
      );
    }

    // Validate doctor exists and is accepting patients
    if (!supabase) {
      throw new AppointmentWorkflowError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('is_accepting_patients')
      .eq('id', data.doctor_id)
      .single();

    if (doctorError) {
      throw new AppointmentWorkflowError('Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    if (!doctor.is_accepting_patients) {
      throw new AppointmentWorkflowError(
        'Doctor is not currently accepting new patients',
        'DOCTOR_NOT_ACCEPTING'
      );
    }

    // Validate consultation fee
    if (data.consultation_fee < 0) {
      throw new AppointmentWorkflowError(
        'Consultation fee cannot be negative',
        'INVALID_FEE'
      );
    }

    // Validate reason for visit
    if (!data.reason_for_visit || data.reason_for_visit.trim().length < 5) {
      throw new AppointmentWorkflowError(
        'Reason for visit must be at least 5 characters',
        'INVALID_REASON'
      );
    }
  }

  /**
   * Initialize workflow for a new appointment
   */
  private async initializeWorkflow(appointmentId: string, createdBy: string): Promise<AppointmentWorkflow> {
    const workflow: AppointmentWorkflow = {
      appointmentId,
      currentStep: 'created',
      steps: [
        {
          id: 'created',
          name: 'Appointment Created',
          description: 'Appointment has been created and is pending doctor approval',
          status: 'completed',
          completedAt: new Date().toISOString()
        },
        {
          id: 'doctor_review',
          name: 'Doctor Review',
          description: 'Waiting for doctor to approve or reject the appointment',
          status: 'pending'
        },
        {
          id: 'confirmed',
          name: 'Appointment Confirmed',
          description: 'Appointment has been confirmed by the doctor',
          status: 'pending'
        },
        {
          id: 'reminder_sent',
          name: 'Reminder Sent',
          description: 'Appointment reminder has been sent to both parties',
          status: 'pending'
        },
        {
          id: 'completed',
          name: 'Appointment Completed',
          description: 'Appointment has been completed',
          status: 'pending'
        }
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy
      }
    };

    // Store workflow in database (you might want to create a workflows table)
    // For now, we'll return the workflow object
    return workflow;
  }

  /**
   * Update time slot availability
   */
  private async updateTimeSlotAvailability(
    doctorId: string,
    date: string,
    time: string,
    isAvailable: boolean
  ): Promise<void> {
    if (!supabase) return;

    try {
      await supabase
        .from('appointment_time_slots')
        .upsert({
          doctor_id: doctorId,
          slot_date: date,
          slot_time: time,
          is_available: isAvailable,
          duration_minutes: 30
        });
    } catch (error) {
      console.warn('Failed to update time slot availability:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Process appointment approval
   */
  async approveAppointment(
    appointmentId: string,
    doctorId: string,
    notes?: string
  ): Promise<Appointment> {
    try {
      // Update appointment status
      const appointment = await appointmentStatusManager.updateAppointmentStatus(
        appointmentId,
        'approved',
        'doctor',
        notes
      );

      // Update workflow
      await this.updateWorkflowStep(appointmentId, 'doctor_review', 'completed');
      await this.updateWorkflowStep(appointmentId, 'confirmed', 'completed');

      return appointment;
    } catch (error) {
      if (error instanceof AppointmentWorkflowError) {
        throw error;
      }
      this.handleError(error, 'approveAppointment');
    }
  }

  /**
   * Process appointment rejection
   */
  async rejectAppointment(
    appointmentId: string,
    doctorId: string,
    reason?: string
  ): Promise<Appointment> {
    try {
      // Get appointment details first
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        this.handleError(fetchError, 'rejectAppointment - fetch');
      }

      // Update appointment status
      const updatedAppointment = await appointmentStatusManager.updateAppointmentStatus(
        appointmentId,
        'rejected',
        'doctor',
        reason
      );

      // Free up the time slot
      await this.updateTimeSlotAvailability(
        appointment.doctor_id,
        appointment.appointment_date,
        appointment.appointment_time,
        true
      );

      // Update workflow
      await this.updateWorkflowStep(appointmentId, 'doctor_review', 'completed');

      return updatedAppointment;
    } catch (error) {
      if (error instanceof AppointmentWorkflowError) {
        throw error;
      }
      this.handleError(error, 'rejectAppointment');
    }
  }

  /**
   * Process appointment rescheduling
   */
  async rescheduleAppointment(request: RescheduleRequest): Promise<{
    success: boolean;
    appointment?: Appointment;
    requiresApproval?: boolean;
    conflicts?: any;
  }> {
    try {
      // Get current appointment
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', request.appointmentId)
        .single();

      if (fetchError) {
        this.handleError(fetchError, 'rescheduleAppointment - fetch');
      }

      // Check if rescheduling is allowed
      const allowedStatuses: AppointmentStatus[] = ['pending', 'approved'];
      if (!allowedStatuses.includes(currentAppointment.status)) {
        throw new AppointmentWorkflowError(
          `Cannot reschedule appointment with status: ${currentAppointment.status}`,
          'INVALID_STATUS'
        );
      }

      // Check for conflicts
      const conflictResult = await appointmentStatusManager.detectConflicts(
        currentAppointment.doctor_id,
        currentAppointment.patient_id,
        request.newDate,
        request.newTime,
        currentAppointment.duration_minutes,
        request.appointmentId
      );

      if (conflictResult.hasConflict) {
        return {
          success: false,
          conflicts: conflictResult
        };
      }

      // Determine if approval is required
      const requiresApproval = request.requestedBy === 'patient' && 
                              currentAppointment.status === 'approved';

      // Process the modification
      const modificationRequest: AppointmentModificationRequest = {
        appointmentId: request.appointmentId,
        newDate: request.newDate,
        newTime: request.newTime,
        reason: request.reason,
        requestedBy: request.requestedBy
      };

      const result = await appointmentStatusManager.processModificationRequest(modificationRequest);

      if (!result.success) {
        return {
          success: false,
          conflicts: result.conflicts
        };
      }

      // Free up old time slot
      await this.updateTimeSlotAvailability(
        currentAppointment.doctor_id,
        currentAppointment.appointment_date,
        currentAppointment.appointment_time,
        true
      );

      // Reserve new time slot
      await this.updateTimeSlotAvailability(
        currentAppointment.doctor_id,
        request.newDate,
        request.newTime,
        false
      );

      // If patient requested and appointment was approved, change status to pending
      if (requiresApproval) {
        await appointmentStatusManager.updateAppointmentStatus(
          request.appointmentId,
          'pending',
          'system',
          'Rescheduled by patient - requires doctor approval'
        );
      }

      return {
        success: true,
        appointment: result.appointment,
        requiresApproval
      };
    } catch (error) {
      if (error instanceof AppointmentWorkflowError) {
        throw error;
      }
      this.handleError(error, 'rescheduleAppointment');
    }
  }

  /**
   * Process appointment cancellation
   */
  async cancelAppointment(request: CancellationRequest): Promise<Appointment> {
    try {
      // Get current appointment
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', request.appointmentId)
        .single();

      if (fetchError) {
        this.handleError(fetchError, 'cancelAppointment - fetch');
      }

      // Check cancellation policy (e.g., can't cancel within 2 hours)
      const appointmentDateTime = new Date(`${currentAppointment.appointment_date}T${currentAppointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 2 && hoursUntilAppointment > 0) {
        throw new AppointmentWorkflowError(
          'Cannot cancel appointment within 2 hours of scheduled time',
          'CANCELLATION_TOO_LATE'
        );
      }

      // Update appointment status
      const updatedAppointment = await appointmentStatusManager.updateAppointmentStatus(
        request.appointmentId,
        'cancelled',
        request.cancelledBy,
        request.reason
      );

      // Free up the time slot
      await this.updateTimeSlotAvailability(
        currentAppointment.doctor_id,
        currentAppointment.appointment_date,
        currentAppointment.appointment_time,
        true
      );

      return updatedAppointment;
    } catch (error) {
      if (error instanceof AppointmentWorkflowError) {
        throw error;
      }
      this.handleError(error, 'cancelAppointment');
    }
  }

  /**
   * Complete an appointment
   */
  async completeAppointment(
    appointmentId: string,
    doctorId: string,
    completionData: {
      doctorNotes?: string;
      prescription?: string;
      followUpRequired?: boolean;
      followUpDate?: string;
    }
  ): Promise<Appointment> {
    try {
      // Update appointment with completion data
      const updateData: UpdateAppointment = {
        status: 'completed',
        doctor_notes: completionData.doctorNotes,
        prescription: completionData.prescription,
        follow_up_required: completionData.followUpRequired || false,
        follow_up_date: completionData.followUpDate
      };

      const updatedAppointment = await appointmentStatusManager.updateAppointmentStatus(
        appointmentId,
        'completed',
        'doctor',
        completionData.doctorNotes,
        updateData
      );

      // Update workflow
      await this.updateWorkflowStep(appointmentId, 'completed', 'completed');

      return updatedAppointment;
    } catch (error) {
      if (error instanceof AppointmentWorkflowError) {
        throw error;
      }
      this.handleError(error, 'completeAppointment');
    }
  }

  /**
   * Update workflow step status
   */
  private async updateWorkflowStep(
    appointmentId: string,
    stepId: string,
    status: 'pending' | 'completed' | 'skipped' | 'failed'
  ): Promise<void> {
    // In a real implementation, you would update the workflow in the database
    // For now, we'll just log the update
    console.log(`Workflow step updated: ${appointmentId} - ${stepId} - ${status}`);
  }

  /**
   * Get appointment workflow status
   */
  async getWorkflowStatus(appointmentId: string): Promise<AppointmentWorkflow | null> {
    // In a real implementation, you would fetch from the database
    // For now, we'll return a mock workflow based on appointment status
    if (!supabase) {
      throw new AppointmentWorkflowError('Database service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) {
        return null;
      }

      // Generate workflow based on current appointment status
      return this.generateWorkflowFromStatus(appointment);
    } catch (error) {
      console.warn('Failed to get workflow status:', error);
      return null;
    }
  }

  /**
   * Generate workflow from appointment status
   */
  private generateWorkflowFromStatus(appointment: Appointment): AppointmentWorkflow {
    const steps: WorkflowStep[] = [
      {
        id: 'created',
        name: 'Appointment Created',
        description: 'Appointment has been created',
        status: 'completed',
        completedAt: appointment.created_at
      }
    ];

    switch (appointment.status) {
      case 'pending':
        steps.push({
          id: 'doctor_review',
          name: 'Doctor Review',
          description: 'Waiting for doctor approval',
          status: 'pending'
        });
        break;

      case 'approved':
        steps.push(
          {
            id: 'doctor_review',
            name: 'Doctor Review',
            description: 'Doctor has approved the appointment',
            status: 'completed',
            completedAt: appointment.updated_at
          },
          {
            id: 'confirmed',
            name: 'Appointment Confirmed',
            description: 'Appointment is confirmed and scheduled',
            status: 'completed',
            completedAt: appointment.updated_at
          }
        );
        break;

      case 'completed':
        steps.push(
          {
            id: 'doctor_review',
            name: 'Doctor Review',
            description: 'Doctor approved the appointment',
            status: 'completed'
          },
          {
            id: 'confirmed',
            name: 'Appointment Confirmed',
            description: 'Appointment was confirmed',
            status: 'completed'
          },
          {
            id: 'completed',
            name: 'Appointment Completed',
            description: 'Appointment has been completed',
            status: 'completed',
            completedAt: appointment.updated_at
          }
        );
        break;

      case 'cancelled':
      case 'rejected':
        steps.push({
          id: 'terminated',
          name: appointment.status === 'cancelled' ? 'Cancelled' : 'Rejected',
          description: `Appointment was ${appointment.status}`,
          status: 'completed',
          completedAt: appointment.updated_at
        });
        break;
    }

    return {
      appointmentId: appointment.id,
      currentStep: steps[steps.length - 1].id,
      steps,
      metadata: {
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at,
        createdBy: appointment.patient_id
      }
    };
  }
}

// Create and export the appointment workflow service instance
export const appointmentWorkflowService = new AppointmentWorkflowService();

// Export types
export type {
  WorkflowStep,
  AppointmentWorkflow,
  RescheduleRequest,
  CancellationRequest
};