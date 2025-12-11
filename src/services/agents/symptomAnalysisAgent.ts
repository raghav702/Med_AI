import { SymptomAnalysis, ParsedSymptom, UrgencyLevel } from '../../types/medical';
import { followUpQuestionGenerator } from './followUpQuestionGenerator';

export interface SymptomKeyword {
  keyword: string;
  urgencyScore: number;
  specialty: string[];
  followUpQuestions: string[];
}

export interface EmergencySymptom {
  keywords: string[];
  description: string;
  immediateAction: string;
}

export class SymptomAnalysisAgent {
  private emergencySymptoms: EmergencySymptom[] = [
    {
      keywords: ['heart attack', 'crushing chest pain', 'chest pressure', 'chest crushing', 'elephant on chest'],
      description: 'Potential cardiac emergency',
      immediateAction: 'Call 911 immediately - Do not drive yourself'
    },
    {
      keywords: ['difficulty breathing', 'can\'t breathe', 'shortness of breath', 'gasping', 'choking', 'suffocating'],
      description: 'Severe respiratory distress',
      immediateAction: 'Call 911 immediately - This is a medical emergency'
    },
    {
      keywords: ['severe bleeding', 'heavy bleeding', 'blood loss', 'hemorrhage', 'bleeding won\'t stop', 'gushing blood'],
      description: 'Severe bleeding emergency',
      immediateAction: 'Apply direct pressure and call 911 immediately'
    },
    {
      keywords: ['unconscious', 'passed out', 'fainting', 'loss of consciousness', 'blacked out', 'collapsed'],
      description: 'Loss of consciousness',
      immediateAction: 'Call 911 immediately - Check for breathing and pulse'
    },
    {
      keywords: ['stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'slurred speech', 'face numb'],
      description: 'Potential stroke - FAST symptoms',
      immediateAction: 'Call 911 immediately - Time is brain tissue'
    },
    {
      keywords: ['severe headache', 'worst headache', 'sudden headache', 'thunderclap headache', 'headache like never before'],
      description: 'Severe sudden headache',
      immediateAction: 'Call 911 - May indicate brain hemorrhage'
    },
    {
      keywords: ['anaphylaxis', 'severe allergic reaction', 'throat swelling', 'face swelling', 'hives with breathing'],
      description: 'Severe allergic reaction',
      immediateAction: 'Use EpiPen if available and call 911 immediately'
    },
    {
      keywords: ['severe abdominal pain', 'appendicitis', 'rigid abdomen', 'stomach pain severe', 'belly pain severe'],
      description: 'Severe abdominal emergency',
      immediateAction: 'Go to emergency room immediately - Do not eat or drink'
    },
    {
      keywords: ['suicidal thoughts', 'want to die', 'kill myself', 'end my life', 'suicide'],
      description: 'Mental health emergency',
      immediateAction: 'Call 988 (Suicide & Crisis Lifeline) or 911 immediately'
    },
    {
      keywords: ['seizure', 'convulsions', 'shaking uncontrollably', 'epileptic fit'],
      description: 'Seizure emergency',
      immediateAction: 'Call 911 if seizure lasts >5 minutes or person is injured'
    },
    {
      keywords: ['severe burns', 'third degree burn', 'electrical burn', 'chemical burn'],
      description: 'Severe burn injury',
      immediateAction: 'Call 911 - Cool with water, do not remove clothing'
    },
    {
      keywords: ['overdose', 'took too many pills', 'poisoning', 'swallowed poison'],
      description: 'Poisoning or overdose',
      immediateAction: 'Call Poison Control 1-800-222-1222 or 911 immediately'
    }
  ];

  private symptomKeywords: SymptomKeyword[] = [
    // Cardiovascular
    {
      keyword: 'chest pain',
      urgencyScore: 8,
      specialty: ['cardiology', 'emergency'],
      followUpQuestions: [
        'How long have you been experiencing chest pain?',
        'Is the pain sharp, dull, or crushing?',
        'Does the pain radiate to your arm, jaw, or back?'
      ]
    },
    {
      keyword: 'palpitations',
      urgencyScore: 5,
      specialty: ['cardiology'],
      followUpQuestions: [
        'How often do you experience palpitations?',
        'Do you feel dizzy or lightheaded with the palpitations?',
        'Are you taking any medications or stimulants?'
      ]
    },
    
    // Respiratory
    {
      keyword: 'cough',
      urgencyScore: 3,
      specialty: ['pulmonology', 'general'],
      followUpQuestions: [
        'How long have you had this cough?',
        'Are you coughing up any phlegm or blood?',
        'Is the cough worse at night or during the day?'
      ]
    },
    {
      keyword: 'shortness of breath',
      urgencyScore: 7,
      specialty: ['pulmonology', 'cardiology'],
      followUpQuestions: [
        'When did the shortness of breath start?',
        'Does it occur at rest or only with activity?',
        'Do you have any chest pain with the breathing difficulty?'
      ]
    },
    
    // Gastrointestinal
    {
      keyword: 'abdominal pain',
      urgencyScore: 5,
      specialty: ['gastroenterology', 'general'],
      followUpQuestions: [
        'Where exactly is the pain located?',
        'How severe is the pain on a scale of 1-10?',
        'Does eating make the pain better or worse?'
      ]
    },
    {
      keyword: 'nausea',
      urgencyScore: 3,
      specialty: ['gastroenterology', 'general'],
      followUpQuestions: [
        'Are you also vomiting?',
        'When did the nausea start?',
        'Have you eaten anything unusual recently?'
      ]
    },
    
    // Neurological
    {
      keyword: 'headache',
      urgencyScore: 4,
      specialty: ['neurology', 'general'],
      followUpQuestions: [
        'How severe is your headache on a scale of 1-10?',
        'Where is the headache located?',
        'Do you have any vision changes or nausea?'
      ]
    },
    {
      keyword: 'dizziness',
      urgencyScore: 4,
      specialty: ['neurology', 'ent'],
      followUpQuestions: [
        'Do you feel like the room is spinning?',
        'Does the dizziness occur when you stand up?',
        'Have you had any recent ear infections?'
      ]
    },
    
    // Musculoskeletal
    {
      keyword: 'back pain',
      urgencyScore: 3,
      specialty: ['orthopedics', 'general'],
      followUpQuestions: [
        'Where exactly is your back pain?',
        'Did you injure your back recently?',
        'Does the pain radiate down your legs?'
      ]
    },
    {
      keyword: 'joint pain',
      urgencyScore: 3,
      specialty: ['rheumatology', 'orthopedics'],
      followUpQuestions: [
        'Which joints are affected?',
        'Is there any swelling or redness?',
        'Is the pain worse in the morning or evening?'
      ]
    },
    
    // General symptoms
    {
      keyword: 'fever',
      urgencyScore: 4,
      specialty: ['general', 'infectious disease'],
      followUpQuestions: [
        'What is your temperature?',
        'How long have you had the fever?',
        'Do you have any other symptoms like chills or body aches?'
      ]
    },
    {
      keyword: 'fatigue',
      urgencyScore: 2,
      specialty: ['general'],
      followUpQuestions: [
        'How long have you been feeling tired?',
        'Are you getting enough sleep?',
        'Have you noticed any other symptoms?'
      ]
    }
  ];

  /**
   * Analyzes user input for symptoms and returns comprehensive analysis
   */
  public analyzeSymptoms(userInput: string): SymptomAnalysis {
    const normalizedInput = userInput.toLowerCase();
    const detectedSymptoms = this.detectSymptoms(normalizedInput);
    const emergencyFlags = this.checkForEmergencies(normalizedInput);
    const urgencyLevel = this.calculateUrgencyLevel(detectedSymptoms, emergencyFlags);
    const followUpQuestions = this.generateFollowUpQuestions(detectedSymptoms);
    const recommendedSpecialties = this.getRecommendedSpecialties(detectedSymptoms);

    return {
      symptoms: detectedSymptoms,
      urgencyScore: this.calculateUrgencyScore(detectedSymptoms),
      urgencyLevel,
      possibleConditions: this.inferPossibleConditions(detectedSymptoms),
      recommendedSpecialties,
      followUpQuestions,
      emergencyFlags
    };
  }

  /**
   * Detects symptoms from user input using keyword matching
   */
  private detectSymptoms(input: string): ParsedSymptom[] {
    const detectedSymptoms: ParsedSymptom[] = [];

    for (const symptomKeyword of this.symptomKeywords) {
      if (input.includes(symptomKeyword.keyword)) {
        detectedSymptoms.push({
          symptom: symptomKeyword.keyword,
          severity: this.extractSeverity(input, symptomKeyword.keyword),
          duration: this.extractDuration(input),
          location: this.extractLocation(input, symptomKeyword.keyword),
          urgencyScore: symptomKeyword.urgencyScore
        });
      }
    }

    return detectedSymptoms;
  }

  /**
   * Checks for emergency symptoms that require immediate attention
   */
  private checkForEmergencies(input: string): string[] {
    const emergencyFlags: string[] = [];

    for (const emergency of this.emergencySymptoms) {
      for (const keyword of emergency.keywords) {
        if (input.includes(keyword)) {
          emergencyFlags.push(emergency.description);
          break;
        }
      }
    }

    return emergencyFlags;
  }

  /**
   * Calculates overall urgency level based on symptoms and emergency flags
   */
  private calculateUrgencyLevel(symptoms: ParsedSymptom[], emergencyFlags: string[]): UrgencyLevel {
    if (emergencyFlags.length > 0) {
      return 'emergency';
    }

    const maxUrgencyScore = Math.max(...symptoms.map(s => s.urgencyScore), 0);

    if (maxUrgencyScore >= 8) return 'high';
    if (maxUrgencyScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * Generates relevant follow-up questions based on detected symptoms
   */
  private generateFollowUpQuestions(symptoms: ParsedSymptom[]): string[] {
    // Use symptom-specific questions from the advanced generator
    const symptomSpecificQuestions: string[] = [];
    
    for (const symptom of symptoms) {
      const questions = followUpQuestionGenerator.generateSymptomSpecificQuestions(symptom);
      symptomSpecificQuestions.push(...questions.map(q => q.question));
    }
    
    if (symptomSpecificQuestions.length > 0) {
      return symptomSpecificQuestions.slice(0, 3);
    }
    
    // Fallback to keyword-based questions
    const questions: string[] = [];
    const usedQuestions = new Set<string>();

    for (const symptom of symptoms) {
      const symptomKeyword = this.symptomKeywords.find(sk => sk.keyword === symptom.symptom);
      if (symptomKeyword) {
        for (const question of symptomKeyword.followUpQuestions) {
          if (!usedQuestions.has(question)) {
            questions.push(question);
            usedQuestions.add(question);
          }
        }
      }
    }

    // Add general questions if no specific symptoms detected
    if (symptoms.length === 0) {
      questions.push(
        'Can you describe your main symptoms?',
        'When did these symptoms start?',
        'How severe are your symptoms on a scale of 1-10?'
      );
    }

    return questions.slice(0, 3); // Limit to 3 questions to avoid overwhelming
  }

  /**
   * Gets recommended medical specialties based on symptoms
   */
  private getRecommendedSpecialties(symptoms: ParsedSymptom[]): string[] {
    const specialties = new Set<string>();

    for (const symptom of symptoms) {
      const symptomKeyword = this.symptomKeywords.find(sk => sk.keyword === symptom.symptom);
      if (symptomKeyword) {
        symptomKeyword.specialty.forEach(spec => specialties.add(spec));
      }
    }

    return Array.from(specialties);
  }

  /**
   * Calculates numerical urgency score
   */
  private calculateUrgencyScore(symptoms: ParsedSymptom[]): number {
    if (symptoms.length === 0) return 1;
    return Math.max(...symptoms.map(s => s.urgencyScore));
  }

  /**
   * Infers possible medical conditions based on symptom combinations
   */
  private inferPossibleConditions(symptoms: ParsedSymptom[]): string[] {
    const conditions: string[] = [];
    const symptomNames = symptoms.map(s => s.symptom);

    // Simple condition inference based on symptom combinations
    if (symptomNames.includes('chest pain') && symptomNames.includes('shortness of breath')) {
      conditions.push('Possible cardiac condition', 'Pulmonary embolism');
    }
    
    if (symptomNames.includes('fever') && symptomNames.includes('cough')) {
      conditions.push('Respiratory infection', 'Pneumonia');
    }
    
    if (symptomNames.includes('abdominal pain') && symptomNames.includes('nausea')) {
      conditions.push('Gastrointestinal condition', 'Food poisoning');
    }
    
    if (symptomNames.includes('headache') && symptomNames.includes('fever')) {
      conditions.push('Viral infection', 'Meningitis (if severe)');
    }

    return conditions;
  }

  /**
   * Extracts severity information from user input
   */
  private extractSeverity(input: string, symptom: string): string {
    const severityKeywords = {
      mild: ['mild', 'slight', 'little', 'minor'],
      moderate: ['moderate', 'medium', 'noticeable'],
      severe: ['severe', 'intense', 'excruciating', 'unbearable', 'terrible', 'awful']
    };

    for (const [level, keywords] of Object.entries(severityKeywords)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return level;
      }
    }

    // Check for numeric pain scale
    const painScaleMatch = input.match(/(\d+)(?:\/10|\s*out\s*of\s*10)/);
    if (painScaleMatch) {
      const score = parseInt(painScaleMatch[1]);
      if (score <= 3) return 'mild';
      if (score <= 6) return 'moderate';
      return 'severe';
    }

    return 'unknown';
  }

  /**
   * Extracts duration information from user input
   */
  private extractDuration(input: string): string {
    const durationPatterns = [
      /(\d+)\s*(days?)/,
      /(\d+)\s*(weeks?)/,
      /(\d+)\s*(months?)/,
      /(\d+)\s*(hours?)/,
      /(\d+)\s*(minutes?)/
    ];

    for (const pattern of durationPatterns) {
      const match = input.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        const unit = match[2];
        // Normalize to plural form
        if (num === 1) {
          return `${num} ${unit.replace(/s$/, '')}`;
        } else {
          return `${num} ${unit.endsWith('s') ? unit : unit + 's'}`;
        }
      }
    }

    // Check for relative time expressions
    if (input.includes('today') || input.includes('this morning')) return 'today';
    if (input.includes('yesterday')) return '1 day';
    if (input.includes('last week')) return '1 week';
    if (input.includes('recently') || input.includes('lately')) return 'recent';

    return 'unknown';
  }

  /**
   * Extracts location information for symptoms
   */
  private extractLocation(input: string, symptom: string): string {
    const locationKeywords = {
      chest: ['left chest', 'right chest', 'center chest', 'upper chest'],
      abdomen: ['upper abdomen', 'lower abdomen', 'left side', 'right side'],
      head: ['forehead', 'temples', 'back of head', 'top of head'],
      back: ['lower back', 'upper back', 'middle back']
    };

    for (const [area, locations] of Object.entries(locationKeywords)) {
      if (symptom.includes(area)) {
        for (const location of locations) {
          if (input.includes(location)) {
            return location;
          }
        }
      }
    }

    return 'unspecified';
  }
}

// Export singleton instance
export const symptomAnalysisAgent = new SymptomAnalysisAgent();