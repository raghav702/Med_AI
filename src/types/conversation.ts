// Conversation and AI Assistant types

export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'doctor_recommendations' | 'emergency_alert' | 'quick_replies' | 'urgency_escalation';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type ConversationStage = 'initial' | 'gathering' | 'analysis' | 'recommendation' | 'booking';

export interface Location {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  timestamp: Date;
  metadata?: {
    symptoms?: string[];
    urgencyLevel?: UrgencyLevel;
    doctorRecommendations?: string[];
    quickReplies?: string[];
    [key: string]: any;
  };
}

export interface ParsedSymptom {
  text: string;
  severity?: number;
  duration?: string;
  location?: string;
  category?: string;
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

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  messages: ChatMessage[];
  currentSymptoms: string[];
  urgencyLevel: UrgencyLevel;
  recommendedSpecialty?: string;
  userLocation?: Location;
  conversationStage: ConversationStage;
  lastActivity: Date;
  isTyping: boolean;
  metadata: {
    symptomAnalysis?: SymptomAnalysis;
    recommendedDoctors?: string[];
    [key: string]: any;
  };
}

export interface AIResponse {
  message: string;
  responseType: 'question' | 'analysis' | 'recommendation' | 'emergency' | 'doctors';
  followUpQuestions?: string[];
  doctorRecommendations?: any[];
  urgencyLevel?: UrgencyLevel;
  nextAction?: 'continue_chat' | 'show_doctors' | 'emergency_redirect';
  metadata?: Record<string, any>;
}

export interface ConversationState {
  context: ConversationContext;
  isLoading: boolean;
  error: string | null;
}

export interface ConversationActions {
  sendMessage: (content: string, type?: MessageType) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateContext: (updates: Partial<ConversationContext>) => void;
  clearConversation: () => void;
  setTyping: (isTyping: boolean) => void;
  setError: (error: string | null) => void;
  loadConversation: (sessionId: string) => Promise<void>;
  saveConversation: () => Promise<void>;
}