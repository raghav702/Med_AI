/**
 * Medical Prompt Engineering Module
 * 
 * Handles prompt generation and engineering for medical conversations
 * Provides context-aware prompts for different conversation stages
 */

import { ConversationContext, SymptomAnalysis, UrgencyLevel } from '../../types/conversation';
import { ParsedSymptom } from '../../types/medical';

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  context?: string;
}

export class MedicalPromptEngine {
  private static readonly BASE_SYSTEM_PROMPT = `You are a professional medical AI assistant designed to help users understand their symptoms and connect them with appropriate healthcare providers. 

IMPORTANT GUIDELINES:
- You are NOT a doctor and cannot provide medical diagnoses
- Always recommend consulting with healthcare professionals for medical concerns
- For emergency symptoms, immediately direct users to emergency services
- Be empathetic, professional, and clear in your communication
- Ask relevant follow-up questions to better understand symptoms
- Provide helpful information while staying within appropriate boundaries

Your role is to:
1. Gather symptom information through thoughtful questions
2. Assess urgency levels appropriately
3. Recommend appropriate medical specialties
4. Connect users with suitable healthcare providers
5. Provide general health guidance when appropriate`;

  /**
   * Generate prompts for initial symptom gathering
   */
  static generateSymptomGatheringPrompt(
    userMessage: string, 
    context: ConversationContext
  ): PromptTemplate {
    const conversationHistory = this.formatConversationHistory(context);
    const currentSymptoms = context.currentSymptoms.length > 0 
      ? `Current symptoms mentioned: ${context.currentSymptoms.join(', ')}`
      : 'No symptoms mentioned yet';

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

CURRENT TASK: Symptom Gathering
You are in the symptom gathering phase. Your goal is to:
- Understand the user's primary symptoms
- Ask clarifying questions about severity, duration, and context
- Identify any urgent or emergency symptoms
- Gather enough information to make appropriate specialty recommendations

${currentSymptoms}

Respond with empathy and ask 1-2 relevant follow-up questions to better understand their condition.`;

    const userPrompt = `User message: "${userMessage}"

${conversationHistory}

Please respond to the user's message, focusing on gathering more specific information about their symptoms. Ask relevant follow-up questions and show empathy for their situation.`;

    return {
      systemPrompt,
      userPrompt,
      context: this.buildContextString(context)
    };
  }

  /**
   * Generate prompts for symptom analysis and specialty recommendation
   */
  static generateAnalysisPrompt(
    userMessage: string,
    context: ConversationContext,
    analysis: SymptomAnalysis
  ): PromptTemplate {
    const symptomsText = analysis.symptoms.map(s => 
      `${s.symptom} (severity: ${s.severity}, duration: ${s.duration})`
    ).join(', ');

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

CURRENT TASK: Symptom Analysis & Specialty Recommendation
You have analyzed the user's symptoms and need to:
- Explain your assessment in clear, non-alarming terms
- Recommend appropriate medical specialties
- Explain why these specialties are recommended
- Assess urgency level appropriately

ANALYSIS RESULTS:
- Symptoms: ${symptomsText}
- Urgency Level: ${analysis.urgencyLevel}
- Recommended Specialties: ${analysis.recommendedSpecialties.join(', ')}
- Possible Conditions: ${analysis.possibleConditions.join(', ')}

Provide a clear, empathetic response that explains your recommendations without causing unnecessary alarm.`;

    const userPrompt = `User message: "${userMessage}"

Based on the symptom analysis, provide your assessment and specialty recommendations. Explain your reasoning clearly and ask if the user would like to see available doctors in the recommended specialty.`;

    return {
      systemPrompt,
      userPrompt,
      context: this.buildContextString(context)
    };
  }

  /**
   * Generate prompts for emergency situations
   */
  static generateEmergencyPrompt(
    userMessage: string,
    analysis: SymptomAnalysis
  ): PromptTemplate {
    const emergencyFlags = analysis.emergencyFlags.join(', ');

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

EMERGENCY SITUATION DETECTED
The user's symptoms indicate a potential medical emergency. You must:
- Clearly communicate the urgency of the situation
- Direct them to appropriate emergency services
- Provide immediate action steps
- Be direct and clear while remaining calm and supportive

EMERGENCY INDICATORS: ${emergencyFlags}

This is a medical emergency. Prioritize immediate safety and professional medical care.`;

    const userPrompt = `EMERGENCY SITUATION: The user has reported symptoms that may indicate a medical emergency.

Emergency flags detected: ${emergencyFlags}

Provide immediate guidance for emergency care. Be clear, direct, and supportive.`;

    return {
      systemPrompt,
      userPrompt
    };
  }

  /**
   * Generate prompts for follow-up questions
   */
  static generateFollowUpPrompt(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PromptTemplate {
    const symptomsText = symptoms.map(s => s.symptom).join(', ');

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

CURRENT TASK: Generate Follow-up Questions
Based on the symptoms mentioned (${symptomsText}), generate 2-3 relevant follow-up questions that will help:
- Better understand symptom severity and duration
- Identify potential triggers or patterns
- Assess impact on daily activities
- Gather information relevant to medical evaluation

Make questions specific, clear, and medically relevant.`;

    const userPrompt = `Generate appropriate follow-up questions for these symptoms: ${symptomsText}

Consider what additional information would be most helpful for:
1. Assessing urgency
2. Recommending appropriate medical specialties
3. Helping the user prepare for their medical appointment

Provide 2-3 specific, relevant questions.`;

    return {
      systemPrompt,
      userPrompt,
      context: this.buildContextString(context)
    };
  }

  /**
   * Generate prompts for doctor recommendation explanations
   */
  static generateDoctorRecommendationPrompt(
    specialty: string,
    analysis: SymptomAnalysis,
    context: ConversationContext
  ): PromptTemplate {
    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

CURRENT TASK: Explain Doctor Recommendation
The user is asking about why you recommended a ${specialty} specialist. Explain:
- Why this specialty is appropriate for their symptoms
- What they can expect during the appointment
- How this specialist can help with their specific condition
- Any preparation they should do for the visit

Be informative and reassuring while maintaining appropriate medical boundaries.`;

    const userPrompt = `Explain why a ${specialty} specialist is recommended for the user's symptoms: ${analysis.symptoms.map(s => s.symptom).join(', ')}

Provide a clear, helpful explanation that helps the user understand the recommendation and feel confident about seeking care.`;

    return {
      systemPrompt,
      userPrompt,
      context: this.buildContextString(context)
    };
  }

  /**
   * Generate prompts for general medical guidance
   */
  static generateGeneralGuidancePrompt(
    userMessage: string,
    context: ConversationContext
  ): PromptTemplate {
    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

CURRENT TASK: General Medical Guidance
The user is asking for general health information or guidance. Provide helpful, accurate information while:
- Staying within appropriate boundaries
- Encouraging professional medical consultation when needed
- Being supportive and informative
- Not providing specific medical advice or diagnoses`;

    const userPrompt = `User message: "${userMessage}"

Provide helpful, general health guidance while maintaining appropriate boundaries. Encourage professional medical consultation when appropriate.`;

    return {
      systemPrompt,
      userPrompt,
      context: this.buildContextString(context)
    };
  }

  /**
   * Format conversation history for context
   */
  private static formatConversationHistory(context: ConversationContext): string {
    if (context.messages.length === 0) {
      return 'This is the start of the conversation.';
    }

    const recentMessages = context.messages.slice(-5); // Last 5 messages for context
    return recentMessages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');
  }

  /**
   * Build context string with relevant information
   */
  private static buildContextString(context: ConversationContext): string {
    const contextParts = [
      `Conversation Stage: ${context.conversationStage}`,
      `Current Urgency Level: ${context.urgencyLevel}`,
      `Symptoms Mentioned: ${context.currentSymptoms.join(', ') || 'None yet'}`
    ];

    if (context.recommendedSpecialty) {
      contextParts.push(`Recommended Specialty: ${context.recommendedSpecialty}`);
    }

    if (context.userLocation?.city) {
      contextParts.push(`User Location: ${context.userLocation.city}, ${context.userLocation.state}`);
    }

    return contextParts.join('\n');
  }

  /**
   * Validate and sanitize prompts for safety
   */
  static validatePrompt(prompt: PromptTemplate): boolean {
    // Basic validation - can be expanded with more sophisticated checks
    const dangerousPatterns = [
      /provide medical diagnosis/i,
      /prescribe medication/i,
      /replace doctor/i,
      /medical treatment/i
    ];

    const fullPrompt = `${prompt.systemPrompt} ${prompt.userPrompt}`;
    return !dangerousPatterns.some(pattern => pattern.test(fullPrompt));
  }
}