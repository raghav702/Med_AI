# Loading States and User Feedback

This document provides a comprehensive guide to the loading states and user feedback system implemented in the application. The system provides consistent, accessible, and user-friendly feedback for all async operations.

## Overview

The loading states and user feedback system consists of several key components:

1. **Loading Spinners** - Visual indicators for async operations
2. **Loading Buttons** - Buttons with integrated loading and success states
3. **Progress Indicators** - Progress tracking for file uploads and multi-step operations
4. **Skeleton Loaders** - Placeholder content for better perceived performance
5. **Success Feedback** - User-friendly success notifications
6. **Loading State Managers** - Comprehensive state management for different scenarios
7. **File Upload with Progress** - Advanced file upload with progress tracking

## Components

### 1. Loading Spinners

Basic loading indicators for various use cases.

```tsx
import { LoadingSpinner, ButtonLoadingSpinner, PageLoadingSpinner, InlineLoadingSpinner } from '@/components/ui/loading-spinner';

// Basic spinner
<LoadingSpinner size="md" text="Loading..." />

// Button spinner
<ButtonLoadingSpinner text="Saving..." />

// Page-level spinner
<PageLoadingSpinner text="Loading page..." />

// Inline spinner
<InlineLoadingSpinner text="Processing..." />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg'
- `text`: Optional loading text
- `variant`: 'default' | 'overlay' | 'inline'
- `className`: Additional CSS classes

### 2. Loading Button

Enhanced button component with loading and success states.

```tsx
import { LoadingButton } from '@/components/ui/loading-button';

<LoadingButton
  loading={isLoading}
  success={isSuccess}
  loadingText="Saving..."
  successText="Saved!"
  onClick={handleSave}
  icon={<Save className="w-4 h-4" />}
>
  Save Data
</LoadingButton>
```

**Props:**
- `loading`: Boolean loading state
- `success`: Boolean success state
- `loadingText`: Text to show during loading
- `successText`: Text to show on success
- `successDuration`: How long to show success state (default: 2000ms)
- `icon`: Optional icon element
- All standard Button props

### 3. Loading State Manager

Comprehensive loading state management for different scenarios.

```tsx
import { LoadingStateManager, DataLoadingManager, FormLoadingManager } from '@/components/ui/loading-state-manager';

// Basic loading state manager
<LoadingStateManager
  loading={isLoading}
  error={error}
  onRetry={handleRetry}
  skeleton={<ProfileSkeleton />}
  showSkeletonOnInitialLoad={true}
>
  <YourContent />
</LoadingStateManager>

// Data loading manager
<DataLoadingManager
  loading={isLoading}
  error={error}
  data={data}
  skeleton={<DataSkeleton />}
  emptyState={<EmptyState />}
  onRetry={handleRetry}
>
  <DataContent />
</DataLoadingManager>

// Form loading manager
<FormLoadingManager
  loading={isSubmitting}
  error={submitError}
  success={isSuccess}
>
  <YourForm />
</FormLoadingManager>
```

### 4. Success Feedback

User-friendly success notifications with different variants.

```tsx
import { SuccessFeedback, useSuccessFeedback } from '@/components/ui/success-feedback';

// Component usage
<SuccessFeedback
  show={showSuccess}
  message="Operation successful"
  description="Your data has been saved successfully."
  onClose={handleClose}
  variant="toast" // 'toast' | 'banner' | 'inline'
/>

// Hook usage
const { show, showSuccess, hideSuccess } = useSuccessFeedback();

const handleSave = async () => {
  try {
    await saveData();
    showSuccess('Data saved!', 'Your changes have been saved successfully.');
  } catch (error) {
    // Handle error
  }
};
```

### 5. Progress Indicators

Advanced progress tracking for complex operations.

```tsx
import { ProgressIndicator, MultiStepProgress, BatchProgress, FileUploadProgress } from '@/components/ui/progress-indicator';

// Multi-step progress
<MultiStepProgress
  steps={[
    { id: '1', title: 'Initialize', status: 'completed' },
    { id: '2', title: 'Process', status: 'in-progress', progress: 50 },
    { id: '3', title: 'Finalize', status: 'pending' }
  ]}
  currentStep="2"
/>

// Batch operation progress
<BatchProgress
  total={100}
  completed={75}
  failed={5}
  currentItem="Processing item 81"
/>

// File upload progress
<FileUploadProgress
  fileName="document.pdf"
  progress={65}
  status="uploading"
  onCancel={handleCancel}
/>
```

### 6. File Upload with Progress

Advanced file upload component with drag-and-drop and progress tracking.

```tsx
import { FileUploadWithProgress } from '@/components/ui/file-upload-with-progress';

<FileUploadWithProgress
  onUpload={handleFileUpload}
  accept="image/*,.pdf,.doc,.docx"
  maxSize={5 * 1024 * 1024} // 5MB
  multiple={true}
  disabled={isUploading}
/>
```

**Props:**
- `onUpload`: Upload function that receives file and progress callback
- `accept`: File type restrictions
- `maxSize`: Maximum file size in bytes
- `multiple`: Allow multiple file selection
- `disabled`: Disable the upload area
- `className`: Additional CSS classes

### 7. Skeleton Loaders

Placeholder content for better perceived performance.

```tsx
import { 
  ProfileSkeleton, 
  MedicalRecordsListSkeleton, 
  DashboardSkeleton,
  FormSkeleton,
  TableSkeleton,
  ButtonSkeleton,
  NavigationSkeleton,
  CardListSkeleton,
  SearchResultsSkeleton,
  FileUploadSkeleton
} from '@/components/ui/skeleton-loaders';

// Profile skeleton
<ProfileSkeleton />

// Medical records skeleton
<MedicalRecordsListSkeleton count={3} />

// Dashboard skeleton
<DashboardSkeleton />

// Form skeleton
<FormSkeleton fields={5} />

// Table skeleton
<TableSkeleton rows={5} columns={4} />

// Button skeleton
<ButtonSkeleton width="w-32" height="h-10" />

// Navigation skeleton
<NavigationSkeleton />

// Card list skeleton
<CardListSkeleton count={3} />

// Search results skeleton
<SearchResultsSkeleton count={5} />

// File upload skeleton
<FileUploadSkeleton />
```

## Hooks

### useLoadingState

Comprehensive loading state management hook.

```tsx
import { useLoadingState, useFormSubmission, useDataFetching, useFileUpload } from '@/hooks/useLoadingState';

// Basic loading state
const loadingState = useLoadingState();

const handleOperation = async () => {
  await loadingState.executeAsync(
    async () => {
      // Your async operation
      return await performOperation();
    },
    {
      showSuccessNotification: true,
      successMessage: 'Operation completed!',
      showErrorNotification: true,
      errorMessage: 'Operation failed',
      onSuccess: (result) => {
        // Handle success
      },
      onError: (error) => {
        // Handle error
      }
    }
  );
};

// Form submission
const formSubmission = useFormSubmission();

const handleSubmit = async (data) => {
  await formSubmission.submitForm(
    async () => await submitForm(data),
    {
      successMessage: 'Form submitted successfully!',
      onSuccess: (result) => {
        navigate('/success');
      }
    }
  );
};

// Data fetching
const dataFetching = useDataFetching();

useEffect(() => {
  const loadData = async () => {
    const data = await dataFetching.fetchData(
      async (signal) => await fetchData(signal),
      {
        errorMessage: 'Failed to load data'
      }
    );
    setData(data);
  };
  
  loadData();
}, []);

// File upload
const fileUpload = useFileUpload();

const handleUpload = async (file) => {
  await fileUpload.uploadFile(
    file,
    async (file, onProgress) => {
      // Upload implementation with progress
      return await uploadFile(file, onProgress);
    },
    {
      onSuccess: (result) => {
        console.log('Upload successful:', result);
      }
    }
  );
};
```

### useNotifications

Notification system hook for various types of feedback.

```tsx
import { useNotifications } from '@/hooks/useNotifications';

const {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showSaveSuccess,
  showUpdateSuccess,
  showDeleteSuccess,
  showUploadSuccess,
  showNetworkError,
  showValidationError,
  showAuthError,
  showPermissionError
} = useNotifications();

// Basic notifications
showSuccess('Operation successful');
showError('Something went wrong');
showWarning('Please review your input');
showInfo('New feature available');

// Specialized notifications
showSaveSuccess('Profile');
showUpdateSuccess('Medical record');
showDeleteSuccess('Document');
showUploadSuccess('report.pdf');
showNetworkError(() => retryOperation());
showValidationError('Please check required fields');
showAuthError('Invalid credentials');
showPermissionError();
```

## Best Practices

### 1. Loading States

- **Always provide loading feedback** for operations that take more than 200ms
- **Use skeleton loaders** for initial page loads to improve perceived performance
- **Show progress indicators** for operations that can report progress (file uploads, batch operations)
- **Provide cancel options** for long-running operations when possible

### 2. Error Handling

- **Always provide retry options** for recoverable errors
- **Use clear, user-friendly error messages** instead of technical error codes
- **Categorize errors appropriately** (network, validation, permission, etc.)
- **Log detailed errors** for debugging while showing simple messages to users

### 3. Success Feedback

- **Provide immediate feedback** for successful operations
- **Use appropriate feedback duration** (2-5 seconds for most operations)
- **Include relevant details** in success messages when helpful
- **Consider the user's next action** when designing success states

### 4. Accessibility

- **Use proper ARIA labels** for loading states
- **Ensure keyboard navigation** works during loading states
- **Provide screen reader announcements** for state changes
- **Maintain focus management** during async operations

### 5. Performance

- **Debounce rapid state changes** to avoid flickering
- **Use skeleton loaders** instead of spinners for better perceived performance
- **Implement proper cleanup** for async operations to prevent memory leaks
- **Consider using React.Suspense** for code splitting scenarios

## Examples

### Complete Form with Loading States

```tsx
import React from 'react';
import { useFormSubmission } from '@/hooks/useLoadingState';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormLoadingManager } from '@/components/ui/loading-state-manager';
import { useSuccessFeedback } from '@/components/ui/success-feedback';

const MyForm = () => {
  const formSubmission = useFormSubmission();
  const { showSuccess, show: showingSuccess } = useSuccessFeedback();

  const handleSubmit = async (data) => {
    await formSubmission.submitForm(
      async () => await submitData(data),
      {
        successMessage: 'Data saved successfully!',
        onSuccess: () => {
          showSuccess('Form submitted!', 'Your data has been saved.');
        }
      }
    );
  };

  return (
    <FormLoadingManager
      loading={formSubmission.isLoading}
      error={formSubmission.error}
      success={showingSuccess}
    >
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <LoadingButton
          type="submit"
          loading={formSubmission.isLoading}
          success={showingSuccess}
          loadingText="Saving..."
          successText="Saved!"
        >
          Submit
        </LoadingButton>
      </form>
    </FormLoadingManager>
  );
};
```

### Data Loading with Skeleton

```tsx
import React, { useEffect, useState } from 'react';
import { useDataFetching } from '@/hooks/useLoadingState';
import { DataLoadingManager } from '@/components/ui/loading-state-manager';
import { ProfileSkeleton } from '@/components/ui/skeleton-loaders';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const dataFetching = useDataFetching();

  useEffect(() => {
    const loadProfile = async () => {
      const data = await dataFetching.fetchData(
        async () => await fetchUserProfile(),
        { errorMessage: 'Failed to load profile' }
      );
      setProfile(data);
    };
    
    loadProfile();
  }, []);

  return (
    <DataLoadingManager
      loading={dataFetching.isLoading}
      error={dataFetching.error}
      data={profile}
      skeleton={<ProfileSkeleton />}
      emptyState={<div>No profile data available</div>}
      onRetry={() => loadProfile()}
    >
      <ProfileContent profile={profile} />
    </DataLoadingManager>
  );
};
```

## Testing

The loading states system includes comprehensive tests. Run them with:

```bash
npm test -- --run src/test/loading-states-comprehensive.test.tsx
```

The tests cover:
- All loading state components
- Hook functionality
- User interactions
- Error scenarios
- Success feedback
- Progress indicators
- Skeleton loaders
- Integration scenarios

## Migration Guide

If you're updating existing components to use the new loading states system:

1. **Replace basic loading states** with `LoadingStateManager`
2. **Update buttons** to use `LoadingButton` for better UX
3. **Add skeleton loaders** for initial loading states
4. **Implement success feedback** for user actions
5. **Use specialized hooks** (`useFormSubmission`, `useDataFetching`) for common patterns
6. **Add progress indicators** for file uploads and batch operations

## Troubleshooting

### Common Issues

1. **Loading state not showing**: Ensure the loading state is properly managed and the component is re-rendering
2. **Success feedback not appearing**: Check that the success state is being set and the component is mounted
3. **Progress not updating**: Verify that the progress callback is being called correctly
4. **Skeleton loader flickering**: Use `showSkeletonOnInitialLoad` prop to control when skeletons appear
5. **Memory leaks**: Ensure proper cleanup of async operations and subscriptions

### Performance Issues

1. **Too many re-renders**: Use `useCallback` and `useMemo` for expensive operations
2. **Slow skeleton loading**: Optimize skeleton components and reduce complexity
3. **Progress updates too frequent**: Throttle progress updates to avoid excessive re-renders

For more help, check the test files for usage examples and expected behavior.