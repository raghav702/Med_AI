import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/error";
import { globalErrorHandler } from "@/lib/global-error-handler";
import { getUserFacingConfigErrors } from "@/lib/startup-validator";
import { getCurrentEnvironment } from "@/lib/config";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import Appointments from "./pages/Appointments";
import { DoctorDashboard } from "./pages/doctor/DoctorDashboard";
import { DoctorProfile } from "./pages/doctor/DoctorProfile";
import { DoctorPatients } from "./pages/doctor/DoctorPatients";
import { DoctorAppointments } from "./pages/doctor/DoctorAppointments";
import DoctorDiscovery from "./pages/DoctorDiscovery";
import AIAssistantDemo from "./pages/AIAssistantDemo";
import AIMedicalAssistant from "./pages/AIMedicalAssistant";
import NotFound from "./pages/NotFound";
import ConfigurationError from "./components/error/ConfigurationError";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.message?.includes('auth') || error?.message?.includes('401')) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

const App = () => {
  const [configErrors, setConfigErrors] = useState(getUserFacingConfigErrors());
  const environment = getCurrentEnvironment();
  
  // Initialize global error handling
  useEffect(() => {
    globalErrorHandler.initialize();
    
    return () => {
      globalErrorHandler.cleanup();
    };
  }, []);
  
  // Check for configuration errors periodically in development
  useEffect(() => {
    if (environment !== 'development') return;
    
    const interval = setInterval(() => {
      const newErrors = getUserFacingConfigErrors();
      if (JSON.stringify(newErrors) !== JSON.stringify(configErrors)) {
        setConfigErrors(newErrors);
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [configErrors, environment]);
  
  // Show blocking configuration errors
  const hasBlockingErrors = configErrors.some(error => error.isBlocking);
  
  if (hasBlockingErrors && environment === 'production') {
    return (
      <ErrorBoundary level="page" showDetails={false}>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Configuration Error
                </h1>
                <p className="text-gray-600">
                  The application is not properly configured for this environment.
                </p>
              </div>
              <ConfigurationError />
            </div>
          </div>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" showDetails={import.meta.env.DEV}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary level="section">
                {/* Show non-blocking configuration errors in development */}
                {environment === 'development' && configErrors.length > 0 && !hasBlockingErrors && (
                  <div className="bg-yellow-50 border-b border-yellow-200 p-4">
                    <div className="max-w-7xl mx-auto">
                      <ConfigurationError />
                    </div>
                  </div>
                )}
                
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  {/* Protected Routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/medical-records" 
                    element={
                      <ProtectedRoute>
                        <div className="p-6">
                          <h1 className="text-2xl font-bold">Medical Records</h1>
                          <p className="text-muted-foreground">View your appointment history in the Appointments section.</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/appointments" 
                    element={
                      <ProtectedRoute>
                        <Appointments />
                      </ProtectedRoute>
                    } 
                  />
                  {/* AI Medical Assistant - Primary doctor discovery route */}
                  <Route 
                    path="/doctors" 
                    element={
                      <ProtectedRoute>
                        <AIMedicalAssistant />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Alias routes for AI Assistant */}
                  <Route 
                    path="/ai-assistant" 
                    element={
                      <ProtectedRoute>
                        <AIMedicalAssistant />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Doctor Discovery - Browse doctors */}
                  <Route 
                    path="/doctor-discovery" 
                    element={
                      <ProtectedRoute>
                        <DoctorDiscovery />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Doctor Routes */}
                  <Route 
                    path="/doctor/dashboard" 
                    element={
                      <ProtectedRoute>
                        <DoctorDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/doctor/patients" 
                    element={
                      <ProtectedRoute>
                        <DoctorPatients />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/doctor/appointments" 
                    element={
                      <ProtectedRoute>
                        <DoctorAppointments />
                      </ProtectedRoute>
                    } 
                  />

                  <Route 
                    path="/doctor/profile" 
                    element={
                      <ProtectedRoute>
                        <DoctorProfile />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Root redirect - redirect to dashboard if authenticated, login if not */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Catch-all route for 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
