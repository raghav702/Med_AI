import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { doctorService } from '@/services/doctor';
import { appointmentService } from '@/services/appointment';
import { patientService } from '@/services/patient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { AppointmentForm } from './AppointmentForm';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import type { Doctor, CreateAppointment } from '@/types/database';

interface AppointmentBookingProps {
  doctorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingComplete?: (appointmentId: string) => void;
}

type BookingStep = 'date-time-selection' | 'appointment-form' | 'confirmation' | 'success';

interface BookingData {
  selectedDate: string | null;
  selectedTime: string | null;
  reason: string;
  patientNotes: string;
}

export function AppointmentBooking({ 
  doctorId, 
  open, 
  onOpenChange, 
  onBookingComplete 
}: AppointmentBookingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('date-time-selection');
  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: null,
    selectedTime: null,
    reason: '',
    patientNotes: ''
  });
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  // Fetch doctor information
  const { data: doctor, isLoading: doctorLoading, error: doctorError } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorService.getDoctorProfile(doctorId),
    enabled: open && !!doctorId,
  });

  // Fetch patient profile to ensure it exists
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get existing patient profile
      let patientProfile = await patientService.getPatientProfile(user.id);
      
      // If no patient profile exists, create one automatically
      if (!patientProfile) {
        try {
          patientProfile = await patientService.createPatientProfile({
            id: user.id,
          });
        } catch (error) {
          console.error('Failed to create patient profile:', error);
          return null;
        }
      }
      
      return patientProfile;
    },
    enabled: open && !!user?.id,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: CreateAppointment) => {
      return appointmentService.createAppointment(appointmentData);
    },
    onSuccess: (appointment) => {
      setCreatedAppointmentId(appointment.id);
      setCurrentStep('success');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Requested",
        description: "Your appointment request has been sent to the doctor for approval.",
      });
      onBookingComplete?.(appointment.id);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStepChange = (step: BookingStep) => {
    setCurrentStep(step);
  };

  const handleBookingDataChange = (data: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const handleDateTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData.selectedDate || !bookingData.selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time.",
        variant: "destructive",
      });
      return;
    }
    handleStepChange('appointment-form');
  };

  const handleConfirmBooking = async () => {
    if (!user?.id || !doctor || !bookingData.selectedDate || !bookingData.selectedTime || !bookingData.reason) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields.",
        variant: "destructive",
      });
      return;
    }

    const appointmentData: CreateAppointment = {
      doctor_id: doctor.id,
      patient_id: user.id,
      appointment_date: bookingData.selectedDate,
      appointment_time: bookingData.selectedTime,
      reason: bookingData.reason,
      patient_notes: bookingData.patientNotes || undefined,
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'date-time-selection':
        return 'Select Date & Time';
      case 'appointment-form':
        return 'Appointment Details';
      case 'confirmation':
        return 'Confirm Booking';
      case 'success':
        return 'Booking Confirmed';
      default:
        return 'Book Appointment';
    }
  };

  if (doctorLoading || patientLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 sm:p-6">
          <DialogHeader>
            <DialogTitle>Loading</DialogTitle>
            <DialogDescription>Please wait while we load the appointment booking information</DialogDescription>
          </DialogHeader>
          <div className="p-4 sm:p-0">
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" text="Loading appointment booking..." />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (doctorError || !doctor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 sm:p-6">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Unable to load doctor information</DialogDescription>
          </DialogHeader>
          <div className="p-4 sm:p-0">
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load doctor information. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!patient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 sm:p-6">
          <DialogHeader>
            <DialogTitle>Profile Required</DialogTitle>
            <DialogDescription>A patient profile is required to book appointments</DialogDescription>
          </DialogHeader>
          <div className="p-4 sm:p-0">
            <Alert variant="destructive">
              <AlertDescription>
                Please complete your patient profile before booking appointments.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <DialogHeader className="p-4 sm:p-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            {currentStep !== 'date-time-selection' && currentStep !== 'success' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const steps: BookingStep[] = ['date-time-selection', 'appointment-form', 'confirmation'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1]);
                  }
                }}
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            <Calendar className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'date-time-selection' && 'Choose your preferred appointment date and time'}
            {currentStep === 'appointment-form' && 'Provide details about your appointment'}
            {currentStep === 'confirmation' && 'Review and confirm your appointment details'}
            {currentStep === 'success' && 'Your appointment request has been submitted'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
          {/* Doctor Information Header */}
          {doctor && currentStep !== 'success' && (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <Avatar className="h-16 w-16 mx-auto sm:mx-0">
                      <AvatarFallback>
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">
                          {doctor.name}
                        </h2>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{doctor.specialty}</p>
                      
                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                        {doctor.aggregate_rating && (
                          <div className="flex items-center">
                            <div className="flex items-center" role="img" aria-label={`Rating: ${doctor.aggregate_rating.toFixed(1)} out of 5 stars`}>
                              {renderStars(doctor.aggregate_rating)}
                            </div>
                            <span className="ml-1 font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                            <span className="ml-1">({doctor.review_count} reviews)</span>
                          </div>
                        )}
                        {doctor.experience && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                            <span>{doctor.experience} years experience</span>
                          </div>
                        )}
                      </div>
                      
                      {doctor.address && (
                        <div className="flex items-center text-sm text-gray-600 mt-2 justify-center sm:justify-start">
                          <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
                          <span>{doctor.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Separator />
            </>
          )}

          {/* Step Content */}
          {currentStep === 'date-time-selection' && (
            <form onSubmit={handleDateTimeSubmit} className="space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label htmlFor="appointment-date" className="block text-sm font-medium mb-2">
                      Select Date *
                    </label>
                    <input
                      id="appointment-date"
                      type="date"
                      value={bookingData.selectedDate || ''}
                      onChange={(e) => handleBookingDataChange({ selectedDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="appointment-time" className="block text-sm font-medium mb-2">
                      Select Time *
                    </label>
                    <input
                      id="appointment-time"
                      type="time"
                      value={bookingData.selectedTime || ''}
                      onChange={(e) => handleBookingDataChange({ selectedTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button type="submit" size="lg">
                  Continue
                </Button>
              </div>
            </form>
          )}

          {currentStep === 'appointment-form' && (
            <AppointmentForm
              bookingData={bookingData}
              onDataChange={handleBookingDataChange}
              onNext={() => handleStepChange('confirmation')}
            />
          )}

          {currentStep === 'confirmation' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Review Your Appointment</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doctor:</span>
                      <span className="font-medium">{doctor.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Specialty:</span>
                      <span className="font-medium">{doctor.specialty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{bookingData.selectedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{bookingData.selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reason:</span>
                      <span className="font-medium">{bookingData.reason}</span>
                    </div>
                    {bookingData.patientNotes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Notes:</span>
                        <span className="font-medium">{bookingData.patientNotes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Alert>
                <AlertDescription>
                  Your appointment request will be sent to the doctor for approval. You will be notified once the doctor reviews your request.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleStepChange('appointment-form')}
                >
                  Edit Details
                </Button>
                <Button 
                  onClick={handleConfirmBooking}
                  disabled={createAppointmentMutation.isPending}
                  size="lg"
                >
                  {createAppointmentMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'success' && createdAppointmentId && (
            <div className="text-center py-6 sm:py-8">
              <CheckCircle 
                className="h-16 w-16 mx-auto mb-4 text-green-600" 
                aria-hidden="true"
              />
              <h3 className="text-xl font-semibold mb-2">Appointment Request Sent!</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Your appointment request has been sent to {doctor.name}. 
                You will receive a notification once the doctor approves your request.
              </p>
              <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p><strong>Date:</strong> {bookingData.selectedDate}</p>
                <p><strong>Time:</strong> {bookingData.selectedTime}</p>
                <p><strong>Status:</strong> <Badge variant="secondary">Pending Approval</Badge></p>
              </div>
              <Button 
                onClick={() => onOpenChange(false)} 
                className="mt-6 w-full sm:w-auto min-h-[44px] touch-manipulation"
                size="lg"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
