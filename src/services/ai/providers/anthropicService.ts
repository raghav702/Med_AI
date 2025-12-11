/**
 * Anthropic Service Implementation
 * 
 * Provides integration with Anthropic's Claude API for medical conversations
 */

import { IAIService, AIServiceConfig, AIRequest, AIResponse } from '../aiServiceInterface';

export class AnthropicService implements IAIService {
  private config: AIServiceConfig | null = null;
  private isInitialized = false;

  async initialize(config: AIServiceConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    // Test API connection
    try {
      await this.testConnection();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Anthropic service: ${error}`);
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.isInitialized || !this.config?.apiKey) {
      throw new Error('Anthropic service not initialized');
    }

    try {
      const messages = [];
      
      if (request.conversationHistory) {
        messages.push(...request.conversationHistory);
      }
      
      messages.push({ role: 'user', content: request.prompt });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-sonnet-20240229',
          messages,
          max_tokens: request.maxTokens || this.config.maxTokens || 1000,
          temperature: request.temperature || this.config.temperature || 0.7,
          system: request.systemPrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.content[0]?.text || '',
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        model: data.model,
        finishReason: data.stop_reason
      };

    } catch (error) {
      console.error('Anthropic service error:', error);
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

    // Anthropic doesn't have a simple health check endpoint, so we'll make a minimal request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });

    if (!response.ok && response.status !== 400) { // 400 is expected for minimal request
      throw new Error(`API test failed: ${response.status}`);
    }
  }
}