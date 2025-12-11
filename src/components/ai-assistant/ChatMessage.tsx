import React from 'react';
import { Bot, User, Check, CheckCheck, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ConversationChatMessage } from '@/types/conversation';

interface ChatMessageProps {
  message: ConversationChatMessage;
  className?: string;
}

const MessageStatusIcon: React.FC<{ type?: ConversationChatMessage['type'] }> = ({ type }) => {
  switch (type) {
    case 'emergency_alert':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'doctor_recommendations':
      return <Check className="w-3 h-3 text-green-500" />;
    default:
      return null;
  }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, className }) => {
  const isUser = message.role === 'user';
  const isEmergency = message.type === 'emergency_alert';
  const isUrgent = message.metadata?.urgencyLevel === 'high' || message.metadata?.urgencyLevel === 'emergency';
  
  return (
    <div className={cn(
      'flex w-full mb-4',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      <div className={cn(
        'flex max-w-[85%] space-x-3',
        isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-1',
          isUser 
            ? 'bg-blue-600 shadow-md' 
            : isEmergency
            ? 'bg-red-100 border-2 border-red-300 animate-pulse'
            : isUrgent
            ? 'bg-orange-100 border border-orange-200'
            : 'bg-gray-100 border border-gray-200'
        )}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : isEmergency ? (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          ) : (
            <Bot className="w-4 h-4 text-gray-600" />
          )}
        </div>
        
        {/* Message bubble */}
        <div className={cn(
          'relative px-4 py-3 rounded-2xl shadow-sm',
          isUser 
            ? 'bg-blue-600 text-white rounded-br-md' 
            : isEmergency
            ? 'bg-red-50 text-red-900 border-2 border-red-200 rounded-bl-md shadow-lg'
            : isUrgent
            ? 'bg-orange-50 text-orange-900 border border-orange-200 rounded-bl-md'
            : 'bg-gray-100 text-gray-900 border border-gray-200 rounded-bl-md'
        )}>
          {/* Emergency header for emergency messages */}
          {isEmergency && (
            <div className="flex items-center mb-2 pb-2 border-b border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2 animate-pulse" />
              <span className="text-xs font-bold text-red-800 uppercase tracking-wide">
                Medical Emergency
              </span>
            </div>
          )}
          
          {/* Message content */}
          <div className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap',
            isEmergency && 'font-medium'
          )}>
            {message.content}
          </div>
          
          {/* Emergency contact info for emergency messages */}
          {isEmergency && message.metadata?.emergencyContacts && (
            <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
              <p className="text-xs font-semibold text-red-800 mb-1">Emergency Contacts:</p>
              {message.metadata.emergencyContacts.slice(0, 2).map((contact: any, index: number) => (
                <div key={index} className="text-xs text-red-700">
                  📞 {contact.name}: {contact.number}
                </div>
              ))}
            </div>
          )}
          
          {/* Urgency indicator for AI messages */}
          {!isUser && message.metadata?.urgencyLevel && message.metadata.urgencyLevel !== 'low' && !isEmergency && (
            <div className="mt-2">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                message.metadata.urgencyLevel === 'high' && 'bg-orange-100 text-orange-800',
                message.metadata.urgencyLevel === 'medium' && 'bg-yellow-100 text-yellow-800'
              )}>
                {message.metadata.urgencyLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {message.metadata.urgencyLevel.charAt(0).toUpperCase() + message.metadata.urgencyLevel.slice(1)} Priority
              </span>
            </div>
          )}
          
          {/* Timestamp and status */}
          <div className={cn(
            'flex items-center justify-between mt-2 text-xs',
            isUser ? 'text-blue-100' : isEmergency ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-500'
          )}>
            <span>
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            <div className="flex items-center space-x-1">
              <MessageStatusIcon type={message.type} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;