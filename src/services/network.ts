import { ErrorHandler, AppError } from '@/lib/error-handler';

/**
 * Network request configuration
 */
export interface NetworkConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * Default network configuration
 */
const DEFAULT_CONFIG: NetworkConfig = {
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Network service with built-in error handling and retry logic
 */
export class NetworkService {
  private config: NetworkConfig;

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Make a network request with error handling and retry logic
   */
  async request<T>(
    url: string,
    options: RequestInit & { config?: Partial<NetworkConfig> } = {}
  ): Promise<T> {
    const { config: requestConfig, ...fetchOptions } = options;
    const finalConfig = { ...this.config, ...requestConfig };

    return ErrorHandler.withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

        try {
          const response = await fetch(url, {
            ...fetchOptions,
            headers: {
              ...finalConfig.headers,
              ...fetchOptions.headers
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw await this.handleHttpError(response);
          }

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          }

          return await response.text() as T;
        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            throw ErrorHandler.handleNetworkError(new Error('Request timeout'));
          }
          
          throw error;
        }
      },
      {
        maxAttempts: finalConfig.retries || 3,
        baseDelay: finalConfig.retryDelay || 1000,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE']
      }
    );
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<AppError> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = `HTTP_${response.status}`;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        try {
          const parsedError = JSON.parse(errorBody);
          errorMessage = parsedError.message || parsedError.error || errorMessage;
          errorCode = parsedError.code || errorCode;
        } catch {
          errorMessage = errorBody;
        }
      }
    } catch {
      // Ignore parsing errors
    }

    // Map HTTP status codes to appropriate error types
    switch (response.status) {
      case 400:
        return ErrorHandler.handleValidationError(new Error(errorMessage));
      case 401:
      case 403:
        return ErrorHandler.handlePermissionError(new Error(errorMessage));
      case 404:
        return ErrorHandler.handleDatabaseError({ code: 'PGRST116', message: errorMessage });
      case 429:
        return ErrorHandler.handleAuthError({ message: 'Too many requests' });
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorHandler.handleNetworkError(new Error(errorMessage));
      default:
        return ErrorHandler.handleGenericError(new Error(errorMessage));
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: Partial<NetworkConfig>): Promise<T> {
    return this.request<T>(url, { method: 'GET', config });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: Partial<NetworkConfig>): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      config
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: Partial<NetworkConfig>): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      config
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: Partial<NetworkConfig>): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      config
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: Partial<NetworkConfig>): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', config });
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: Partial<NetworkConfig>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText as T);
          }
        } else {
          const error = ErrorHandler.handleNetworkError(
            new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`)
          );
          reject(error);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        const error = ErrorHandler.handleNetworkError(
          new Error('Upload failed due to network error')
        );
        reject(error);
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        const error = ErrorHandler.handleNetworkError(
          new Error('Upload timed out')
        );
        reject(error);
      });

      // Set timeout
      xhr.timeout = config?.timeout || this.config.timeout || 30000; // 30 seconds for uploads

      // Start upload
      xhr.open('POST', url);
      
      // Set headers (excluding Content-Type for FormData)
      const headers = { ...this.config.headers, ...config?.headers };
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.send(formData);
    });
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity(url: string = '/api/health'): Promise<boolean> {
    try {
      await this.get(url, { timeout: 5000, retries: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const networkService = new NetworkService();

// Export utility functions
export { NetworkService };
export type { NetworkConfig };