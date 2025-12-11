import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface AppointmentHistoryWithRatingsProps {
  patientId: string;
}

// Terminal statuses as per requirement 7.1
const TERMINAL_STATUSES: AppointmentStatus[] = ['completed', 'cancelled', 'rejected'];

export function AppointmentHistoryWithRatings({ patientId }: AppointmentHistoryWithRatingsProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patient appointments with terminal statuses only
  const { data: appointmentsData, isLoading, error } = useQuery({
    queryKey: ['patient-appointment-history', patientId],
    queryFn: async () => {
      const result = await appointmentService.getAppointmentsByPatient(patientId);
      // Filter to only terminal statuses as per requirement 7.1
      const filteredData = {
        ...result,
        data: result.data.filter(apt => TERMINAL_STATUSES.includes(apt.status))
      };
      return filteredData;
    },
    enabled: !!patientId,
  });

  const appointments = appointmentsData?.data || [];

  // Mutation for adding rating
  const addRatingMutation = useMutation({
    mutationFn: async ({ appointmentId, rating, reviewText }: { 
      appointmentId: string; 
      rating: number; 
      reviewText?: string 
    }) => {
      // Validate rating range (1-5) as per requirement 7.2
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      return appointmentService.updateAppointment(appointmentId, {
        rating,
        review_text: reviewText || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointment-history', patientId] });
      toast({
        title: 'Rating submitted',
        description: 'Thank you for your feedback!',
      });
      setShowRatingDialog(false);
      setSelectedAppointment(null);
      setRating(0);
      setReviewText('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit rating',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleRateAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setRating(appointment.rating || 0);
    setReviewText(appointment.review_text || '');
    setShowRatingDialog(true);
  };

  const handleSubmitRating = () => {
    if (!selectedAppointment) return;
    
    // Validate rating is between 1-5
    if (rating < 1 || rating > 5) {
      toast({
        title: 'Invalid rating',
        description: 'Please select a rating between 1 and 5 stars',
        variant: 'destructive',
      });
      return;
    }

    addRatingMutation.mutate({
      appointmentId: selectedAppointment.id,
      rating,
      reviewText: reviewText.trim() || undefined
    });
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = interactive 
        ? (hoveredRating || rating) >= starValue
        : currentRating >= starValue;
      
      return (
        <Star
          key={i}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            isActive
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
          onClick={() => interactive && setRating(starValue)}
          onMouseEnter={() => interactive && setHoveredRating(starValue)}
          onMouseLeave={() => interactive && setHoveredRating(0)}
        />
      );
    });
  };

  const renderSmallStars = (currentRating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < currentRating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load appointment history. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Appointment History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            View your past appointments and provide feedback
          </p>
        </CardHeader>
      </Card>

      {/* Appointment List */}
      {appointments.length > 0 ? (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      Dr. {appointment.doctor.name}
                    </h3>
                    <p className="text-sm text-gray-600">{appointment.doctor.specialty}</p>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {getStatusIcon(appointment.status)}
                    <span className="ml-1 capitalize">{appointment.status}</span>
                  </Badge>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{appointment.appointment_time}</span>
                  </div>
                  {appointment.reason && (
                    <div className="flex items-start space-x-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span>{appointment.reason}</span>
                    </div>
                  )}
                </div>

                {/* Doctor notes for completed appointments */}
                {appointment.status === 'completed' && appointment.doctor_notes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900 text-sm mb-1">Doctor's Notes:</p>
                    <p className="text-blue-800 text-sm">{appointment.doctor_notes}</p>
                  </div>
                )}

                {/* Rejection reason */}
                {appointment.status === 'rejected' && appointment.doctor_notes && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-red-900 text-sm mb-1">Rejection Reason:</p>
                    <p className="text-red-800 text-sm">{appointment.doctor_notes}</p>
                  </div>
                )}

                {/* Rating section */}
                {appointment.status === 'completed' && (
                  <div className="pt-4 border-t">
                    {appointment.rating ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Your Rating:</span>
                          <div className="flex">
                            {renderSmallStars(appointment.rating)}
                          </div>
                          <span className="text-sm text-gray-600">({appointment.rating}/5)</span>
                        </div>
                        {appointment.review_text && (
                          <div className="p-2 bg-gray-50 rounded text-sm">
                            <p className="text-gray-700">{appointment.review_text}</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRateAppointment(appointment)}
                        >
                          Update Rating
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRateAppointment(appointment)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Appointment
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Appointment History</h3>
            <p className="text-gray-600">
              Your completed, cancelled, or rejected appointments will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Appointment</DialogTitle>
            <DialogDescription>
              Share your experience with Dr. {selectedAppointment?.doctor.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating (1-5 stars)</label>
              <div className="flex gap-1">
                {renderStars(rating, true)}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600">You selected {rating} out of 5 stars</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Review (Optional)</label>
              <Textarea
                placeholder="Share your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRatingDialog(false);
                setSelectedAppointment(null);
                setRating(0);
                setReviewText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={rating < 1 || rating > 5 || addRatingMutation.isPending}
            >
              {addRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
