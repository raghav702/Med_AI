import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatDoctorCard } from '@/components/doctors/ChatDoctorCard';
import { UrgencyIndicator } from './UrgencyIndicator';
import { EmergencyAlert } from './EmergencyAlert';
import { useConversation } from '@/hooks/useConversation';
import { UrgencyLevel } from '@/types/conversation';
import { urgencyEscalationService } from '@/services/urgencyEscalationService';

interface ChatInterfaceProps {
  className?: string;
  sessionId?: string;
}

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
        <Bot className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

const UrgencyIndicator: React.FC<{ urgencyLevel: UrgencyLevel }> = ({ urgencyLevel }) => {
  const getUrgencyColor = (level: UrgencyLevel) => {
    switch (level) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (level: UrgencyLevel) => {
    if (level === 'emergency' || level === 'high') {
      return <AlertTriangle className="w-3 h-3" />;
    }
    return null;
  };

  if (urgencyLevel === 'low') return null;

  return (
    <Badge variant="outline" className={cn('text-xs', getUrgencyColor(urgencyLevel))}>
      {getUrgencyIcon(urgencyLevel)}
      <span className="ml-1 capitalize">{urgencyLevel} Priority</span>
    </Badge>
  );
};

const QuickReplies: React.FC<{ 
  questions: string[]; 
  onReply: (reply: string) => void;
  disabled?: boolean;
}> = ({ questions, onReply, disabled }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {questions.slice(0, 3).map((question, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onReply(question)}
          disabled={disabled}
          className="text-xs"
        >
          {question}
        </Button>
      ))}
    </div>
  );
};



export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className,
  sessionId
}) => {
  const {
    context,
    isLoading,
    error,
    sendMessage,
    clearConversation
  } = useConversation(sessionId);

  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [context.messages, isLoading]);

  // Add initial greeting if no messages
  useEffect(() => {
    if (context.messages.length === 0 && context.conversationStage === 'initial') {
      // Trigger initial greeting from AI by sending empty message
      sendMessage('');
    }
  }, [context.messages.length, context.conversationStage, sendMessage]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageToSend = inputValue.trim();
    setInputValue('');
    
    try {
      await sendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleQuickReply = async (reply: string) => {
    if (isLoading) return;
    
    try {
      await sendMessage(reply);
    } catch (error) {
      console.error('Error sending quick reply:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConversationStageText = () => {
    switch (context.conversationStage) {
      case 'initial': return 'Ready to help';
      case 'gathering': return 'Gathering information';
      case 'analysis': return 'Analyzing symptoms';
      case 'recommendation': return 'Finding doctors';
      case 'booking': return 'Ready to book';
      default: return 'AI Assistant';
    }
  };

  return (
    <Card className={cn('flex flex-col h-[600px]', className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Medical Assistant</h3>
            <p className="text-sm text-gray-500">{getConversationStageText()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <UrgencyIndicator 
            urgencyLevel={context.urgencyLevel}
            escalation={context.metadata.escalation}
          />
          {context.messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="text-xs"
            >
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {/* Emergency Alert - Show at top if emergency detected */}
          {context.urgencyLevel === 'emergency' && context.metadata.symptomAnalysis && context.metadata.escalation && (
            <div className="mb-4">
              <EmergencyAlert
                analysis={context.metadata.symptomAnalysis}
                escalation={context.metadata.escalation}
              />
            </div>
          )}

          {/* High urgency alert */}
          {context.urgencyLevel === 'high' && context.metadata.escalation && (
            <div className="mb-4">
              <UrgencyIndicator
                urgencyLevel={context.urgencyLevel}
                escalation={context.metadata.escalation}
                showDetails={true}
              />
            </div>
          )}

          {context.messages.map((message) => (
            <div key={message.id} className="mb-4">
              <ChatMessageComponent message={message} />
              
              {/* Show emergency alert for emergency messages */}
              {message.type === 'emergency_alert' && message.metadata?.symptomAnalysis && message.metadata?.escalation && (
                <div className="mt-3">
                  <EmergencyAlert
                    analysis={message.metadata.symptomAnalysis}
                    escalation={message.metadata.escalation}
                  />
                </div>
              )}
              
              {/* Show doctor recommendations if present */}
              {message.type === 'doctor_recommendations' && message.metadata?.doctorRecommendations && (
                <div className="mt-3 space-y-2">
                  {message.metadata.doctorRecommendations.slice(0, 3).map((doctor: any, index: number) => (
                    <ChatDoctorCard key={index} doctor={doctor} />
                  ))}
                </div>
              )}
              
              {/* Show detailed urgency info for high/medium priority messages */}
              {message.role === 'assistant' && message.metadata?.escalation && 
               (message.metadata.urgencyLevel === 'high' || message.metadata.urgencyLevel === 'medium') && (
                <div className="mt-3">
                  <UrgencyIndicator
                    urgencyLevel={message.metadata.urgencyLevel}
                    escalation={message.metadata.escalation}
                    showDetails={true}
                  />
                </div>
              )}
              
              {/* Show quick replies for follow-up questions */}
              {message.role === 'assistant' && message.metadata?.followUpQuestions && (
                <QuickReplies
                  questions={message.metadata.followUpQuestions}
                  onReply={handleQuickReply}
                  disabled={isLoading}
                />
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isLoading && <TypingIndicator />}
          
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              context.conversationStage === 'initial' 
                ? "Describe your symptoms or health concerns..."
                : context.conversationStage === 'gathering'
                ? "Tell me more about your symptoms..."
                : context.conversationStage === 'analysis'
                ? "Any additional details?"
                : "Ask me anything else..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            Press Enter to send • This is not a substitute for professional medical advice
          </p>
          {context.currentSymptoms.length > 0 && (
            <div className="text-xs text-gray-500">
              Symptoms: {context.currentSymptoms.slice(0, 3).join(', ')}
              {context.currentSymptoms.length > 3 && ` +${context.currentSymptoms.length - 3} more`}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};