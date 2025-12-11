import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientAppointmentManagement } from '../PatientAppointmentManagement';
import { appointmentService } from '@/services/appointment';
import type { AppointmentWithDetails } from '@/types/database';

// Mock the appointment service
vi.mock('@/services/appointment', () => ({
  appointmentService: {
    updateAppointmentStatus: vi.fn(),
    updateAppointment: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockAppointment: AppointmentWithDetails = {
  id: 'apt-123',
  patient_id: 'patient-123',
  doctor_id: 'doctor-123',
  appointment_date: '2024-12-15',
  appointment_time: '10:00:00',
  status: 'pending',
  reason: 'Regular checkup',
  doctor_notes: null,
  patient_notes: 'First visit',
  rating: null,
  review_text: null,
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
  doctor: {
    id: 'doctor-123',
    name: 'Dr. John Smith',
    specialty: 'Cardiology',
    address: '123 Medical Center',
    price_range: 150,
    experience: 10,
    qualifications: 'MD, FACC',
    aggregate_rating: 4.5,
    review_count: 100,
    lat: 40.7128,
    lng: -74.0060,
    opening_hours: ['Mo 09:00-17:00', 'Tu 09:00-17:00'],
    works_for: 'City Hospital',
    url: 'https://example.com',
    available_service: 'Consultation',
    same_as: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profile: {
      id: 'doctor-123',
      email: 'doctor@example.com',
      user_role: 'doctor',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  patient: {
    id: 'patient-123',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '555-0123',
    date_of_birth: '1990-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profile: {
      id: 'patient-123',
      email: 'patient@example.com',
      user_role: 'patient',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
};

describe('PatientAppointmentManagement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (appointment: AppointmentWithDetails, open = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PatientAppointmentManagement
          appointment={appointment}
          open={open}
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  it('displays appointment details correctly', () => {
    renderComponent(mockAppointment);

    expect(screen.getByText(/John Smith/)).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Regular checkup')).toBeInTheDocument();
    expect(screen.getByText('First visit')).toBeInTheDocument();
  });

  it('displays appointment status badge', () => {
    renderComponent(mockAppointment);

    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows cancel button for pending appointments', () => {
    renderComponent(mockAppointment);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('shows cancel button for approved appointments', () => {
    const approvedAppointment = { ...mockAppointment, status: 'approved' as const };
    renderComponent(approvedAppointment);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('does not show cancel button for completed appointments', () => {
    const completedAppointment = { ...mockAppointment, status: 'completed' as const };
    renderComponent(completedAppointment);

    const cancelButton = screen.queryByRole('button', { name: /cancel/i });
    expect(cancelButton).not.toBeInTheDocument();
  });

  it('shows rate button for completed appointments without rating', () => {
    const completedAppointment = { ...mockAppointment, status: 'completed' as const };
    renderComponent(completedAppointment);

    const rateButton = screen.getByRole('button', { name: /rate experience/i });
    expect(rateButton).toBeInTheDocument();
  });

  it('does not show rate button for completed appointments with rating', () => {
    const ratedAppointment = {
      ...mockAppointment,
      status: 'completed' as const,
      rating: 5,
      review_text: 'Great experience',
    };
    renderComponent(ratedAppointment);

    const rateButton = screen.queryByRole('button', { name: /rate experience/i });
    expect(rateButton).not.toBeInTheDocument();
  });

  it('displays existing rating for rated appointments', () => {
    const ratedAppointment = {
      ...mockAppointment,
      status: 'completed' as const,
      rating: 5,
      review_text: 'Great experience',
    };
    renderComponent(ratedAppointment);

    expect(screen.getByText('Your Rating')).toBeInTheDocument();
    expect(screen.getByText('(5/5)')).toBeInTheDocument();
    expect(screen.getByText('Great experience')).toBeInTheDocument();
  });

  it('handles appointment cancellation', async () => {
    const user = userEvent.setup();
    const mockUpdateStatus = vi.mocked(appointmentService.updateAppointmentStatus);
    mockUpdateStatus.mockResolvedValue({
      ...mockAppointment,
      status: 'cancelled',
    });

    renderComponent(mockAppointment);

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Confirm cancellation in the dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /yes, cancel/i });
    await user.click(confirmButton);

    // Verify the service was called
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'apt-123',
        'cancelled',
        expect.any(String)
      );
    });
  });

  it('displays doctor notes when present', () => {
    const appointmentWithNotes = {
      ...mockAppointment,
      doctor_notes: 'Patient is doing well',
    };
    renderComponent(appointmentWithNotes);

    expect(screen.getByText("Doctor's Notes")).toBeInTheDocument();
    expect(screen.getByText('Patient is doing well')).toBeInTheDocument();
  });

  it('displays price range when available', () => {
    renderComponent(mockAppointment);

    expect(screen.getByText('Price Range')).toBeInTheDocument();
    expect(screen.getByText('$150')).toBeInTheDocument();
  });

  it('displays appointment date and time', () => {
    renderComponent(mockAppointment);

    expect(screen.getByText(/december 15, 2024/i)).toBeInTheDocument();
    expect(screen.getByText('10:00:00')).toBeInTheDocument();
  });
});
