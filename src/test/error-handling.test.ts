import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler, ErrorSeverity, ErrorCategory, safeAsync, safeSync } from '@/lib/error-handler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleAuthError', () => {
    it('should handle invalid credentials error', () => {
      const error = { message: 'Invalid login credentials' };
      const result = ErrorHandler.handleAuthError(error);

      expect(result.code).toBe('Invalid login credentials');
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.userMessage).toContain('Invalid email or password');
      expect(result.retryable).toBe(false);
    });

    it('should handle network errors as retryable', () => {
      const error = { message: 'Network error' };
      const result = ErrorHandler.handleAuthError(error);

      expect(result.code).toBe('Network error');
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
    });

    it('should handle rate limiting', () => {
      const error = { message: 'Too many requests' };
      const result = ErrorHandler.handleAuthError(error);

      expect(result.code).toBe('Too many requests');
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle record not found error', () => {
      const error = { code: 'PGRST116', message: 'Record not found' };
      const result = ErrorHandler.handleDatabaseError(error);

      expect(result.code).toBe('PGRST116');
      expect(result.category).toBe(ErrorCategory.DATABASE);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.userMessage).toContain('not found');
      expect(result.retryable).toBe(false);
    });

    it('should handle permission errors', () => {
      const error = { code: '42501', message: 'Permission denied' };
      const result = ErrorHandler.handleDatabaseError(error);

      expect(result.code).toBe('42501');
      expect(result.category).toBe(ErrorCategory.DATABASE);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.userMessage).toContain('permission');
      expect(result.retryable).toBe(false);
    });

    it('should handle service unavailable as retryable', () => {
      const error = { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' };
      const result = ErrorHandler.handleDatabaseError(error);

      expect(result.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleNetworkError', () => {
    it('should handle fetch errors', () => {
      const error = new Error('fetch failed');
      const result = ErrorHandler.handleNetworkError(error);

      expect(result.code).toBe('FETCH_ERROR');
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
    });

    it('should handle timeout errors', () => {
      const error = new Error('timeout occurred');
      const result = ErrorHandler.handleNetworkError(error);

      expect(result.code).toBe('TIMEOUT_ERROR');
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.retryable).toBe(true);
    });

    it('should handle aborted requests', () => {
      const error = new Error('request was aborted');
      const result = ErrorHandler.handleNetworkError(error);

      expect(result.code).toBe('REQUEST_ABORTED');
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.retryable).toBe(true);
    });
  });

  describe('categorizeError', () => {
    it('should categorize auth errors', () => {
      const error = { name: 'AuthError', message: 'Auth failed' };
      const result = ErrorHandler.categorizeError(error);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should categorize database errors', () => {
      const error = { code: 'PGRST001', message: 'DB error' };
      const result = ErrorHandler.categorizeError(error);

      expect(result.category).toBe(ErrorCategory.DATABASE);
    });

    it('should categorize network errors', () => {
      const error = new TypeError('fetch failed');
      const result = ErrorHandler.categorizeError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      const result = ErrorHandler.categorizeError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('withRetry', () => {
    it('should retry retryable operations', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return 'success';
      });

      const result = await ErrorHandler.withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10,
        retryableErrors: ['NETWORK_ERROR']
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable operations', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        ErrorHandler.withRetry(operation, {
          maxAttempts: 3,
          retryableErrors: ['NETWORK_ERROR']
        })
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        ErrorHandler.withRetry(operation, {
          maxAttempts: 2,
          baseDelay: 10,
          retryableErrors: ['NETWORK_ERROR']
        })
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('logError', () => {
    it('should log critical errors with console.error', () => {
      const error = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error',
        userMessage: 'Critical error occurred',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.CRITICAL,
        timestamp: new Date(),
        retryable: false
      };

      ErrorHandler.logError(error);

      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL ERROR:',
        expect.any(Object),
        undefined
      );
    });

    it('should log medium errors with console.warn', () => {
      const error = {
        code: 'MEDIUM_ERROR',
        message: 'Medium error',
        userMessage: 'Medium error occurred',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        retryable: false
      };

      ErrorHandler.logError(error);

      expect(console.warn).toHaveBeenCalledWith(
        'MEDIUM SEVERITY ERROR:',
        expect.any(Object),
        undefined
      );
    });

    it('should log low errors with console.info', () => {
      const error = {
        code: 'LOW_ERROR',
        message: 'Low error',
        userMessage: 'Low error occurred',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        retryable: false
      };

      ErrorHandler.logError(error);

      expect(console.info).toHaveBeenCalledWith(
        'LOW SEVERITY ERROR:',
        expect.any(Object)
      );
    });
  });

  describe('getUserMessage', () => {
    it('should return user message from AppError', () => {
      const error = {
        userMessage: 'User friendly message',
        code: 'TEST_ERROR',
        message: 'Technical message',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        retryable: false
      };

      const result = ErrorHandler.getUserMessage(error);
      expect(result).toBe('User friendly message');
    });

    it('should categorize and return user message for regular errors', () => {
      const error = new Error('Network error');
      const result = ErrorHandler.getUserMessage(error);
      
      expect(result).toContain('Network error');
    });
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes within timeout', async () => {
      const operation = Promise.resolve('success');
      const result = await ErrorHandler.withTimeout(operation, 1000);
      
      expect(result).toBe('success');
    });

    it('should reject if operation times out', async () => {
      const operation = new Promise(resolve => setTimeout(resolve, 2000));
      
      await expect(
        ErrorHandler.withTimeout(operation, 100)
      ).rejects.toThrow('Operation timed out after 100ms');
    });
  });
});

describe('safeAsync', () => {
  it('should return data on success', async () => {
    const operation = () => Promise.resolve('success');
    const result = await safeAsync(operation);

    expect(result.data).toBe('success');
    expect(result.error).toBeNull();
  });

  it('should return error on failure', async () => {
    const operation = () => Promise.reject(new Error('Test error'));
    const result = await safeAsync(operation);

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Test error');
  });

  it('should return fallback on failure', async () => {
    const operation = () => Promise.reject(new Error('Test error'));
    const result = await safeAsync(operation, 'fallback');

    expect(result.data).toBe('fallback');
    expect(result.error).toBeDefined();
  });
});

describe('safeSync', () => {
  it('should return data on success', () => {
    const operation = () => 'success';
    const result = safeSync(operation);

    expect(result.data).toBe('success');
    expect(result.error).toBeNull();
  });

  it('should return error on failure', () => {
    const operation = () => {
      throw new Error('Test error');
    };
    const result = safeSync(operation);

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Test error');
  });

  it('should return fallback on failure', () => {
    const operation = () => {
      throw new Error('Test error');
    };
    const result = safeSync(operation, 'fallback');

    expect(result.data).toBe('fallback');
    expect(result.error).toBeDefined();
  });
});