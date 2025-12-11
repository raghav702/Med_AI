/**
 * OpenAI Service Implementation
 * 
 * Provides integration with OpenAI's API for medical conversations
 */

import { IAIService, AIServiceConfig, AIRequest, AIResponse } from '../aiServiceInterface';

export class OpenAIService implements IAIService {
  private config: AIServiceConfig | null = null;
  private isInitialized = false;

  async initialize(config: AIServiceConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Test API connection
    try {
      await this.testConnection();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI service: ${error}`);
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.isInitialized || !this.config?.apiKey) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const messages = [];
      
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      
      if (request.conversationHistory) {
        messages.push(...request.conversationHistory);
      }
      
      messages.push({ role: 'user', content: request.prompt });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-3.5-turbo',
          messages,
          max_tokens: request.maxTokens || this.config.maxTokens || 1000,
          temperature: request.temperature || this.config.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        model: data.model,
        finishReason: data.choices[0]?.finish_reason
      };

    } catch (error) {
      console.error('OpenAI service error:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.config?.apiKey;
  }

  async getHealthStatus(): Promise<{status: 'healthy' | 'degraded' | 'unavailable'; details?: string}> {
    if (!this.isInitialized) {
      return { status: 'unavailable', details: 'Service not initialized' };
    }

    try {
      await this.testConnection();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unavailable', details: `Health check failed: ${error}` };
    }
  }

  async cleanup(): Promise<void> {
    this.config = null;
    this.isInitialized = false;
  }

  private async testConnection(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('No API key configured');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`API test failed: ${response.status}`);
    }
  }
}