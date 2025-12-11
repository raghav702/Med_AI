import { ParsedSymptom, SymptomAnalysis, UrgencyLevel } from '../../types/medical';
import { ConversationContext } from '../../types/conversation';

export interface QuestionContext {
  symptoms: ParsedSymptom[];
  conversationHistory: string[];
  urgencyLevel: UrgencyLevel;
  missingInformation: string[];
  userResponses: Record<string, string>;
}

export interface PrioritizedQuestion {
  question: string;
  priority: number;
  category: 'duration' | 'severity' | 'location' | 'progression' | 'triggers' | 'associated' | 'emergency';
  reasoning: string;
  expectedAnswerType: 'scale' | 'duration' | 'location' | 'yes_no' | 'description';
}

/**
 * Follow-up Question Generator
 * 
 * Generates intelligent, context-aware follow-up questions based on symptoms,
 * conversation history, and missing information to improve diagnostic accuracy.
 * 
 * Enhanced with:
 * - Dynamic question generation based on symptom patterns
 * - Context-aware questioning for duration, severity, location
 * - Advanced question prioritization logic
 */
export class FollowUpQuestionGenerator {
  private static instance: FollowUpQuestionGenerator;
  
  private constructor() {}
  
  public static getInstance(): FollowUpQuestionGenerator {
    if (!FollowUpQuestionGenerator.instance) {
      FollowUpQuestionGenerator.instance = new FollowUpQuestionGenerator();
    }
    return FollowUpQuestionGenerator.instance;
  }

  /**
   * Generate prioritized follow-up questions based on current context
   */
  public generateQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext,
    maxQuestions: number = 3
  ): PrioritizedQuestion[] {
    const questionContext = this.buildQuestionContext(symptoms, context);
    const allQuestions = this.generateAllPossibleQuestions(questionContext);
    const prioritizedQuestions = this.prioritizeQuestions(allQuestions, questionContext);
    
    return prioritizedQuestions.slice(0, maxQuestions);
  }

  /**
   * Generate dynamic questions based on symptom patterns and combinations
   */
  public generateDynamicQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Analyze symptom combinations for targeted questions
    const symptomCombinations = this.analyzeSymptomCombinations(symptoms);
    questions.push(...this.generateCombinationQuestions(symptomCombinations));
    
    // Generate adaptive questions based on conversation flow
    const adaptiveQuestions = this.generateAdaptiveQuestions(symptoms, context);
    questions.push(...adaptiveQuestions);
    
    // Generate temporal pattern questions
    const temporalQuestions = this.generateTemporalQuestions(symptoms, context);
    questions.push(...temporalQuestions);
    
    return questions;
  }

  /**
   * Generate context-aware questions for duration, severity, and location
   */
  public generateContextAwareQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Enhanced duration questioning
    questions.push(...this.generateEnhancedDurationQuestions(symptoms, context));
    
    // Enhanced severity questioning
    questions.push(...this.generateEnhancedSeverityQuestions(symptoms, context));
    
    // Enhanced location questioning
    questions.push(...this.generateEnhancedLocationQuestions(symptoms, context));
    
    // Contextual progression questions
    questions.push(...this.generateProgressionQuestions(symptoms, context));
    
    return questions;
  }

  /**
   * Generate questions for specific symptom categories
   */
  public generateSymptomSpecificQuestions(symptom: ParsedSymptom): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Duration questions
    if (!symptom.duration || symptom.duration === 'unknown') {
      questions.push({
        question: `How long have you been experiencing ${symptom.symptom}?`,
        priority: 8,
        category: 'duration',
        reasoning: 'Duration helps determine urgency and potential causes',
        expectedAnswerType: 'duration'
      });
    }
    
    // Severity questions
    if (!symptom.severity || symptom.severity === 'unknown') {
      questions.push({
        question: `On a scale of 1-10, how severe is your ${symptom.symptom}?`,
        priority: 7,
        category: 'severity',
        reasoning: 'Severity assessment is crucial for triage',
        expectedAnswerType: 'scale'
      });
    }
    
    // Location questions
    if (!symptom.location || symptom.location === 'unspecified') {
      questions.push({
        question: `Where exactly do you feel the ${symptom.symptom}?`,
        priority: 6,
        category: 'location',
        reasoning: 'Specific location helps narrow differential diagnosis',
        expectedAnswerType: 'location'
      });
    }
    
    // Symptom-specific questions
    questions.push(...this.getSymptomSpecificQuestions(symptom));
    
    return questions;
  }

  /**
   * Generate context-aware questions based on conversation flow
   */
  public generateContextualQuestions(
    symptoms: ParsedSymptom[],
    conversationHistory: string[]
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    const recentMessages = conversationHistory.slice(-5).join(' ').toLowerCase();
    
    // Progression questions
    if (!recentMessages.includes('better') && !recentMessages.includes('worse')) {
      questions.push({
        question: 'Are your symptoms getting better, worse, or staying the same?',
        priority: 7,
        category: 'progression',
        reasoning: 'Symptom progression indicates severity and urgency',
        expectedAnswerType: 'description'
      });
    }
    
    // Trigger questions
    if (!recentMessages.includes('trigger') && !recentMessages.includes('cause')) {
      questions.push({
        question: 'Is there anything that triggers or worsens your symptoms?',
        priority: 6,
        category: 'triggers',
        reasoning: 'Identifying triggers helps with diagnosis and management',
        expectedAnswerType: 'description'
      });
    }
    
    // Associated symptoms
    if (symptoms.length === 1) {
      questions.push({
        question: 'Do you have any other symptoms along with this?',
        priority: 8,
        category: 'associated',
        reasoning: 'Associated symptoms help identify syndrome patterns',
        expectedAnswerType: 'description'
      });
    }
    
    // Relief factors
    if (!recentMessages.includes('relief') && !recentMessages.includes('help')) {
      questions.push({
        question: 'Have you tried anything that helps relieve the symptoms?',
        priority: 5,
        category: 'triggers',
        reasoning: 'Relief factors provide diagnostic and therapeutic insights',
        expectedAnswerType: 'description'
      });
    }
    
    return questions;
  }

  /**
   * Generate emergency-focused questions for high-urgency symptoms
   */
  public generateEmergencyQuestions(symptoms: ParsedSymptom[]): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    symptoms.forEach(symptom => {
      if (symptom.urgencyScore >= 7) {
        // High-urgency symptom specific questions
        if (symptom.symptom.includes('chest pain')) {
          questions.push({
            question: 'Is the chest pain crushing, squeezing, or does it radiate to your arm or jaw?',
            priority: 10,
            category: 'emergency',
            reasoning: 'Critical for identifying potential cardiac emergency',
            expectedAnswerType: 'yes_no'
          });
        }
        
        if (symptom.symptom.includes('shortness of breath')) {
          questions.push({
            question: 'Are you having trouble speaking in full sentences due to breathing difficulty?',
            priority: 10,
            category: 'emergency',
            reasoning: 'Indicates severe respiratory distress',
            expectedAnswerType: 'yes_no'
          });
        }
        
        if (symptom.symptom.includes('headache')) {
          questions.push({
            question: 'Is this the worst headache of your life or did it come on suddenly?',
            priority: 9,
            category: 'emergency',
            reasoning: 'Red flags for serious neurological conditions',
            expectedAnswerType: 'yes_no'
          });
        }
      }
    });
    
    return questions;
  }

  /**
   * Build comprehensive question context from symptoms and conversation
   */
  private buildQuestionContext(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): QuestionContext {
    const conversationHistory = context.messages.map(m => m.content);
    const missingInformation = this.identifyMissingInformation(symptoms);
    const userResponses = this.extractUserResponses(context.messages);
    
    return {
      symptoms,
      conversationHistory,
      urgencyLevel: context.urgencyLevel,
      missingInformation,
      userResponses
    };
  }

  /**
   * Generate all possible questions for the current context
   */
  private generateAllPossibleQuestions(context: QuestionContext): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Add symptom-specific questions
    context.symptoms.forEach(symptom => {
      questions.push(...this.generateSymptomSpecificQuestions(symptom));
    });
    
    // Add contextual questions
    questions.push(...this.generateContextualQuestions(context.symptoms, context.conversationHistory));
    
    // Add emergency questions if high urgency
    if (context.urgencyLevel === 'high' || context.urgencyLevel === 'emergency') {
      questions.push(...this.generateEmergencyQuestions(context.symptoms));
    }
    
    // Add missing information questions
    questions.push(...this.generateMissingInfoQuestions(context.missingInformation));
    
    // Add dynamic questions based on symptom patterns
    questions.push(...this.generateDynamicSymptomQuestions(context.symptoms));
    
    // Add context-aware questions
    questions.push(...this.generateContextAwareDetailedQuestions(context));
    
    return questions;
  }

  /**
   * Prioritize questions based on urgency, completeness, and diagnostic value
   */
  private prioritizeQuestions(
    questions: PrioritizedQuestion[],
    context: QuestionContext
  ): PrioritizedQuestion[] {
    // Remove duplicate questions
    const uniqueQuestions = this.removeDuplicateQuestions(questions);
    
    // Filter out questions already answered
    const unansweredQuestions = this.filterAnsweredQuestions(uniqueQuestions, context.userResponses);
    
    // Adjust priorities based on context
    const adjustedQuestions = this.adjustPrioritiesForContext(unansweredQuestions, context);
    
    // Sort by priority (highest first)
    return adjustedQuestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get symptom-specific questions based on symptom type
   */
  private getSymptomSpecificQuestions(symptom: ParsedSymptom): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    const symptomText = symptom.symptom.toLowerCase();
    
    // Pain-specific questions
    if (symptomText.includes('pain')) {
      questions.push({
        question: `Is the ${symptom.symptom} sharp, dull, throbbing, or burning?`,
        priority: 6,
        category: 'severity',
        reasoning: 'Pain quality helps identify underlying pathology',
        expectedAnswerType: 'description'
      });
      
      questions.push({
        question: `Does the ${symptom.symptom} come and go, or is it constant?`,
        priority: 5,
        category: 'progression',
        reasoning: 'Pain pattern provides diagnostic clues',
        expectedAnswerType: 'description'
      });
    }
    
    // Respiratory symptoms
    if (symptomText.includes('cough') || symptomText.includes('breath')) {
      questions.push({
        question: 'Are you coughing up any phlegm, blood, or other material?',
        priority: 7,
        category: 'associated',
        reasoning: 'Sputum characteristics indicate infection or serious conditions',
        expectedAnswerType: 'description'
      });
    }
    
    // Gastrointestinal symptoms
    if (symptomText.includes('nausea') || symptomText.includes('stomach') || symptomText.includes('abdominal')) {
      questions.push({
        question: 'Does eating or drinking make your symptoms better or worse?',
        priority: 6,
        category: 'triggers',
        reasoning: 'Relationship to food intake helps identify GI conditions',
        expectedAnswerType: 'description'
      });
    }
    
    // Neurological symptoms
    if (symptomText.includes('headache') || symptomText.includes('dizziness')) {
      questions.push({
        question: 'Do you have any vision changes, nausea, or sensitivity to light?',
        priority: 7,
        category: 'associated',
        reasoning: 'Associated neurological symptoms indicate serious conditions',
        expectedAnswerType: 'yes_no'
      });
    }
    
    return questions;
  }

  /**
   * Identify what information is missing from symptom analysis
   */
  private identifyMissingInformation(symptoms: ParsedSymptom[]): string[] {
    const missing: string[] = [];
    
    symptoms.forEach(symptom => {
      if (!symptom.duration || symptom.duration === 'unknown') {
        missing.push('duration');
      }
      if (!symptom.severity || symptom.severity === 'unknown') {
        missing.push('severity');
      }
      if (!symptom.location || symptom.location === 'unspecified') {
        missing.push('location');
      }
    });
    
    return [...new Set(missing)]; // Remove duplicates
  }

  /**
   * Extract user responses from conversation history
   */
  private extractUserResponses(messages: any[]): Record<string, string> {
    const responses: Record<string, string> = {};
    
    messages.forEach(message => {
      if (message.role === 'user') {
        const content = message.content.toLowerCase();
        
        // Extract duration responses
        if (content.match(/(\d+)\s*(days?|weeks?|months?|hours?)/)) {
          responses.duration = content;
        }
        
        // Extract severity responses
        if (content.match(/(\d+)(?:\/10|\s*out\s*of\s*10)/)) {
          responses.severity = content;
        }
        
        // Extract yes/no responses
        if (content.includes('yes') || content.includes('no')) {
          responses.confirmation = content;
        }
      }
    });
    
    return responses;
  }

  /**
   * Generate questions for missing information
   */
  private generateMissingInfoQuestions(missingInfo: string[]): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    missingInfo.forEach(info => {
      switch (info) {
        case 'duration':
          questions.push({
            question: 'How long have you been experiencing these symptoms?',
            priority: 8,
            category: 'duration',
            reasoning: 'Duration is critical for determining urgency and causes',
            expectedAnswerType: 'duration'
          });
          break;
        case 'severity':
          questions.push({
            question: 'How would you rate the severity of your symptoms on a scale of 1-10?',
            priority: 7,
            category: 'severity',
            reasoning: 'Severity assessment guides triage decisions',
            expectedAnswerType: 'scale'
          });
          break;
        case 'location':
          questions.push({
            question: 'Can you point to or describe exactly where you feel the symptoms?',
            priority: 6,
            category: 'location',
            reasoning: 'Precise location helps narrow differential diagnosis',
            expectedAnswerType: 'location'
          });
          break;
      }
    });
    
    return questions;
  }

  /**
   * Remove duplicate questions
   */
  private removeDuplicateQuestions(questions: PrioritizedQuestion[]): PrioritizedQuestion[] {
    const seen = new Set<string>();
    return questions.filter(q => {
      const key = q.question.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Filter out questions that have already been answered
   */
  private filterAnsweredQuestions(
    questions: PrioritizedQuestion[],
    userResponses: Record<string, string>
  ): PrioritizedQuestion[] {
    return questions.filter(question => {
      // Check if question category has been answered
      if (question.category === 'duration' && userResponses.duration) {
        return false;
      }
      if (question.category === 'severity' && userResponses.severity) {
        return false;
      }
      // Add more filtering logic as needed
      return true;
    });
  }

  /**
   * Adjust question priorities based on current context - Enhanced with new logic
   */
  private adjustPrioritiesForContext(
    questions: PrioritizedQuestion[],
    context: QuestionContext
  ): PrioritizedQuestion[] {
    return questions.map(question => {
      let adjustedPriority = question.priority;
      
      // Boost emergency questions for high urgency
      if (question.category === 'emergency' && context.urgencyLevel === 'emergency') {
        adjustedPriority += 3;
      }
      
      // Boost duration questions if no duration info available
      if (question.category === 'duration' && context.missingInformation.includes('duration')) {
        adjustedPriority += 2;
      }
      
      // Boost severity questions if no severity info available
      if (question.category === 'severity' && context.missingInformation.includes('severity')) {
        adjustedPriority += 2;
      }
      
      // Boost severity questions for pain symptoms
      if (question.category === 'severity' && 
          context.symptoms.some(s => s.symptom && s.symptom.includes('pain'))) {
        adjustedPriority += 1;
      }
      
      // Boost location questions for localizable symptoms
      if (question.category === 'location' && 
          context.symptoms.some(s => this.isLocalizableSymptom(s))) {
        adjustedPriority += 1;
      }
      
      // Boost progression questions for chronic symptoms
      if (question.category === 'progression' && 
          context.symptoms.some(s => this.isChronicSymptom(s))) {
        adjustedPriority += 1;
      }
      
      return {
        ...question,
        priority: adjustedPriority
      };
    });
  }

  /**
   * Analyze symptom combinations to identify patterns - NEW METHOD
   */
  private analyzeSymptomCombinations(symptoms: ParsedSymptom[]): string[] {
    const combinations: string[] = [];
    const symptomTexts = symptoms.map(s => s.symptom || s.text || '').filter(Boolean);
    
    // Cardiovascular combinations
    if (symptomTexts.some(s => s.includes('chest')) && 
        symptomTexts.some(s => s.includes('shortness') || s.includes('breath'))) {
      combinations.push('cardiovascular_respiratory');
    }
    
    // Gastrointestinal combinations
    if (symptomTexts.some(s => s.includes('nausea')) && 
        symptomTexts.some(s => s.includes('abdominal') || s.includes('stomach'))) {
      combinations.push('gastrointestinal_complex');
    }
    
    // Neurological combinations
    if (symptomTexts.some(s => s.includes('headache')) && 
        symptomTexts.some(s => s.includes('dizziness') || s.includes('nausea'))) {
      combinations.push('neurological_complex');
    }
    
    // Infectious combinations
    if (symptomTexts.some(s => s.includes('fever')) && 
        (symptomTexts.some(s => s.includes('cough')) || symptomTexts.some(s => s.includes('fatigue')))) {
      combinations.push('infectious_pattern');
    }
    
    return combinations;
  }

  /**
   * Generate questions based on symptom combinations - NEW METHOD
   */
  private generateCombinationQuestions(combinations: string[]): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    combinations.forEach(combination => {
      switch (combination) {
        case 'cardiovascular_respiratory':
          questions.push({
            question: 'Do you feel any pressure or tightness in your chest along with the breathing difficulty?',
            priority: 9,
            category: 'emergency',
            reasoning: 'Chest pressure with dyspnea suggests serious cardiac or pulmonary condition',
            expectedAnswerType: 'yes_no'
          });
          break;
          
        case 'gastrointestinal_complex':
          questions.push({
            question: 'Have you had any changes in your bowel movements or appetite recently?',
            priority: 6,
            category: 'associated',
            reasoning: 'GI symptom patterns help identify specific conditions',
            expectedAnswerType: 'description'
          });
          break;
          
        case 'neurological_complex':
          questions.push({
            question: 'Do you have any vision changes, confusion, or difficulty with balance?',
            priority: 8,
            category: 'emergency',
            reasoning: 'Neurological symptom clusters may indicate serious conditions',
            expectedAnswerType: 'yes_no'
          });
          break;
          
        case 'infectious_pattern':
          questions.push({
            question: 'Have you been around anyone who was sick, or traveled recently?',
            priority: 5,
            category: 'triggers',
            reasoning: 'Exposure history helps identify infectious causes',
            expectedAnswerType: 'description'
          });
          break;
      }
    });
    
    return questions;
  }

  /**
   * Generate adaptive questions based on conversation flow - NEW METHOD
   */
  private generateAdaptiveQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    const messageCount = context.messages.length;
    const recentMessages = context.messages.slice(-3).map(m => m.content).join(' ').toLowerCase();
    
    // Early conversation - focus on primary symptoms
    if (messageCount <= 3) {
      questions.push({
        question: 'What is bothering you the most right now?',
        priority: 8,
        category: 'severity',
        reasoning: 'Identify primary concern early in conversation',
        expectedAnswerType: 'description'
      });
    }
    
    // Mid conversation - focus on details
    if (messageCount > 3 && messageCount <= 6) {
      if (!recentMessages.includes('started') && !recentMessages.includes('began')) {
        questions.push({
          question: 'When did you first notice these symptoms starting?',
          priority: 7,
          category: 'duration',
          reasoning: 'Onset timing is crucial for diagnosis',
          expectedAnswerType: 'duration'
        });
      }
    }
    
    // Later conversation - focus on context and triggers
    if (messageCount > 6) {
      if (!recentMessages.includes('medication') && !recentMessages.includes('treatment')) {
        questions.push({
          question: 'Are you currently taking any medications or have you tried any treatments?',
          priority: 6,
          category: 'triggers',
          reasoning: 'Medication history affects diagnosis and treatment',
          expectedAnswerType: 'description'
        });
      }
    }
    
    return questions;
  }

  /**
   * Generate temporal pattern questions - NEW METHOD
   */
  private generateTemporalQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Time of day patterns
    questions.push({
      question: 'Do your symptoms tend to be worse at any particular time of day?',
      priority: 5,
      category: 'progression',
      reasoning: 'Temporal patterns provide diagnostic clues',
      expectedAnswerType: 'description'
    });
    
    // Activity-related patterns
    questions.push({
      question: 'Do your symptoms change with physical activity or rest?',
      priority: 6,
      category: 'triggers',
      reasoning: 'Activity relationship helps identify underlying causes',
      expectedAnswerType: 'description'
    });
    
    // Cyclical patterns
    if (symptoms.some(s => this.isRecurrentSymptom(s))) {
      questions.push({
        question: 'Do these symptoms come and go, or have you had them before?',
        priority: 7,
        category: 'progression',
        reasoning: 'Recurrent patterns suggest chronic conditions',
        expectedAnswerType: 'description'
      });
    }
    
    return questions;
  }

  /**
   * Generate enhanced duration questions - NEW METHOD
   */
  private generateEnhancedDurationQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    symptoms.forEach(symptom => {
      if (!symptom.duration || symptom.duration === 'unknown') {
        const symptomName = symptom.symptom || symptom.text || 'symptoms';
        
        // Specific duration questions based on symptom type
        if (symptomName.includes('pain')) {
          questions.push({
            question: `How long have you been experiencing this ${symptomName}? Was the onset sudden or gradual?`,
            priority: 8,
            category: 'duration',
            reasoning: 'Pain onset pattern is crucial for diagnosis',
            expectedAnswerType: 'duration'
          });
        } else if (symptomName.includes('fever')) {
          questions.push({
            question: `When did the fever start, and has it been constant or intermittent?`,
            priority: 7,
            category: 'duration',
            reasoning: 'Fever pattern indicates infection severity',
            expectedAnswerType: 'duration'
          });
        } else {
          questions.push({
            question: `How long have you been experiencing ${symptomName}?`,
            priority: 6,
            category: 'duration',
            reasoning: 'Duration helps determine urgency and causes',
            expectedAnswerType: 'duration'
          });
        }
      }
    });
    
    return questions;
  } 
 /**
   * Generate enhanced severity questions - NEW METHOD
   */
  private generateEnhancedSeverityQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    symptoms.forEach(symptom => {
      if (!symptom.severity || symptom.severity === 'unknown') {
        const symptomName = symptom.symptom || symptom.text || 'symptoms';
        
        // Context-aware severity questions
        if (symptomName.includes('pain')) {
          questions.push({
            question: `On a scale of 1-10, how severe is your ${symptomName}? Does it interfere with your daily activities?`,
            priority: 8,
            category: 'severity',
            reasoning: 'Pain severity and functional impact guide treatment urgency',
            expectedAnswerType: 'scale'
          });
        } else if (symptomName.includes('shortness') || symptomName.includes('breath')) {
          questions.push({
            question: `How severe is your breathing difficulty? Can you speak in full sentences?`,
            priority: 9,
            category: 'severity',
            reasoning: 'Respiratory distress severity indicates emergency need',
            expectedAnswerType: 'description'
          });
        } else {
          questions.push({
            question: `How would you rate the severity of your ${symptomName} from mild to severe?`,
            priority: 6,
            category: 'severity',
            reasoning: 'Severity assessment guides triage decisions',
            expectedAnswerType: 'scale'
          });
        }
      }
    });
    
    return questions;
  }

  /**
   * Generate enhanced location questions - NEW METHOD
   */
  private generateEnhancedLocationQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    symptoms.forEach(symptom => {
      if ((!symptom.location || symptom.location === 'unspecified') && this.isLocalizableSymptom(symptom)) {
        const symptomName = symptom.symptom || symptom.text || 'symptoms';
        
        // Specific location questions based on symptom type
        if (symptomName.includes('pain')) {
          questions.push({
            question: `Can you point to exactly where the ${symptomName} is located? Does it spread or radiate anywhere else?`,
            priority: 7,
            category: 'location',
            reasoning: 'Pain location and radiation patterns are diagnostic',
            expectedAnswerType: 'location'
          });
        } else if (symptomName.includes('headache')) {
          questions.push({
            question: `Where exactly is your headache located - front, back, sides, or all over?`,
            priority: 6,
            category: 'location',
            reasoning: 'Headache location helps identify type and cause',
            expectedAnswerType: 'location'
          });
        } else {
          questions.push({
            question: `Where exactly do you feel the ${symptomName}?`,
            priority: 5,
            category: 'location',
            reasoning: 'Specific location helps narrow differential diagnosis',
            expectedAnswerType: 'location'
          });
        }
      }
    });
    
    return questions;
  }

  /**
   * Generate progression questions - NEW METHOD
   */
  private generateProgressionQuestions(
    symptoms: ParsedSymptom[],
    context: ConversationContext
  ): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    const recentMessages = context.messages.slice(-3).map(m => m.content).join(' ').toLowerCase();
    
    if (!recentMessages.includes('better') && !recentMessages.includes('worse') && !recentMessages.includes('same')) {
      questions.push({
        question: 'Since your symptoms started, have they been getting better, worse, or staying about the same?',
        priority: 7,
        category: 'progression',
        reasoning: 'Symptom progression indicates severity and urgency',
        expectedAnswerType: 'description'
      });
    }
    
    if (!recentMessages.includes('sudden') && !recentMessages.includes('gradual')) {
      questions.push({
        question: 'Did your symptoms come on suddenly or develop gradually over time?',
        priority: 6,
        category: 'progression',
        reasoning: 'Onset pattern helps identify acute vs chronic conditions',
        expectedAnswerType: 'description'
      });
    }
    
    return questions;
  }

  /**
   * Generate dynamic symptom questions based on patterns - NEW METHOD
   */
  private generateDynamicSymptomQuestions(symptoms: ParsedSymptom[]): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Multi-symptom analysis
    if (symptoms.length > 1) {
      questions.push({
        question: 'Which of your symptoms started first, and did the others develop afterward?',
        priority: 6,
        category: 'progression',
        reasoning: 'Symptom sequence helps identify primary condition',
        expectedAnswerType: 'description'
      });
    }
    
    // High-urgency symptom focus
    const highUrgencySymptoms = symptoms.filter(s => s.urgencyScore >= 7);
    if (highUrgencySymptoms.length > 0) {
      const symptomName = highUrgencySymptoms[0].symptom || highUrgencySymptoms[0].text;
      questions.push({
        question: `Your ${symptomName} concerns me. Is this the worst you've ever experienced this type of symptom?`,
        priority: 9,
        category: 'emergency',
        reasoning: 'Worst-ever symptoms may indicate serious conditions',
        expectedAnswerType: 'yes_no'
      });
    }
    
    return questions;
  }

  /**
   * Generate context-aware detailed questions - NEW METHOD
   */
  private generateContextAwareDetailedQuestions(context: QuestionContext): PrioritizedQuestion[] {
    const questions: PrioritizedQuestion[] = [];
    
    // Medical history context
    if (context.conversationHistory.length > 2) {
      const hasHistoryMention = context.conversationHistory.some(msg => 
        msg.toLowerCase().includes('history') || msg.toLowerCase().includes('before') || msg.toLowerCase().includes('previous')
      );
      
      if (!hasHistoryMention) {
        questions.push({
          question: 'Do you have any medical conditions or have you experienced similar symptoms before?',
          priority: 5,
          category: 'associated',
          reasoning: 'Medical history provides important diagnostic context',
          expectedAnswerType: 'description'
        });
      }
    }
    
    // Medication context
    const hasMedicationMention = context.conversationHistory.some(msg => 
      msg.toLowerCase().includes('medication') || msg.toLowerCase().includes('medicine') || msg.toLowerCase().includes('drug')
    );
    
    if (!hasMedicationMention && context.symptoms.length > 0) {
      questions.push({
        question: 'Are you currently taking any medications, supplements, or have you recently started or stopped any?',
        priority: 5,
        category: 'triggers',
        reasoning: 'Medications can cause or interact with symptoms',
        expectedAnswerType: 'description'
      });
    }
    
    return questions;
  }

  /**
   * Helper method to check if symptom is localizable - NEW METHOD
   */
  private isLocalizableSymptom(symptom: ParsedSymptom): boolean {
    const symptomText = (symptom.symptom || symptom.text || '').toLowerCase();
    const localizableKeywords = ['pain', 'ache', 'hurt', 'sore', 'tender', 'swelling', 'rash', 'numbness', 'tingling'];
    return localizableKeywords.some(keyword => symptomText.includes(keyword));
  }

  /**
   * Helper method to check if symptom is chronic/recurrent - NEW METHOD
   */
  private isChronicSymptom(symptom: ParsedSymptom): boolean {
    const duration = symptom.duration || '';
    const chronicKeywords = ['weeks', 'months', 'years', 'chronic', 'ongoing', 'recurring'];
    return chronicKeywords.some(keyword => duration.toLowerCase().includes(keyword));
  }

  /**
   * Helper method to check if symptom is recurrent - NEW METHOD
   */
  private isRecurrentSymptom(symptom: ParsedSymptom): boolean {
    const symptomText = (symptom.symptom || symptom.text || '').toLowerCase();
    const recurrentKeywords = ['headache', 'migraine', 'back pain', 'joint pain', 'heartburn'];
    return recurrentKeywords.some(keyword => symptomText.includes(keyword));
  }
}

// Export singleton instance
export const followUpQuestionGenerator = FollowUpQuestionGenerator.getInstance();