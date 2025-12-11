import { describe, it, expect, beforeEach } from 'vitest';
import { followUpQuestionGenerator } from '../services/agents/followUpQuestionGenerator';
import { ParsedSymptom, UrgencyLevel } from '../types/medical';
import { ConversationContext, ConversationStage } from '../types/conversation';

describe('FollowUpQuestionGenerator', () => {
  let mockContext: ConversationContext;
  let mockSymptoms: ParsedSymptom[];

  beforeEach(() => {
    mockContext = {
      sessionId: 'test-session',
      messages: [],
      currentSymptoms: ['chest pain', 'shortness of breath'],
      urgencyLevel: 'medium' as UrgencyLevel,
      conversationStage: 'gathering' as ConversationStage,
      lastActivity: new Date(),
      isTyping: false,
      metadata: {}
    };

    mockSymptoms = [
      {
        symptom: 'chest pain',
        severity: 'unknown',
        duration: 'unknown',
        location: 'unspecified',
        urgencyScore: 8
      },
      {
        symptom: 'shortness of breath',
        severity: 'moderate',
        duration: '2 days',
        location: 'chest',
        urgencyScore: 7
      }
    ];
  });

  describe('generateQuestions', () => {
    it('should generate prioritized questions based on symptoms and context', () => {
      const questions = followUpQuestionGenerator.generateQuestions(mockSymptoms, mockContext, 3);
      
      expect(questions).toHaveLength(3);
      expect(questions[0]).toHaveProperty('question');
      expect(questions[0]).toHaveProperty('priority');
      expect(questions[0]).toHaveProperty('category');
      expect(questions[0]).toHaveProperty('reasoning');
    });

    it('should prioritize emergency questions for high urgency symptoms', () => {
      mockContext.urgencyLevel = 'emergency';
      mockSymptoms[0].urgencyScore = 10;
      
      const questions = followUpQuestionGenerator.generateQuestions(mockSymptoms, mockContext, 3);
      
      expect(questions.some(q => q.category === 'emergency')).toBe(true);
      expect(questions[0].priority).toBeGreaterThan(8);
    });

    it('should ask about missing information first', () => {
      const questions = followUpQuestionGenerator.generateQuestions(mockSymptoms, mockContext, 3);
      
      // Should ask about severity for chest pain since it's unknown
      expect(questions.some(q => 
        q.question.toLowerCase().includes('severe') || 
        q.question.toLowerCase().includes('scale')
      )).toBe(true);
    });
  });

  describe('generateSymptomSpecificQuestions', () => {
    it('should generate duration questions for symptoms without duration', () => {
      const symptom: ParsedSymptom = {
        symptom: 'headache',
        severity: 'moderate',
        duration: 'unknown',
        location: 'forehead',
        urgencyScore: 5
      };

      const questions = followUpQuestionGenerator.generateSymptomSpecificQuestions(symptom);
      
      expect(questions.some(q => 
        q.category === 'duration' && 
        q.question.toLowerCase().includes('how long')
      )).toBe(true);
    });

    it('should generate severity questions for symptoms without severity', () => {
      const symptom: ParsedSymptom = {
        symptom: 'back pain',
        severity: 'unknown',
        duration: '1 week',
        location: 'lower back',
        urgencyScore: 4
      };

      const questions = followUpQuestionGenerator.generateSymptomSpecificQuestions(symptom);
      
      expect(questions.some(q => 
        q.category === 'severity' && 
        (q.question.toLowerCase().includes('scale') || q.question.toLowerCase().includes('severe'))
      )).toBe(true);
    });

    it('should generate location questions for symptoms without location', () => {
      const symptom: ParsedSymptom = {
        symptom: 'abdominal pain',
        severity: 'moderate',
        duration: '2 hours',
        location: 'unspecified',
        urgencyScore: 6
      };

      const questions = followUpQuestionGenerator.generateSymptomSpecificQuestions(symptom);
      
      expect(questions.some(q => 
        q.category === 'location' && 
        q.question.toLowerCase().includes('where')
      )).toBe(true);
    });

    it('should generate pain-specific questions for pain symptoms', () => {
      const symptom: ParsedSymptom = {
        symptom: 'chest pain',
        severity: 'severe',
        duration: '30 minutes',
        location: 'center chest',
        urgencyScore: 8
      };

      const questions = followUpQuestionGenerator.generateSymptomSpecificQuestions(symptom);
      
      expect(questions.some(q => 
        q.question.toLowerCase().includes('sharp') || 
        q.question.toLowerCase().includes('dull') ||
        q.question.toLowerCase().includes('burning')
      )).toBe(true);
    });
  });

  describe('generateContextualQuestions', () => {
    it('should ask about symptom progression if not mentioned', () => {
      const conversationHistory = ['I have chest pain', 'It started this morning'];
      
      const questions = followUpQuestionGenerator.generateContextualQuestions(mockSymptoms, conversationHistory);
      
      expect(questions.some(q => 
        q.category === 'progression' && 
        (q.question.toLowerCase().includes('better') || q.question.toLowerCase().includes('worse'))
      )).toBe(true);
    });

    it('should ask about triggers if not mentioned', () => {
      const conversationHistory = ['I have a headache', 'It hurts a lot'];
      
      const questions = followUpQuestionGenerator.generateContextualQuestions(mockSymptoms, conversationHistory);
      
      expect(questions.some(q => 
        q.category === 'triggers' && 
        q.question.toLowerCase().includes('trigger')
      )).toBe(true);
    });

    it('should ask about associated symptoms for single symptoms', () => {
      const singleSymptom = [mockSymptoms[0]];
      const conversationHistory = ['I have chest pain'];
      
      const questions = followUpQuestionGenerator.generateContextualQuestions(singleSymptom, conversationHistory);
      
      expect(questions.some(q => 
        q.category === 'associated' && 
        q.question.toLowerCase().includes('other symptoms')
      )).toBe(true);
    });
  });

  describe('generateEmergencyQuestions', () => {
    it('should generate emergency questions for chest pain', () => {
      const emergencySymptom: ParsedSymptom = {
        symptom: 'chest pain',
        severity: 'severe',
        duration: '20 minutes',
        location: 'center chest',
        urgencyScore: 9
      };

      const questions = followUpQuestionGenerator.generateEmergencyQuestions([emergencySymptom]);
      
      expect(questions.some(q => 
        q.category === 'emergency' && 
        (q.question.toLowerCase().includes('crushing') || 
         q.question.toLowerCase().includes('radiating') ||
         q.question.toLowerCase().includes('arm'))
      )).toBe(true);
    });

    it('should generate emergency questions for breathing difficulty', () => {
      const emergencySymptom: ParsedSymptom = {
        symptom: 'shortness of breath',
        severity: 'severe',
        duration: '10 minutes',
        location: 'chest',
        urgencyScore: 8
      };

      const questions = followUpQuestionGenerator.generateEmergencyQuestions([emergencySymptom]);
      
      expect(questions.some(q => 
        q.category === 'emergency' && 
        q.question.toLowerCase().includes('speaking')
      )).toBe(true);
    });

    it('should generate emergency questions for severe headache', () => {
      const emergencySymptom: ParsedSymptom = {
        symptom: 'headache',
        severity: 'severe',
        duration: 'sudden',
        location: 'entire head',
        urgencyScore: 8
      };

      const questions = followUpQuestionGenerator.generateEmergencyQuestions([emergencySymptom]);
      
      expect(questions.some(q => 
        q.category === 'emergency' && 
        (q.question.toLowerCase().includes('worst') || 
         q.question.toLowerCase().includes('sudden'))
      )).toBe(true);
    });
  });

  describe('question prioritization', () => {
    it('should prioritize emergency questions highest', () => {
      mockContext.urgencyLevel = 'emergency';
      const emergencySymptom: ParsedSymptom = {
        symptom: 'chest pain',
        severity: 'severe',
        duration: 'unknown',
        location: 'unspecified',
        urgencyScore: 10
      };

      const questions = followUpQuestionGenerator.generateQuestions([emergencySymptom], mockContext, 5);
      
      const emergencyQuestions = questions.filter(q => q.category === 'emergency');
      const otherQuestions = questions.filter(q => q.category !== 'emergency');
      
      if (emergencyQuestions.length > 0 && otherQuestions.length > 0) {
        expect(emergencyQuestions[0].priority).toBeGreaterThan(otherQuestions[0].priority);
      }
    });

    it('should prioritize duration questions when missing', () => {
      const symptomWithoutDuration: ParsedSymptom = {
        symptom: 'back pain',
        severity: 'moderate',
        duration: 'unknown',
        location: 'lower back',
        urgencyScore: 4
      };

      const questions = followUpQuestionGenerator.generateQuestions([symptomWithoutDuration], mockContext, 3);
      
      const durationQuestions = questions.filter(q => q.category === 'duration');
      expect(durationQuestions.length).toBeGreaterThan(0);
      expect(durationQuestions[0].priority).toBeGreaterThanOrEqual(8);
    });
  });
});