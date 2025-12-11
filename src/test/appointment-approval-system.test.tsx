import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppointmentRequests } from '@/components/doctor/AppointmentRequests';
import { AlternativeTimeSelector } from '@/components/doctor/AlternativeTimeSelector';
import { appointmentService } from '@/services/appointment';
import { appointmentNotificationService } from '@/services/appointment-notifications';
import type { AppointmentWithDetails } from '@/types/database';

// Mock dependencies
vi.mock('@/services/appointment');
vi.mock('@/services/appointment-notifications');
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'doctor-1', email: 'doctor@test.com' }
  })
}));
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn()
  })
}));

// Mock appointment data
const mockAppointment: AppointmentWithDetails = {
  id: 'appointment-1',
  doctor_id: 'doctor-1',
  patient_id: 'patient-1',
  appointment_date: '2024-12-01',
  appointment_time: '10:00',
  duration_minutes: 30,
  status: 'pending',
  reason_for_visit: 'Regular checkup',
  symptoms: 'Feeling tired',
  consultation_fee: 100,
  doctor_notes: null,
  patient_notes: 'First visit',
  prescription: null,
  follow_up_required: false,
  follow_up_date: null,
  rating: null,
  review_text: null,
  created_at: '2024-11-01T10:00:00Z',
  updated_at: '2024-11-01T10:00:00Z',
  doctor: {
    id: 'doctor-1',
    license_number: 'DOC123',
    specialization: 'General Medicine',
    sub_specialization: null,
    years_of_experience: 10,
    consultation_fee: 100,
    bio: 'Experienced doctor',
    education: ['MD'],
    certifications: ['Board Certified'],
    languages_spoken: ['English'],
    office_address: '123 Medical St',
    office_phone: '555-0123',
    is_accepting_patients: true,
    rating: 4.5,
    total_reviews: 50,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profile: {
      id: 'doctor-1',
      first_name: 'John',
      last_name: 'Smith',
      date_of_birth: '1980-01-01',
      phone_number: '555-0123',
      emergency_contact: '555-0124',
      medical_conditions: [],
      allergies: [],
      medications: [],
      user_role: 'doctor',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  patient: {
    id: 'patient-1',
    insurance_provider: 'Health Insurance Co',
    insurance_policy_number: 'POL123',
    primary_care_doctor: null,
    blood_type: 'O+',
    height_cm: 175,
    weight_kg: 70,
    medical_history: 'No significant history',
    current_medications: [],
    known_allergies: [],
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '555-0125',
    emergency_contact_relationship: 'Spouse',
    preferred_language: 'English',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profile: {
      id: 'patient-1',
      first_name: 'Alice',
      last_name: 'Johnson',
      date_of_birth: '1990-01-01',
      phone_number: '555-0126',
      emergency_contact: '555-0125',
      medical_conditions: [],
      allergies: [],
      medications: [],
      user_role: 'patient',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
};

describe('Appointment Approval System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock appointment service methods
    vi.mocked(appointmentService.getAppointmentsByDoctor).mockResolvedValue({
      data: [mockAppointment],
      count: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
      has_next: false,
      has_previous: false
    });
    
    vi.mocked(appointmentService.approveAppointment).mockResolvedValue(mockAppointment);
    vi.mocked(appointmentService.rejectAppointment).mockResolvedValue(mockAppointment);
    vi.mocked(appointmentService.updateAppointment).mockResolvedValue(mockAppointment);
    
    // Mock notification service methods
    vi.mocked(appointmentNotificationService.isServiceAvailable).mockReturnValue(true);
    vi.mocked(appointmentNotificationService.subscribeToAppointmentNotifications).mockResolvedValue('sub-1');
    vi.mocked(appointmentNotificationService.sendApprovalNotification).mockResolvedValue();
    vi.mocked(appointmentNotificationService.sendRejectionNotification).mockResolvedValue();
    vi.mocked(appointmentNotificationService.sendAlternativeTimeNotification).mockResolvedValue();
  });

  describe('AppointmentRequests Component', () => {
    it('should render appointment requests with all action buttons', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText('Appointment Requests')).toBeInTheDocument();
      });

      // Check if appointment is displayed
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Regular checkup')).toBeInTheDocument();

      // Check if all action buttons are present
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Suggest Times')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should handle appointment approval with consultation fee confirmation', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Click approve button
      fireEvent.click(screen.getByText('Approve'));

      // Check if approval dialog opens
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getAllByText('Approve Appointment')[0]).toBeInTheDocument();
      });

      // Check if consultation fee input is present
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();

      // Update consultation fee
      const feeInput = screen.getByDisplayValue('100');
      fireEvent.change(feeInput, { target: { value: '120' } });
      
      // Wait for state to update
      await waitFor(() => {
        expect(feeInput).toHaveValue(120);
      });

      // Add notes
      const notesTextarea = screen.getByPlaceholderText(/Any special instructions/);
      fireEvent.change(notesTextarea, { target: { value: 'Please arrive 15 minutes early' } });

      // Confirm approval
      fireEvent.click(screen.getByRole('button', { name: /approve appointment/i }));

      await waitFor(() => {
        expect(appointmentService.updateAppointment).toHaveBeenCalledWith(
          'appointment-1',
          expect.objectContaining({
            consultation_fee: 120,
            doctor_notes: 'Please arrive 15 minutes early'
          })
        );
        expect(appointmentService.approveAppointment).toHaveBeenCalledWith(
          'appointment-1',
          'Please arrive 15 minutes early'
        );
        expect(appointmentNotificationService.sendApprovalNotification).toHaveBeenCalled();
      });
    });

    it('should handle appointment rejection with reason', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Click reject button
      fireEvent.click(screen.getByText('Reject'));

      // Check if rejection dialog opens
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getAllByText('Reject Appointment')[0]).toBeInTheDocument();
      });

      // Add rejection reason
      const reasonTextarea = screen.getByPlaceholderText(/Please explain why/);
      fireEvent.change(reasonTextarea, { target: { value: 'Schedule conflict' } });

      // Confirm rejection
      fireEvent.click(screen.getByRole('button', { name: /reject appointment/i }));

      await waitFor(() => {
        expect(appointmentService.rejectAppointment).toHaveBeenCalledWith(
          'appointment-1',
          'Schedule conflict'
        );
        expect(appointmentNotificationService.sendRejectionNotification).toHaveBeenCalled();
      });
    });

    it('should open alternative time selector dialog', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Click suggest times button
      fireEvent.click(screen.getByText('Suggest Times'));

      // Check if alternative time selector dialog opens
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getAllByText('Suggest Alternative Times')[0]).toBeInTheDocument();
      });
    });

    it('should display live notification indicator when subscribed', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      expect(appointmentNotificationService.subscribeToAppointmentNotifications).toHaveBeenCalled();
    });
  });

  describe('AlternativeTimeSelector Component', () => {
    const mockOnSuggestTimes = vi.fn();
    const mockOnCancel = vi.fn();

    it('should render alternative time selector with calendar', () => {
      render(
        <AlternativeTimeSelector
          appointment={mockAppointment}
          onSuggestTimes={mockOnSuggestTimes}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Suggest Alternative Times')).toBeInTheDocument();
      expect(screen.getByText('Select Available Dates')).toBeInTheDocument();
      expect(screen.getByText('Alternative Time Slots')).toBeInTheDocument();
    });

    it('should allow adding and removing time slots', async () => {
      render(
        <AlternativeTimeSelector
          appointment={mockAppointment}
          onSuggestTimes={mockOnSuggestTimes}
          onCancel={mockOnCancel}
        />
      );

      // Initially should show "Add Time" button
      expect(screen.getByText('Add Time')).toBeInTheDocument();

      // The button should be disabled until a date is selected
      expect(screen.getByText('Add Time')).toBeDisabled();
    });

    it('should validate that alternative times are in the future', async () => {
      render(
        <AlternativeTimeSelector
          appointment={mockAppointment}
          onSuggestTimes={mockOnSuggestTimes}
          onCancel={mockOnCancel}
        />
      );

      // Try to suggest times without adding any
      const suggestButton = screen.getByText('Suggest These Times');
      fireEvent.click(suggestButton);

      // Should show validation message (handled by toast)
      expect(mockOnSuggestTimes).not.toHaveBeenCalled();
    });
  });

  describe('Notification System Integration', () => {
    it('should set up real-time notifications on component mount', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(appointmentNotificationService.subscribeToAppointmentNotifications).toHaveBeenCalledWith(
          'doctor-1',
          expect.any(Function)
        );
      });
    });

    it('should send appropriate notifications for each action', async () => {
      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Test approval notification
      fireEvent.click(screen.getByText('Approve'));
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getAllByText('Approve Appointment')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /approve appointment/i }));

      await waitFor(() => {
        expect(appointmentNotificationService.sendApprovalNotification).toHaveBeenCalledWith(
          mockAppointment,
          undefined
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle appointment service errors gracefully', async () => {
      vi.mocked(appointmentService.getAppointmentsByDoctor).mockRejectedValue(
        new Error('Service unavailable')
      );

      render(<AppointmentRequests />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load appointment requests/)).toBeInTheDocument();
      });
    });

    it('should handle notification service unavailability', async () => {
      vi.mocked(appointmentNotificationService.isServiceAvailable).mockReturnValue(false);

      render(<AppointmentRequests />);

      // Should still render the component without notifications
      await waitFor(() => {
        expect(screen.getByText('Appointment Requests')).toBeInTheDocument();
      });

      // Should not show live indicator
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });
  });
});