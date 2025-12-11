import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calendar, 
  Clock, 
  Star, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';

interface PatientAppointmentManagementProps {
  appointment: AppointmentWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActionType = 'cancel' | 'reschedule' | 'rate' | 'view';

export function PatientAppointmentManagement({ 
  appointment, 
  open, 
  onOpenChange 
}: PatientAppointmentManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionType, setActionType] = useState<ActionType>('view');
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async () => {
      return appointmentService.updateAppointmentStatus(
        appointment.id, 
        'cancelled', 
        cancelReason || 'Cancelled by patient'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Rate appointment mutation
  const rateAppointmentMutation = useMutation({
    mutationFn: async () => {
      return appointmentService.updateAppointment(appointment.id, {
        rating,
        review_text: reviewText
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const canCancel = () => {
    return ['pending', 'approved'].includes(appointment.status);
  };

  const canReschedule = () => {
    return appointment.status === 'approved';
  };

  const canRate = () => {
    return appointment.status === 'completed' && !appointment.rating;
  };

  const handleAction = (action: ActionType) => {
    setActionType(action);
    if (action === 'cancel') {
      setShowConfirmation(true);
    }
  };

  const handleConfirmCancel = () => {
    cancelAppointmentMutation.mutate();
    setShowConfirmation(false);
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }
    rateAppointmentMutation.mutate();
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-6 w-6 cursor-pointer transition-colors ${
          i < currentRating 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300 hover:text-yellow-400'
        }`}
        onClick={interactive ? () => setRating(i + 1) : undefined}
      />
    ));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Appointment Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Dr. {appointment.doctor.name}
                  </CardTitle>
                  <Badge className={getStatusColor(appointment.status)}>
                    {getStatusIcon(appointment.status)}
                    <span className="ml-1 capitalize">{appointment.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Specialty</Label>
                    <p className="text-sm">{appointment.doctor.specialty}</p>
                  </div>
                  {appointment.doctor.price_range && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Price Range</Label>
                      <p className="text-sm">₹{appointment.doctor.price_range}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Date</Label>
                    <p className="text-sm">{format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Time</Label>
                    <p className="text-sm">{appointment.appointment_time}</p>
                  </div>
                </div>

                {appointment.reason && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Reason for Visit</Label>
                    <p className="text-sm">{appointment.reason}</p>
                  </div>
                )}

                {appointment.patient_notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Your Notes</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded">{appointment.patient_notes}</p>
                  </div>
                )}

                {appointment.doctor_notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Doctor's Notes</Label>
                    <p className="text-sm bg-blue-50 p-2 rounded">{appointment.doctor_notes}</p>
                  </div>
                )}

                {appointment.rating && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Your Rating</Label>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {renderStars(appointment.rating)}
                      </div>
                      <span className="text-sm text-gray-600">({appointment.rating}/5)</span>
                    </div>
                    {appointment.review_text && (
                      <p className="text-sm mt-2 bg-yellow-50 p-2 rounded">{appointment.review_text}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating Section for Completed Appointments */}
            {actionType === 'rate' && canRate() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Rate Your Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Rating</Label>
                    <div className="flex items-center space-x-1 mt-2">
                      {renderStars(rating, true)}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="review" className="text-sm font-medium">
                      Review (Optional)
                    </Label>
                    <Textarea
                      id="review"
                      placeholder="Share your experience with this appointment..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setActionType('view')}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmitRating}
                      disabled={rateAppointmentMutation.isPending}
                    >
                      {rateAppointmentMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancel Section */}
            {actionType === 'cancel' && canCancel() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    Cancel Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Are you sure you want to cancel this appointment? This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label htmlFor="cancelReason" className="text-sm font-medium">
                      Reason for Cancellation (Optional)
                    </Label>
                    <Textarea
                      id="cancelReason"
                      placeholder="Please let us know why you're cancelling..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setActionType('view')}>
                      Keep Appointment
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowConfirmation(true)}
                    >
                      Cancel Appointment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {actionType === 'view' && (
              <div className="flex justify-end space-x-2">
                {canCancel() && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleAction('cancel')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
                {canReschedule() && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleAction('reschedule')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                )}
                {canRate() && (
                  <Button onClick={() => handleAction('rate')}>
                    <Star className="h-4 w-4 mr-2" />
                    Rate Experience
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Cancellation
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel your appointment with Dr. {appointment.doctor.name} 
              on {format(new Date(appointment.appointment_date), 'MMMM d, yyyy')} at {appointment.appointment_time}?
            </p>
            <p className="text-sm text-red-600 mt-2 font-medium">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Keep Appointment
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel}
              disabled={cancelAppointmentMutation.isPending}
            >
              {cancelAppointmentMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}