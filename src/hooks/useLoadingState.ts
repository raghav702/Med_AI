import { useState, useCallback, useRef, useMemo } from 'react';
import { useNotifications } from './useNotifications';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
}

export interface LoadingStateOptions {
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useLoadingState = (initialState: LoadingState = { isLoading: false, error: null }) => {
  const [state, setState] = useState<LoadingState>(initialState);
  const { showSuccess, showError } = useNotifications();
  const abortControllerRef = useRef<AbortController | null>(null);

  const setLoading = useCallback((loading: boolean, progress?: number) => {
    setState(prev => ({ ...prev, isLoading: loading, progress, error: loading ? null : prev.error }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFunction: (abortSignal?: AbortSignal) => Promise<T>,
    options: LoadingStateOptions = {}
  ): Promise<T | null> => {
    try {
      // Create abort controller for this operation
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      clearError();

      const result = await asyncFunction(abortControllerRef.current.signal);

      if (options.showSuccessNotification) {
        showSuccess(options.successMessage || 'Operation completed successfully');
      }

      if (options.onSuccess) {
        options.onSuccess();
      }

      setLoading(false);
      return result;
    } catch (error: any) {
      // Don't show error if operation was aborted
      if (error.name === 'AbortError') {
        return null;
      }

      const errorMessage = error.message || options.errorMessage || 'An error occurred';
      setError(errorMessage);

      if (options.showErrorNotification) {
        showError(errorMessage);
      }

      if (options.onError) {
        options.onError(error);
      }

      setLoading(false);
      return null;
    } finally {
      abortControllerRef.current = null;
    }
  }, [setLoading, clearError, setError, showSuccess, showError]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, [setLoading]);

  return {
    ...state,
    setLoading,
    setError,
    setProgress,
    clearError,
    reset,
    executeAsync,
    cancel,
  };
};

// Specialized hooks for common operations
export const useFormSubmission = () => {
  const loadingState = useLoadingState();

  const submitForm = useCallback(async <T>(
    submitFunction: () => Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: any) => void;
    } = {}
  ) => {
    return loadingState.executeAsync(
      async () => {
        const result = await submitFunction();
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        return result;
      },
      {
        showSuccessNotification: true,
        showErrorNotification: true,
        successMessage: options.successMessage || 'Form submitted successfully',
        errorMessage: options.errorMessage || 'Failed to submit form',
        onError: options.onError,
      }
    );
  }, [loadingState]);

  return {
    ...loadingState,
    submitForm,
  };
};

export const useDataFetching = () => {
  const loadingState = useLoadingState();

  const fetchData = useCallback(async <T>(
    fetchFunction: (abortSignal?: AbortSignal) => Promise<T>,
    options: {
      showErrorNotification?: boolean;
      errorMessage?: string;
      onError?: (error: any) => void;
    } = {}
  ) => {
    return loadingState.executeAsync(
      fetchFunction,
      {
        showErrorNotification: options.showErrorNotification ?? true,
        errorMessage: options.errorMessage || 'Failed to load data',
        onError: options.onError,
      }
    );
  }, [loadingState.executeAsync]);

  return useMemo(() => ({
    ...loadingState,
    fetchData,
  }), [loadingState, fetchData]);
};

export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const loadingState = useLoadingState();

  const uploadFile = useCallback(async (
    file: File,
    uploadFunction: (file: File, onProgress: (progress: number) => void) => Promise<any>,
    options: {
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
    } = {}
  ) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      loadingState.setLoading(true);

      const result = await uploadFunction(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        loadingState.setProgress(progress);
      });

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }

      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 2000);

      loadingState.setLoading(false);
      return result;
    } catch (error: any) {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      
      loadingState.setError(error.message || 'Upload failed');
      
      if (options.onError) {
        options.onError(error);
      }
      
      return null;
    }
  }, [loadingState]);

  return {
    ...loadingState,
    uploadProgress,
    uploadFile,
  };
};