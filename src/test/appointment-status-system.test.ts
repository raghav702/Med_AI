import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Appointment, AppointmentStatus, CreateAppointment } from '../types/database';

// Mock Supabase with factory function
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          in: vi.fn(() => ({
            neq: vi.fn()
          }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn()
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        upsert: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}));

// Mock error handler
vi.mock('../lib/error-handler', () => ({
  ErrorHandler: {
    handleDatabaseError: vi.fn((error) => ({
      userMessage: error.message || 'Database error',
      code: error.code || 'DATABASE_ERROR'
    }))
  }
}));

// Import after mocking
import { appointmentStatusManager, APPOINTMENT_STATUS_TRANSITIONS } from '../services/appointment-status-manager';
import { appointmentWorkflowService } from '../services/appointment-workflow';
import { appointmentSchedulerService } from '../services/appointment-scheduler';
import { supabase } from '../lib/supabase';

describe('Appointment Status System', () => {
  const mockAppointment: Appointment = {
    id: 'test-appointment-id',
    doctor_id: 'doctor-123',
    patient_id: 'patient-456',
    appointment_date: '2024-12-01',
    appointment_time: '10:00',
    duration_minutes: 30,
    status: 'pending',
    reason_for_visit: 'Regular checkup',
    consultation_fee: 100,
    follow_up_required: false,
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AppointmentStatusManager', () => {
    describe('validateStatusTransition', () => {
      it('should allow valid transitions', () => {
        const isValid = appointmentStatusManager.validateStatusTransition(
          'pending',
          'approved',
          'doctor',
          mockAppointment
        );
        expect(isValid).toBe(true);
      });

      it('should reject invalid transitions', () => {
        const isValid = appointmentStatusManager.validateStatusTransition(
          'completed',
          'pending',
          'patient',
          mockAppointment
        );
        expect(isValid).toBe(false);
      });

      it('should reject transitions by unauthorized users', () => {
        const isValid = appointmentStatusManager.validateStatusTransition(
          'pending',
          'approved',
          'patient', // Only doctors can approve
          mockAppointment
        );
        expect(isValid).toBe(false);
      });

      it('should check time-based conditions', () => {
        const pastAppointment = {
          ...mockAppointment,
          appointment_date: '2024-01-01' // Past date
        };

        const isValid = appointmentStatusManager.validateStatusTransition(
          'pending',
          'approved',
          'doctor',
          pastAppointment
        );
        expect(isValid).toBe(false);
      });
    });

    describe('getAllowedTransitions', () => {
      it('should return correct transitions for pending appointment', () => {
        const transitions = appointmentStatusManager.getAllowedTransitions(
          mockAppointment,
          'doctor'
        );
        expect(transitions).toContain('approved');
        expect(transitions).toContain('rejected');
        expect(transitions).toContain('cancelled');
      });

      it('should return different transitions for patients', () => {
        const transitions = appointmentStatusManager.getAllowedTransitions(
          mockAppointment,
          'patient'
        );
        expect(transitions).toContain('cancelled');
        expect(transitions).not.toContain('approved');
        expect(transitions).not.toContain('rejected');
      });
    });

    describe('updateAppointmentStatus', () => {
      it('should update appointment status successfully', async () => {
        const mockUpdatedAppointment = {
          ...mockAppointment,
          status: 'approved' as AppointmentStatus,
          doctor_notes: 'Approved by doctor'
        };

        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAppointment,
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedAppointment,
                  error: null
                })
              })
            })
          })
        } as any);

        const result = await appointmentStatusManager.updateAppointmentStatus(
          'test-appointment-id',
          'approved',
          'doctor',
          'Approved by doctor'
        );

        expect(result.status).toBe('approved');
        expect(result.doctor_notes).toBe('Approved by doctor');
      });

      it('should throw error for invalid transition', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { ...mockAppointment, status: 'completed' },
          error: null
        });

        await expect(
          appointmentStatusManager.updateAppointmentStatus(
            'test-appointment-id',
            'pending',
            'patient'
          )
        ).rejects.toThrow('Invalid status transition');
      });
    });

    describe('detectConflicts', () => {
      it('should detect doctor time conflicts', async () => {
        // Mock doctor availability
        mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        // Mock existing appointment conflict
        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [{
            appointment_date: '2024-12-01',
            appointment_time: '10:00',
            duration_minutes: 30
          }],
          error: null
        });

        // Mock no patient conflicts
        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        // Mock time slot check
        mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // Not found
        });

        const result = await appointmentStatusManager.detectConflicts(
          'doctor-123',
          'patient-456',
          '2024-12-01',
          '10:00',
          30
        );

        expect(result.hasConflict).toBe(true);
        expect(result.conflictType).toBe('doctor_busy');
      });

      it('should detect outside availability hours', async () => {
        // Mock doctor availability (9 AM - 5 PM)
        mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        const result = await appointmentStatusManager.detectConflicts(
          'doctor-123',
          'patient-456',
          '2024-12-01',
          '18:00', // 6 PM - outside availability
          30
        );

        expect(result.hasConflict).toBe(true);
        expect(result.conflictType).toBe('outside_availability');
      });

      it('should return no conflict for valid time slot', async () => {
        // Mock doctor availability
        mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        // Mock no conflicts
        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        // Mock available time slot
        mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
          data: {
            is_available: true,
            is_blocked: false
          },
          error: null
        });

        const result = await appointmentStatusManager.detectConflicts(
          'doctor-123',
          'patient-456',
          '2024-12-01',
          '10:00',
          30
        );

        expect(result.hasConflict).toBe(false);
      });
    });
  });

  describe('AppointmentWorkflowService', () => {
    describe('createAppointmentWithWorkflow', () => {
      it('should create appointment with workflow validation', async () => {
        const appointmentData: CreateAppointment = {
          doctor_id: 'doctor-123',
          patient_id: 'patient-456',
          appointment_date: '2024-12-01',
          appointment_time: '10:00',
          reason_for_visit: 'Regular checkup',
          consultation_fee: 100
        };

        // Mock doctor validation
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { is_accepting_patients: true },
          error: null
        });

        // Mock conflict detection (no conflicts)
        mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

        // Mock appointment creation
        mockSupabase.from().insert().select().single.mockResolvedValueOnce({
          data: mockAppointment,
          error: null
        });

        // Mock time slot update
        mockSupabase.from().upsert.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const result = await appointmentWorkflowService.createAppointmentWithWorkflow(
          appointmentData,
          'patient-456'
        );

        expect(result.appointment).toBeDefined();
        expect(result.workflow).toBeDefined();
        expect(result.workflow.steps).toHaveLength(5);
        expect(result.workflow.steps[0].status).toBe('completed');
      });

      it('should reject appointment with conflicts', async () => {
        const appointmentData: CreateAppointment = {
          doctor_id: 'doctor-123',
          patient_id: 'patient-456',
          appointment_date: '2024-12-01',
          appointment_time: '10:00',
          reason_for_visit: 'Regular checkup',
          consultation_fee: 100
        };

        // Mock doctor validation
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { is_accepting_patients: true },
          error: null
        });

        // Mock conflict detection (has conflict)
        mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [{
            appointment_date: '2024-12-01',
            appointment_time: '10:00',
            duration_minutes: 30
          }],
          error: null
        });

        await expect(
          appointmentWorkflowService.createAppointmentWithWorkflow(
            appointmentData,
            'patient-456'
          )
        ).rejects.toThrow('Appointment conflict detected');
      });
    });

    describe('rescheduleAppointment', () => {
      it('should reschedule appointment successfully', async () => {
        const rescheduleRequest = {
          appointmentId: 'test-appointment-id',
          newDate: '2024-12-02',
          newTime: '11:00',
          reason: 'Patient requested change',
          requestedBy: 'patient' as const
        };

        // Mock current appointment fetch
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: mockAppointment,
          error: null
        });

        // Mock conflict detection (no conflicts)
        mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        mockSupabase.from().select().eq().eq().in().mockResolvedValueOnce({
          data: [],
          error: null
        });

        mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

        // Mock appointment update
        mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
          data: {
            ...mockAppointment,
            appointment_date: '2024-12-02',
            appointment_time: '11:00'
          },
          error: null
        });

        // Mock time slot updates
        mockSupabase.from().upsert.mockResolvedValue({
          data: null,
          error: null
        });

        const result = await appointmentWorkflowService.rescheduleAppointment(rescheduleRequest);

        expect(result.success).toBe(true);
        expect(result.appointment?.appointment_date).toBe('2024-12-02');
        expect(result.appointment?.appointment_time).toBe('11:00');
      });
    });
  });

  describe('AppointmentSchedulerService', () => {
    describe('getAvailableTimeSlots', () => {
      it('should return available time slots for date range', async () => {
        // Mock doctor availability
        mockSupabase.from().select().eq().eq().eq().mockResolvedValue({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        // Mock existing time slots
        mockSupabase.from().select().eq().eq().mockResolvedValue({
          data: [],
          error: null
        });

        // Mock existing appointments
        mockSupabase.from().select().eq().eq().in().mockResolvedValue({
          data: [],
          error: null
        });

        const slots = await appointmentSchedulerService.getAvailableTimeSlots(
          'doctor-123',
          '2024-12-01',
          '2024-12-01'
        );

        expect(slots).toBeDefined();
        expect(slots.length).toBeGreaterThan(0);
        expect(slots[0]).toHaveProperty('date');
        expect(slots[0]).toHaveProperty('time');
        expect(slots[0]).toHaveProperty('isAvailable');
      });
    });

    describe('createBulkTimeSlots', () => {
      it('should create time slots in bulk', async () => {
        const request = {
          doctorId: 'doctor-123',
          startDate: '2024-12-01',
          endDate: '2024-12-03',
          slotDuration: 30,
          bufferTime: 0
        };

        // Mock doctor availability
        mockSupabase.from().select().eq().eq().eq().mockResolvedValue({
          data: [{
            start_time: '09:00',
            end_time: '17:00'
          }],
          error: null
        });

        // Mock successful insertions
        mockSupabase.from().insert.mockResolvedValue({
          data: null,
          error: null
        });

        const result = await appointmentSchedulerService.createBulkTimeSlots(request);

        expect(result.created).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('getSchedulingStats', () => {
      it('should return scheduling statistics', async () => {
        // Mock time slots
        mockSupabase.from().select().eq().gte().lte().mockResolvedValueOnce({
          data: [
            { is_available: true, is_blocked: false },
            { is_available: true, is_blocked: false },
            { is_available: false, is_blocked: true }
          ],
          error: null
        });

        // Mock appointments
        mockSupabase.from().select().eq().gte().lte().mockResolvedValueOnce({
          data: [
            { status: 'completed', appointment_time: '10:00', created_at: '2024-11-25T10:00:00Z' },
            { status: 'approved', appointment_time: '11:00', created_at: '2024-11-26T10:00:00Z' }
          ],
          error: null
        });

        const stats = await appointmentSchedulerService.getSchedulingStats(
          'doctor-123',
          '2024-12-01',
          '2024-12-31'
        );

        expect(stats).toHaveProperty('totalSlots');
        expect(stats).toHaveProperty('availableSlots');
        expect(stats).toHaveProperty('bookedSlots');
        expect(stats).toHaveProperty('utilizationRate');
        expect(stats).toHaveProperty('peakHours');
        expect(stats).toHaveProperty('averageBookingLead');
      });
    });
  });

  describe('Status Transition Rules', () => {
    it('should have valid transition configuration', () => {
      expect(APPOINTMENT_STATUS_TRANSITIONS).toBeDefined();
      expect(APPOINTMENT_STATUS_TRANSITIONS.length).toBeGreaterThan(0);

      // Check that all transitions have required fields
      APPOINTMENT_STATUS_TRANSITIONS.forEach(transition => {
        expect(transition).toHaveProperty('from');
        expect(transition).toHaveProperty('to');
        expect(transition).toHaveProperty('allowedBy');
        expect(Array.isArray(transition.allowedBy)).toBe(true);
      });
    });

    it('should allow system to perform automatic transitions', () => {
      const systemTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.allowedBy.includes('system')
      );

      expect(systemTransitions.length).toBeGreaterThan(0);
      
      // Check for no-show transition
      const noShowTransition = systemTransitions.find(
        t => t.to === 'no_show'
      );
      expect(noShowTransition).toBeDefined();
      expect(noShowTransition?.autoTransition).toBeDefined();
    });
  });
});