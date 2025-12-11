import { describe, it, expect, beforeEach } from 'vitest';
import { AIOrchestrator } from '../services/aiOrchestrator';
import { ConversationContext, ConversationStage, UrgencyLevel } from '../types/conversation';
import { ParsedSymptom } from '../types/medical';

describe('AIOrchestrator - Follow-up Questions Integration', () => {
  let orchestrator: AIOrchestrator;
  let mockContext: ConversationContext;

  beforeEach(() => {
    orchestrator = AIOrchestrator.getInstance();
    
    mockContext = {
      sessionId: 'test-session',
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'I have chest pain',
          type: 'text',
          timestamp: new Date()
        }
      ],
      currentSymptoms: ['chest pain'],
      urgencyLevel: 'medium' as UrgencyLevel,
      conversationStage: 'gathering' as ConversationStage,
      lastActivity: new Date(),
      isTyping: false,
      metadata: {}
    };
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate context-aware questions when context is provided', () => {
      const symptoms: ParsedSymptom[] = [
        {
          symptom: 'chest pain',
          severity: 'unknown',
          duration: 'unknown',
          location: 'unspecified',
          urgencyScore: 8
        }
      ];

      const questions = orchestrator.generateFollowUpQuestions(symptoms, mockContext);
      
      expect(questions).toHaveLength(3);
      expect(questions.every(q => typeof q === 'string')).toBe(true);
      expect(questions.some(q => 
        q.toLowerCase().includes('how long') || 
        q.toLowerCase().includes('severe') ||
        q.toLowerCase().includes('scale')
      )).toBe(true);
    });

    it('should fall back to basic questions when no context is provided', () => {
      const symptoms: ParsedSymptom[] = [
        {
          symptom: 'headache',
          severity: 'moderate',
          duration: '2 hours',
          location: 'forehead',
          urgencyScore: 4
        }
      ];

      const questions = orchestrator.generateFollowUpQuestions(symptoms);
      
      expect(questions).toHaveLength(3);
      expect(questions.every(q => typeof q === 'string')).toBe(true);
    });

    it('should prioritize emergency-related questions for high urgency symptoms', () => {
      const emergencySymptoms: ParsedSymptom[] = [
        {
          symptom: 'chest pain',
          severity: 'severe',
          duration: 'unknown',
          location: 'unspecified',
          urgencyScore: 10
        }
      ];

      mockContext.urgencyLevel = 'emergency';
      const questions = orchestrator.generateFollowUpQuestions(emergencySymptoms, mockContext);
      
      expect(questions).toHaveLength(3);
      // Should include emergency-focused questions
      expect(questions.some(q => 
        q.toLowerCase().includes('crushing') || 
        q.toLowerCase().includes('radiating') ||
        q.toLowerCase().includes('arm') ||
        q.toLowerCase().includes('jaw')
      )).toBe(true);
    });
  });

  describe('processUserMessage integration', () => {
    it('should use advanced follow-up questions in symptom gathering stage', async () => {
      mockContext.conversationStage = 'gathering';
      mockContext.metadata = {
        partialAnalysis: {
          symptoms: [
            {
              symptom: 'chest pain',
              severity: 'unknown',
              duration: 'unknown',
              location: 'unspecified',
              urgencyScore: 8
            }
          ],
          urgencyScore: 8,
          urgencyLevel: 'high' as UrgencyLevel,
          possibleConditions: ['Cardiac evaluation needed'],
          recommendedSpecialties: ['cardiology'],
          followUpQuestions: [],
          emergencyFlags: []
        }
      };

      const response = await orchestrator.processUserMessage('It hurts a lot', mockContext);
      
      expect(response.followUpQuestions).toBeDefined();
      expect(response.followUpQuestions!.length).toBeGreaterThan(0);
      
      // Check that the symptom analysis contains the advanced follow-up questions
      expect(response.metadata?.symptomAnalysis?.followUpQuestions).toBeDefined();
      expect(response.metadata!.symptomAnalysis!.followUpQuestions.some((q: string) => 
        q.toLowerCase().includes('how long') || 
        q.toLowerCase().includes('severe') ||
        q.toLowerCase().includes('scale') ||
        q.toLowerCase().includes('where')
      )).toBe(true);
    });
  });

  describe('symptom-specific question generation', () => {
    it('should generate pain-specific questions for pain symptoms', () => {
      const painSymptoms: ParsedSymptom[] = [
        {
          symptom: 'back pain',
          severity: 'moderate',
          duration: '1 week',
          location: 'lower back',
          urgencyScore: 4
        }
      ];

      const questions = orchestrator.generateFollowUpQuestions(painSymptoms, mockContext);
      
      expect(questions.some(q => 
        q.toLowerCase().includes('sharp') || 
        q.toLowerCase().includes('dull') ||
        q.toLowerCase().includes('throbbing') ||
        q.toLowerCase().includes('burning')
      )).toBe(true);
    });

    it('should generate respiratory-specific questions for breathing symptoms', () => {
      const respiratorySymptoms: ParsedSymptom[] = [
        {
          symptom: 'cough',
          severity: 'mild',
          duration: '3 days',
          location: 'chest',
          urgencyScore: 3
        }
      ];

      const questions = orchestrator.generateFollowUpQuestions(respiratorySymptoms, mockContext);
      
      expect(questions.some(q => 
        q.toLowerCase().includes('phlegm') || 
        q.toLowerCase().includes('blood') ||
        q.toLowerCase().includes('coughing up')
      )).toBe(true);
    });

    it('should ask about missing information first', () => {
      const incompleteSymptoms: ParsedSymptom[] = [
        {
          symptom: 'abdominal pain',
          severity: 'unknown',
          duration: 'unknown',
          location: 'unspecified',
          urgencyScore: 5
        }
      ];

      const questions = orchestrator.generateFollowUpQuestions(incompleteSymptoms, mockContext);
      
      // Should prioritize asking about missing duration, severity, or location
      expect(questions.some(q => 
        q.toLowerCase().includes('how long') || 
        q.toLowerCase().includes('severe') ||
        q.toLowerCase().includes('scale') ||
        q.toLowerCase().includes('where')
      )).toBe(true);
    });
  });
});