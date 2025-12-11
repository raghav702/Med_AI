/**
 * AI Error Handler
 * 
 * Centralized error handling for AI service operations
 * Provides appropriate fallback responses and error recovery
 */

import { AIResponse } from '../../types/conversation';

export interface AIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export class AIErrorHandler {
  private static readonly ERROR_CODES = {
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    API_KEY_INVALID: 'API_KEY_INVALID',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    TIMEOUT: 'TIMEOUT',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  /**
   * Handle AI service errors and provide appropriate responses
   */
  static handleError(error: any, context?: any): { aiError: AIError; fallbackResponse: AIResponse } {
    const aiError = this.categorizeError(error);
    const fallbackResponse = this.generateFallbackResponse(aiError, context);

    // Log error for monitoring
    this.logError(aiError, context);

    return { aiError, fallbackResponse };
  }

  /**
   * Categorize error and create structured error object
   */
  private static categorizeError(error: any): AIError {
    let code = this.ERROR_CODES.UNKNOWN_ERROR;
    let message = 'An unexpected error occurred';
    let recoverable = true;

    if (error.message) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        code = this.ERROR_CODES.API_KEY_INVALID;
        message = 'AI service authentication failed';
        recoverable = false;
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        code = this.ERROR_CODES.RATE_LIMIT_EXCEEDED;
        message = 'AI service rate limit exceeded';
        recoverable = true;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        code = this.ERROR_CODES.TIMEOUT;
        message = 'AI service request timed out';
        recoverable = true;
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        code = this.ERROR_CODES.NETWORK_ERROR;
        message = 'Network connection error';
        recoverable = true;
      } else if (errorMessage.includes('service not initialized') || errorMessage.includes('configuration')) {
        code = this.ERROR_CODES.CONFIGURATION_ERROR;
        message = 'AI service configuration error';
        recoverable = false;
      } else if (errorMessage.includes('unavailable') || errorMessage.includes('service')) {
        code = this.ERROR_CODES.SERVICE_UNAVAILABLE;
        message = 'AI service is currently unavailable';
        recoverable = true;
      }
    }

    return {
      code,
      message,
      details: {
        originalError: error.message,
        stack: error.stack,
        name: error.name
      },
      timestamp: new Date(),
      recoverable
    };
  }

  /**
   * Generate appropriate fallback response based on error type
   */
  private static generateFallbackResponse(aiError: AIError, context?: any): AIResponse {
    switch (aiError.code) {
      case this.ERROR_CODES.SERVICE_UNAVAILABLE:
      case this.ERROR_CODES.TIMEOUT:
      case this.ERROR_CODES.NETWORK_ERROR:
        return {
          message: "I'm experiencing some technical difficulties right now. Let me help you with a basic assessment of your symptoms.\n\nIf you have urgent medical concerns, please contact your healthcare provider or emergency services directly. Otherwise, I can still help connect you with appropriate doctors based on your symptoms.",
          responseType: 'question',
          nextAction: 'continue_chat',
          followUpQuestions: [
            "What are your main symptoms?",
            "How long have you had these symptoms?",
            "How severe would you rate them?"
          ],
          metadata: {
            aiServiceError: true,
            errorCode: aiError.code,
            fallbackMode: true
          }
        };

      case this.ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return {
          message: "I'm currently experiencing high demand. While I work on processing your request, I can still help you find appropriate medical care.\n\nCould you briefly describe your symptoms so I can recommend the right type of healthcare provider?",
          responseType: 'question',
          nextAction: 'continue_chat',
          followUpQuestions: [
            "What symptoms are you experiencing?",
            "Is this urgent or can it wait?",
            "Do you have a preferred type of doctor?"
          ],
          metadata: {
            aiServiceError: true,
            errorCode: aiError.code,
            rateLimited: true
          }
        };

      case this.ERROR_CODES.API_KEY_INVALID:
      case this.ERROR_CODES.CONFIGURATION_ERROR:
        return {
          message: "I'm currently running in limited mode, but I can still help you find appropriate medical care based on your symptoms.\n\nPlease describe what you're experiencing, and I'll do my best to connect you with the right healthcare providers.",
          responseType: 'question',
          nextAction: 'continue_chat',
          followUpQuestions: [
            "What symptoms are you experiencing?",
            "When did they start?",
            "What type of doctor do you think you need?"
          ],
          metadata: {
            aiServiceError: true,
            errorCode: aiError.code,
            limitedMode: true
          }
        };

      default:
        return {
          message: "I apologize, but I'm experiencing some technical issues. However, I can still help you find medical care.\n\nIf you have urgent symptoms, please contact emergency services immediately. For non-urgent concerns, please describe your symptoms and I'll help you find appropriate doctors.",
          responseType: 'question',
          nextAction: 'continue_chat',
          followUpQuestions: [
            "Is this an emergency?",
            "What symptoms do you have?",
            "Do you need immediate care?"
          ],
          metadata: {
            aiServiceError: true,
            errorCode: aiError.code,
            genericFallback: true
          }
        };
    }
  }

  /**
   * Log error for monitoring and debugging
   */
  private static logError(aiError: AIError, context?: any): void {
    const logData = {
      timestamp: aiError.timestamp.toISOString(),
      code: aiError.code,
      message: aiError.message,
      recoverable: aiError.recoverable,
      context: context ? {
        conversationStage: context.conversationStage,
        urgencyLevel: context.urgencyLevel,
        messageCount: context.messages?.length || 0
      } : null,
      details: aiError.details
    };

    // Log to console (in production, this would go to a proper logging service)
    if (aiError.recoverable) {
      console.warn('Recoverable AI service error:', logData);
    } else {
      console.error('Non-recoverable AI service error:', logData);
    }

    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, or your own monitoring system
    this.sendToMonitoring(logData);
  }

  /**
   * Send error data to monitoring service (placeholder)
   */
  private static sendToMonitoring(logData: any): void {
    // Placeholder for error monitoring integration
    // In production, implement integration with your monitoring service
    
    try {
      // Example: Send to monitoring service
      // monitoringService.captureError(logData);
      
      // For now, just store in localStorage for debugging
      if (typeof window !== 'undefined' && window.localStorage) {
        const errors = JSON.parse(localStorage.getItem('ai_errors') || '[]');
        errors.push(logData);
        
        // Keep only last 50 errors
        if (errors.length > 50) {
          errors.splice(0, errors.length - 50);
        }
        
        localStorage.setItem('ai_errors', JSON.stringify(errors));
      }
    } catch (error) {
      console.warn('Failed to send error to monitoring:', error);
    }
  }

  /**
   * Check if error is recoverable and should trigger retry
   */
  static shouldRetry(error: AIError, attemptCount: number, maxAttempts: number = 3): boolean {
    if (attemptCount >= maxAttempts) {
      return false;
    }

    if (!error.recoverable) {
      return false;
    }

    // Don't retry rate limit errors immediately
    if (error.code === this.ERROR_CODES.RATE_LIMIT_EXCEEDED) {
      return false;
    }

    // Retry network errors and timeouts
    return [
      this.ERROR_CODES.NETWORK_ERROR,
      this.ERROR_CODES.TIMEOUT,
      this.ERROR_CODES.SERVICE_UNAVAILABLE
    ].includes(error.code);
  }

  /**
   * Get retry delay based on error type and attempt count
   */
  static getRetryDelay(error: AIError, attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds

    let delay = baseDelay * Math.pow(2, attemptCount - 1); // Exponential backoff

    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000;

    return Math.min(delay, maxDelay);
  }

  /**
   * Get stored error logs for debugging
   */
  static getErrorLogs(): any[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return JSON.parse(localStorage.getItem('ai_errors') || '[]');
      }
    } catch (error) {
      console.warn('Failed to retrieve error logs:', error);
    }
    return [];
  }

  /**
   * Clear stored error logs
   */
  static clearErrorLogs(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('ai_errors');
      }
    } catch (error) {
      console.warn('Failed to clear error logs:', error);
    }
  }
}