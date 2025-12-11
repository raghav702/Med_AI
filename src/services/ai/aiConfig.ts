/**
 * AI Configuration Service
 * 
 * Manages AI service configuration from environment variables
 * Provides configuration for different AI providers
 */

import { AIServiceConfig, AIServiceManagerConfig } from './aiServiceInterface';

export class AIConfigService {
  /**
   * Get AI service configuration from environment variables
   */
  static getAIServiceConfig(): AIServiceManagerConfig {
    const provider = import.meta.env.VITE_AI_PROVIDER || 'custom-rag';
    const enableFallback = import.meta.env.VITE_AI_ENABLE_FALLBACK === 'true';
    
    const primaryConfig = this.getProviderConfig(provider);
    const fallbackConfigs = enableFallback ? this.getFallbackConfigs(provider) : [];

    return {
      primaryProvider: primaryConfig,
      fallbackProviders: fallbackConfigs,
      enableFallback,
      maxRetries: 2,
      timeoutMs: parseInt(import.meta.env.VITE_AI_TIMEOUT_MS) || 30000
    };
  }

  /**
   * Get configuration for a specific provider
   */
  private static getProviderConfig(provider: string): AIServiceConfig {
    switch (provider) {
      case 'openai':
        return {
          provider: 'openai',
          apiKey: import.meta.env.VITE_OPENAI_API_KEY,
          model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
          maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 1000,
          temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE) || 0.7
        };

      case 'anthropic':
        return {
          provider: 'anthropic',
          apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
          model: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 1000,
          temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE) || 0.7
        };

      case 'custom-rag':
      default:
        return {
          provider: 'custom-rag',
          baseUrl: import.meta.env.VITE_RAG_ENDPOINT || 'http://localhost:8000',
          apiKey: import.meta.env.VITE_RAG_API_KEY,
          maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 1000,
          temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE) || 0.7,
          customConfig: {
            // Add any custom configuration for your RAG system
            endpoint: import.meta.env.VITE_RAG_ENDPOINT || 'http://localhost:8000',
            headers: {
              'X-Client': 'medical-assistant'
            }
          }
        };
    }
  }

  /**
   * Get fallback provider configurations
   */
  private static getFallbackConfigs(primaryProvider: string): AIServiceConfig[] {
    const fallbacks: AIServiceConfig[] = [];

    // Add fallback providers (excluding the primary)
    const providers = ['custom-rag', 'openai', 'anthropic'];
    
    for (const provider of providers) {
      if (provider !== primaryProvider) {
        try {
          const config = this.getProviderConfig(provider);
          
          // Only add if the provider has required configuration
          if (this.isProviderConfigured(config)) {
            fallbacks.push(config);
          }
        } catch (error) {
          console.warn(`Failed to configure fallback provider ${provider}:`, error);
        }
      }
    }

    return fallbacks;
  }

  /**
   * Check if a provider is properly configured
   */
  private static isProviderConfigured(config: AIServiceConfig): boolean {
    switch (config.provider) {
      case 'openai':
        return !!config.apiKey;
      case 'anthropic':
        return !!config.apiKey;
      case 'custom-rag':
        return !!config.baseUrl;
      default:
        return false;
    }
  }

  /**
   * Validate AI configuration
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const provider = import.meta.env.VITE_AI_PROVIDER || 'custom-rag';

    try {
      const config = this.getProviderConfig(provider);
      
      if (!this.isProviderConfigured(config)) {
        errors.push(`Primary AI provider '${provider}' is not properly configured`);
      }

      // Check for required environment variables
      if (provider === 'openai' && !import.meta.env.VITE_OPENAI_API_KEY) {
        errors.push('VITE_OPENAI_API_KEY is required for OpenAI provider');
      }

      if (provider === 'anthropic' && !import.meta.env.VITE_ANTHROPIC_API_KEY) {
        errors.push('VITE_ANTHROPIC_API_KEY is required for Anthropic provider');
      }

      if (provider === 'custom-rag' && !import.meta.env.VITE_RAG_ENDPOINT) {
        errors.push('VITE_RAG_ENDPOINT is required for Custom RAG provider');
      }

    } catch (error) {
      errors.push(`Configuration validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration summary for debugging
   */
  static getConfigSummary(): Record<string, any> {
    const provider = import.meta.env.VITE_AI_PROVIDER || 'custom-rag';
    
    return {
      primaryProvider: provider,
      enableFallback: import.meta.env.VITE_AI_ENABLE_FALLBACK === 'true',
      maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 1000,
      temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE) || 0.7,
      timeoutMs: parseInt(import.meta.env.VITE_AI_TIMEOUT_MS) || 30000,
      hasOpenAIKey: !!import.meta.env.VITE_OPENAI_API_KEY,
      hasAnthropicKey: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
      ragEndpoint: import.meta.env.VITE_RAG_ENDPOINT || 'not configured'
    };
  }
}