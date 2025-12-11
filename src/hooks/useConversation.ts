import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ConversationContext, 
  ConversationState, 
  ConversationActions, 
  ChatMessage, 
  MessageType, 
  UrgencyLevel,
  ConversationStage 
} from '@/types/conversation';
import { aiOrchestrator } from '@/services/aiOrchestrator';
import { urgencyEscalationService } from '@/services/urgencyEscalationService';

// Generate unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate unique message ID
const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Initial conversation context
const createInitialContext = (sessionId?: string): ConversationContext => ({
  sessionId: sessionId || generateSessionId(),
  messages: [],
  currentSymptoms: [],
  urgencyLevel: 'low' as UrgencyLevel,
  conversationStage: 'initial' as ConversationStage,
  lastActivity: new Date(),
  isTyping: false,
  metadata: {}
});

// Storage keys
const STORAGE_KEY_PREFIX = 'ai_conversation_';
const ACTIVE_SESSION_KEY = 'ai_active_session';

export const useConversation = (initialSessionId?: string): ConversationState & ConversationActions => {
  // Initialize state
  const [context, setContext] = useState<ConversationContext>(() => 
    createInitialContext(initialSessionId)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we've loaded from storage
  const hasLoadedFromStorage = useRef(false);

  // Load conversation from localStorage
  const loadFromStorage = useCallback((sessionId: string): ConversationContext | null => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return {
          ...parsed,
          lastActivity: new Date(parsed.lastActivity),
          messages: parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        };
      }
    } catch (err) {
      console.error('Failed to load conversation from storage:', err);
    }
    return null;
  }, []);

  // Save conversation to localStorage
  const saveToStorage = useCallback((contextToSave: ConversationContext) => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${contextToSave.sessionId}`, 
        JSON.stringify(contextToSave)
      );
      localStorage.setItem(ACTIVE_SESSION_KEY, contextToSave.sessionId);
    } catch (err) {
      console.error('Failed to save conversation to storage:', err);
    }
  }, []);

  // Load conversation by session ID
  const loadConversation = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stored = loadFromStorage(sessionId);
      if (stored) {
        setContext(stored);
      } else {
        // Create new conversation with provided session ID
        setContext(createInitialContext(sessionId));
      }
    } catch (err) {
      setError('Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadFromStorage]);

  // Save current conversation
  const saveConversation = useCallback(async () => {
    try {
      saveToStorage(context);
    } catch (err) {
      setError('Failed to save conversation');
      console.error('Error saving conversation:', err);
    }
  }, [context, saveToStorage]);

  // Add a message to the conversation
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date()
    };

    setContext(prev => {
      const updated = {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastActivity: new Date(),
        isTyping: false
      };
      
      // Auto-save after adding message
      setTimeout(() => saveToStorage(updated), 0);
      
      return updated;
    });
  }, [saveToStorage]);

  // Send a message (user message)
  const sendMessage = useCallback(async (content: string, type: MessageType = 'text') => {
    if (!content.trim()) return;

    setError(null);
    setIsLoading(true);
    
    // Add user message
    addMessage({
      role: 'user',
      content: content.trim(),
      type
    });

    try {
      // Get AI response using the orchestrator
      const aiResponse = await aiOrchestrator.processUserMessage(content.trim(), context);
      
      // Update context with any changes from AI processing
      setContext(prev => {
        const updates: Partial<ConversationContext> = {
          lastActivity: new Date()
        };

        // Update symptoms if AI extracted any
        if (aiResponse.metadata?.symptoms) {
          updates.currentSymptoms = [...new Set([...prev.currentSymptoms, ...aiResponse.metadata.symptoms])];
        }

        // Update urgency level if provided
        if (aiResponse.urgencyLevel) {
          updates.urgencyLevel = aiResponse.urgencyLevel;
        }

        // Update conversation stage based on AI response
        if (aiResponse.nextAction === 'show_doctors') {
          updates.conversationStage = 'recommendation';
        } else if (aiResponse.nextAction === 'emergency_redirect') {
          updates.conversationStage = 'booking'; // Emergency handling
        }

        // Store AI analysis and urgency escalation in metadata
        if (aiResponse.metadata) {
          updates.metadata = { ...prev.metadata, ...aiResponse.metadata };
          
          // Generate urgency escalation if we have symptom analysis
          if (aiResponse.metadata.symptomAnalysis && aiResponse.urgencyLevel) {
            const escalation = urgencyEscalationService.assessUrgency(aiResponse.metadata.symptomAnalysis);
            updates.metadata.escalation = escalation;
            updates.metadata.emergencyContacts = urgencyEscalationService.getEmergencyContacts(aiResponse.metadata.symptomAnalysis);
            updates.metadata.immediateCareRecommendations = urgencyEscalationService.getImmediateCareRecommendations(aiResponse.metadata.symptomAnalysis);
            updates.metadata.isImmediateDanger = urgencyEscalationService.isImmediateDanger(aiResponse.metadata.symptomAnalysis);
          }
        }

        return { ...prev, ...updates };
      });

      // Add AI response message
      addMessage({
        role: 'assistant',
        content: aiResponse.message,
        type: aiResponse.responseType === 'doctors' ? 'doctor_recommendations' : 
              aiResponse.responseType === 'emergency' ? 'emergency_alert' : 'text',
        metadata: {
          followUpQuestions: aiResponse.followUpQuestions,
          urgencyLevel: aiResponse.urgencyLevel,
          doctorRecommendations: aiResponse.doctorRecommendations,
          nextAction: aiResponse.nextAction,
          ...aiResponse.metadata
        }
      });

    } catch (error) {
      console.error('Error processing message with AI orchestrator:', error);
      setError('Sorry, I encountered an error processing your message. Please try again.');
      
      // Add fallback response
      addMessage({
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your message right now. Could you please try rephrasing your symptoms or concerns?',
        type: 'text'
      });
    } finally {
      setIsLoading(false);
    }

  }, [addMessage, context]);

  // Update conversation context
  const updateContext = useCallback((updates: Partial<ConversationContext>) => {
    setContext(prev => {
      const updated = {
        ...prev,
        ...updates,
        lastActivity: new Date()
      };
      
      // Auto-save after context update
      setTimeout(() => saveToStorage(updated), 0);
      
      return updated;
    });
  }, [saveToStorage]);

  // Set typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    setContext(prev => ({
      ...prev,
      isTyping,
      lastActivity: new Date()
    }));
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    const newContext = createInitialContext();
    setContext(newContext);
    setError(null);
    
    // Clear from storage
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${context.sessionId}`);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (err) {
      console.error('Failed to clear conversation from storage:', err);
    }
  }, [context.sessionId]);

  // Set error state
  const setErrorState = useCallback((error: string | null) => {
    setError(error);
  }, []);

  // Load active session on mount
  useEffect(() => {
    if (!hasLoadedFromStorage.current && !initialSessionId) {
      hasLoadedFromStorage.current = true;
      
      try {
        const activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (activeSessionId) {
          const stored = loadFromStorage(activeSessionId);
          if (stored) {
            setContext(stored);
          }
        }
      } catch (err) {
        console.error('Failed to load active session:', err);
      }
    }
  }, [initialSessionId, loadFromStorage]);

  // Auto-save conversation periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (context.messages.length > 0) {
        saveToStorage(context);
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [context, saveToStorage]);

  // Save conversation when component unmounts
  useEffect(() => {
    return () => {
      if (context.messages.length > 0) {
        saveToStorage(context);
      }
    };
  }, [context, saveToStorage]);

  return {
    // State
    context,
    isLoading,
    error,
    
    // Actions
    sendMessage,
    addMessage,
    updateContext,
    clearConversation,
    setTyping,
    setError: setErrorState,
    loadConversation,
    saveConversation
  };
};

export default useConversation;