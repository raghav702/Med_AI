/**
 * AI Response Processing Module
 * 
 * Handles parsing, formatting, and validation of AI responses
 * Ensures responses are appropriate for medical conversations
 */

import { AIResponse as ServiceAIResponse } from './aiServiceInterface';
import { AIResponse, UrgencyLevel } from '../../types/conversation';
import { SymptomAnalysis } from '../../types/medical';

export interface ProcessingOptions {
  maxLength?: number;
  sanitizeHtml?: boolean;
  validateMedicalContent?: boolean;
  extractStructuredData?: boolean;
}

export interface ProcessedResponse {
  response: AIResponse;
  confidence: number;
  warnings: string[];
  metadata: Record<string, any>;
}

export class AIResponseProcessor {
  private static readonly MAX_RESPONSE_LENGTH = 2000;
  private static readonly MEDICAL_DISCLAIMERS = [
    "I'm not a doctor and this is not medical advice.",
    "Please consult with a healthcare professional for proper medical evaluation.",
    "This information is for educational purposes only."
  ];

  /**
   * Process raw AI service response into application format
   */
  static processResponse(
    serviceResponse: ServiceAIResponse,
    context: any,
    options: ProcessingOptions = {}
  ): ProcessedResponse {
    const warnings: string[] = [];
    let confidence = 1.0;

    // Validate response content
    const validationResult = this.validateResponse(serviceResponse, options);
    warnings.push(...validationResult.warnings);
    confidence *= validationResult.confidence;

    // Format and sanitize content
    let processedContent = this.formatContent(serviceResponse.content, options);
    
    // Extract structured information
    const structuredData = options.extractStructuredData 
      ? this.extractStructuredData(processedContent)
      : {};

    // Determine response type and next action
    const responseType = this.determineResponseType(processedContent, context);
    const nextAction = this.determineNextAction(responseType, context);

    // Extract follow-up questions if present
    const followUpQuestions = this.extractFollowUpQuestions(processedContent);

    // Add medical disclaimers if needed
    if (this.needsMedicalDisclaimer(processedContent)) {
      processedContent = this.addMedicalDisclaimer(processedContent);
    }

    const response: AIResponse = {
      message: processedContent,
      responseType,
      nextAction,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined,
      urgencyLevel: structuredData.urgencyLevel,
      doctorRecommendations: structuredData.doctorRecommendations,
      metadata: {
        ...structuredData,
        originalLength: serviceResponse.content.length,
        processingTime: Date.now(),
        serviceMetadata: serviceResponse.metadata
      }
    };

    return {
      response,
      confidence,
      warnings,
      metadata: {
        usage: serviceResponse.usage,
        model: serviceResponse.model,
        finishReason: serviceResponse.finishReason,
        ...structuredData
      }
    };
  }

  /**
   * Validate AI response for medical appropriateness
   */
  private static validateResponse(
    response: ServiceAIResponse,
    options: ProcessingOptions
  ): { confidence: number; warnings: string[] } {
    const warnings: string[] = [];
    let confidence = 1.0;

    // Check response length
    if (response.content.length === 0) {
      warnings.push('Empty response received');
      confidence *= 0.1;
    }

    if (response.content.length > (options.maxLength || this.MAX_RESPONSE_LENGTH)) {
      warnings.push('Response exceeds maximum length');
      confidence *= 0.8;
    }

    // Check for inappropriate medical content
    if (options.validateMedicalContent) {
      const medicalValidation = this.validateMedicalContent(response.content);
      warnings.push(...medicalValidation.warnings);
      confidence *= medicalValidation.confidence;
    }

    // Check finish reason
    if (response.finishReason === 'length') {
      warnings.push('Response was truncated due to length limit');
      confidence *= 0.9;
    }

    return { confidence, warnings };
  }

  /**
   * Validate medical content for safety
   */
  private static validateMedicalContent(content: string): { confidence: number; warnings: string[] } {
    const warnings: string[] = [];
    let confidence = 1.0;

    const lowerContent = content.toLowerCase();

    // Check for inappropriate medical advice
    const inappropriatePatterns = [
      /you have|you are diagnosed with|you definitely have/i,
      /take this medication|prescribe|dosage/i,
      /don't need to see a doctor|skip the doctor/i,
      /this is definitely|this is certainly/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(content)) {
        warnings.push('Response contains inappropriate medical advice');
        confidence *= 0.3;
        break;
      }
    }

    // Check for emergency symptoms without proper escalation
    const emergencySymptoms = [
      'chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious',
      'stroke symptoms', 'severe headache', 'anaphylaxis'
    ];

    const hasEmergencySymptoms = emergencySymptoms.some(symptom => 
      lowerContent.includes(symptom)
    );

    if (hasEmergencySymptoms && !lowerContent.includes('emergency') && !lowerContent.includes('911')) {
      warnings.push('Emergency symptoms mentioned without proper escalation');
      confidence *= 0.5;
    }

    return { confidence, warnings };
  }

  /**
   * Format and clean response content
   */
  private static formatContent(content: string, options: ProcessingOptions): string {
    let formatted = content.trim();

    // Remove excessive whitespace
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.replace(/\s{2,}/g, ' ');

    // Sanitize HTML if requested
    if (options.sanitizeHtml) {
      formatted = this.sanitizeHtml(formatted);
    }

    // Ensure proper sentence structure
    formatted = this.ensureProperSentences(formatted);

    return formatted;
  }

  /**
   * Extract structured data from response
   */
  private static extractStructuredData(content: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract urgency level
    const urgencyMatch = content.match(/urgency[:\s]*(low|medium|high|emergency)/i);
    if (urgencyMatch) {
      data.urgencyLevel = urgencyMatch[1].toLowerCase() as UrgencyLevel;
    }

    // Extract specialty recommendations
    const specialtyMatch = content.match(/recommend[^.]*?(cardiology|neurology|orthopedics|gastroenterology|pulmonology|dermatology|general practice)/i);
    if (specialtyMatch) {
      data.recommendedSpecialty = specialtyMatch[1];
    }

    // Extract symptoms mentioned
    const symptomPatterns = [
      /symptoms?[^.]*?:(.*?)(?:\.|$)/i,
      /experiencing[^.]*?:(.*?)(?:\.|$)/i
    ];

    for (const pattern of symptomPatterns) {
      const match = content.match(pattern);
      if (match) {
        data.mentionedSymptoms = match[1].trim().split(',').map(s => s.trim());
        break;
      }
    }

    return data;
  }

  /**
   * Determine response type based on content
   */
  private static determineResponseType(content: string, context: any): AIResponse['responseType'] {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('emergency') || lowerContent.includes('911') || lowerContent.includes('immediate')) {
      return 'emergency';
    }

    if (lowerContent.includes('recommend') && lowerContent.includes('doctor')) {
      return 'recommendation';
    }

    if (lowerContent.includes('analysis') || lowerContent.includes('assessment')) {
      return 'analysis';
    }

    if (lowerContent.includes('?') || lowerContent.includes('tell me more')) {
      return 'question';
    }

    return 'question'; // Default
  }

  /**
   * Determine next action based on response type
   */
  private static determineNextAction(
    responseType: AIResponse['responseType'],
    context: any
  ): AIResponse['nextAction'] {
    switch (responseType) {
      case 'emergency':
        return 'emergency_redirect';
      case 'recommendation':
        return 'show_doctors';
      case 'doctors':
        return 'show_doctors';
      default:
        return 'continue_chat';
    }
  }

  /**
   * Extract follow-up questions from response
   */
  private static extractFollowUpQuestions(content: string): string[] {
    const questions: string[] = [];
    
    // Look for numbered questions
    const numberedQuestions = content.match(/\d+\.\s*([^?]+\?)/g);
    if (numberedQuestions) {
      questions.push(...numberedQuestions.map(q => q.replace(/^\d+\.\s*/, '')));
    }

    // Look for bullet point questions
    const bulletQuestions = content.match(/[•\-\*]\s*([^?]+\?)/g);
    if (bulletQuestions) {
      questions.push(...bulletQuestions.map(q => q.replace(/^[•\-\*]\s*/, '')));
    }

    // Look for standalone questions at the end
    const sentences = content.split(/[.!]/).map(s => s.trim());
    const questionSentences = sentences.filter(s => s.endsWith('?') && s.length > 10);
    
    if (questionSentences.length > 0 && questions.length === 0) {
      questions.push(...questionSentences.slice(-3)); // Last 3 questions
    }

    return questions.slice(0, 3); // Limit to 3 questions
  }

  /**
   * Check if response needs medical disclaimer
   */
  private static needsMedicalDisclaimer(content: string): boolean {
    const medicalKeywords = [
      'symptoms', 'condition', 'diagnosis', 'treatment', 'medication',
      'doctor', 'specialist', 'medical', 'health'
    ];

    const lowerContent = content.toLowerCase();
    const hasMedicalContent = medicalKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );

    const hasDisclaimer = this.MEDICAL_DISCLAIMERS.some(disclaimer =>
      lowerContent.includes(disclaimer.toLowerCase())
    );

    return hasMedicalContent && !hasDisclaimer;
  }

  /**
   * Add appropriate medical disclaimer
   */
  private static addMedicalDisclaimer(content: string): string {
    const disclaimer = "\n\n*Please note: I'm an AI assistant and this is not medical advice. Always consult with a healthcare professional for proper medical evaluation and treatment.*";
    return content + disclaimer;
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHtml(content: string): string {
    // Basic HTML sanitization - remove potentially dangerous tags
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Ensure proper sentence structure
   */
  private static ensureProperSentences(content: string): string {
    // Capitalize first letter of sentences
    return content.replace(/([.!?]\s*)([a-z])/g, (match, punctuation, letter) => {
      return punctuation + letter.toUpperCase();
    });
  }

  /**
   * Create fallback response for errors
   */
  static createFallbackResponse(error: any, context: any): ProcessedResponse {
    const fallbackMessage = "I apologize, but I'm experiencing some technical difficulties right now. " +
      "If you have urgent medical concerns, please contact your healthcare provider or emergency services directly. " +
      "Otherwise, please try again in a moment.";

    return {
      response: {
        message: fallbackMessage,
        responseType: 'question',
        nextAction: 'continue_chat',
        metadata: {
          isFallback: true,
          originalError: error.message
        }
      },
      confidence: 0.1,
      warnings: ['Fallback response due to processing error'],
      metadata: {
        error: error.message,
        timestamp: Date.now()
      }
    };
  }
}