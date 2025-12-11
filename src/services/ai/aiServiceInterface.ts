/**
 * AI Service Interface
 * 
 * Provides a unified interface for different AI services (OpenAI, Anthropic, Custom RAG)
 * This allows easy switching between providers and integration of custom RAG systems
 */

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'custom-rag';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  customConfig?: Record<string, any>;
}

export interface AIRequest {
  prompt: string;
  context?: string;
  systemPrompt?: string;
  conversationHistory?: Array<{role: string; content: string}>;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
  metadata?: Record<string, any>;
}

export interface AIServiceError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Base interface that all AI service providers must implement
 */
export interface IAIService {
  /**
   * Initialize the service with configuration
   */
  initialize(config: AIServiceConfig): Promise<void>;

  /**
   * Generate a response from the AI service
   */
  generateResponse(request: AIRequest): Promise<AIResponse>;

  /**
   * Check if the service is available and configured
   */
  isAvailable(): boolean;

  /**
   * Get service health status
   */
  getHealthStatus(): Promise<{status: 'healthy' | 'degraded' | 'unavailable'; details?: string}>;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

/**
 * Factory for creating AI service instances
 */
export class AIServiceFactory {
  private static services: Map<string, IAIService> = new Map();

  static async createService(config: AIServiceConfig): Promise<IAIService> {
    const key = `${config.provider}-${config.model || 'default'}`;
    
    if (this.services.has(key)) {
      return this.services.get(key)!;
    }

    let service: IAIService;

    switch (config.provider) {
      case 'openai':
        const { OpenAIService } = await import('./providers/openaiService');
        service = new OpenAIService();
        break;
      case 'anthropic':
        const { AnthropicService } = await import('./providers/anthropicService');
        service = new AnthropicService();
        break;
      case 'custom-rag':
        const { CustomRAGService } = await import('./providers/customRAGService');
        service = new CustomRAGService();
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }

    await service.initialize(config);
    this.services.set(key, service);
    return service;
  }

  static clearCache(): void {
    this.services.clear();
  }
}