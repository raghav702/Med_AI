import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoadingSpinner, ButtonLoadingSpinner, PageLoadingSpinner, InlineLoadingSpinner } from '@/components/ui/loading-spinner';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ProfileSkeleton, MedicalRecordsListSkeleton, DashboardSkeleton, FormSkeleton } from '@/components/ui/skeleton-loaders';
import { ProgressIndicator, FileUploadProgress } from '@/components/ui/progress-indicator';
import { useLoadingState, useFormSubmission, useDataFetching, useFileUpload } from '@/hooks/useLoadingState';
import { useNotifications } from '@/hooks/useNotifications';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Loading Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      render(<LoadingSpinner text="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      expect(document.querySelector('.w-4')).toBeInTheDocument();

      rerender(<LoadingSpinner size="lg" />);
      expect(document.querySelector('.w-8')).toBeInTheDocument();
    });

    it('renders as overlay variant', () => {
      render(<LoadingSpinner variant="overlay" text="Loading..." />);
      expect(document.querySelector('.absolute.inset-0')).toBeInTheDocument();
    });
  });

  describe('ButtonLoadingSpinner', () => {
    it('renders with defau