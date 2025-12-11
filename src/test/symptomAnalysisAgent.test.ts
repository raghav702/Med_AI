import { describe, it, expect } from 'vitest';
import { SymptomAnalysisAgent } from '../services/agents/symptomAnalysisAgent';

describe('SymptomAnalysisAgent', () => {
  const agent = new SymptomAnalysisAgent();

  describe('symptom detection', () => {
    it('should detect chest pain symptoms', () => {
      const result = agent.analyzeSymptoms('I have severe chest pain');
      
      expect(result.symptoms).toHaveLength(1);
      expect(result.symptoms[0].symptom).toBe('chest pain');
      expect(result.symptoms[0].severity).toBe('severe');
      expect(result.urgencyLevel).toBe('high');
    });

    it('should detect multiple symptoms', () => {
      const result = agent.analyzeSymptoms('I have a headache and fever for 2 days');
      
      expect(result.symptoms).toHaveLength(2);
      expect(result.symptoms.map(s => s.symptom)).toContain('headache');
      expect(result.symptoms.map(s => s.symptom)).toContain('fever');
    });

    it('should extract duration information', () => {
      const result = agent.analyzeSymptoms('I have had a cough for 3 days');
      
      expect(result.symptoms[0].duration).toBe('3 days');
    });
  });

  describe('urgency assessment', () => {
    it('should classify emergency symptoms correctly', () => {
      const result = agent.analyzeSymptoms('I am having difficulty breathing and chest pain');
      
      expect(result.urgencyLevel).toBe('emergency');
      expect(result.emergencyFlags.length).toBeGreaterThan(0);
    });

    it('should classify high urgency symptoms', () => {
      const result = agent.analyzeSymptoms('I have severe chest pain');
      
      expect(result.urgencyLevel).toBe('high');
    });

    it('should classify low urgency symptoms', () => {
      const result = agent.analyzeSymptoms('I have mild fatigue');
      
      expect(result.urgencyLevel).toBe('low');
    });
  });

  describe('follow-up questions', () => {
    it('should generate relevant follow-up questions', () => {
      const result = agent.analyzeSymptoms('I have chest pain');
      
      expect(result.followUpQuestions).toHaveLength(3);
      expect(result.followUpQuestions[0]).toContain('How long');
    });

    it('should generate general questions for vague symptoms', () => {
      const result = agent.analyzeSymptoms('I feel unwell');
      
      expect(result.followUpQuestions).toHaveLength(3);
      expect(result.followUpQuestions[0]).toContain('describe your main symptoms');
    });
  });

  describe('specialty recommendations', () => {
    it('should recommend cardiology for chest pain', () => {
      const result = agent.analyzeSymptoms('I have chest pain');
      
      expect(result.recommendedSpecialties).toContain('cardiology');
    });

    it('should recommend multiple specialties for complex symptoms', () => {
      const result = agent.analyzeSymptoms('I have shortness of breath and chest pain');
      
      expect(result.recommendedSpecialties).toContain('cardiology');
      expect(result.recommendedSpecialties).toContain('pulmonology');
    });
  });

  describe('condition inference', () => {
    it('should infer possible cardiac conditions', () => {
      const result = agent.analyzeSymptoms('I have chest pain and shortness of breath');
      
      expect(result.possibleConditions).toContain('Possible cardiac condition');
    });

    it('should infer respiratory infections', () => {
      const result = agent.analyzeSymptoms('I have fever and cough');
      
      expect(result.possibleConditions).toContain('Respiratory infection');
    });
  });
});