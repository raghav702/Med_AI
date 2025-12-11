import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Import components to test
import { LoadingButton } from '@/components/ui/loading-button';
import { FileUploadWithProgress } from '@/components/ui/file-upload-with-progress';
import { LoadingStateManager, DataLoadingManager, FormLoadingManager } from '@/components/ui/loading-state-manager';
import { SuccessFeedback, useSuccessFeedback } from '@/components/ui/success-feedback';
import { MultiStepProgress, BatchProgress } from '@/components/ui/progress-indicator';
import { 
  ButtonSkeleton, 
  NavigationSkeleton, 
  CardListSkeleton, 
  SearchResultsSkeleton,
  FileUploadSkeleton 
} from '@/components/ui/skeleton-loaders';

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showUploadSuccess: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLoadingState', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn(),
    isLoading: false,
    error: null,
    uploadProgress: {},
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Loading States and User Feedback', () => {
  describe('LoadingButton', () => {
    it('should show loading state', () => {
      render(
        <LoadingButton loading={true} loadingText="Processing...">
          Submit
        </LoadingButton>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show success state', async () => {
      render(
        <LoadingButton success={true} successText="Done!">
          Submit
        </LoadingButton>
      );

      expect(screen.getByText('Done!')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show normal state when not loading or success', () => {
      render(
        <LoadingButton loading={false} success={false}>
          Submit
        </LoadingButton>
      );

      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('LoadingStateManager', () => {
    it('should show loading spinner when loading', () => {
      render(
        <LoadingStateManager loading={true} error={null}>
          <div>Content</div>
        </LoadingStateManager>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should show error state when error exists', () => {
      const mockRetry = vi.fn();
      render(
        <LoadingStateManager 
          loading={false} 
          error="Something went wrong" 
          onRetry={mockRetry}
        >
          <div>Content</div>
        </LoadingStateManager>
      );

      expect(screen.getAllByText('Something went wrong')).toHaveLength(2); // Title and description
      expect(screen.getByText('Try again')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Try again'));
      expect(mockRetry).toHaveBeenCalled();
    });

    it('should show content when not loading and no error', () => {
      render(
        <LoadingStateManager loading={false} error={null}>
          <div>Content</div>
        </LoadingStateManager>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should show skeleton on initial load when provided', () => {
      render(
        <LoadingStateManager 
          loading={true} 
          error={null}
          skeleton={<div>Loading skeleton</div>}
          showSkeletonOnInitialLoad={true}
        >
          <div>Content</div>
        </LoadingStateManager>
      );

      expect(screen.getByText('Loading skeleton')).toBeInTheDocument();
    });
  });

  describe('DataLoadingManager', () => {
    it('should show skeleton while loading without data', () => {
      render(
        <DataLoadingManager
          loading={true}
          data={null}
          skeleton={<div>Data skeleton</div>}
        >
          <div>Data content</div>
        </DataLoadingManager>
      );

      expect(screen.getByText('Data skeleton')).toBeInTheDocument();
    });

    it('should show empty state when no data and not loading', () => {
      render(
        <DataLoadingManager
          loading={false}
          data={null}
          emptyState={<div>No data available</div>}
        >
          <div>Data content</div>
        </DataLoadingManager>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show content when data is available', () => {
      render(
        <DataLoadingManager
          loading={false}
          data={{ items: [] }}
        >
          <div>Data content</div>
        </DataLoadingManager>
      );

      expect(screen.getByText('Data content')).toBeInTheDocument();
    });
  });

  describe('FormLoadingManager', () => {
    it('should show loading overlay when loading', () => {
      render(
        <FormLoadingManager loading={true}>
          <form>
            <input type="text" />
            <button>Submit</button>
          </form>
        </FormLoadingManager>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should show error message when error exists', () => {
      render(
        <FormLoadingManager loading={false} error="Form submission failed">
          <form>
            <input type="text" />
            <button>Submit</button>
          </form>
        </FormLoadingManager>
      );

      expect(screen.getByText('Form submission failed')).toBeInTheDocument();
    });

    it('should show success message when success is true', () => {
      render(
        <FormLoadingManager loading={false} success={true}>
          <form>
            <input type="text" />
            <button>Submit</button>
          </form>
        </FormLoadingManager>
      );

      expect(screen.getByText('Operation completed successfully!')).toBeInTheDocument();
    });
  });

  describe('SuccessFeedback', () => {
    it('should show success message when visible', () => {
      render(
        <SuccessFeedback
          show={true}
          message="Operation successful"
          description="The operation completed successfully"
        />
      );

      expect(screen.getByText('Operation successful')).toBeInTheDocument();
      expect(screen.getByText('The operation completed successfully')).toBeInTheDocument();
    });

    it('should not show when show is false', () => {
      render(
        <SuccessFeedback
          show={false}
          message="Operation successful"
        />
      );

      expect(screen.queryByText('Operation successful')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const mockClose = vi.fn();
      render(
        <SuccessFeedback
          show={true}
          message="Operation successful"
          onClose={mockClose}
        />
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('useSuccessFeedback hook', () => {
    const TestComponent = () => {
      const { show, message, showSuccess, hideSuccess } = useSuccessFeedback();
      
      return (
        <div>
          <button onClick={() => showSuccess('Test success', 'Test description')}>
            Show Success
          </button>
          <button onClick={hideSuccess}>Hide Success</button>
          {show && <div>{message}</div>}
        </div>
      );
    };

    it('should manage success feedback state', () => {
      render(<TestComponent />);

      // Initially hidden
      expect(screen.queryByText('Test success')).not.toBeInTheDocument();

      // Show success
      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Test success')).toBeInTheDocument();

      // Hide success
      fireEvent.click(screen.getByText('Hide Success'));
      expect(screen.queryByText('Test success')).not.toBeInTheDocument();
    });
  });

  describe('MultiStepProgress', () => {
    const steps = [
      { id: '1', title: 'Step 1', status: 'completed' as const },
      { id: '2', title: 'Step 2', status: 'in-progress' as const, progress: 50 },
      { id: '3', title: 'Step 3', status: 'pending' as const },
    ];

    it('should render all steps with correct status', () => {
      render(<MultiStepProgress steps={steps} currentStep="2" />);

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('BatchProgress', () => {
    it('should show batch operation progress', () => {
      render(
        <BatchProgress
          total={10}
          completed={7}
          failed={1}
          currentItem="Processing item 9"
        />
      );

      expect(screen.getByText('Processing 10 items')).toBeInTheDocument();
      expect(screen.getByText('8 of 10')).toBeInTheDocument();
      expect(screen.getByText('✓ 7 completed')).toBeInTheDocument();
      expect(screen.getByText('✗ 1 failed')).toBeInTheDocument();
      expect(screen.getByText('2 remaining')).toBeInTheDocument();
      expect(screen.getByText('Currently processing: Processing item 9')).toBeInTheDocument();
    });
  });

  describe('Skeleton Loaders', () => {
    it('should render ButtonSkeleton', () => {
      render(<ButtonSkeleton />);
      // Check that skeleton element is rendered (it should have skeleton classes)
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render NavigationSkeleton', () => {
      render(<NavigationSkeleton />);
      // Should render 5 navigation items
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render CardListSkeleton with specified count', () => {
      render(<CardListSkeleton count={3} />);
      // Should render 3 card skeletons
      const cards = document.querySelectorAll('[class*="space-y-4"] > div');
      expect(cards.length).toBe(3);
    });

    it('should render SearchResultsSkeleton', () => {
      render(<SearchResultsSkeleton count={2} />);
      // Should render 2 search result skeletons
      const results = document.querySelectorAll('[class*="space-y-3"] > div');
      expect(results.length).toBe(2);
    });

    it('should render FileUploadSkeleton', () => {
      render(<FileUploadSkeleton />);
      // Should render file upload skeleton
      const skeleton = document.querySelector('.border-dashed');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('FileUploadWithProgress', () => {
    const mockUpload = vi.fn();

    beforeEach(() => {
      mockUpload.mockClear();
    });

    it('should render upload area', () => {
      render(
        <TestWrapper>
          <FileUploadWithProgress onUpload={mockUpload} />
        </TestWrapper>
      );

      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument();
    });

    it('should show file size limit', () => {
      render(
        <TestWrapper>
          <FileUploadWithProgress onUpload={mockUpload} maxSize={5 * 1024 * 1024} />
        </TestWrapper>
      );

      expect(screen.getByText('Maximum file size: 5 MB')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <TestWrapper>
          <FileUploadWithProgress onUpload={mockUpload} disabled={true} />
        </TestWrapper>
      );

      const input = document.querySelector('input[type="file"]');
      expect(input).toBeDisabled();
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete loading flow', async () => {
    const TestComponent = () => {
      const [loading, setLoading] = React.useState(false);
      const [success, setSuccess] = React.useState(false);
      const [error, setError] = React.useState<string | null>(null);

      const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 100));
          setSuccess(true);
        } catch (err) {
          setError('Operation failed');
        } finally {
          setLoading(false);
        }
      };

      return (
        <FormLoadingManager loading={loading} error={error} success={success}>
          <LoadingButton
            loading={loading}
            success={success}
            onClick={handleSubmit}
          >
            Submit
          </LoadingButton>
        </FormLoadingManager>
      );
    };

    render(<TestComponent />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Submit');

    fireEvent.click(button);
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});