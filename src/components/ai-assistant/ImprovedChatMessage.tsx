import React from 'react';
import { Bot, User, Check, CheckCheck, Clock, AlertTriangle, Sparkles, Heart, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ConversationChatMessage } from '@/types/conversation';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ChatMessageProps {
  message: ConversationChatMessage;
  className?: string;
}

const MessageStatusIcon: React.FC<{ type?: ConversationChatMessage['type'] }> = ({ type }) => {
  switch (type) {
    case 'emergency_alert':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'doctor_recommendations':
      return <Heart className="w-3 h-3 text-green-500" />;
    default:
      return <Check className="w-3 h-3 text-gray-400" />;
  }
};

const MessageTypeIndicator: React.FC<{ type?: ConversationChatMessage['type'] }> = ({ type }) => {
  if (!type || type === 'text') return null;
  
  const indicators = {
    emergency_alert: { icon: AlertTriangle, text: 'Emergency Alert', color: 'text-red-600 bg-red-100' },
    doctor_recommendations: { icon: Heart, text: 'Doctor Recommendations', color: 'text-blue-600 bg-blue-100' },
    symptom_analysis: { icon: Sparkles, text: 'Analysis Complete', color: 'text-purple-600 bg-purple-100' }
  };
  
  const indicator = indicators[type as keyof typeof indicators];
  if (!indicator) return null;
  
  const IconComponent = indicator.icon;
  
  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${indicator.color}`}>
      <IconComponent className="w-3 h-3" />
      <span>{indicator.text}</span>
    </div>
  );
};

export const ImprovedChatMessage: React.FC<ChatMessageProps> = ({ message, className }) => {
  const navigate = useNavigate();
  const isUser = message.role === 'user';
  const isEmergency = message.type === 'emergency_alert';
  const isUrgent = message.metadata?.urgencyLevel === 'high' || message.metadata?.urgencyLevel === 'emergency';

  // Parse and render message content with doctor listings
  const renderMessageContent = (content: string) => {
    // Check if message contains doctor listings with IDs
    const doctorIdPattern = /\[DOCTOR_ID:([^\]]+)\]/g;
    const matches = [...content.matchAll(doctorIdPattern)];
    
    if (matches.length === 0) {
      // No doctor IDs, return plain text
      return <span>{content}</span>;
    }

    // Parse doctor entries - each doctor starts with a number and ends with "Book Appointment"
    const doctorEntryPattern = /(\d+\.\s+[^[]+)\[DOCTOR_ID:([^\]]+)\]([^]*?)(?=\d+\.\s+[^[]+\[DOCTOR_ID:|$)/g;
    const doctorEntries: Array<{ headerText: string; id: string; detailsText: string }> = [];
    
    // First, extract the header line (e.g., "Found 5 nearest doctor(s)...")
    const headerMatch = content.match(/^(.*?)(?=\d+\.\s+)/s);
    const headerText = headerMatch ? headerMatch[1].trim() : '';
    
    let match;
    while ((match = doctorEntryPattern.exec(content)) !== null) {
      doctorEntries.push({
        headerText: match[1].trim(),
        id: match[2],
        detailsText: match[3].trim()
      });
    }

    if (doctorEntries.length === 0) {
      // Fallback: simple rendering if pattern doesn't match
      return <span>{content.replace(/\[DOCTOR_ID:[^\]]+\]/g, '')}</span>;
    }

    return (
      <div className="space-y-1">
        {/* Header */}
        {headerText && (
          <p className="font-medium mb-3">{headerText}</p>
        )}
        
        {/* Doctor entries */}
        {doctorEntries.map((entry, idx) => (
          <div key={idx} className="border-l-2 border-blue-200 pl-3 py-2 mb-2 bg-white/50 rounded-r">
            {/* Doctor name and specialty */}
            <p className="font-medium text-gray-900">{entry.headerText}</p>
            
            {/* Doctor details */}
            <div className="text-gray-600 whitespace-pre-wrap mt-1">
              {entry.detailsText.split('\n').map((line, lineIdx) => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.includes("Click 'Book Appointment'")) return null;
                return (
                  <div key={lineIdx} className="leading-relaxed">
                    {trimmedLine}
                  </div>
                );
              })}
            </div>
            
            {/* Book Appointment button */}
            <Button
              size="sm"
              onClick={() => navigate(`/doctor-discovery?doctorId=${entry.id}`)}
              className="mt-2 bg-red-500 hover:bg-red-600"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Book Appointment
            </Button>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className={cn(
      'flex w-full mb-6 animate-fade-in',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      <div className={cn(
        'flex max-w-[85%] space-x-3',
        isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
      )}>
        {/* Enhanced Avatar */}
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 mt-1 shadow-md',
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
            : isEmergency
            ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse shadow-red-200'
            : isUrgent
            ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-200'
            : 'bg-gradient-to-br from-gray-500 to-gray-600 shadow-gray-200'
        )}>
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : isEmergency ? (
            <AlertTriangle className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>
        
        {/* Enhanced Message bubble */}
        <div className={cn(
          'relative px-5 py-4 rounded-2xl shadow-lg backdrop-blur-sm',
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-blue-200' 
            : isEmergency
            ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-900 border-2 border-red-300 rounded-bl-md shadow-red-200'
            : isUrgent
            ? 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900 border border-orange-300 rounded-bl-md shadow-orange-200'
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-gray-200'
        )}>
          {/* Message type indicator */}
          {!isUser && <MessageTypeIndicator type={message.type} />}
          
          {/* Emergency header for emergency messages */}
          {isEmergency && (
            <div className="flex items-center mb-3 pb-3 border-b border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 animate-pulse" />
              <span className="text-sm font-bold text-red-800 uppercase tracking-wide">
                Medical Emergency Detected
              </span>
            </div>
          )}
          
          {/* Message content with better typography */}
          <div className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap',
            isEmergency && 'font-medium',
            !isUser && 'text-gray-800'
          )}>
            {renderMessageContent(message.content)}
          </div>
          
          {/* Emergency contact info for emergency messages */}
          {isEmergency && message.metadata?.emergencyContacts && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-2">🚨 Emergency Contacts:</p>
              {message.metadata.emergencyContacts.slice(0, 2).map((contact: any, index: number) => (
                <div key={index} className="text-sm text-red-700 font-medium">
                  📞 {contact.name}: {contact.number}
                </div>
              ))}
            </div>
          )}
          
          {/* Enhanced urgency indicator for AI messages */}
          {!isUser && message.metadata?.urgencyLevel && message.metadata.urgencyLevel !== 'low' && !isEmergency && (
            <div className="mt-3">
              <span className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm',
                message.metadata.urgencyLevel === 'high' && 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300',
                message.metadata.urgencyLevel === 'medium' && 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
              )}>
                {message.metadata.urgencyLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {message.metadata.urgencyLevel.charAt(0).toUpperCase() + message.metadata.urgencyLevel.slice(1)} Priority
              </span>
            </div>
          )}
          
          {/* Enhanced timestamp and status */}
          <div className={cn(
            'flex items-center justify-between mt-3 pt-2 text-xs border-t',
            isUser ? 'text-blue-100 border-blue-400' : isEmergency ? 'text-red-600 border-red-200' : isUrgent ? 'text-orange-600 border-orange-200' : 'text-gray-500 border-gray-200'
          )}>
            <span className="font-medium">
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            <div className="flex items-center space-x-1">
              <MessageStatusIcon type={message.type} />
              {isUser && (
                <span className="text-xs opacity-75">Sent</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedChatMessage;