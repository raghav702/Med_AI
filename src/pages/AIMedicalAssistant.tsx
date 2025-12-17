import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, User, AlertCircle, Loader2, Stethoscope, Search, AlertTriangle, Activity, UserPlus, HelpCircle, Pill, MapPin, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type TaskType = 'symptom_analysis' | 'doctor_matching' | 'health_qa' | 'medication_info' | 'auto';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tool_used?: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high';
  isEmergency?: boolean;
  taskType?: TaskType;
  metadata?: {
    tools_used?: string[];
    response_time_ms?: number;
    context_switched?: boolean;
  };
}

export default function AIMedicalAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(() => {
    // Restore from sessionStorage (cleared when tab closes)
    const saved = sessionStorage.getItem('ai-chat-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<TaskType | 'auto'>('auto');
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationDetected, setLocationDetected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Save messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('ai-chat-messages', JSON.stringify(messages));
  }, [messages]);

  // Task type configurations
  const taskConfigs = {
    auto: {
      title: 'Smart Assistant',
      icon: Bot,
      description: 'I automatically understand what you need - just ask naturally',
      placeholder: 'Ask me anything: symptoms, find doctors, health questions, or medication info',
      color: 'bg-gradient-to-r from-blue-500 to-purple-500',
      hoverColor: 'hover:from-blue-600 hover:to-purple-600',
    },
    symptom_analysis: {
      title: 'Symptom Analysis',
      icon: Activity,
      description: 'Describe your symptoms and get medical triage guidance with severity assessment',
      placeholder: 'Describe your symptoms (e.g., "I have a headache and fever")',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    doctor_matching: {
      title: 'Find Doctors',
      icon: UserPlus,
      description: 'Find suitable doctors based on your symptoms or specialty needs',
      placeholder: 'What kind of doctor do you need? (e.g., "I need a cardiologist in Delhi")',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    health_qa: {
      title: 'Health Q&A',
      icon: HelpCircle,
      description: 'Ask any health-related questions and get reliable medical information',
      placeholder: 'Ask any health question (e.g., "What is diabetes?")',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    medication_info: {
      title: 'Medication Info',
      icon: Pill,
      description: 'Learn about medications, dosages, side effects, and drug interactions',
      placeholder: 'Ask about a medication (e.g., "Tell me about aspirin")',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
  };

  // Auto-scroll to bottom when new messages arrive with smooth behavior
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isLoading]);

  // Auto-detect user location on mount
  useEffect(() => {
    const detectLocation = async () => {
      // Try GPS first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
            setLocationDetected(true);
          },
          async (error) => {
            // GPS failed, try IP-based location as fallback
            try {
              const response = await fetch('https://ipapi.co/json/');
              const data = await response.json();
              if (data.latitude && data.longitude) {
                setUserLocation({
                  lat: parseFloat(data.latitude),
                  lon: parseFloat(data.longitude)
                });
                setLocationDetected(true);
              }
            } catch (ipError) {
              console.log('Location detection failed, will ask user if needed');
            }
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      }
    };

    detectLocation();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    // Keep input focused after sending message
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    let retryCount = 0;
    const maxRetries = 2;

    const attemptSend = async (): Promise<void> => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/ask`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: userMessage.content,
            task_type: taskType,
            session_id: sessionId,
            user_location: userLocation ? `${userLocation.lat},${userLocation.lon}` : undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle specific HTTP errors
          if (response.status === 503) {
            throw new Error('AI_UNAVAILABLE: The AI Assistant service is temporarily unavailable');
          } else if (response.status === 429) {
            throw new Error('AI_RATE_LIMIT: Too many requests. Please wait a moment');
          } else if (response.status === 500) {
            throw new Error('AI_SERVER_ERROR: The AI Assistant encountered an error');
          } else {
            throw new Error(`HTTP ${response.status}: Failed to get response from AI assistant`);
          }
        }

        const data = await response.json();

        // Validate response structure
        if (!data || typeof data.response !== 'string') {
          throw new Error('AI_INVALID_RESPONSE: Invalid response format from AI assistant');
        }

        // Parse MedGemma response to detect severity
        let severity: 'low' | 'medium' | 'high' = 'low';
        let isEmergency = false;

        // Check if emergency flag is set in response
        if (data.emergency === true) {
          severity = 'high';
          isEmergency = true;
        } else if (data.tool_used === 'emergency_alert_tool' || data.tools_used?.includes('emergency_alert_tool')) {
          severity = 'high';
          isEmergency = true;
        } else if (data.tool_used === 'medgemma_triage_tool' || data.tools_used?.includes('medgemma_triage_tool')) {
          // Try to parse the response for severity information
          try {
            // Look for JSON in the response
            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedResponse = JSON.parse(jsonMatch[0]);
              if (parsedResponse.severity) {
                severity = parsedResponse.severity;
                isEmergency = severity === 'high';
              }
            }
          } catch (parseError) {
            // If parsing fails, check for emergency keywords in response
            const emergencyKeywords = ['emergency', 'urgent', 'immediately', 'call 112', 'call 911', 'ambulance'];
            const lowerResponse = data.response.toLowerCase();
            if (emergencyKeywords.some(keyword => lowerResponse.includes(keyword))) {
              severity = 'high';
              isEmergency = true;
            }
          }
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          tool_used: data.tool_used || (data.tools_used && data.tools_used[0]),
          timestamp: new Date(),
          severity,
          isEmergency,
          taskType: data.task_type || taskType,
          metadata: data.metadata,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Show emergency alert if emergency detected
        if (isEmergency) {
          toast({
            title: '🚨 Emergency Alert',
            description: 'This appears to be a medical emergency. Please seek immediate medical attention.',
            variant: 'destructive',
            duration: 10000, // Show for 10 seconds
          });
        }
      } catch (err) {
        // Handle abort/timeout errors
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('AI_TIMEOUT: The request took too long. Please try again');
        }

        // Handle network errors
        if (err instanceof TypeError && err.message.includes('fetch')) {
          const port = import.meta.env.VITE_API_BASE_URL?.includes(':8080') ? '8080' : '8000';
          throw new Error(`AI_UNAVAILABLE: Cannot connect to AI Assistant. Make sure the backend is running on port ${port}`);
        }

        // Re-throw other errors
        throw err;
      }
    };

    // Retry logic
    while (retryCount <= maxRetries) {
      try {
        await attemptSend();
        break; // Success, exit retry loop
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        
        // Check if error is retryable
        const isRetryable = 
          errorMessage.includes('AI_TIMEOUT') ||
          errorMessage.includes('AI_UNAVAILABLE') ||
          errorMessage.includes('AI_SERVER_ERROR') ||
          errorMessage.includes('network');

        if (isRetryable && retryCount < maxRetries) {
          retryCount++;
          // Exponential backoff: 1s, 2s
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }

        // Non-retryable error or max retries reached
        const userFriendlyMessage = errorMessage.split(':')[1]?.trim() || errorMessage;
        setError(userFriendlyMessage);
        
        toast({
          title: 'AI Assistant Error',
          description: userFriendlyMessage,
          variant: 'destructive',
          duration: 5000,
        });
        break;
      }
    }

    setIsLoading(false);
    
    // Re-focus input after response received
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getToolBadge = (tool?: string) => {
    if (!tool || tool === 'None') return null;

    const toolConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
      medgemma_triage_tool: { label: 'Medical Triage', variant: 'default' },
      doctor_locator_tool: { label: 'Doctor Finder', variant: 'secondary' },
      find_nearest_doctors_tool: { label: 'Doctor Finder', variant: 'secondary' },
      emergency_alert_tool: { label: 'Emergency', variant: 'destructive' },
    };

    const config = toolConfig[tool] || { label: tool, variant: 'default' };

    return (
      <Badge variant={config.variant} className="text-xs mt-2">
        <Stethoscope className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Parse doctor IDs from message content and render booking buttons
  const renderMessageContent = (content: string) => {
    // Check if message contains doctor listings with IDs
    const doctorIdPattern = /\[DOCTOR_ID:([^\]]+)\]/g;
    const matches = [...content.matchAll(doctorIdPattern)];
    
    if (matches.length === 0) {
      // No doctor IDs, return plain text
      return <p className="text-sm whitespace-pre-wrap">{content}</p>;
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
      return <p className="text-sm whitespace-pre-wrap">{content.replace(/\[DOCTOR_ID:[^\]]+\]/g, '')}</p>;
    }

    return (
      <div className="space-y-1">
        {/* Header */}
        {headerText && (
          <p className="text-sm font-medium mb-3">{headerText}</p>
        )}
        
        {/* Doctor entries */}
        {doctorEntries.map((entry, idx) => (
          <div key={idx} className="border-l-2 border-blue-200 pl-3 py-2 mb-2 bg-gray-50/50 rounded-r">
            {/* Doctor name and specialty */}
            <p className="text-sm font-medium text-gray-900">{entry.headerText}</p>
            
            {/* Doctor details */}
            <div className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
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
    <NavigationLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Warning Alert */}
        <Alert className="mb-0 py-2 rounded-b-none border-b-0 shadow-none">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs flex items-center justify-between">
            <span>
              This is an AI assistant. Always consult a doctor before taking any medication or making medical decisions. For emergencies, call 112.
            </span>
            {locationDetected && (
              <Badge variant="secondary" className="text-xs ml-2">
                <MapPin className="h-3 w-3 mr-1" />
                Location Detected
              </Badge>
            )}
          </AlertDescription>
        </Alert>

        {/* Chat Card */}
        <Card className="flex-1 flex flex-col rounded-t-none border-t-0 mt-0 shadow-none overflow-hidden">
          <CardHeader className="py-2 px-4 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Chat with AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
              <div className="space-y-4 pt-4 pb-2">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-6">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">Welcome to AI Medical Assistant</p>
                    <p className="text-sm mt-2 text-gray-700">
                      <strong className="text-blue-900">I can help you with:</strong> Symptom analysis, finding doctors, health questions, medication information, and emergency support.
                    </p>
                    <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                      <p className="text-sm font-medium">Try asking:</p>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• "I have a headache and fever"</li>
                        <li>• "Find me a cardiologist in Delhi"</li>
                        <li>• "What should I do for a sore throat?"</li>
                      </ul>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div key={index} className="space-y-3">
                    {/* Emergency Alert Banner */}
                    {message.isEmergency && message.role === 'assistant' && (
                      <Alert variant="destructive" className="border-2 border-red-500 bg-red-50 animate-pulse">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertDescription className="font-semibold">
                          🚨 MEDICAL EMERGENCY DETECTED - Seek immediate medical attention. Call emergency services: 112 (India) or 911 (US)
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            message.isEmergency 
                              ? 'bg-red-100 border-2 border-red-500' 
                              : 'bg-primary/10'
                          }`}>
                            {message.isEmergency ? (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Bot className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[80%] ${
                          message.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-white'
                              : message.isEmergency
                              ? 'bg-red-50 text-red-900 border-2 border-red-200'
                              : message.severity === 'medium'
                              ? 'bg-orange-50 text-orange-900 border border-orange-200'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {renderMessageContent(message.content)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {message.role === 'assistant' && message.taskType && (
                            <Badge variant="outline" className="text-xs">
                              {taskConfigs[message.taskType].title}
                            </Badge>
                          )}
                          {message.role === 'assistant' && getToolBadge(message.tool_used)}
                          {message.role === 'assistant' && message.severity && message.severity !== 'low' && (
                            <Badge 
                              variant={message.severity === 'high' ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {message.severity === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {message.severity.toUpperCase()} Priority
                            </Badge>
                          )}
                          {message.role === 'assistant' && message.metadata?.context_switched && (
                            <Badge variant="secondary" className="text-xs">
                              Context Switched
                            </Badge>
                          )}
                          {message.role === 'assistant' && message.metadata?.response_time_ms && (
                            <span className="text-xs text-gray-400">
                              {Math.round(message.metadata.response_time_ms)}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t px-4 pt-3">
              <div className="flex gap-2 mb-1.5">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything: symptoms, find doctors, health questions, or medication info..."
                  disabled={isLoading}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="touch-manipulation"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 leading-tight pb-3">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </NavigationLayout>
  );
}
