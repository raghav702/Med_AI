import { describe, it, expect } from 'vitest';
import { aiOrchestrator } from '../services/aiOrchestrator';
import { ConversationContext } from '../types/conversation';

describe('Urgency Detection Integration', () => {
  const createTestContext = (): ConversationContext => ({
    sessionId: 'test-session',
    messages: [],
    currentSymptoms: [],
    urgencyLevel: 'low',
    conversationStage: 'initial',
    lastActivity: new Date(),
    isTyping: false,
    metadata: {}
  });

  it('should process emergency symptoms and provide response', async () => {
    const context = createTestContext();
    const emergencyMessage = "I think I'm having a heart attack with crushing chest pain";
    
    const response = await aiOrchestrator.processUserMessage(emergencyMessage, context);
    
    // Should detect urgency and provide appropriate response
    expect(response.urgencyLevel).toBeDefined();
    expect(response.message).toBeDefined();
    expect(response.message.length).toBeGreaterThan(0);
  });

  it('should handle symptoms and provide escalation metadata', async () => {
    const context = createTestContext();
    const symptomMessage = "I have severe abdominal pain";
    
    const response = await aiOrchestrator.processUserMessage(symptomMessage, context);
    
    // Should provide some level of urgency assessment
    expect(response.urgencyLevel).toBeDefined();
    expect(['low', 'medium', 'high', 'emergency']).toContain(response.urgencyLevel!);
  });

  it('should provide follow-up questions for symptom gathering', async () => {
    const context = createTestContext();
    const symptomMessage = "I have a headache and feel nauseous";
    
    const response = await aiOrchestrator.processUserMessage(symptomMessage, context);
    
    expect(response.followUpQuestions).toBeDefined();
    expect(response.followUpQuestions!.length).toBeGreaterThan(0);
  });

  it('should handle conversation flow properly', async () => {
    const context = createTestContext();
    const message = "I'm having severe bleeding that won't stop";
    
    const response = await aiOrchestrator.processUserMessage(message, context);
    
    // Should provide appropriate response and metadata
    expect(response.message).toBeDefined();
    expect(response.responseType).toBeDefined();
    expect(['question', 'analysis', 'recommendation', 'emergency', 'doctors']).toContain(response.responseType);
  });
});