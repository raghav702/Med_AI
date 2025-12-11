import React, { useState } from 'react';
import { ImprovedChatInterface } from '@/components/ai-assistant/ImprovedChatInterface';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Heart, 
  Brain, 
  Pill, 
  Shield, 
  Clock, 
  Users, 
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

const ImprovedAIAssistant: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);

  const features = [
    {
      icon: Stethoscope,
      title: 'Symptom Analysis',
      description: 'AI-powered triage with severity assessment',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: Heart,
      title: 'Smart Doctor Matching',
      description: 'Find the right healthcare provider',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Brain,
      title: '24/7 Health Q&A',
      description: 'Get reliable medical information anytime',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Pill,
      title: 'Medication Guidance',
      description: 'Drug information and interaction checks',
      color: 'from-purple-500 to-violet-500'
    }
  ];

  const safetyFeatures = [
    {
      icon: Shield,
      title: 'Emergency Detection',
      description: 'Automatic identification of urgent symptoms'
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Always here when you need medical guidance'
    },
    {
      icon: Users,
      title: 'Professional Network',
      description: 'Connected to verified healthcare providers'
    }
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            AI Medical Assistant
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Your intelligent healthcare companion. Get personalized medical guidance, 
            find the right doctors, and make informed health decisions.
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Shield className="w-3 h-3 mr-1" />
              HIPAA Compliant
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="w-3 h-3 mr-1" />
              24/7 Available
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <ImprovedChatInterface />
          </div>

          {/* Sidebar with Features and Info */}
          <div className="space-y-6">
            {/* Features Overview */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                  AI Capabilities
                </h3>
                <div className="space-y-3">
                  {features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Safety Features */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-green-600" />
                  Safety & Trust
                </h3>
                <div className="space-y-3">
                  {safetyFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-blue-600" />
                    How It Works
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {showInfo ? 'Hide' : 'Show'}
                  </Button>
                </div>
                
                {showInfo && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                        1
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Choose Your Need</p>
                        <p className="text-xs text-gray-600">Select from symptom analysis, doctor matching, health Q&A, or medication info</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                        2
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Describe Your Situation</p>
                        <p className="text-xs text-gray-600">Share your symptoms, questions, or concerns in natural language</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                        3
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Get AI Analysis</p>
                        <p className="text-xs text-gray-600">Receive personalized recommendations and next steps</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                        4
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Connect with Care</p>
                        <p className="text-xs text-gray-600">Book appointments with recommended healthcare providers</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="shadow-lg border-0 bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-800 font-medium mb-1">Medical Disclaimer</p>
                    <p className="text-xs text-amber-700">
                      This AI assistant provides general health information and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical concerns.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ImprovedAIAssistant;