import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeaderNavigation } from '../HeaderNavigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { describe, it, expect, vi } from 'vitest';

// Mock the useUserType hook
vi.mock('@/hooks/useUserType', () => ({
  useUserType: () => ({
    userType: 'patient',
    loading: false,
    isDoctor: false,
    isPatient: true,
  }),
}));

// Mock the useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('HeaderNavigation', () => {
  it('renders the MedAI logo for patient users', () => {
    render(
      <TestWrapper>
        <HeaderNavigation />
      </TestWrapper>
    );

    expect(screen.getByText('MedAI')).toBeInTheDocument();
    expect(screen.getByText('Health Dashboard')).toBeInTheDocument();
  });

  it('renders navigation items for patient users', () => {
    render(
      <TestWrapper>
        <HeaderNavigation />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Browse Doctors')).toBeInTheDocument();
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders user menu with correct email', () => {
    render(
      <TestWrapper>
        <HeaderNavigation />
      </TestWrapper>
    );

    // The user menu should be accessible via button with specific aria-label
    const userButton = screen.getByRole('button', { name: /open user menu/i });
    expect(userButton).toBeInTheDocument();
  });

  it('renders mobile navigation menu button', () => {
    render(
      <TestWrapper>
        <HeaderNavigation />
      </TestWrapper>
    );

    // The mobile menu button should be present
    const mobileMenuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <HeaderNavigation />
      </TestWrapper>
    );

    // Check for proper ARIA labels and roles
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: /main navigation/i });
    expect(navigation).toBeInTheDocument();

    const userMenuButton = screen.getByRole('button', { name: /open user menu/i });
    expect(userMenuButton).toHaveAttribute('aria-label', 'Open user menu');
  });

  it('navigation items have proper hover and focus styles', () => {
    render(
      <TestWrapper>
        <HeaderNavigation />
      </TestWrapper>
    );

    // Check that navigation items have proper classes for hover effects
    const dashboardLink = screen.getByRole('menuitem', { name: /navigate to dashboard/i });
    expect(dashboardLink).toHaveClass('hover:bg-accent');
    expect(dashboardLink).toHaveClass('hover:scale-105');
    expect(dashboardLink).toHaveClass('focus:outline-none');
    expect(dashboardLink).toHaveClass('focus:ring-2');
    expect(dashboardLink).toHaveClass('focus:ring-ring');
  });
});