import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from '../UserProfile';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import * as databaseService from '@/services/database';

// Mock the database service
vi.mock('@/services/database', () => ({
  databaseService: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    createUserProfile: vi.fn(),
  },
  DatabaseServiceError: class DatabaseServiceError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'DatabaseServiceError';
    }
  }
}));

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    error: null
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(databaseService.databaseService.getUserProfile).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Check for skeleton loading elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render create profile CTA for new users', async () => {
    vi.mocked(databaseService.databaseService.getUserProfile).mockResolvedValue(null);

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      expect(screen.getByText('Create Profile')).toBeInTheDocument();
    });
  });

  it('should render user profile when data exists', async () => {
    const mockProfile = {
      id: 'test-user-id',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-01',
      phone_number: '+1234567890',
      emergency_contact: 'Jane Doe',
      medical_conditions: ['Hypertension'],
      allergies: ['Peanuts'],
      medications: ['Lisinopril'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    vi.mocked(databaseService.databaseService.getUserProfile).mockResolvedValue(mockProfile);

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Hypertension')).toBeInTheDocument();
      expect(screen.getByText('Peanuts')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
    });
  });

  it('should render error state when loading fails', async () => {
    const mockError = new databaseService.DatabaseServiceError('Failed to load profile', 'DATABASE_ERROR');
    vi.mocked(databaseService.databaseService.getUserProfile).mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });
  });
});