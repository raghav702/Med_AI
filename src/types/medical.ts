export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';

export interface ParsedSymptom {
  symptom: string;
  severity: string;
  duration: string;
  location: string;
  urgencyScore: number;
}

export interface SymptomAnalysis {
  symptoms: ParsedSymptom[];
  urgencyScore: number;
  urgencyLevel: UrgencyLevel;
  possibleConditions: string[];
  recommendedSpecialties: string[];
  followUpQuestions: string[];
  emergencyFlags: string[];
}

export interface MedicalSpecialty {
  id: string;
  name: string;
  description: string;
  commonConditions: string[];
}

export interface EmergencyProtocol {
  condition: string;
  immediateActions: string[];
  emergencyContacts: string[];
  firstAidInstructions?: string[];
}