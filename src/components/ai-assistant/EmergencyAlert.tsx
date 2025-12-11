import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Clock, X, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SymptomAnalysis } from '@/types/medical';
import { UrgencyEscalation, EmergencyContact } from '@/services/urgencyEscalationService';

interface EmergencyAlertProps {
  analysis: SymptomAnalysis;
  escalation: UrgencyEscalation;
  onDismiss?: () => void;
  className?: string;
}

interface CountdownTimerProps {
  urgencyLevel: 'emergency' | 'high';
  onTimeUp?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ urgencyLevel, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(urgencyLevel === 'emergency' ? 300 : 900); // 5 min for emergency, 15 min for high
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const getTimerColor = () => {
    if (urgencyLevel === 'emergency') return 'text-red-600';
    if (timeLeft < 300) return 'text-orange-600'; // Last 5 minutes
    return 'text-yellow-600';
  };

  return (
    <div className={cn('flex items-center text-sm font-mono', getTimerColor())}>
      <Clock className="w-4 h-4 mr-1" />
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
};

const EmergencyContactButton: React.FC<{ contact: EmergencyContact; isPrimary?: boolean }> = ({ 
  contact, 
  isPrimary = false 
}) => {
  const handleCall = () => {
    // Track emergency call attempt
    console.log(`Emergency call attempted to ${contact.number}`);
    window.location.href = `tel:${contact.number}`;
  };

  return (
    <Button
      onClick={handleCall}
      size={isPrimary ? 'lg' : 'default'}
      className={cn(
        'w-full font-semibold transition-all',
        isPrimary 
          ? 'bg-red-600 hover:bg-red-700 text-white text-lg py-3 animate-pulse' 
          : 'bg-orange-600 hover:bg-orange-700 text-white'
      )}
    >
      <Phone className={cn('mr-2', isPrimary ? 'w-5 h-5' : 'w-4 h-4')} />
      <div className="text-left">
        <div>{contact.number}</div>
        <div className={cn('text-xs opacity-90', isPrimary ? 'text-red-100' : 'text-orange-100')}>
          {contact.name}
        </div>
      </div>
    </Button>
  );
};

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({
  analysis,
  escalation,
  onDismiss,
  className
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasCalledEmergency, setHasCalledEmergency] = useState(false);

  const isEmergency = analysis.urgencyLevel === 'emergency';
  const isHighUrgency = analysis.urgencyLevel === 'high';

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleEmergencyCall = () => {
    setHasCalledEmergency(true);
    // Track that user called emergency services
    console.log('Emergency services called');
  };

  if (!isVisible || (!isEmergency && !isHighUrgency)) {
    return null;
  }

  const primaryContact = escalation.emergencyContacts.find(c => c.number === '911') || escalation.emergencyContacts[0];
  const secondaryContacts = escalation.emergencyContacts.filter(c => c !== primaryContact);

  return (
    <Card className={cn(
      'border-2 shadow-lg animate-in slide-in-from-top-2',
      isEmergency 
        ? 'border-red-500 bg-red-50' 
        : 'border-orange-500 bg-orange-50',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            'flex items-center text-lg font-bold',
            isEmergency ? 'text-red-900' : 'text-orange-900'
          )}>
            <AlertTriangle className={cn(
              'mr-2 animate-pulse',
              isEmergency ? 'w-6 h-6 text-red-600' : 'w-5 h-5 text-orange-600'
            )} />
            {isEmergency ? 'MEDICAL EMERGENCY' : 'URGENT MEDICAL ATTENTION'}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {(isEmergency || isHighUrgency) && (
              <CountdownTimer 
                urgencyLevel={isEmergency ? 'emergency' : 'high'}
                onTimeUp={() => console.log('Time critical - seek immediate care')}
              />
            )}
            {!isEmergency && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Emergency flags */}
        {analysis.emergencyFlags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {analysis.emergencyFlags.map((flag, index) => (
              <Badge 
                key={index} 
                variant="destructive" 
                className="text-xs"
              >
                {flag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Critical message */}
        <div className={cn(
          'p-4 rounded-lg border-2',
          isEmergency 
            ? 'bg-red-100 border-red-300 text-red-900' 
            : 'bg-orange-100 border-orange-300 text-orange-900'
        )}>
          <p className="font-semibold text-sm">
            {isEmergency 
              ? '🚨 This appears to be a medical emergency requiring immediate attention.'
              : '⚠️ Your symptoms indicate urgent medical attention is needed.'
            }
          </p>
          <p className="text-xs mt-1">
            {escalation.timeframe}
          </p>
        </div>

        {/* Primary emergency contact */}
        {primaryContact && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-900">
              {isEmergency ? 'CALL NOW:' : 'URGENT CONTACT:'}
            </h4>
            <EmergencyContactButton 
              contact={primaryContact} 
              isPrimary={isEmergency}
            />
          </div>
        )}

        {/* Secondary contacts */}
        {secondaryContacts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-900">
              Additional Resources:
            </h4>
            <div className="space-y-2">
              {secondaryContacts.map((contact, index) => (
                <EmergencyContactButton 
                  key={index} 
                  contact={contact} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Immediate actions */}
        {escalation.immediateActions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-900">
              Immediate Actions:
            </h4>
            <ul className="space-y-1">
              {escalation.immediateActions.slice(0, 4).map((action, index) => (
                <li key={index} className="text-xs text-gray-700 flex items-start">
                  <span className="mr-2 text-red-600">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* First aid instructions for emergencies */}
        {isEmergency && escalation.firstAidInstructions && escalation.firstAidInstructions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-2 text-blue-900 flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              While Waiting for Help:
            </h4>
            <ul className="space-y-1">
              {escalation.firstAidInstructions.slice(0, 3).map((instruction, index) => (
                <li key={index} className="text-xs text-blue-800 flex items-start">
                  <span className="mr-2">•</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Critical warnings */}
        {escalation.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-2 text-yellow-900 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Critical Warnings:
            </h4>
            <ul className="space-y-1">
              {escalation.warnings.map((warning, index) => (
                <li key={index} className="text-xs text-yellow-800 flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation for emergency calls */}
        {hasCalledEmergency && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3">
            <p className="text-sm text-green-800 font-medium">
              ✅ Good! Stay on the line with emergency services and follow their instructions.
            </p>
          </div>
        )}

        {/* Medical disclaimer */}
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
          <p>
            <strong>Medical Disclaimer:</strong> This AI assessment is not a substitute for professional medical diagnosis. 
            When in doubt, always seek immediate medical attention.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyAlert;