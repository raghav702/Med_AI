import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, AlertTriangle, Sparkles, Heart, Brain, Stethoscope, Pill } from 'lucide-react';
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

interface ChatInterfaceProps {
  className?: string;
  sessionId?: string;
}

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 p-4 animate-fade-in">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
        <Bot className="w-5 h-5 text-white animate-pulse" />
      </div>
      <div className="flex flex-col space-y-1">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-gray-500">AI is thinking...</span>
      </div>
    </div>
  );
};

const TaskTypeSelector: React.FC<{ 
  onSelectTask: (taskType: string) => void;
  disabled?: boolean;
}> = ({ onSelectTask, disabled }) => {
  const taskTypes = [
    {
      id: 'symptom_analysis',
      icon: Stethoscope,
      title: 'Symptom Analysis',
      description: 'Analyze symptoms & get triage',
      color: 'from-red-500 to-pink-500'
    },
    {
      id: 'doctor_matching',
      icon: Heart,
      title: 'Find Doctors',
      description: 'Get doctor recommendations',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'health_qa',
      icon: Brain,
      title: 'Health Q&A',
      description: 'Ask health questions',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'medication_info',
      icon: Pill,
      title: 'Medications',
      description: 'Drug info & interactions',
      color: 'from-purple-500 to-violet-500'
    }
  ];

  return (
    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Choose your assistance type:</h3>
      <div className="grid grid-cols-2 gap-2">
        {taskTypes.map((task) => {
          const IconComponent = task.icon;
          return (
            <Button
              key={task.id}
              variant="outline"
              size="sm"
              onClick={() => onSelectTask(task.id)}
              disabled={disabled}
              className="h-auto p-3 flex flex-col items-center space-y-1 hover:shadow-md transition-all duration-200"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${task.color} flex items-center justify-center`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div className="text-center">
                <div className="text-xs font-medium">{task.title}</div>
                <div className="text-xs text-gray-500">{task.description}</div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const QuickReplies: React.FC<{ 
  questions: string[]; 
  onReply: (reply: string) => void;
  disabled?: boolean;
}> = ({ questions, onReply, disabled }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
      {questions.slice(0, 3).map((question, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onReply(question)}
          disabled={disabled}
          className="text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
        >
          {question}
        </Button>
      ))}
    </div>
  );
};

const WelcomeMessage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Welcome to AI Medical Assistant
      </h2>
      <p className="text-gray-600 mb-6 max-w-md">
        I'm here to help you understand your symptoms, find the right doctors, 
        and answer your health questions. Let's get started!
      </p>
      <Button 
        onClick={onGetStarted}
        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2"
      >
        Start Conversation
      </Button>
    </div>
  );
};

export const ImprovedChatInterface: React.FC<ChatInterfaceProps> = ({
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
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
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

  // Hide welcome screen when conversation starts
  useEffect(() => {
    if (context.messages.length > 0) {
      setShowWelcome(false);
    }
  }, [context.messages.length]);

  const handleGetStarted = () => {
    setShowWelcome(false);
    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleTaskTypeSelect = async (taskType: string) => {
    setSelectedTaskType(taskType);
    // Send initial message with task type context
    await sendMessage(`I need help with ${taskType.replace('_', ' ')}`);
  };

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

  const getPlaceholderText = () => {
    if (selectedTaskType) {
      switch (selectedTaskType) {
        case 'symptom_analysis': return "Describe your symptoms in detail...";
        case 'doctor_matching': return "What type of doctor are you looking for?";
        case 'health_qa': return "Ask me any health-related question...";
        case 'medication_info': return "Ask about medications, dosages, or interactions...";
        default: return "Type your message...";
      }
    }
    
    switch (context.conversationStage) {
      case 'initial': return "Describe your symptoms or health concerns...";
      case 'gathering': return "Tell me more about your symptoms...";
      case 'analysis': return "Any additional details?";
      default: return "Ask me anything else...";
    }
  };

  return (
    <Card className={cn('flex flex-col h-[700px] shadow-xl border-0 bg-white overflow-hidden', className)}>
      {/* Enhanced Chat Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Medical Assistant</h3>
            <p className="text-sm text-blue-100">{getConversationStageText()}</p>
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
              onClick={() => {
                clearConversation();
                setShowWelcome(true);
                setSelectedTaskType(null);
              }}
              className="text-white hover:bg-white/20 text-xs"
            >
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Task Type Selector - Show when no task selected */}
      {!selectedTaskType && !showWelcome && context.messages.length === 0 && (
        <TaskTypeSelector 
          onSelectTask={handleTaskTypeSelect}
          disabled={isLoading}
        />
      )}

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 bg-gray-50">
        {showWelcome ? (
          <WelcomeMessage onGetStarted={handleGetStarted} />
        ) : (
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
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-sm">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>

      {/* Enhanced Message Input */}
      {!showWelcome && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholderText()}
                disabled={isLoading}
                className="pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {inputValue && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  {inputValue.length}/500
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Enhanced Footer */}
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center space-x-4">
              <p className="text-xs text-gray-500">
                Press Enter to send • Not a substitute for professional medical advice
              </p>
              {selectedTaskType && (
                <Badge variant="outline" className="text-xs">
                  {selectedTaskType.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
            {context.currentSymptoms.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Symptoms: {context.currentSymptoms.slice(0, 2).join(', ')}
                {context.currentSymptoms.length > 2 && ` +${context.currentSymptoms.length - 2} more`}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};