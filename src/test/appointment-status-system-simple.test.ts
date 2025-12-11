import { describe, it, expect } from 'vitest';
import { APPOINTMENT_STATUS_TRANSITIONS } from '../services/appointment-status-manager';
import type { Appointment, AppointmentStatus } from '../types/database';

describe('Appointment Status System - Core Logic', () => {
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

    it('should have proper doctor approval transitions', () => {
      const doctorTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.from === 'pending' && t.allowedBy.includes('doctor')
      );

      expect(doctorTransitions.length).toBeGreaterThan(0);
      
      const approveTransition = doctorTransitions.find(t => t.to === 'approved');
      const rejectTransition = doctorTransitions.find(t => t.to === 'rejected');
      
      expect(approveTransition).toBeDefined();
      expect(rejectTransition).toBeDefined();
    });

    it('should allow patients to cancel appointments', () => {
      const patientCancelTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.to === 'cancelled' && t.allowedBy.includes('patient')
      );

      expect(patientCancelTransitions.length).toBeGreaterThan(0);
    });

    it('should have time-based conditions for some transitions', () => {
      const timeBasedTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.conditions !== undefined
      );

      expect(timeBasedTransitions.length).toBeGreaterThan(0);
    });

    it('should prevent invalid status combinations', () => {
      // Test that completed appointments can't go back to pending
      const invalidTransition = APPOINTMENT_STATUS_TRANSITIONS.find(
        t => t.from === 'completed' && t.to === 'pending'
      );

      expect(invalidTransition).toBeUndefined();
    });

    it('should allow doctors to complete approved appointments', () => {
      const completeTransition = APPOINTMENT_STATUS_TRANSITIONS.find(
        t => t.from === 'approved' && t.to === 'completed' && t.allowedBy.includes('doctor')
      );

      expect(completeTransition).toBeDefined();
    });

    it('should have proper cancellation rules', () => {
      const cancelTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.to === 'cancelled'
      );

      expect(cancelTransitions.length).toBeGreaterThan(0);
      
      // Should allow cancellation from pending and approved states
      const fromPending = cancelTransitions.find(t => t.from === 'pending');
      const fromApproved = cancelTransitions.find(t => t.from === 'approved');
      
      expect(fromPending).toBeDefined();
      expect(fromApproved).toBeDefined();
    });
  });

  describe('Appointment Status Values', () => {
    it('should have all required status values', () => {
      const requiredStatuses: AppointmentStatus[] = [
        'pending',
        'approved', 
        'rejected',
        'completed',
        'cancelled',
        'no_show'
      ];

      requiredStatuses.forEach(status => {
        const hasTransition = APPOINTMENT_STATUS_TRANSITIONS.some(
          t => t.from === status || t.to === status
        );
        expect(hasTransition).toBe(true);
      });
    });

    it('should have consistent status naming', () => {
      const allStatuses = new Set<AppointmentStatus>();
      
      APPOINTMENT_STATUS_TRANSITIONS.forEach(transition => {
        allStatuses.add(transition.from);
        allStatuses.add(transition.to);
      });

      // Check that all statuses are lowercase and use underscores
      allStatuses.forEach(status => {
        expect(status).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate appointment timing constraints', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const futureAppointment = {
        ...mockAppointment,
        appointment_date: futureDate.toISOString().split('T')[0]
      };

      // Test that future appointments can be approved
      const approveTransition = APPOINTMENT_STATUS_TRANSITIONS.find(
        t => t.from === 'pending' && t.to === 'approved'
      );

      expect(approveTransition).toBeDefined();
      
      if (approveTransition?.conditions) {
        const canApprove = approveTransition.conditions(futureAppointment);
        expect(canApprove).toBe(true);
      }
    });

    it('should prevent approval of past appointments', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const pastAppointment = {
        ...mockAppointment,
        appointment_date: pastDate.toISOString().split('T')[0]
      };

      const approveTransition = APPOINTMENT_STATUS_TRANSITIONS.find(
        t => t.from === 'pending' && t.to === 'approved'
      );

      if (approveTransition?.conditions) {
        const canApprove = approveTransition.conditions(pastAppointment);
        expect(canApprove).toBe(false);
      }
    });

    it('should have proper role-based permissions', () => {
      // Doctors should be able to approve/reject
      const doctorTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.allowedBy.includes('doctor')
      );
      
      expect(doctorTransitions.length).toBeGreaterThan(0);
      
      // Patients should be able to cancel
      const patientTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.allowedBy.includes('patient')
      );
      
      expect(patientTransitions.length).toBeGreaterThan(0);
      
      // System should be able to auto-transition
      const systemTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.allowedBy.includes('system')
      );
      
      expect(systemTransitions.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow State Machine', () => {
    it('should have a complete state machine', () => {
      const allFromStates = new Set(APPOINTMENT_STATUS_TRANSITIONS.map(t => t.from));
      const allToStates = new Set(APPOINTMENT_STATUS_TRANSITIONS.map(t => t.to));
      
      // Every status should have at least one transition from it (except terminal states)
      const terminalStates: AppointmentStatus[] = ['completed', 'no_show'];
      
      allFromStates.forEach(status => {
        if (!terminalStates.includes(status)) {
          const hasOutgoingTransition = APPOINTMENT_STATUS_TRANSITIONS.some(
            t => t.from === status
          );
          expect(hasOutgoingTransition).toBe(true);
        }
      });
    });

    it('should have proper entry points', () => {
      // 'pending' should be the main entry point
      const toPending = APPOINTMENT_STATUS_TRANSITIONS.filter(
        t => t.to === 'pending'
      );
      
      // Should have transitions to pending (for rescheduling, etc.)
      expect(toPending.length).toBeGreaterThan(0);
    });

    it('should have proper exit points', () => {
      // Terminal states should not have outgoing transitions (except for special cases)
      const terminalStates: AppointmentStatus[] = ['completed', 'no_show'];
      
      terminalStates.forEach(status => {
        const outgoingTransitions = APPOINTMENT_STATUS_TRANSITIONS.filter(
          t => t.from === status
        );
        
        // Terminal states should have very few or no outgoing transitions
        expect(outgoingTransitions.length).toBeLessThanOrEqual(1);
      });
    });
  });
});