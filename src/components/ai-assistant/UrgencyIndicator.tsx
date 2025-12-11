import React from 'react';
import { AlertTriangle, Clock, Phone, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UrgencyLevel } from '@/types/conversation';
import { UrgencyEscalation, EmergencyContact } from '@/services/urgencyEscalationService';

interface UrgencyIndicatorProps {
  urgencyLevel: UrgencyLevel;
  escalation?: UrgencyEscalation;
  className?: string;
  showDetails?: boolean;
}

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  isEmergency?: boolean;
}

const EmergencyContactCard: React.FC<EmergencyContactCardProps> = ({ contact, isEmergency }) => {
  const handleCall = () => {
    window.location.href = `tel:${contact.number}`;
  };

  return (
    <Card className={cn(
      'border-2 transition-all hover:shadow-md',
      isEmergency ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className={cn(
              'font-semibold text-sm',
              isEmergency ? 'text-red-900' : 'text-blue-900'
            )}>
              {contact.name}
            </h4>
            <p className={cn(
              'text-xs mt-1',
              isEmergency ? 'text-red-700' : 'text-blue-700'
            )}>
              {contact.description}
            </p>
            <p className={cn(
              'text-xs mt-1 font-medium',
              isEmergency ? 'text-red-800' : 'text-blue-800'
            )}>
              {contact.when}
            </p>
          </div>
          <Button
            onClick={handleCall}
            size="sm"
            className={cn(
              'ml-3',
              isEmergency 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            <Phone className="w-4 h-4 mr-1" />
            {contact.number}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({
  urgencyLevel,
  escalation,
  className,
  showDetails = false
}) => {
  const getUrgencyConfig = (level: UrgencyLevel) => {
    switch (level) {
      case 'emergency':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertTriangle,
          label: 'EMERGENCY',
          description: 'Immediate medical attention required',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: AlertTriangle,
          label: 'HIGH PRIORITY',
          description: 'Urgent medical attention needed',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: Clock,
          label: 'MEDIUM PRIORITY',
          description: 'Medical attention recommended',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'low':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: Heart,
          label: 'LOW PRIORITY',
          description: 'Routine medical care',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Clock,
          label: 'ASSESSMENT',
          description: 'Medical evaluation recommended',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getUrgencyConfig(urgencyLevel);
  const Icon = config.icon;

  // Don't show indicator for low priority unless details are requested
  if (urgencyLevel === 'low' && !showDetails) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main urgency badge */}
      <Badge 
        variant="outline" 
        className={cn('text-xs font-semibold px-3 py-1', config.color)}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>

      {/* Detailed urgency information */}
      {showDetails && escalation && (
        <Card className={cn('border-2', config.borderColor, config.bgColor)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <Icon className="w-4 h-4 mr-2" />
              {config.description}
            </CardTitle>
            {escalation.timeframe && (
              <p className="text-xs font-medium text-gray-700">
                ⏰ Timeframe: {escalation.timeframe}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Immediate actions */}
            {escalation.immediateActions && escalation.immediateActions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-gray-900">
                  Immediate Actions:
                </h4>
                <ul className="space-y-1">
                  {escalation.immediateActions.map((action, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Emergency contacts */}
            {escalation.emergencyContacts && escalation.emergencyContacts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-gray-900">
                  Emergency Contacts:
                </h4>
                <div className="space-y-2">
                  {escalation.emergencyContacts.map((contact, index) => (
                    <EmergencyContactCard 
                      key={index} 
                      contact={contact} 
                      isEmergency={urgencyLevel === 'emergency'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* First aid instructions for emergencies */}
            {escalation.firstAidInstructions && escalation.firstAidInstructions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-gray-900">
                  First Aid Instructions:
                </h4>
                <ul className="space-y-1">
                  {escalation.firstAidInstructions.map((instruction, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {escalation.warnings && escalation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-2 text-yellow-900 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Important Warnings:
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UrgencyIndicator;