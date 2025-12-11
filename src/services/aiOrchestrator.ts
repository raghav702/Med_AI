import { 
  ConversationContext, 
  AIResponse, 
  ChatMessage, 
  MessageRole, 
  MessageType, 
  UrgencyLevel,
  ConversationStage,
  SymptomAnalysis,
  ParsedSymptom
} from '../types/conversation';
import { symptomAnalysisAgent } from './agents/symptomAnalysisAgent';
import { doctorRecommendationAgent, DoctorRecommendationRequest } from './agents/doctorRecommendationAgent';
import { followUpQuestionGenerator } from './agents/followUpQuestionGenerator';
import { urgencyEscalationService, UrgencyEscalation } from './urgencyEscalationService';
import { aiServiceManager, AIServiceManager } from './ai/aiServiceManager';

/**
 * AI Orchestrator Service
 * 
 * Central coordination service for AI responses in the medical assistant.
 * Manages conversation flow, processes user messages, and coordinates
 * between different AI agents for symptom analysis and doctor recommendations.
 */
export class AIOrchestrator {
  private static instance: AIOrchestrator;
  
  private constructor() {}
  
  public static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  /**
   * Process user message and generate appropriate AI response
   */
  public async processUserMessage(
    message: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      // Update conversation stage based on current context
      const updatedContext = this.updateConversationStage(context, message);
      
      // Route message to appropriate handler based on conversation stage
      switch (updatedContext.conversationStage) {
        case 'initial':
          return this.handleInitialMessage(message, updatedContext);
        
        case 'gathering':
          return this.handleSymptomGathering(message, updatedContext);
        
        case 'analysis':
          return this.handleSymptomAnalysis(message, updatedContext);
        
        case 'recommendation':
          return this.handleSpecialtyRecommendation(message, updatedContext);
        
        case 'booking':
          return this.handleBookingFlow(message, updatedContext);
        
        default:
          return this.handleFallback(message, updatedContext);
      }
    } catch (error) {
      console.error('Error processing user message:', error);
      return this.generateErrorResponse();
    }
  }

  /**
   * Analyze symptoms and determine urgency level
   */
  public async analyzeSymptoms(symptoms: string[]): Promise<SymptomAnalysis> {
    // Use the symptom analysis agent for comprehensive analysis
    const combinedSymptoms = symptoms.join(' ');
    const analysis = symptomAnalysisAgent.analyzeSymptoms(combinedSymptoms);
    
    return analysis;
  }

  /**
   * Get doctor recommendations based on symptoms and context
   */
  public async getDoctorRecommendations(
    specialties: string[],
    urgencyLevel: UrgencyLevel,
    userLocation?: any,
    maxResults: number = 5
  ) {
    const request: DoctorRecommendationRequest = {
      specialties,
      urgencyLevel,
      userLocation,
      maxResults
    };
    
    return await doctorRecommendationAgent.recommendDoctors(request);
  }

  /**
   * Generate follow-up questions based on symptoms and conversation context
   */
  public generateFollowUpQuestions(symptoms: ParsedSymptom[], context?: ConversationContext): string[] {
    if (context) {
      // Use the advanced follow-up question generator with full context
      const prioritizedQuestions = followUpQuestionGenerator.generateQuestions(symptoms, context, 3);
      return prioritizedQuestions.map(q => q.question);
    }
    
    // Fallback to basic question generation if no context provided
    const questions: string[] = [];
    
    // Generate contextual questions based on symptom categories
    symptoms.forEach(symptom => {
      if (symptom.symptom.includes('pain') && (!symptom.severity || symptom.severity === 'unknown')) {
        questions.push("On a scale of 1-10, how would you rate the pain intensity?");
      }
      if (symptom.symptom.includes('pain') && (!symptom.duration || symptom.duration === 'unknown')) {
        questions.push("How long have you been experiencing this pain?");
      }
      if (symptom.symptom.includes('cough') || symptom.symptom.includes('breath')) {
        questions.push("Are you experiencing any difficulty breathing or shortness of breath?");
      }
      if (symptom.symptom.includes('nausea') || symptom.symptom.includes('stomach')) {
        questions.push("Have you noticed any changes in your appetite or eating habits?");
      }
    });

    // Add general follow-up questions if no specific ones generated
    if (questions.length === 0) {
      questions.push(
        "How long have you been experiencing these symptoms?",
        "Have the symptoms gotten worse, better, or stayed the same?",
        "Are there any activities that make the symptoms better or worse?"
      );
    }

    return questions.slice(0, 3); // Limit to 3 questions to avoid overwhelming
  }

  /**
   * Determine conversation stage based on context and message
   */
  private updateConversationStage(
    context: ConversationContext, 
    message: string
  ): ConversationContext {
    const messageCount = context.messages.length;
    
    // Initial greeting - first interaction
    if (messageCount === 0) {
      return { ...context, conversationStage: 'initial' };
    }
    
    // Check for emergency at any stage
    if (context.urgencyLevel === 'emergency') {
      return { ...context, conversationStage: 'booking' }; // Emergency goes straight to action
    }
    
    // Determine stage based on conversation progress
    const hasSymptoms = context.currentSymptoms.length > 0;
    const hasAnalysis = context.metadata.symptomAnalysis;
    const hasSpecialtyRecommendation = context.recommendedSpecialty || context.metadata.recommendedSpecialty;
    const hasDoctorRecommendations = context.metadata.recommendedDoctors || context.metadata.doctorRecommendations;
    
    // Stage progression logic
    if (!hasSymptoms || (hasSymptoms && !hasAnalysis && !this.hasEnoughSymptomInfo(context.metadata.partialAnalysis || {} as SymptomAnalysis, message))) {
      return { ...context, conversationStage: 'gathering' };
    }
    
    if (hasAnalysis && !hasSpecialtyRecommendation) {
      return { ...context, conversationStage: 'analysis' };
    }
    
    if (hasSpecialtyRecommendation && !hasDoctorRecommendations) {
      return { ...context, conversationStage: 'recommendation' };
    }
    
    if (hasDoctorRecommendations) {
      return { ...context, conversationStage: 'booking' };
    }
    
    // Default to gathering if unclear
    return { ...context, conversationStage: 'gathering' };
  }

  /**
   * Handle initial user message and greeting
   */
  private async handleInitialMessage(
    message: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    // Try to use AI service for more natural responses
    try {
      const aiResponse = await aiServiceManager.processUserMessage(message, context);
      if (aiResponse && aiResponse.message) {
        return aiResponse;
      }
    } catch (error) {
      console.warn('AI service unavailable for initial message, using fallback');
    }

    // Fallback to rule-based responses
    // If message is empty or just a greeting, provide standard greeting
    if (!message || message.trim().length === 0 || this.isGreeting(message)) {
      return {
        message: "Hello! I'm your AI Medical Assistant. I'm here to help you understand your symptoms and connect you with the right healthcare provider.\n\nTo get started, please describe any symptoms or health concerns you're experiencing. The more details you can provide, the better I can assist you.",
        responseType: 'question',
        nextAction: 'continue_chat',
        followUpQuestions: [
          "What symptoms are you experiencing?",
          "How long have you had these symptoms?",
          "How severe are your symptoms?"
        ]
      };
    }

    // Check if message contains symptoms
    const detectedSymptoms = this.extractSymptomsFromMessage(message);
    
    if (detectedSymptoms.length > 0) {
      // User provided symptoms in first message - analyze immediately
      const analysis = await this.analyzeSymptoms(detectedSymptoms);
      
      // Check for emergency first
      if (analysis.urgencyLevel === 'emergency') {
        return this.generateEmergencyResponse(analysis);
      }
      
      // Generate contextual response based on symptoms
      const symptomList = detectedSymptoms.join(', ');
      return {
        message: `Thank you for sharing that you're experiencing ${symptomList}. I want to gather a bit more information to better understand your situation and provide the most appropriate guidance.`,
        responseType: 'question',
        followUpQuestions: analysis.followUpQuestions.slice(0, 3),
        urgencyLevel: analysis.urgencyLevel,
        nextAction: 'continue_chat',
        metadata: {
          symptoms: detectedSymptoms,
          symptomAnalysis: analysis
        }
      };
    }
    
    // Handle non-symptom initial messages
    if (this.isHealthConcern(message)) {
      return {
        message: "I understand you have health concerns. To help you effectively, I'll need to know more about any specific symptoms you're experiencing. Could you describe what you're feeling or what's bothering you?",
        responseType: 'question',
        nextAction: 'continue_chat',
        followUpQuestions: [
          "What specific symptoms are you experiencing?",
          "When did you first notice these concerns?",
          "Is this something new or ongoing?"
        ]
      };
    }
    
    // Standard greeting for other messages
    return {
      message: "Hello! I'm your AI Medical Assistant. I'm here to help you understand your symptoms and connect you with the right healthcare provider.\n\nTo get started, please describe any symptoms or health concerns you're experiencing.",
      responseType: 'question',
      nextAction: 'continue_chat'
    };
  }

  /**
   * Handle symptom gathering phase
   */
  private async handleSymptomGathering(
    message: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    // Try to use AI service for more natural symptom gathering
    try {
      const aiResponse = await aiServiceManager.processUserMessage(message, context);
      if (aiResponse && aiResponse.message) {
        return aiResponse;
      }
    } catch (error) {
      console.warn('AI service unavailable for symptom gathering, using fallback');
    }

    // Fallback to rule-based symptom gathering
    const newSymptoms = this.extractSymptomsFromMessage(message);
    const allSymptoms = [...context.currentSymptoms, ...newSymptoms];
    
    // Update symptoms list
    const updatedSymptoms = [...new Set(allSymptoms)]; // Remove duplicates
    
    // Analyze current symptoms
    const analysis = await this.analyzeSymptoms(updatedSymptoms);
    
    // Check for emergency first
    if (analysis.urgencyLevel === 'emergency') {
      return this.generateEmergencyResponse(analysis);
    }
    
    // Determine if we have enough information to proceed
    const hasEnoughInfo = this.hasEnoughSymptomInfo(analysis, message);
    
    if (hasEnoughInfo) {
      // Move to analysis stage
      const primarySpecialty = analysis.recommendedSpecialties[0] || 'General Practice';
      
      return {
        message: `Thank you for providing that information. Based on your symptoms, I'm analyzing your condition.\n\nFrom what you've described, it appears you may benefit from seeing a ${primarySpecialty} specialist. Your symptoms suggest a ${analysis.urgencyLevel} priority level.\n\nWould you like me to find available doctors in this specialty for you?`,
        responseType: 'analysis',
        urgencyLevel: analysis.urgencyLevel,
        nextAction: 'show_doctors',
        followUpQuestions: [
          "Yes, please find doctors for me",
          "Tell me more about why you recommend this specialty",
          "What should I expect during the appointment?"
        ],
        metadata: {
          symptomAnalysis: analysis,
          recommendedSpecialty: primarySpecialty
        }
      };
    }
    
    // Need more specific information - ask targeted questions
    const targetedQuestions = this.generateTargetedQuestions(analysis, context);
    
    return {
      message: `I understand you're experiencing ${updatedSymptoms.slice(0, 2).join(' and ')}${updatedSymptoms.length > 2 ? ' among other symptoms' : ''}. To provide you with the best guidance, I'd like to ask a few more specific questions.`,
      responseType: 'question',
      followUpQuestions: targetedQuestions,
      urgencyLevel: analysis.urgencyLevel,
      nextAction: 'continue_chat',
      metadata: {
        partialAnalysis: analysis,
        symptoms: updatedSymptoms
      }
    };
  }

  /**
   * Handle symptom analysis phase
   */
  private async handleSymptomAnalysis(
    message: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    const analysis = context.metadata.symptomAnalysis;
    
    if (!analysis) {
      // Perform analysis if not already done
      const newAnalysis = await this.analyzeSymptoms(context.currentSymptoms);
      
      if (newAnalysis.urgencyLevel === 'emergency') {
        return this.generateEmergencyResponse(newAnalysis);
      }
      
      return this.generateSpecialtyRecommendation(newAnalysis);
    }
    
    // User is responding to analysis - check their response
    if (this.isAffirmativeResponse(message)) {
      // User wants to see doctors
      return this.proceedToDoctorRecommendations(analysis, context);
    } else if (this.isQuestionAboutSpecialty(message)) {
      // User wants more information about the specialty
      return this.explainSpecialtyRecommendation(analysis);
    } else if (this.isQuestionAboutSymptoms(message)) {
      // User has more symptom information
      const additionalSymptoms = this.extractSymptomsFromMessage(message);
      if (additionalSymptoms.length > 0) {
        const updatedSymptoms = [...context.currentSymptoms, ...additionalSymptoms];
        const updatedAnalysis = await this.analyzeSymptoms(updatedSymptoms);
        
        if (updatedAnalysis.urgencyLevel === 'emergency') {
          return this.generateEmergencyResponse(updatedAnalysis);
        }
        
        return this.generateSpecialtyRecommendation(updatedAnalysis, true);
      }
    }
    
    // Default response for analysis stage
    return this.generateSpecialtyRecommendation(analysis);
  }

  /**
   * Handle specialty recommendation phase
   */
  private async handleSpecialtyRecommendation(
    message: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    const analysis = context.metadata.symptomAnalysis;
    
    if (!analysis) {
      return this.handleFallback(message, context);
    }
    
    // User agreed to see doctors
    if (this.isAffirmativeResponse(message)) {
      return this.proceedToDoctorRecommendations(analysis, context);
    }
    
    // User wants more information about the specialty
    if (this.isQuestionAboutSpecialty(message)) {
      return this.explainSpecialtyRecommendation(analysis);
    }
    
    // User wants to modify or add symptoms
    if (this.isSymptomModification(message)) {
      const additionalSymptoms = this.extractSymptomsFromMessage(message);
      if (additionalSymptoms.length > 0) {
        const updatedSymptoms = [...context.currentSymptoms, ...additionalSymptoms];
        const updatedAnalysis = await this.analyzeSymptoms(updatedSymptoms);
        
        if (updatedAnalysis.urgencyLevel === 'emergency') {
          return this.generateEmergencyResponse(updatedAnalysis);
        }
        
        return this.generateSpecialtyRecommendation(updatedAnalysis, true);
      }
    }
    
    // User seems hesitant or confused
    if (this.isHesitantResponse(message)) {
      return {
        message: `I understand you might have concerns. Let me explain why I'm recommending a ${analysis.recommendedSpecialties[0]} specialist:\n\n${this.getSpecialtyExplanation(analysis)}\n\nWould you like me to find doctors for you, or do you have other questions about your symptoms?`,
        responseType: 'recommendation',
        followUpQuestions: [
          "Yes, find doctors for me",
          "Tell me more about this specialty",
          "I have more symptoms to mention"
        ],
        urgencyLevel: analysis.urgencyLevel,
        nextAction: 'continue_chat'
      };
    }
    
    // Default response - encourage decision
    return {
      message: `Based on your symptoms, I recommend seeing a ${analysis.recommendedSpecialties[0]} specialist. This is a ${analysis.urgencyLevel} priority situation.\n\nWould you like me to find available doctors for you?`,
      responseType: 'recommendation',
      followUpQuestions: [
        "Yes, show me doctors",
        "Tell me why this specialty",
        "What should I expect?"
      ],
      urgencyLevel: analysis.urgencyLevel,
      nextAction: 'show_doctors'
    };
  }

  /**
   * Handle booking flow phase
   */
  private async handleBookingFlow(
    message: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    // Handle emergency case
    if (context.urgencyLevel === 'emergency') {
      return {
        message: "⚠️ URGENT: Based on your symptoms, this requires immediate medical attention. Please call emergency services (911) or go to the nearest emergency room immediately. Do not delay seeking medical care.",
        responseType: 'emergency',
        urgencyLevel: 'emergency',
        nextAction: 'emergency_redirect',
        metadata: {
          emergencyContacts: ['911', 'Emergency Room'],
          immediateAction: 'Seek emergency medical care'
        }
      };
    }
    
    // Check if user is asking about booking process
    if (this.isBookingQuestion(message)) {
      return this.provideBookingGuidance(context);
    }
    
    // Check if user wants different doctors
    if (this.isRequestForDifferentDoctors(message)) {
      return this.offerAlternativeDoctors(context);
    }
    
    // Check if user has questions about their condition
    if (this.isConditionQuestion(message)) {
      return this.provideConditionGuidance(context);
    }
    
    // Check if user wants to start over
    if (this.isStartOverRequest(message)) {
      return {
        message: "Of course! I'm here to help. What new symptoms or health concerns would you like to discuss?",
        responseType: 'question',
        nextAction: 'continue_chat',
        metadata: {
          resetConversation: true
        }
      };
    }
    
    // Default booking stage response
    const urgencyGuidance = this.getBookingUrgencyGuidance(context.urgencyLevel);
    
    return {
      message: `Great! I've found some excellent doctors who can help with your condition. ${urgencyGuidance}\n\nTo book an appointment, simply click on any doctor card above. Is there anything else I can help you with?`,
      responseType: 'recommendation',
      followUpQuestions: [
        "How do I book an appointment?",
        "Can you find different doctors?",
        "What should I prepare for my visit?"
      ],
      nextAction: 'continue_chat'
    };
  }

  /**
   * Handle fallback cases
   */
  private handleFallback(
    message: string, 
    context: ConversationContext
  ): AIResponse {
    return {
      message: "I'm here to help you with your health concerns and find the right medical care. Could you please describe any symptoms you're experiencing?",
      responseType: 'question',
      nextAction: 'continue_chat'
    };
  }

  /**
   * Generate emergency response with escalation protocols
   */
  private generateEmergencyResponse(analysis: SymptomAnalysis): AIResponse {
    const escalation = urgencyEscalationService.assessUrgency(analysis);
    const emergencyContacts = urgencyEscalationService.getEmergencyContacts(analysis);
    const immediateCare = urgencyEscalationService.getImmediateCareRecommendations(analysis);
    const timeGuidance = urgencyEscalationService.getTimeGuidance(analysis.urgencyLevel);
    
    // Create comprehensive emergency message
    let message = "🚨 MEDICAL EMERGENCY DETECTED\n\n";
    
    if (analysis.emergencyFlags.length > 0) {
      message += `Emergency indicators: ${analysis.emergencyFlags.join(', ')}\n\n`;
    }
    
    message += `${timeGuidance}\n\n`;
    message += "IMMEDIATE ACTIONS:\n";
    message += escalation.immediateActions.slice(0, 3).map(action => `• ${action}`).join('\n');
    
    if (escalation.firstAidInstructions && escalation.firstAidInstructions.length > 0) {
      message += "\n\nWHILE WAITING FOR HELP:\n";
      message += escalation.firstAidInstructions.slice(0, 3).map(instruction => `• ${instruction}`).join('\n');
    }
    
    message += "\n\n⚠️ DO NOT DELAY - This is a medical emergency requiring immediate professional care.";

    return {
      message,
      responseType: 'emergency',
      urgencyLevel: 'emergency',
      nextAction: 'emergency_redirect',
      metadata: {
        emergencyFlags: analysis.emergencyFlags,
        escalation,
        emergencyContacts,
        immediateCareRecommendations: immediateCare,
        symptomAnalysis: analysis,
        isImmediateDanger: urgencyEscalationService.isImmediateDanger(analysis)
      }
    };
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(): AIResponse {
    return {
      message: "I apologize, but I'm experiencing some technical difficulties. Please try again, or if you have urgent medical concerns, please contact your healthcare provider or emergency services directly.",
      responseType: 'question',
      nextAction: 'continue_chat'
    };
  }

  // Helper methods for symptom processing

  private extractSymptomsFromMessage(message: string): string[] {
    const symptoms: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Common symptom keywords
    const symptomKeywords = [
      'pain', 'ache', 'hurt', 'sore', 'headache', 'fever', 'cough', 'nausea',
      'vomiting', 'dizziness', 'fatigue', 'tired', 'weakness', 'shortness of breath',
      'chest pain', 'stomach pain', 'back pain', 'joint pain', 'swelling',
      'rash', 'itching', 'burning', 'numbness', 'tingling'
    ];
    
    symptomKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        symptoms.push(keyword);
      }
    });
    
    return symptoms;
  }

  private categorizeSymptom(symptom: string): string {
    const lowerSymptom = symptom.toLowerCase();
    
    if (lowerSymptom.includes('pain') || lowerSymptom.includes('ache') || lowerSymptom.includes('hurt')) {
      return 'pain';
    }
    if (lowerSymptom.includes('cough') || lowerSymptom.includes('breath') || lowerSymptom.includes('chest')) {
      return 'respiratory';
    }
    if (lowerSymptom.includes('nausea') || lowerSymptom.includes('vomit') || lowerSymptom.includes('stomach')) {
      return 'digestive';
    }
    if (lowerSymptom.includes('fever') || lowerSymptom.includes('temperature')) {
      return 'systemic';
    }
    if (lowerSymptom.includes('rash') || lowerSymptom.includes('itch') || lowerSymptom.includes('skin')) {
      return 'dermatological';
    }
    
    return 'general';
  }

  private calculateUrgencyScore(symptoms: ParsedSymptom[]): number {
    let score = 0;
    
    symptoms.forEach(symptom => {
      const text = symptom.text.toLowerCase();
      
      // High urgency symptoms
      if (text.includes('chest pain') || text.includes('difficulty breathing') || 
          text.includes('severe pain') || text.includes('blood')) {
        score += 8;
      }
      // Medium urgency symptoms
      else if (text.includes('fever') || text.includes('vomiting') || 
               text.includes('severe headache')) {
        score += 5;
      }
      // Low urgency symptoms
      else {
        score += 2;
      }
    });
    
    return Math.min(score, 10); // Cap at 10
  }

  private determineUrgencyLevel(score: number): UrgencyLevel {
    if (score >= 8) return 'emergency';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private detectEmergencySymptoms(symptoms: ParsedSymptom[]): string[] {
    const emergencyFlags: string[] = [];
    
    symptoms.forEach(symptom => {
      const text = symptom.text.toLowerCase();
      
      if (text.includes('chest pain')) {
        emergencyFlags.push('Chest pain - possible cardiac event');
      }
      if (text.includes('difficulty breathing') || text.includes('shortness of breath')) {
        emergencyFlags.push('Breathing difficulties');
      }
      if (text.includes('severe headache')) {
        emergencyFlags.push('Severe headache - possible neurological issue');
      }
      if (text.includes('blood') && (text.includes('vomit') || text.includes('cough'))) {
        emergencyFlags.push('Blood in vomit/cough');
      }
    });
    
    return emergencyFlags;
  }

  private identifyPossibleConditions(symptoms: ParsedSymptom[]): string[] {
    // Basic condition mapping - will be enhanced with medical knowledge base
    const conditions: string[] = [];
    
    const symptomTexts = symptoms.map(s => s.text.toLowerCase()).join(' ');
    
    if (symptomTexts.includes('fever') && symptomTexts.includes('cough')) {
      conditions.push('Upper respiratory infection', 'Flu', 'COVID-19');
    }
    if (symptomTexts.includes('chest pain')) {
      conditions.push('Cardiac evaluation needed', 'Chest wall pain', 'Respiratory issue');
    }
    if (symptomTexts.includes('headache') && symptomTexts.includes('fever')) {
      conditions.push('Viral infection', 'Sinusitis', 'Migraine');
    }
    
    return conditions.slice(0, 3); // Limit to top 3
  }

  private recommendSpecialties(symptoms: ParsedSymptom[]): string[] {
    const specialties: string[] = [];
    
    symptoms.forEach(symptom => {
      const category = symptom.category;
      
      switch (category) {
        case 'respiratory':
          if (!specialties.includes('Pulmonology')) specialties.push('Pulmonology');
          break;
        case 'digestive':
          if (!specialties.includes('Gastroenterology')) specialties.push('Gastroenterology');
          break;
        case 'dermatological':
          if (!specialties.includes('Dermatology')) specialties.push('Dermatology');
          break;
        case 'pain':
          if (symptom.text.includes('joint')) {
            if (!specialties.includes('Rheumatology')) specialties.push('Rheumatology');
          } else if (symptom.text.includes('back')) {
            if (!specialties.includes('Orthopedics')) specialties.push('Orthopedics');
          }
          break;
      }
    });
    
    // Default to General Practice if no specific specialty identified
    if (specialties.length === 0) {
      specialties.push('General Practice');
    }
    
    return specialties;
  }

  private isCompleteSymptomDescription(message: string): boolean {
    // Check if message contains duration, severity, or detailed description
    const indicators = ['for', 'since', 'days', 'weeks', 'severe', 'mild', 'getting worse', 'started'];
    return indicators.some(indicator => message.toLowerCase().includes(indicator));
  }

  private isAffirmativeResponse(message: string): boolean {
    const affirmative = ['yes', 'yeah', 'sure', 'ok', 'okay', 'please', 'find', 'show'];
    return affirmative.some(word => message.toLowerCase().includes(word));
  }

  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const lowerMessage = message.toLowerCase().trim();
    return greetings.some(greeting => lowerMessage === greeting || lowerMessage.startsWith(greeting));
  }

  private isHealthConcern(message: string): boolean {
    const healthKeywords = ['worried', 'concerned', 'health', 'feeling', 'sick', 'unwell', 'problem'];
    const lowerMessage = message.toLowerCase();
    return healthKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private hasEnoughSymptomInfo(analysis: SymptomAnalysis, message: string): boolean {
    // Check if we have sufficient information to make a recommendation
    const hasMultipleSymptoms = analysis.symptoms.length >= 2;
    const hasDetailedDescription = this.isCompleteSymptomDescription(message);
    const hasHighUrgency = analysis.urgencyLevel === 'high' || analysis.urgencyLevel === 'emergency';
    const hasSpecificSymptoms = analysis.symptoms.some(s => s.urgencyScore >= 5);
    
    return hasMultipleSymptoms || hasDetailedDescription || hasHighUrgency || hasSpecificSymptoms;
  }

  private generateTargetedQuestions(analysis: SymptomAnalysis, context: ConversationContext): string[] {
    // Use the advanced follow-up question generator for targeted questions
    const prioritizedQuestions = followUpQuestionGenerator.generateQuestions(analysis.symptoms, context, 3);
    
    if (prioritizedQuestions.length > 0) {
      return prioritizedQuestions.map(q => q.question);
    }
    
    // Fallback to basic questions if generator returns no results
    const questions: string[] = [];
    
    // Ask about duration if not specified
    const hasDuration = analysis.symptoms.some(s => s.duration && s.duration !== 'unknown');
    if (!hasDuration) {
      questions.push("How long have you been experiencing these symptoms?");
    }
    
    // Ask about severity if not specified
    const hasSeverity = analysis.symptoms.some(s => s.severity && s.severity !== 'unknown');
    if (!hasSeverity) {
      questions.push("How would you rate the severity of your symptoms on a scale of 1-10?");
    }
    
    // Ask about progression
    questions.push("Are your symptoms getting better, worse, or staying the same?");
    
    // Ask about triggers or patterns
    if (analysis.symptoms.length > 0) {
      questions.push("Is there anything that makes your symptoms better or worse?");
    }
    
    return questions.slice(0, 3);
  }

  private generateSpecialtyRecommendation(analysis: SymptomAnalysis, isUpdate: boolean = false): AIResponse {
    const primarySpecialty = analysis.recommendedSpecialties[0] || 'General Practice';
    const urgencyText = this.getUrgencyDescription(analysis.urgencyLevel);
    
    const message = isUpdate 
      ? `Thank you for the additional information. Based on all your symptoms, I ${analysis.recommendedSpecialties.length > 1 ? 'still' : 'now'} recommend seeing a ${primarySpecialty} specialist. ${urgencyText}`
      : `Based on your symptoms, I recommend consulting with a ${primarySpecialty} specialist. ${urgencyText}`;
    
    return {
      message: `${message}\n\nWould you like me to find available doctors in this specialty for you?`,
      responseType: 'recommendation',
      urgencyLevel: analysis.urgencyLevel,
      nextAction: 'show_doctors',
      followUpQuestions: [
        "Yes, find doctors for me",
        "Why this specialty?",
        "What should I expect?"
      ],
      metadata: {
        symptomAnalysis: analysis,
        recommendedSpecialty: primarySpecialty
      }
    };
  }

  private async proceedToDoctorRecommendations(analysis: SymptomAnalysis, context: ConversationContext): Promise<AIResponse> {
    try {
      const request: DoctorRecommendationRequest = {
        specialties: analysis.recommendedSpecialties,
        urgencyLevel: analysis.urgencyLevel,
        userLocation: context.userLocation,
        maxResults: 5
      };
      
      const recommendations = await doctorRecommendationAgent.recommendDoctors(request);
      
      if (recommendations.doctors.length === 0) {
        return {
          message: "I'm having trouble finding doctors in your specific specialty right now. Let me show you some general practitioners who can help assess your symptoms and refer you to the right specialist if needed.",
          responseType: 'doctors',
          urgencyLevel: analysis.urgencyLevel,
          nextAction: 'show_doctors'
        };
      }
      
      const specialtyName = recommendations.recommendations?.primarySpecialty || analysis.recommendedSpecialties[0];
      const urgencyMessage = analysis.urgencyLevel === 'high' || analysis.urgencyLevel === 'emergency' 
        ? " Given the urgency of your symptoms, I recommend booking an appointment as soon as possible."
        : "";
      
      return {
        message: `Perfect! I found ${recommendations.doctors.length} excellent ${specialtyName} specialists for you. These doctors are highly rated and available in your area.${urgencyMessage}\n\nYou can click on any doctor card below to book an appointment.`,
        responseType: 'doctors',
        doctorRecommendations: recommendations.doctors,
        urgencyLevel: analysis.urgencyLevel,
        nextAction: 'show_doctors',
        metadata: {
          doctorRecommendations: recommendations,
          recommendedSpecialty: specialtyName
        }
      };
    } catch (error) {
      console.error('Error getting doctor recommendations:', error);
      return {
        message: "I'm experiencing some technical difficulties finding doctors right now. You can browse all available doctors in the main directory, or try again in a moment. If your symptoms are urgent, please consider contacting your healthcare provider directly.",
        responseType: 'recommendation',
        urgencyLevel: analysis.urgencyLevel,
        nextAction: 'continue_chat'
      };
    }
  }

  private explainSpecialtyRecommendation(analysis: SymptomAnalysis): AIResponse {
    const primarySpecialty = analysis.recommendedSpecialties[0] || 'General Practice';
    const explanation = this.getSpecialtyExplanation(analysis);
    
    return {
      message: `I'm recommending a ${primarySpecialty} specialist because:\n\n${explanation}\n\nWould you like me to find available doctors in this specialty?`,
      responseType: 'recommendation',
      followUpQuestions: [
        "Yes, find doctors",
        "Are there other options?",
        "What will they do?"
      ],
      urgencyLevel: analysis.urgencyLevel,
      nextAction: 'show_doctors'
    };
  }

  private getSpecialtyExplanation(analysis: SymptomAnalysis): string {
    const primarySpecialty = analysis.recommendedSpecialties[0];
    const symptoms = analysis.symptoms.map(s => s.symptom).join(', ');
    
    const explanations: Record<string, string> = {
      'cardiology': `Your symptoms (${symptoms}) may be related to heart or cardiovascular issues. Cardiologists specialize in diagnosing and treating heart conditions.`,
      'pulmonology': `Your respiratory symptoms (${symptoms}) suggest you may benefit from seeing a lung specialist who can evaluate breathing and lung function.`,
      'gastroenterology': `Your digestive symptoms (${symptoms}) indicate you should see a specialist who focuses on stomach, intestinal, and digestive system disorders.`,
      'neurology': `Your neurological symptoms (${symptoms}) suggest you may need evaluation by a specialist who focuses on the nervous system and brain function.`,
      'orthopedics': `Your musculoskeletal symptoms (${symptoms}) indicate you may benefit from seeing a specialist who treats bone, joint, and muscle conditions.`,
      'general': `Your symptoms (${symptoms}) can be effectively evaluated by a general practitioner who can provide comprehensive care and refer to specialists if needed.`
    };
    
    return explanations[primarySpecialty?.toLowerCase()] || 
           `Your symptoms (${symptoms}) are best evaluated by a ${primarySpecialty} specialist who has specific expertise in this area.`;
  }

  private getUrgencyDescription(urgencyLevel: UrgencyLevel): string {
    switch (urgencyLevel) {
      case 'emergency':
        return 'This appears to be an emergency situation requiring immediate medical attention.';
      case 'high':
        return 'Your symptoms suggest this is a high priority situation that should be addressed promptly.';
      case 'medium':
        return 'Your symptoms indicate this should be addressed within a reasonable timeframe.';
      case 'low':
        return 'While not urgent, it\'s good to have these symptoms evaluated.';
      default:
        return 'I recommend having these symptoms evaluated by a healthcare professional.';
    }
  }

  private isQuestionAboutSpecialty(message: string): boolean {
    const specialtyQuestions = ['why', 'what does', 'what is', 'tell me about', 'explain', 'specialty'];
    const lowerMessage = message.toLowerCase();
    return specialtyQuestions.some(phrase => lowerMessage.includes(phrase));
  }

  private isQuestionAboutSymptoms(message: string): boolean {
    const symptomKeywords = ['also', 'additionally', 'another', 'more', 'forgot to mention', 'plus'];
    const lowerMessage = message.toLowerCase();
    return symptomKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isSymptomModification(message: string): boolean {
    const modificationKeywords = ['also have', 'forgot', 'another', 'plus', 'additionally', 'more symptoms'];
    const lowerMessage = message.toLowerCase();
    return modificationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isHesitantResponse(message: string): boolean {
    const hesitantKeywords = ['not sure', 'maybe', 'i don\'t know', 'unsure', 'confused', 'worried'];
    const lowerMessage = message.toLowerCase();
    return hesitantKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isBookingQuestion(message: string): boolean {
    const bookingKeywords = ['how to book', 'how do i book', 'appointment', 'schedule', 'booking process'];
    const lowerMessage = message.toLowerCase();
    return bookingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isRequestForDifferentDoctors(message: string): boolean {
    const alternativeKeywords = ['different doctors', 'other doctors', 'more options', 'other choices', 'alternatives'];
    const lowerMessage = message.toLowerCase();
    return alternativeKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isConditionQuestion(message: string): boolean {
    const conditionKeywords = ['what should i expect', 'what will happen', 'prepare for visit', 'what to bring'];
    const lowerMessage = message.toLowerCase();
    return conditionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isStartOverRequest(message: string): boolean {
    const startOverKeywords = ['start over', 'new symptoms', 'different problem', 'something else'];
    const lowerMessage = message.toLowerCase();
    return startOverKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private provideBookingGuidance(context: ConversationContext): AIResponse {
    const urgencyGuidance = context.urgencyLevel === 'high' 
      ? " Try to book the earliest available appointment given the urgency of your symptoms."
      : "";
    
    return {
      message: `To book an appointment:\n\n1. Click on any doctor card above that interests you\n2. You'll be taken to their booking page\n3. Select an available time slot\n4. Fill in your contact information\n5. Confirm your appointment\n\n${urgencyGuidance}\n\nThe booking system will also include a summary of your symptoms to help the doctor prepare for your visit.`,
      responseType: 'recommendation',
      nextAction: 'continue_chat'
    };
  }

  private async offerAlternativeDoctors(context: ConversationContext): Promise<AIResponse> {
    const analysis = context.metadata.symptomAnalysis;
    if (!analysis) {
      return {
        message: "I'd be happy to find different doctors for you. Could you let me know what specific preferences you have? For example, different location, specialty, or availability?",
        responseType: 'question',
        nextAction: 'continue_chat'
      };
    }

    // Try to get more doctors with different criteria
    try {
      const request: DoctorRecommendationRequest = {
        specialties: analysis.recommendedSpecialties,
        urgencyLevel: analysis.urgencyLevel,
        userLocation: context.userLocation,
        maxResults: 8 // Get more results
      };
      
      const recommendations = await doctorRecommendationAgent.recommendDoctors(request);
      
      return {
        message: `Here are some additional doctor options for you. I've included a wider range of specialists who can help with your condition:`,
        responseType: 'doctors',
        doctorRecommendations: recommendations.doctors.slice(3), // Show different doctors
        urgencyLevel: analysis.urgencyLevel,
        nextAction: 'show_doctors'
      };
    } catch (error) {
      return {
        message: "I'm having trouble finding additional doctors right now. You can also browse the full doctor directory to see all available options, or let me know if you have specific preferences for location or specialty.",
        responseType: 'recommendation',
        nextAction: 'continue_chat'
      };
    }
  }

  private provideConditionGuidance(context: ConversationContext): AIResponse {
    const analysis = context.metadata.symptomAnalysis;
    const specialty = context.recommendedSpecialty || context.metadata.recommendedSpecialty;
    
    if (!analysis || !specialty) {
      return {
        message: "For your appointment, I recommend:\n\n• Bring a list of your current medications\n• Write down your symptoms and when they started\n• Prepare any questions you want to ask\n• Bring your insurance information\n\nThe doctor will likely ask about your medical history and perform a physical examination.",
        responseType: 'recommendation',
        nextAction: 'continue_chat'
      };
    }

    const symptoms = analysis.symptoms.map(s => s.symptom).join(', ');
    
    return {
      message: `For your ${specialty} appointment regarding ${symptoms}:\n\n**What to expect:**\n• Discussion of your symptoms and medical history\n• Physical examination related to your condition\n• Possible diagnostic tests if needed\n• Treatment recommendations\n\n**What to bring:**\n• List of current medications and supplements\n• Previous medical records if relevant\n• Insurance information\n• List of questions you want to ask\n\n**Prepare to discuss:**\n• When symptoms started and how they've changed\n• What makes symptoms better or worse\n• Any treatments you've already tried`,
      responseType: 'recommendation',
      nextAction: 'continue_chat'
    };
  }

  private getBookingUrgencyGuidance(urgencyLevel: UrgencyLevel): string {
    switch (urgencyLevel) {
      case 'high':
        return "Given the urgency of your symptoms, I recommend booking an appointment as soon as possible, ideally within the next day or two.";
      case 'medium':
        return "I recommend scheduling an appointment within the next week to address your symptoms.";
      case 'low':
        return "You can schedule an appointment at your convenience, though it's good to address these symptoms soon.";
      default:
        return "Please book an appointment when convenient for you.";
    }
  }
}

// Export singleton instance
export const aiOrchestrator = AIOrchestrator.getInstance();

// Export error class for error handling
export class AIOrchestratorError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AIOrchestratorError';
  }
}

// Export interface for dependency injection
export interface IAIOrchestrator {
  processUserMessage(message: string, context: ConversationContext): Promise<AIResponse>;
  analyzeSymptoms(symptoms: string[]): Promise<SymptomAnalysis>;
  generateFollowUpQuestions(symptoms: ParsedSymptom[]): string[];
  getDoctorRecommendations(specialties: string[], urgencyLevel: UrgencyLevel, userLocation?: any, maxResults?: number): Promise<any>;
}