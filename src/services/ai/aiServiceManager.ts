/**
 * AI Service Manager
 * 
 * Central manager for AI services with fallback support and error handling
 * Coordinates between different AI providers and your custom RAG system
 */

import { IAIService, AIServiceConfig, AIRequest, AIResponse as ServiceAIResponse, AIServiceFactory } from './aiServiceInterface';
import { MedicalPromptEngine, PromptTemplate } from './medicalPromptEngine';
import { AIResponseProcessor, ProcessedResponse } from './aiResponseProcessor';
import { ConversationContext, AIResponse, SymptomAnalysis } from '../../types/conversation';
import { ParsedSymptom } from '../../types/medical';

export interface AIServiceManagerConfig {
  primaryProvider: AIServiceConfig;
  fallbackProviders?: AIServiceConfig[];
  enableFallback: boolean;
  maxRetries: number;
  timeoutMs: number;
}

export class AIServiceManager {
  private primaryService: IAIService | null = null;
  private fallbackServices: IAIService[] = [];
  private config: AIServiceManagerConfig | null = null;
  private isInitialized = false;

  /**
   * Initialize the AI Service Manager with configuration
   */
  async initialize(config: AIServiceManagerConfig): Promise<void> {
    this.config = config;

    try {
      // Initialize primary service
      this.primaryService = await AIServiceFactory.createService(config.primaryProvider);
      
      // Initialize fallback services if enabled
      if (config.enableFallback && config.fallbackProviders) {
        for (const fallbackConfig of config.fallbackProviders) {
          try {
            const fallbackService = await AIServiceFactory.createService(fallbackConfig);
            this.fallbackServices.push(fallbackService);
          } catch (error) {
            console.warn(`Failed to initialize fallback service ${fallbackConfig.provider}:`, error);
          }
        }
      }

      this.isInitialized = true;
      console.log('AI Service Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Service Manager:', error);
      throw error;
    }
  }

  /**
   * Process user message with AI service
   */
  async processUserMessage(
    message: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('AI Service Manager not initialized');
    }

    try {
      // Generate appropriate prompt based on conversation stage
      const promptTemplate = this.generatePromptForStage(message, context);
      
      // Create AI request
      const aiRequest: AIRequest = {
        prompt: promptTemplate.userPrompt,
        systemPrompt: promptTemplate.systemPrompt,
        context: promptTemplate.context,
        conversationHistory: this.formatConversationHistory(context),
        maxTokens: 1000,
        temperature: 0.7
      };

      // Get response from AI service with fallback support
      const serviceResponse = await this.getAIResponse(aiRequest);
      
      // Process and validate response
      const processedResponse = AIResponseProcessor.processResponse(
        serviceResponse,
        context,
        {
          validateMedicalContent: true,
          extractStructuredData: true,
          sanitizeHtml: true
        }
      );

      // Log warnings if any
      if (processedResponse.warnings.length > 0) {
        console.warn('AI Response warnings:', processedResponse.warnings);
      }

      return processedResponse.response;

    } catch (error) {
      console.error('Error processing user message:', error);
      
      // Return fallback response
      const fallbackResponse = AIResponseProcessor.createFallbackResponse(error, context);
      return fallbackResponse.response;
    }
  }

  /**
   * Generate follow-up questions for symptoms
   */
  async generateFollowUpQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): Promise<string[]> {
    if (!this.isInitialized) {
      return this.getDefaultFollowUpQuestions(symptoms);
    }

    try {
      const promptTemplate = MedicalPromptEngine.generateFollowUpPrompt(symptoms, context);
      
      const aiRequest: AIRequest = {
        prompt: promptTemplate.userPrompt,
        systemPrompt: promptTemplate.systemPrompt,
        maxTokens: 300,
        temperature: 0.5
      };

      const serviceResponse = await this.getAIResponse(aiRequest);
      const questions = AIResponseProcessor.processResponse(serviceResponse, context)
        .response.followUpQuestions || [];

      return questions.length > 0 ? questions : this.getDefaultFollowUpQuestions(symptoms);

    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return this.getDefaultFollowUpQuestions(symptoms);
    }
  }

  /**
   * Explain doctor recommendation
   */
  async explainDoctorRecommendation(
    specialty: string,
    analysis: SymptomAnalysis,
    context: ConversationContext
  ): Promise<string> {
    if (!this.isInitialized) {
      return this.getDefaultSpecialtyExplanation(specialty, analysis);
    }

    try {
      const promptTemplate = MedicalPromptEngine.generateDoctorRecommendationPrompt(
        specialty,
        analysis,
        context
      );
      
      const aiRequest: AIRequest = {
        prompt: promptTemplate.userPrompt,
        systemPrompt: promptTemplate.systemPrompt,
        maxTokens: 500,
        temperature: 0.6
      };

      const serviceResponse = await this.getAIResponse(aiRequest);
      const processedResponse = AIResponseProcessor.processResponse(serviceResponse, context);

      return processedResponse.response.message;

    } catch (error) {
      console.error('Error explaining doctor recommendation:', error);
      return this.getDefaultSpecialtyExplanation(specialty, analysis);
    }
  }

  /**
   * Get AI response with fallback support
   */
  private async getAIResponse(request: AIRequest): Promise<ServiceAIResponse> {
    const maxRetries = this.config?.maxRetries || 2;
    let lastError: Error | null = null;

    // Try primary service first
    if (this.primaryService?.isAvailable()) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await this.executeWithTimeout(
            () => this.primaryService!.generateResponse(request),
            this.config?.timeoutMs || 30000
          );
        } catch (error) {
          lastError = error as Error;
          console.warn(`Primary service attempt ${attempt + 1} failed:`, error);
          
          if (attempt < maxRetries - 1) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
          }
        }
      }
    }

    // Try fallback services if primary fails
    if (this.config?.enableFallback && this.fallbackServices.length > 0) {
      for (const fallbackService of this.fallbackServices) {
        if (fallbackService.isAvailable()) {
          try {
            console.log('Trying fallback service...');
            return await this.executeWithTimeout(
              () => fallbackService.generateResponse(request),
              this.config?.timeoutMs || 30000
            );
          } catch (error) {
            console.warn('Fallback service failed:', error);
            lastError = error as Error;
          }
        }
      }
    }

    throw lastError || new Error('All AI services failed');
  }

  /**
   * Generate prompt based on conversation stage
   */
  private generatePromptForStage(
    message: string,
    context: ConversationContext
  ): PromptTemplate {
    switch (context.conversationStage) {
      case 'initial':
      case 'gathering':
        return MedicalPromptEngine.generateSymptomGatheringPrompt(message, context);
      
      case 'analysis':
      case 'recommendation':
        if (context.metadata.symptomAnalysis) {
          return MedicalPromptEngine.generateAnalysisPrompt(
            message,
            context,
            context.metadata.symptomAnalysis
          );
        }
        return MedicalPromptEngine.generateSymptomGatheringPrompt(message, context);
      
      default:
        return MedicalPromptEngine.generateGeneralGuidancePrompt(message, context);
    }
  }

  /**
   * Format conversation history for AI context
   */
  private formatConversationHistory(context: ConversationContext): Array<{role: string; content: string}> {
    return context.messages.slice(-5).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Default follow-up questions fallback
   */
  private getDefaultFollowUpQuestions(symptoms: ParsedSymptom[]): string[] {
    const questions = [
      "How long have you been experiencing these symptoms?",
      "How would you rate the severity on a scale of 1-10?",
      "Is there anything that makes the symptoms better or worse?"
    ];

    // Add symptom-specific questions
    if (symptoms.some(s => s.symptom.includes('pain'))) {
      questions.unshift("Can you describe the type of pain you're experiencing?");
    }

    return questions.slice(0, 3);
  }

  /**
   * Default specialty explanation fallback
   */
  private getDefaultSpecialtyExplanation(specialty: string, analysis: SymptomAnalysis): string {
    const symptoms = analysis.symptoms.map(s => s.symptom).join(', ');
    return `Based on your symptoms (${symptoms}), I recommend seeing a ${specialty} specialist because they have specific expertise in treating conditions related to your symptoms. They will be able to provide a thorough evaluation and appropriate treatment recommendations.`;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    primary: any;
    fallbacks: any[];
    overall: 'healthy' | 'degraded' | 'unavailable';
  }> {
    const status = {
      primary: null as any,
      fallbacks: [] as any[],
      overall: 'unavailable' as 'healthy' | 'degraded' | 'unavailable'
    };

    // Check primary service
    if (this.primaryService) {
      try {
        status.primary = await this.primaryService.getHealthStatus();
      } catch (error) {
        status.primary = { status: 'unavailable', error: error.message };
      }
    }

    // Check fallback services
    for (const service of this.fallbackServices) {
      try {
        const fallbackStatus = await service.getHealthStatus();
        status.fallbacks.push(fallbackStatus);
      } catch (error) {
        status.fallbacks.push({ status: 'unavailable', error: error.message });
      }
    }

    // Determine overall status
    if (status.primary?.status === 'healthy') {
      status.overall = 'healthy';
    } else if (status.fallbacks.some(f => f.status === 'healthy')) {
      status.overall = 'degraded';
    } else {
      status.overall = 'unavailable';
    }

    return status;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.primaryService) {
      await this.primaryService.cleanup();
    }

    for (const service of this.fallbackServices) {
      await service.cleanup();
    }

    AIServiceFactory.clearCache();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const aiServiceManager = new AIServiceManager();