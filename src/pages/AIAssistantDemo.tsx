import React from 'react';
import { ChatInterface } from '@/components/ai-assistant';
import { NavigationLayout } from '@/components/layout/NavigationLayout';

const AIAssistantDemo: React.FC = () => {
  return (
    <NavigationLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Medical Assistant
          </h1>
          <p className="text-gray-600">
            Describe your symptoms and get personalized doctor recommendations with intelligent conversation flow.
          </p>
        </div>
        
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <ChatInterface />
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">How it works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Describe your symptoms in natural language</li>
            <li>• Answer follow-up questions for better analysis</li>
            <li>• Get urgency assessment and specialty recommendations</li>
            <li>• View recommended doctors and book appointments</li>
            <li>• Emergency symptoms are detected and escalated immediately</li>
          </ul>
        </div>
      </div>
    </NavigationLayout>
  );
};

export default AIAssistantDemo;