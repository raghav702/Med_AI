import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentStatusManager } from '@/services/appointment-status-manager';
import { appointmentWorkflowService } from '@/services/appointment-workflow';
import { appointmentSchedulerService } from '@/services/appointment-scheduler';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentWithDetails
} from '@/types/database';
import type {
  ConflictDetectionResult,
  AppointmentModificationRequest
} from '@/services/appointment-status-manager';
import type {
  RescheduleRequest,
  CancellationRequest,
  AppointmentWorkflow
} from '@/services/appointment-workflow';
import type {
  AvailableTimeSlot,
  SchedulingPreferences
} from '@/services/appointment-scheduler';

/**
 * Hook for managing appointment status operations
 */
export function useAppointmentStatus(appointmentId?: string) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get appointment details
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      // This would typically call your appointment service
      // For now, we'll return null as the service method isn't implemented
      return null;
    },
    enabled: !!appointmentId
  });

  // Get workflow status
  const { data: workflow, isLoading: workflowLoading } = useQuery({
    queryKey: ['appointment-workflow', appointmentId],
    queryFn: () => appointmentWorkflowService.getWorkflowStatus(appointmentId!),
    enabled: !!appointmentId
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      newStatus,
      requestedBy,
      notes,
      additionalData
    }: {
      newStatus: AppointmentStatus;
      requestedBy: 'doctor' | 'patient' | 'system';
      notes?: string;
      additionalData?: any;
    }) => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return appointmentStatusManager.updateAppointmentStatus(
        appointmentId,
        newStatus,
        requestedBy,
        notes,
        additionalData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-workflow', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update appointment status');
    }
  });

  // Approve appointment mutation
  const approveAppointmentMutation = useMutation({
    mutationFn: async ({ doctorId, notes }: { doctorId: string; notes?: string }) => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return appointmentWorkflowService.approveAppointment(appointmentId, doctorId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-workflow', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to approve appointment');
    }
  });

  // Reject appointment mutation
  const rejectAppointmentMutation = useMutation({
    mutationFn: async ({ doctorId, reason }: { doctorId: string; reason?: string }) => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return appointmentWorkflowService.rejectAppointment(appointmentId, doctorId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-workflow', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to reject appointment');
    }
  });

  // Reschedule appointment mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: (request: RescheduleRequest) => {
      return appointmentWorkflowService.rescheduleAppointment(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-workflow', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to reschedule appointment');
    }
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (request: CancellationRequest) => {
      return appointmentWorkflowService.cancelAppointment(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-workflow', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to cancel appointment');
    }
  });

  // Complete appointment mutation
  const completeAppointmentMutation = useMutation({
    mutationFn: async ({
      doctorId,
      completionData
    }: {
      doctorId: string;
      completionData: {
        doctorNotes?: string;
        prescription?: string;
        followUpRequired?: boolean;
        followUpDate?: string;
      };
    }) => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return appointmentWorkflowService.completeAppointment(appointmentId, doctorId, completionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-workflow', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to complete appointment');
    }
  });

  // Get allowed transitions
  const getAllowedTransitions = useCallback((
    currentAppointment: Appointment,
    requestedBy: 'doctor' | 'patient' | 'system'
  ): AppointmentStatus[] => {
    return appointmentStatusManager.getAllowedTransitions(currentAppointment, requestedBy);
  }, []);

  // Detect conflicts
  const detectConflicts = useCallback(async (
    doctorId: string,
    patientId: string,
    appointmentDate: string,
    appointmentTime: string,
    duration: number = 30,
    excludeAppointmentId?: string
  ): Promise<ConflictDetectionResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await appointmentStatusManager.detectConflicts(
        doctorId,
        patientId,
        appointmentDate,
        appointmentTime,
        duration,
        excludeAppointmentId
      );
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to detect conflicts');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get suggested alternatives
  const getSuggestedAlternatives = useCallback(async (
    doctorId: string,
    patientId: string,
    preferredDate: string,
    duration: number = 30,
    maxSuggestions: number = 5
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const alternatives = await appointmentStatusManager.getSuggestedAlternatives(
        doctorId,
        patientId,
        preferredDate,
        duration,
        maxSuggestions
      );
      return alternatives;
    } catch (err: any) {
      setError(err.message || 'Failed to get suggested alternatives');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    appointment,
    workflow,
    
    // Loading states
    isLoading: isLoading || appointmentLoading || workflowLoading,
    isUpdating: updateStatusMutation.isPending,
    isApproving: approveAppointmentMutation.isPending,
    isRejecting: rejectAppointmentMutation.isPending,
    isRescheduling: rescheduleAppointmentMutation.isPending,
    isCancelling: cancelAppointmentMutation.isPending,
    isCompleting: completeAppointmentMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    updateStatus: updateStatusMutation.mutate,
    approveAppointment: approveAppointmentMutation.mutate,
    rejectAppointment: rejectAppointmentMutation.mutate,
    rescheduleAppointment: rescheduleAppointmentMutation.mutate,
    cancelAppointment: cancelAppointmentMutation.mutate,
    completeAppointment: completeAppointmentMutation.mutate,
    
    // Utilities
    getAllowedTransitions,
    detectConflicts,
    getSuggestedAlternatives,
    clearError
  };
}

/**
 * Hook for managing appointment scheduling
 */
export function useAppointmentScheduling(doctorId?: string) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available time slots
  const getAvailableSlots = useCallback(async (
    startDate: string,
    endDate: string,
    patientId?: string,
    preferences?: SchedulingPreferences
  ): Promise<AvailableTimeSlot[]> => {
    if (!doctorId) throw new Error('Doctor ID is required');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const slots = await appointmentSchedulerService.getAvailableTimeSlots(
        doctorId,
        startDate,
        endDate,
        patientId,
        preferences
      );
      return slots;
    } catch (err: any) {
      setError(err.message || 'Failed to get available slots');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Create bulk time slots mutation
  const createBulkSlotsMutation = useMutation({
    mutationFn: (request: {
      startDate: string;
      endDate: string;
      slotDuration: number;
      bufferTime?: number;
      excludeDates?: string[];
    }) => {
      if (!doctorId) throw new Error('Doctor ID is required');
      return appointmentSchedulerService.createBulkTimeSlots({
        doctorId,
        ...request
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['scheduling-stats'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create time slots');
    }
  });

  // Block time slots mutation
  const blockSlotsMutation = useMutation({
    mutationFn: ({
      slots,
      reason
    }: {
      slots: { date: string; time: string }[];
      reason: string;
    }) => {
      if (!doctorId) throw new Error('Doctor ID is required');
      return appointmentSchedulerService.blockTimeSlots(doctorId, slots, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['scheduling-stats'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to block time slots');
    }
  });

  // Unblock time slots mutation
  const unblockSlotsMutation = useMutation({
    mutationFn: (slots: { date: string; time: string }[]) => {
      if (!doctorId) throw new Error('Doctor ID is required');
      return appointmentSchedulerService.unblockTimeSlots(doctorId, slots);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['scheduling-stats'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to unblock time slots');
    }
  });

  // Get scheduling stats
  const getSchedulingStats = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    if (!doctorId) throw new Error('Doctor ID is required');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await appointmentSchedulerService.getSchedulingStats(
        doctorId,
        startDate,
        endDate
      );
      return stats;
    } catch (err: any) {
      setError(err.message || 'Failed to get scheduling stats');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Loading states
    isLoading,
    isCreatingSlots: createBulkSlotsMutation.isPending,
    isBlockingSlots: blockSlotsMutation.isPending,
    isUnblockingSlots: unblockSlotsMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    getAvailableSlots,
    createBulkSlots: createBulkSlotsMutation.mutate,
    blockSlots: blockSlotsMutation.mutate,
    unblockSlots: unblockSlotsMutation.mutate,
    getSchedulingStats,
    
    // Utilities
    clearError
  };
}