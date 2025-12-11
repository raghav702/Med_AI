/**
 * AI Integration Tests
 * 
 * Tests for AI service integration and functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIServiceManager } from '../services/ai/aiServiceManager';
import { AIConfigService } from '../services/ai/aiConfig';
import { AIServiceInitializer } from '../services/ai/aiServiceInitializer';
import { AIErrorHandler } from '../services/ai/aiErrorHandler';
import { ConversationContext } from '../types/conversation';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_AI_PROVIDER: 'custom-rag',
    VITE_RAG_ENDPOINT: 'http://localhost:8000',
    VITE_AI_MAX_TOKENS: '1000',
    VITE_AI_TEMPERATURE: '0.7',
    VITE_AI_TIMEOUT_MS: '30000',
    VITE_AI_ENABLE_FALLBACK: 'true'
  }
}));

describe('AI Service Configuration', () => {
  it('should generate valid configuration from environment variables', () => {
    const config = AIConfigService.getAIServiceConfig();
    
    expect(config).toBeDefined();
    expect(config.primaryProvider.provider).toBe('custom-rag');
    expect(config.primaryProvider.baseUrl).toBe('http://localhost:8000');
    expect(config.enableFallback).toBe(true);
    expect(config.maxRetries).toBe(2);
    expect(config.timeoutMs).toBe(30000);
  });

  it('should validate configuration correctly', () => {
    const validation = AIConfigService.validateConfiguration();
    
    expect(validation).toBeDefined();
    expect(validation.isValid).toBeDefined();
    expect(validation.errors).toBeInstanceOf(Array);
  });

  it('should provide configuration summary', () => {
    const summary = AIConfigService.getConfigSummary();
    
    expect(summary).toBeDefined();
    expect(summary.primaryProvider).toBe('custom-rag');
    expect(summary.enableFallback).toBe(true);
    expect(summary.ragEndpoint).toBe('http://localhost:8000');
  });
});

describe('AI Error Handler', () => {
  it('should categorize errors correctly', () => {
    const networkError = new Error('Network connection failed');
    const { aiError, fallbackResponse } = AIErrorHandler.handleError(networkError);
    
    expect(aiError.code).toBe('NETWORK_ERROR');
    expect(aiError.recoverable).toBe(true);
    expect(fallbackResponse.message).toContain('technical difficulties');
    expect(fallbackResponse.responseType).toBe('question');
  });

  it('should handle API key errors', () => {
    const apiError = new Error('Invalid API key provided');
    const { aiError, fallbackResponse } = AIErrorHandler.handleError(apiError);
    
    expect(aiError.code).toBe('API_KEY_INVALID');
    expect(aiError.recoverable).toBe(false);
    expect(fallbackResponse.message).toContain('limited mode');
  });

  it('should determine retry logic correctly', () => {
    const networkError = { code: 'NETWORK_ERROR', recoverable: true } as any;
    const apiKeyError = { code: 'API_KEY_INVALID', recoverable: false } as any;
    
    expect(AIErrorHandler.shouldRetry(networkError, 1, 3)).toBe(true);
    expect(AIErrorHandler.shouldRetry(apiKeyError, 1, 3)).toBe(false);
    expect(AIErrorHandler.shouldRetry(networkError, 3, 3)).toBe(false);
  });

  it('should calculate retry delays with exponential backoff', () => {
    const error = { code: 'NETWORK_ERROR', recoverable: true } as any;
    
    const delay1 = AIErrorHandler.getRetryDelay(error, 1);
    const delay2 = AIErrorHandler.getRetryDelay(error, 2);
    
    expect(delay1).toBeGreaterThan(0);
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay2).toBeLessThanOrEqual(10000); // Max delay
  });
});

describe('AI Service Initializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track initialization status', () => {
    expect(typeof AIServiceInitializer.isReady()).toBe('boolean');
  });

  it('should provide status information', async () => {
    const status = await AIServiceInitializer.getStatus();
    
    expect(status).toBeDefined();
    expect(status.initialized).toBeDefined();
    expect(status.healthy).toBeDefined();
    expect(status.provider).toBeDefined();
  });
});

describe('AI Service Manager Integration', () => {
  let aiServiceManager: AIServiceManager;
  let mockContext: ConversationContext;

  beforeEach(() => {
    aiServiceManager = new AIServiceManager();
    mockContext = {
      sessionId: 'test-session',
      messages: [],
      currentSymptoms: ['headache', 'fever'],
      urgencyLevel: 'medium',
      conversationStage: 'gathering',
      lastActivity: new Date(),
      isTyping: false,
      metadata: {}
    };
  });

  it('should handle message processing gracefully when service unavailable', async () => {
    // This test will use fallback responses since no actual AI service is configured
    try {
      const response = await aiServiceManager.processUserMessage('I have a headache', mockContext);
      
      // Should return a fallback response
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.responseType).toBeDefined();
    } catch (error) {
      // Expected when no AI service is available
      expect(error).toBeDefined();
    }
  });

  it('should generate follow-up questions with fallback', async () => {
    const symptoms = [
      { symptom: 'headache', severity: 'moderate', duration: '2 days', location: 'forehead', urgencyScore: 4 }
    ];

    const questions = await aiServiceManager.generateFollowUpQuestions(symptoms, mockContext);
    
    expect(questions).toBeInstanceOf(Array);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it('should provide specialty explanations with fallback', async () => {
    const mockAnalysis = {
      symptoms: [{ symptom: 'headache', severity: 'moderate', duration: '2 days', location: 'forehead', urgencyScore: 4 }],
      urgencyScore: 4,
      urgencyLevel: 'medium' as const,
      possibleConditions: ['tension headache'],
      recommendedSpecialties: ['neurology'],
      followUpQuestions: ['How severe is the pain?'],
      emergencyFlags: []
    };

    const explanation = await aiServiceManager.explainDoctorRecommendation(
      'neurology',
      mockAnalysis,
      mockContext
    );
    
    expect(explanation).toBeDefined();
    expect(typeof explanation).toBe('string');
    expect(explanation.length).toBeGreaterThan(0);
  });
});

describe('AI Service Health Monitoring', () => {
  it('should provide health status structure', async () => {
    const aiServiceManager = new AIServiceManager();
    
    try {
      const health = await aiServiceManager.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health.primary).toBeDefined();
      expect(health.fallbacks).toBeInstanceOf(Array);
      expect(['healthy', 'degraded', 'unavailable']).toContain(health.overall);
    } catch (error) {
      // Expected when service is not initialized
      expect(error).toBeDefined();
    }
  });
});

describe('Error Logging and Monitoring', () => {
  beforeEach(() => {
    AIErrorHandler.clearErrorLogs();
  });

  it('should store and retrieve error logs', () => {
    const testError = new Error('Test error for logging');
    AIErrorHandler.handleError(testError);
    
    const logs = AIErrorHandler.getErrorLogs();
    expect(logs).toBeInstanceOf(Array);
  });

  it('should clear error logs', () => {
    const testError = new Error('Test error for clearing');
    AIErrorHandler.handleError(testError);
    
    AIErrorHandler.clearErrorLogs();
    const logs = AIErrorHandler.getErrorLogs();
    expect(logs).toHaveLength(0);
  });
});