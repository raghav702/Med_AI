// Medical Knowledge Base for AI Medical Assistant
// Contains symptom-to-specialty mappings, emergency symptoms, and common conditions

export interface MedicalCondition {
  name: string;
  symptoms: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  specialties: string[];
  description: string;
}

export interface SymptomMapping {
  symptom: string;
  keywords: string[];
  specialties: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  followUpQuestions: string[];
}

export interface EmergencySymptom {
  symptom: string;
  keywords: string[];
  urgencyLevel: 'emergency';
  immediateAction: string;
  description: string;
}

// Emergency symptoms that require immediate medical attention
export const EMERGENCY_SYMPTOMS: EmergencySymptom[] = [
  {
    symptom: 'Chest Pain',
    keywords: ['chest pain', 'heart attack', 'crushing chest pain', 'chest pressure', 'chest tightness'],
    urgencyLevel: 'emergency',
    immediateAction: 'Call 911 immediately',
    description: 'Severe chest pain may indicate heart attack or other cardiac emergency'
  },
  {
    symptom: 'Difficulty Breathing',
    keywords: ['can\'t breathe', 'shortness of breath', 'difficulty breathing', 'gasping', 'choking'],
    urgencyLevel: 'emergency',
    immediateAction: 'Call 911 immediately',
    description: 'Severe breathing difficulties require immediate medical attention'
  },
  {
    symptom: 'Severe Head Injury',
    keywords: ['head injury', 'unconscious', 'loss of consciousness', 'severe headache', 'confusion after injury'],
    urgencyLevel: 'emergency',
    immediateAction: 'Call 911 immediately',
    description: 'Head injuries with loss of consciousness or severe symptoms'
  },
  {
    symptom: 'Stroke Symptoms',
    keywords: ['stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'sudden numbness'],
    urgencyLevel: 'emergency',
    immediateAction: 'Call 911 immediately - Time is critical',
    description: 'Signs of stroke require immediate emergency treatment'
  },
  {
    symptom: 'Severe Bleeding',
    keywords: ['severe bleeding', 'heavy bleeding', 'blood loss', 'hemorrhage', 'uncontrolled bleeding'],
    urgencyLevel: 'emergency',
    immediateAction: 'Apply pressure and call 911',
    description: 'Severe bleeding that cannot be controlled'
  },
  {
    symptom: 'Allergic Reaction',
    keywords: ['anaphylaxis', 'severe allergic reaction', 'swelling face', 'difficulty swallowing', 'hives with breathing'],
    urgencyLevel: 'emergency',
    immediateAction: 'Use EpiPen if available and call 911',
    description: 'Severe allergic reactions can be life-threatening'
  },
  {
    symptom: 'Severe Abdominal Pain',
    keywords: ['severe stomach pain', 'appendicitis', 'severe abdominal pain', 'rigid abdomen'],
    urgencyLevel: 'emergency',
    immediateAction: 'Go to emergency room immediately',
    description: 'Severe abdominal pain may indicate appendicitis or other surgical emergency'
  }
];

// Comprehensive symptom-to-specialty mappings
export const SYMPTOM_MAPPINGS: SymptomMapping[] = [
  // Cardiovascular symptoms
  {
    symptom: 'Heart Palpitations',
    keywords: ['heart racing', 'palpitations', 'irregular heartbeat', 'heart skipping'],
    specialties: ['Cardiology', 'Internal Medicine'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'How long have you been experiencing these palpitations?',
      'Do you feel dizzy or short of breath with the palpitations?',
      'Have you had any chest pain?'
    ]
  },
  {
    symptom: 'High Blood Pressure',
    keywords: ['high blood pressure', 'hypertension', 'elevated bp'],
    specialties: ['Cardiology', 'Internal Medicine'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'What was your last blood pressure reading?',
      'Are you currently taking any blood pressure medications?',
      'Do you have any symptoms like headaches or dizziness?'
    ]
  },
  
  // Respiratory symptoms
  {
    symptom: 'Persistent Cough',
    keywords: ['chronic cough', 'persistent cough', 'cough for weeks'],
    specialties: ['Pulmonology', 'Internal Medicine'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'How long have you had this cough?',
      'Are you coughing up any blood or phlegm?',
      'Do you have any fever or weight loss?'
    ]
  },
  {
    symptom: 'Asthma',
    keywords: ['asthma', 'wheezing', 'breathing problems', 'inhaler'],
    specialties: ['Pulmonology', 'Allergy and Immunology'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'Are you using your rescue inhaler more frequently?',
      'What triggers your asthma symptoms?',
      'Have you had any recent asthma attacks?'
    ]
  },

  // Gastrointestinal symptoms
  {
    symptom: 'Stomach Pain',
    keywords: ['stomach ache', 'abdominal pain', 'belly pain', 'stomach cramps'],
    specialties: ['Gastroenterology', 'Internal Medicine'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'Where exactly is the pain located?',
      'How severe is the pain on a scale of 1-10?',
      'Does eating make it better or worse?'
    ]
  },
  {
    symptom: 'Digestive Issues',
    keywords: ['diarrhea', 'constipation', 'nausea', 'vomiting', 'indigestion'],
    specialties: ['Gastroenterology', 'Internal Medicine'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'How long have you been experiencing these symptoms?',
      'Have you noticed any blood in your stool?',
      'Have you changed your diet recently?'
    ]
  },

  // Neurological symptoms
  {
    symptom: 'Headaches',
    keywords: ['headache', 'migraine', 'head pain'],
    specialties: ['Neurology', 'Internal Medicine'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'How often do you get these headaches?',
      'On a scale of 1-10, how severe is the pain?',
      'Do you have any visual changes or nausea with the headaches?'
    ]
  },
  {
    symptom: 'Memory Problems',
    keywords: ['memory loss', 'forgetfulness', 'confusion', 'dementia'],
    specialties: ['Neurology', 'Geriatrics'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'When did you first notice memory problems?',
      'Are you having trouble with daily activities?',
      'Has anyone in your family had similar issues?'
    ]
  },

  // Musculoskeletal symptoms
  {
    symptom: 'Joint Pain',
    keywords: ['joint pain', 'arthritis', 'stiff joints', 'swollen joints'],
    specialties: ['Rheumatology', 'Orthopedics'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'Which joints are affected?',
      'Is the pain worse in the morning or evening?',
      'Do you have any swelling or redness?'
    ]
  },
  {
    symptom: 'Back Pain',
    keywords: ['back pain', 'lower back pain', 'spine pain'],
    specialties: ['Orthopedics', 'Physical Medicine'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'Where exactly is the pain located?',
      'Did you injure your back recently?',
      'Does the pain radiate down your legs?'
    ]
  },

  // Dermatological symptoms
  {
    symptom: 'Skin Rash',
    keywords: ['rash', 'skin irritation', 'itchy skin', 'skin condition'],
    specialties: ['Dermatology'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'When did the rash first appear?',
      'Is it itchy or painful?',
      'Have you used any new products recently?'
    ]
  },
  {
    symptom: 'Skin Cancer Concern',
    keywords: ['mole changes', 'skin cancer', 'suspicious mole', 'skin lesion'],
    specialties: ['Dermatology'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'Has the mole changed in size, color, or shape?',
      'Is it bleeding or itching?',
      'Do you have a family history of skin cancer?'
    ]
  },

  // Mental Health symptoms
  {
    symptom: 'Depression',
    keywords: ['depression', 'sad', 'hopeless', 'low mood'],
    specialties: ['Psychiatry', 'Psychology'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'How long have you been feeling this way?',
      'Are you having thoughts of hurting yourself?',
      'Have you lost interest in activities you used to enjoy?'
    ]
  },
  {
    symptom: 'Anxiety',
    keywords: ['anxiety', 'panic attacks', 'worried', 'stress'],
    specialties: ['Psychiatry', 'Psychology'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'What situations trigger your anxiety?',
      'Do you have physical symptoms like rapid heartbeat?',
      'How is this affecting your daily life?'
    ]
  },

  // Women's Health symptoms
  {
    symptom: 'Menstrual Issues',
    keywords: ['irregular periods', 'heavy bleeding', 'missed period', 'menstrual pain'],
    specialties: ['Gynecology'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'How long is your typical cycle?',
      'When was your last period?',
      'Are you sexually active?'
    ]
  },

  // Eye symptoms
  {
    symptom: 'Vision Problems',
    keywords: ['blurry vision', 'eye pain', 'vision loss', 'double vision'],
    specialties: ['Ophthalmology'],
    urgencyLevel: 'medium',
    followUpQuestions: [
      'When did you first notice vision changes?',
      'Is it affecting one or both eyes?',
      'Do you have any eye pain or headaches?'
    ]
  },

  // Ear, Nose, Throat symptoms
  {
    symptom: 'Sore Throat',
    keywords: ['sore throat', 'throat pain', 'difficulty swallowing'],
    specialties: ['ENT', 'Internal Medicine'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'How long have you had the sore throat?',
      'Do you have a fever?',
      'Are your lymph nodes swollen?'
    ]
  },
  {
    symptom: 'Hearing Problems',
    keywords: ['hearing loss', 'ear pain', 'ringing in ears', 'tinnitus'],
    specialties: ['ENT', 'Audiology'],
    urgencyLevel: 'low',
    followUpQuestions: [
      'Is the hearing loss sudden or gradual?',
      'Do you have any ear pain or discharge?',
      'Have you been exposed to loud noises?'
    ]
  }
];

// Common medical conditions database
export const MEDICAL_CONDITIONS: MedicalCondition[] = [
  {
    name: 'Hypertension',
    symptoms: ['high blood pressure', 'headaches', 'dizziness'],
    urgencyLevel: 'medium',
    specialties: ['Cardiology', 'Internal Medicine'],
    description: 'High blood pressure that can lead to heart disease and stroke'
  },
  {
    name: 'Type 2 Diabetes',
    symptoms: ['frequent urination', 'excessive thirst', 'fatigue', 'blurred vision'],
    urgencyLevel: 'medium',
    specialties: ['Endocrinology', 'Internal Medicine'],
    description: 'Chronic condition affecting blood sugar regulation'
  },
  {
    name: 'Asthma',
    symptoms: ['wheezing', 'shortness of breath', 'chest tightness', 'coughing'],
    urgencyLevel: 'medium',
    specialties: ['Pulmonology', 'Allergy and Immunology'],
    description: 'Chronic respiratory condition causing airway inflammation'
  },
  {
    name: 'Migraine',
    symptoms: ['severe headache', 'nausea', 'light sensitivity', 'visual disturbances'],
    urgencyLevel: 'medium',
    specialties: ['Neurology'],
    description: 'Recurring headaches with neurological symptoms'
  },
  {
    name: 'Arthritis',
    symptoms: ['joint pain', 'stiffness', 'swelling', 'reduced range of motion'],
    urgencyLevel: 'low',
    specialties: ['Rheumatology', 'Orthopedics'],
    description: 'Inflammation of joints causing pain and stiffness'
  },
  {
    name: 'Depression',
    symptoms: ['persistent sadness', 'loss of interest', 'fatigue', 'sleep changes'],
    urgencyLevel: 'medium',
    specialties: ['Psychiatry', 'Psychology'],
    description: 'Mental health condition affecting mood and daily functioning'
  },
  {
    name: 'Anxiety Disorder',
    symptoms: ['excessive worry', 'restlessness', 'rapid heartbeat', 'sweating'],
    urgencyLevel: 'medium',
    specialties: ['Psychiatry', 'Psychology'],
    description: 'Mental health condition characterized by excessive anxiety'
  },
  {
    name: 'GERD',
    symptoms: ['heartburn', 'acid reflux', 'chest pain', 'difficulty swallowing'],
    urgencyLevel: 'low',
    specialties: ['Gastroenterology'],
    description: 'Gastroesophageal reflux disease causing stomach acid backup'
  },
  {
    name: 'Allergic Rhinitis',
    symptoms: ['sneezing', 'runny nose', 'itchy eyes', 'nasal congestion'],
    urgencyLevel: 'low',
    specialties: ['Allergy and Immunology', 'ENT'],
    description: 'Allergic reaction affecting the nose and eyes'
  },
  {
    name: 'Eczema',
    symptoms: ['itchy skin', 'red patches', 'dry skin', 'skin inflammation'],
    urgencyLevel: 'low',
    specialties: ['Dermatology'],
    description: 'Chronic skin condition causing inflammation and itching'
  }
];

// Medical specialties mapping
export const MEDICAL_SPECIALTIES = {
  'Internal Medicine': {
    name: 'Internal Medicine',
    description: 'General adult medicine and primary care',
    commonConditions: ['hypertension', 'diabetes', 'general health checkups']
  },
  'Cardiology': {
    name: 'Cardiology',
    description: 'Heart and cardiovascular system',
    commonConditions: ['heart disease', 'high blood pressure', 'chest pain']
  },
  'Pulmonology': {
    name: 'Pulmonology',
    description: 'Lungs and respiratory system',
    commonConditions: ['asthma', 'COPD', 'lung infections']
  },
  'Gastroenterology': {
    name: 'Gastroenterology',
    description: 'Digestive system and stomach',
    commonConditions: ['GERD', 'IBS', 'stomach pain']
  },
  'Neurology': {
    name: 'Neurology',
    description: 'Brain and nervous system',
    commonConditions: ['headaches', 'seizures', 'memory problems']
  },
  'Orthopedics': {
    name: 'Orthopedics',
    description: 'Bones, joints, and muscles',
    commonConditions: ['fractures', 'joint pain', 'sports injuries']
  },
  'Dermatology': {
    name: 'Dermatology',
    description: 'Skin, hair, and nails',
    commonConditions: ['acne', 'rashes', 'skin cancer screening']
  },
  'Psychiatry': {
    name: 'Psychiatry',
    description: 'Mental health and psychiatric conditions',
    commonConditions: ['depression', 'anxiety', 'bipolar disorder']
  },
  'Psychology': {
    name: 'Psychology',
    description: 'Mental health counseling and therapy',
    commonConditions: ['therapy', 'counseling', 'behavioral issues']
  },
  'Gynecology': {
    name: 'Gynecology',
    description: 'Women\'s reproductive health',
    commonConditions: ['menstrual issues', 'pregnancy care', 'reproductive health']
  },
  'Ophthalmology': {
    name: 'Ophthalmology',
    description: 'Eyes and vision',
    commonConditions: ['vision problems', 'eye infections', 'glaucoma']
  },
  'ENT': {
    name: 'Ear, Nose & Throat',
    description: 'Ear, nose, throat, and head/neck conditions',
    commonConditions: ['hearing loss', 'sinus problems', 'throat issues']
  },
  'Endocrinology': {
    name: 'Endocrinology',
    description: 'Hormones and endocrine system',
    commonConditions: ['diabetes', 'thyroid problems', 'hormone imbalances']
  },
  'Rheumatology': {
    name: 'Rheumatology',
    description: 'Autoimmune and inflammatory conditions',
    commonConditions: ['arthritis', 'lupus', 'autoimmune diseases']
  },
  'Allergy and Immunology': {
    name: 'Allergy & Immunology',
    description: 'Allergies and immune system disorders',
    commonConditions: ['allergies', 'asthma', 'immune deficiencies']
  }
};

// Utility functions for medical knowledge base
export class MedicalKnowledgeService {
  
  /**
   * Check if symptoms indicate an emergency
   */
  static isEmergencySymptom(symptomText: string): EmergencySymptom | null {
    const lowerSymptom = symptomText.toLowerCase();
    
    for (const emergency of EMERGENCY_SYMPTOMS) {
      for (const keyword of emergency.keywords) {
        if (lowerSymptom.includes(keyword.toLowerCase())) {
          return emergency;
        }
      }
    }
    
    return null;
  }

  /**
   * Find matching symptoms and their specialties
   */
  static findMatchingSymptoms(symptomText: string): SymptomMapping[] {
    const lowerSymptom = symptomText.toLowerCase();
    const matches: SymptomMapping[] = [];
    
    for (const mapping of SYMPTOM_MAPPINGS) {
      for (const keyword of mapping.keywords) {
        if (lowerSymptom.includes(keyword.toLowerCase())) {
          matches.push(mapping);
          break; // Avoid duplicate matches for the same mapping
        }
      }
    }
    
    return matches;
  }

  /**
   * Get recommended specialties based on symptoms
   */
  static getRecommendedSpecialties(symptomText: string): string[] {
    const matches = this.findMatchingSymptoms(symptomText);
    const specialties = new Set<string>();
    
    matches.forEach(match => {
      match.specialties.forEach(specialty => specialties.add(specialty));
    });
    
    return Array.from(specialties);
  }

  /**
   * Assess urgency level based on symptoms
   */
  static assessUrgencyLevel(symptomText: string): 'low' | 'medium' | 'high' | 'emergency' {
    // Check for emergency symptoms first
    if (this.isEmergencySymptom(symptomText)) {
      return 'emergency';
    }
    
    const matches = this.findMatchingSymptoms(symptomText);
    
    if (matches.length === 0) {
      return 'low'; // Default for unknown symptoms
    }
    
    // Return the highest urgency level found
    const urgencyLevels = matches.map(match => match.urgencyLevel);
    
    if (urgencyLevels.includes('high')) return 'high';
    if (urgencyLevels.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Generate follow-up questions based on symptoms
   */
  static getFollowUpQuestions(symptomText: string): string[] {
    const matches = this.findMatchingSymptoms(symptomText);
    const questions = new Set<string>();
    
    matches.forEach(match => {
      match.followUpQuestions.forEach(question => questions.add(question));
    });
    
    return Array.from(questions);
  }

  /**
   * Find medical conditions that match symptoms
   */
  static findMatchingConditions(symptomText: string): MedicalCondition[] {
    const lowerSymptom = symptomText.toLowerCase();
    const matches: MedicalCondition[] = [];
    
    for (const condition of MEDICAL_CONDITIONS) {
      for (const symptom of condition.symptoms) {
        if (lowerSymptom.includes(symptom.toLowerCase())) {
          matches.push(condition);
          break; // Avoid duplicate matches for the same condition
        }
      }
    }
    
    return matches;
  }

  /**
   * Get specialty information
   */
  static getSpecialtyInfo(specialtyName: string) {
    return MEDICAL_SPECIALTIES[specialtyName as keyof typeof MEDICAL_SPECIALTIES];
  }

  /**
   * Get all available specialties
   */
  static getAllSpecialties(): string[] {
    return Object.keys(MEDICAL_SPECIALTIES);
  }
}