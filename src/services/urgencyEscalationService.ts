import { UrgencyLevel, SymptomAnalysis } from '../types/medical';
import { EmergencySymptom } from './agents/symptomAnalysisAgent';

export interface EmergencyContact {
  name: string;
  number: string;
  description: string;
  when: string;
}

export interface UrgencyEscalation {
  urgencyLevel: UrgencyLevel;
  immediateActions: string[];
  emergencyContacts: EmergencyContact[];
  timeframe: string;
  warnings: string[];
  firstAidInstructions?: string[];
}

export interface EmergencyProtocol {
  condition: string;
  symptoms: string[];
  immediateActions: string[];
  emergencyContacts: EmergencyContact[];
  firstAidSteps: string[];
  whatNotToDo: string[];
  timeframe: string;
}

/**
 * Urgency Escalation Service
 * 
 * Handles emergency detection, escalation protocols, and provides
 * immediate care recommendations based on symptom urgency levels.
 */
export class UrgencyEscalationService {
  private static instance: UrgencyEscalationService;

  private constructor() {}

  public static getInstance(): UrgencyEscalationService {
    if (!UrgencyEscalationService.instance) {
      UrgencyEscalationService.instance = new UrgencyEscalationService();
    }
    return UrgencyEscalationService.instance;
  }

  /**
   * Emergency contacts database
   */
  private emergencyContacts: EmergencyContact[] = [
    {
      name: 'Emergency Services',
      number: '911',
      description: 'Life-threatening emergencies',
      when: 'Immediate danger to life or limb'
    },
    {
      name: 'Poison Control',
      number: '1-800-222-1222',
      description: 'Poisoning and overdose emergencies',
      when: 'Suspected poisoning or drug overdose'
    },
    {
      name: 'Suicide & Crisis Lifeline',
      number: '988',
      description: 'Mental health crisis support',
      when: 'Suicidal thoughts or mental health emergency'
    },
    {
      name: 'Nurse Hotline',
      number: '1-800-NURSES',
      description: '24/7 medical advice from registered nurses',
      when: 'Non-emergency medical questions'
    }
  ];

  /**
   * Emergency protocols for specific conditions
   */
  private emergencyProtocols: EmergencyProtocol[] = [
    {
      condition: 'Heart Attack',
      symptoms: ['chest pain', 'crushing chest pain', 'chest pressure', 'arm pain', 'jaw pain'],
      immediateActions: [
        'Call 911 immediately',
        'Chew aspirin if not allergic (325mg)',
        'Sit down and rest',
        'Loosen tight clothing',
        'Stay calm and wait for help'
      ],
      emergencyContacts: [
        {
          name: 'Emergency Services',
          number: '911',
          description: 'Immediate emergency response',
          when: 'Call now'
        }
      ],
      firstAidSteps: [
        'Keep person calm and seated',
        'Give aspirin if available and no allergies',
        'Monitor breathing and pulse',
        'Be prepared to perform CPR if needed'
      ],
      whatNotToDo: [
        'Do not drive to hospital',
        'Do not leave person alone',
        'Do not give food or water',
        'Do not wait to see if symptoms improve'
      ],
      timeframe: 'Every minute counts - Call 911 now'
    },
    {
      condition: 'Stroke',
      symptoms: ['face drooping', 'arm weakness', 'speech difficulty', 'sudden confusion'],
      immediateActions: [
        'Call 911 immediately',
        'Note the time symptoms started',
        'Keep person calm and lying down',
        'Do not give food, water, or medication'
      ],
      emergencyContacts: [
        {
          name: 'Emergency Services',
          number: '911',
          description: 'Stroke is a medical emergency',
          when: 'Call immediately'
        }
      ],
      firstAidSteps: [
        'Use FAST test: Face, Arms, Speech, Time',
        'Keep airway clear',
        'Position on side if vomiting',
        'Monitor vital signs'
      ],
      whatNotToDo: [
        'Do not give aspirin (unlike heart attack)',
        'Do not give food or water',
        'Do not leave person alone',
        'Do not wait for symptoms to improve'
      ],
      timeframe: 'Treatment must begin within 3-4.5 hours'
    },
    {
      condition: 'Severe Allergic Reaction',
      symptoms: ['difficulty breathing', 'swelling face/throat', 'hives', 'rapid pulse'],
      immediateActions: [
        'Use EpiPen if available',
        'Call 911 immediately',
        'Remove or avoid allergen',
        'Keep person calm and upright'
      ],
      emergencyContacts: [
        {
          name: 'Emergency Services',
          number: '911',
          description: 'Anaphylaxis can be fatal',
          when: 'Call immediately after using EpiPen'
        }
      ],
      firstAidSteps: [
        'Administer epinephrine auto-injector',
        'Help person sit upright',
        'Loosen tight clothing',
        'Be prepared for second dose of epinephrine'
      ],
      whatNotToDo: [
        'Do not assume one EpiPen dose is enough',
        'Do not leave person alone',
        'Do not give oral medications',
        'Do not have person lie flat if breathing is difficult'
      ],
      timeframe: 'Anaphylaxis can be fatal within minutes'
    },
    {
      condition: 'Severe Bleeding',
      symptoms: ['heavy bleeding', 'blood won\'t stop', 'gushing blood', 'blood loss'],
      immediateActions: [
        'Apply direct pressure to wound',
        'Call 911 immediately',
        'Elevate injured area if possible',
        'Keep person warm and calm'
      ],
      emergencyContacts: [
        {
          name: 'Emergency Services',
          number: '911',
          description: 'Severe bleeding emergency',
          when: 'Call while applying pressure'
        }
      ],
      firstAidSteps: [
        'Apply firm, direct pressure',
        'Use clean cloth or bandage',
        'Do not remove embedded objects',
        'Apply pressure to pressure points if needed'
      ],
      whatNotToDo: [
        'Do not remove objects from wound',
        'Do not peek under bandages',
        'Do not use tourniquet unless trained',
        'Do not give food or water'
      ],
      timeframe: 'Control bleeding immediately to prevent shock'
    }
  ];

  /**
   * Assess urgency and provide escalation recommendations
   */
  public assessUrgency(analysis: SymptomAnalysis): UrgencyEscalation {
    const urgencyLevel = analysis.urgencyLevel;
    
    switch (urgencyLevel) {
      case 'emergency':
        return this.createEmergencyEscalation(analysis);
      case 'high':
        return this.createHighUrgencyEscalation(analysis);
      case 'medium':
        return this.createMediumUrgencyEscalation(analysis);
      case 'low':
        return this.createLowUrgencyEscalation(analysis);
      default:
        return this.createDefaultEscalation();
    }
  }

  /**
   * Get emergency protocol for specific condition
   */
  public getEmergencyProtocol(condition: string): EmergencyProtocol | null {
    return this.emergencyProtocols.find(protocol => 
      protocol.condition.toLowerCase().includes(condition.toLowerCase()) ||
      protocol.symptoms.some(symptom => 
        condition.toLowerCase().includes(symptom.toLowerCase())
      )
    ) || null;
  }

  /**
   * Get appropriate emergency contacts based on symptoms
   */
  public getEmergencyContacts(analysis: SymptomAnalysis): EmergencyContact[] {
    const contacts: EmergencyContact[] = [];
    
    // Check for specific emergency types
    const symptoms = analysis.symptoms.map(s => s.symptom.toLowerCase()).join(' ');
    const emergencyFlags = analysis.emergencyFlags.map(f => f.toLowerCase()).join(' ');
    const allText = `${symptoms} ${emergencyFlags}`.toLowerCase();
    
    // Always include 911 for emergencies
    if (analysis.urgencyLevel === 'emergency') {
      contacts.push(this.emergencyContacts[0]); // 911
    }
    
    // Poison control for overdose/poisoning
    if (allText.includes('poison') || allText.includes('overdose') || allText.includes('pills')) {
      contacts.push(this.emergencyContacts[1]); // Poison Control
    }
    
    // Crisis line for mental health emergencies
    if (allText.includes('suicide') || allText.includes('kill myself') || allText.includes('want to die')) {
      contacts.push(this.emergencyContacts[2]); // Crisis Lifeline
    }
    
    // Nurse hotline for non-emergency but urgent situations
    if (analysis.urgencyLevel === 'high' || analysis.urgencyLevel === 'medium') {
      contacts.push(this.emergencyContacts[3]); // Nurse Hotline
    }
    
    return contacts;
  }

  /**
   * Generate immediate care recommendations
   */
  public getImmediateCareRecommendations(analysis: SymptomAnalysis): string[] {
    const recommendations: string[] = [];
    const urgencyLevel = analysis.urgencyLevel;
    
    if (urgencyLevel === 'emergency') {
      recommendations.push(
        '🚨 This is a medical emergency - Call 911 immediately',
        '⏰ Do not wait or drive yourself to the hospital',
        '📞 Stay on the line with emergency services',
        '🧘 Try to stay calm while help is on the way'
      );
      
      // Add specific emergency recommendations
      const emergencyFlags = analysis.emergencyFlags;
      emergencyFlags.forEach(flag => {
        const protocol = this.getEmergencyProtocol(flag);
        if (protocol) {
          recommendations.push(...protocol.immediateActions.map(action => `• ${action}`));
        }
      });
    } else if (urgencyLevel === 'high') {
      recommendations.push(
        '⚠️ Seek medical attention within the next few hours',
        '🏥 Consider going to urgent care or emergency room',
        '📞 Call your doctor or nurse hotline for guidance',
        '👥 Do not ignore these symptoms'
      );
    } else if (urgencyLevel === 'medium') {
      recommendations.push(
        '📅 Schedule an appointment within the next 1-2 days',
        '📞 Call your doctor\'s office during business hours',
        '📝 Monitor symptoms and note any changes',
        '🏥 Seek immediate care if symptoms worsen'
      );
    } else {
      recommendations.push(
        '📅 Schedule a routine appointment when convenient',
        '📝 Keep track of your symptoms',
        '💊 Consider over-the-counter remedies if appropriate',
        '📞 Contact your doctor if symptoms persist or worsen'
      );
    }
    
    return recommendations;
  }

  /**
   * Check if symptoms indicate immediate danger
   */
  public isImmediateDanger(analysis: SymptomAnalysis): boolean {
    return analysis.urgencyLevel === 'emergency' || 
           analysis.emergencyFlags.length > 0 ||
           analysis.urgencyScore >= 9;
  }

  /**
   * Get time-sensitive guidance
   */
  public getTimeGuidance(urgencyLevel: UrgencyLevel): string {
    switch (urgencyLevel) {
      case 'emergency':
        return 'IMMEDIATE - Call 911 now';
      case 'high':
        return 'Within 2-4 hours - Seek urgent care';
      case 'medium':
        return 'Within 1-2 days - Schedule appointment';
      case 'low':
        return 'Within 1-2 weeks - Routine care';
      default:
        return 'When convenient - Monitor symptoms';
    }
  }

  // Private helper methods for creating escalation responses

  private createEmergencyEscalation(analysis: SymptomAnalysis): UrgencyEscalation {
    return {
      urgencyLevel: 'emergency',
      immediateActions: [
        'Call 911 immediately',
        'Do not drive yourself to hospital',
        'Stay calm and follow emergency operator instructions',
        'Have someone stay with you if possible'
      ],
      emergencyContacts: this.getEmergencyContacts(analysis),
      timeframe: 'IMMEDIATE - Every second counts',
      warnings: [
        'This is a medical emergency',
        'Do not delay seeking immediate care',
        'Symptoms may be life-threatening'
      ],
      firstAidInstructions: this.getFirstAidInstructions(analysis)
    };
  }

  private createHighUrgencyEscalation(analysis: SymptomAnalysis): UrgencyEscalation {
    return {
      urgencyLevel: 'high',
      immediateActions: [
        'Seek medical attention within 2-4 hours',
        'Go to urgent care or emergency room',
        'Call your doctor or nurse hotline',
        'Do not ignore these symptoms'
      ],
      emergencyContacts: this.getEmergencyContacts(analysis),
      timeframe: 'Within 2-4 hours',
      warnings: [
        'These symptoms require prompt medical attention',
        'Condition may worsen without treatment',
        'Call 911 if symptoms become severe'
      ]
    };
  }

  private createMediumUrgencyEscalation(analysis: SymptomAnalysis): UrgencyEscalation {
    return {
      urgencyLevel: 'medium',
      immediateActions: [
        'Schedule appointment within 1-2 days',
        'Call your doctor during business hours',
        'Monitor symptoms closely',
        'Seek immediate care if symptoms worsen'
      ],
      emergencyContacts: [this.emergencyContacts[3]], // Nurse hotline
      timeframe: 'Within 1-2 days',
      warnings: [
        'Monitor symptoms for any worsening',
        'Seek immediate care if condition deteriorates',
        'Do not delay if new symptoms develop'
      ]
    };
  }

  private createLowUrgencyEscalation(analysis: SymptomAnalysis): UrgencyEscalation {
    return {
      urgencyLevel: 'low',
      immediateActions: [
        'Schedule routine appointment when convenient',
        'Monitor symptoms over time',
        'Consider appropriate self-care measures',
        'Contact doctor if symptoms persist or worsen'
      ],
      emergencyContacts: [this.emergencyContacts[3]], // Nurse hotline for questions
      timeframe: 'Within 1-2 weeks or when convenient',
      warnings: [
        'Contact healthcare provider if symptoms worsen',
        'Seek immediate care for any emergency symptoms',
        'Keep track of symptom patterns'
      ]
    };
  }

  private createDefaultEscalation(): UrgencyEscalation {
    return {
      urgencyLevel: 'low',
      immediateActions: [
        'Consult with healthcare provider',
        'Monitor your symptoms',
        'Seek care if symptoms worsen'
      ],
      emergencyContacts: [this.emergencyContacts[3]],
      timeframe: 'When convenient',
      warnings: [
        'Contact healthcare provider for persistent symptoms'
      ]
    };
  }

  private getFirstAidInstructions(analysis: SymptomAnalysis): string[] {
    const instructions: string[] = [];
    const emergencyFlags = analysis.emergencyFlags;
    
    emergencyFlags.forEach(flag => {
      const protocol = this.getEmergencyProtocol(flag);
      if (protocol) {
        instructions.push(...protocol.firstAidSteps);
      }
    });
    
    // Default emergency instructions if no specific protocol found
    if (instructions.length === 0) {
      instructions.push(
        'Stay calm and call for help',
        'Keep person comfortable and still',
        'Monitor breathing and consciousness',
        'Follow emergency operator instructions'
      );
    }
    
    return instructions;
  }
}

// Export singleton instance
export const urgencyEscalationService = UrgencyEscalationService.getInstance();