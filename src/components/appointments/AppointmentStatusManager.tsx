import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, AlertTriangle, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useAppointmentStatus } from '@/hooks/useAppointmentStatus';
import type { Appointment, AppointmentStatus } from '@/types/database';

interface AppointmentStatusManagerProps {
  appointment: Appointment;
  userRole: 'doctor' | 'patient' | 'admin';
  userId: string;
  onStatusChange?: (newStatus: AppointmentStatus) => void;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  no_show: 'bg-orange-100 text-orange-800 border-orange-200'
};

const STATUS_ICONS: Record<AppointmentStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
  no_show: <AlertTriangle className="h-4 w-4" />
};

export function AppointmentStatusManager({
  appointment,
  userRole,
  userId,
  onStatusChange
}: AppointmentStatusManagerProps) {
  const {
    workflow,
    isLoading,
    isUpdating,
    isApproving,
    isRejecting,
    isRescheduling,
    isCancelling,
    isCompleting,
    error,
    updateStatus,
    approveAppointment,
    rejectAppointment,
    rescheduleAppointment,
    cancelAppointment,
    completeAppointment,
    getAllowedTransitions,
    detectConflicts,
    getSuggestedAlternatives,
    clearError
  } = useAppointmentStatus(appointment.id);

  const [notes, setNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [conflicts, setConflicts] = useState<any>(null);
  const [suggestedTimes, setSuggestedTimes] = useState<any[]>([]);

  const allowedTransitions = getAllowedTransitions(appointment, userRole);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleStatusUpdate = async (newStatus: AppointmentStatus) => {
    try {
      await updateStatus({
        newStatus,
        requestedBy: userRole,
        notes: notes || undefined
      });
      setNotes('');
      onStatusChange?.(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleApprove = async () => {
    try {
      await approveAppointment({
        doctorId: userId,
        notes: notes || undefined
      });
      setNotes('');
      onStatusChange?.('approved');
    } catch (err) {
      console.error('Failed to approve appointment:', err);
    }
  };

  const handleReject = async () => {
    try {
      await rejectAppointment({
        doctorId: userId,
        reason: notes || undefined
      });
      setNotes('');
      onStatusChange?.('rejected');
    } catch (err) {
      console.error('Failed to reject appointment:', err);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      return;
    }

    try {
      // Check for conflicts first
      const conflictResult = await detectConflicts(
        appointment.doctor_id,
        appointment.patient_id,
        rescheduleDate,
        rescheduleTime,
        appointment.duration_minutes,
        appointment.id
      );

      if (conflictResult.hasConflict) {
        setConflicts(conflictResult);
        // Get suggested alternatives
        const alternatives = await getSuggestedAlternatives(
          appointment.doctor_id,
          appointment.patient_id,
          rescheduleDate
        );
        setSuggestedTimes(alternatives);
        return;
      }

      await rescheduleAppointment({
        appointmentId: appointment.id,
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        reason: rescheduleReason,
        requestedBy: userRole
      });

      setShowRescheduleForm(false);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      setConflicts(null);
      setSuggestedTimes([]);
    } catch (err) {
      console.error('Failed to reschedule appointment:', err);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelAppointment({
        appointmentId: appointment.id,
        reason: cancellationReason,
        cancelledBy: userRole
      });

      setShowCancelForm(false);
      setCancellationReason('');
      onStatusChange?.('cancelled');
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const handleComplete = async () => {
    try {
      await completeAppointment({
        doctorId: userId,
        completionData: {
          doctorNotes: completionNotes || undefined,
          prescription: prescription || undefined,
          followUpRequired,
          followUpDate: followUpDate || undefined
        }
      });

      setShowCompleteForm(false);
      setCompletionNotes('');
      setPrescription('');
      setFollowUpRequired(false);
      setFollowUpDate('');
      onStatusChange?.('completed');
    } catch (err) {
      console.error('Failed to complete appointment:', err);
    }
  };

  const useSuggestedTime = (suggestion: { date: string; time: string }) => {
    setRescheduleDate(suggestion.date);
    setRescheduleTime(suggestion.time);
    setConflicts(null);
    setSuggestedTimes([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Status
          </CardTitle>
          <CardDescription>
            Manage appointment status and workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Badge className={`${STATUS_COLORS[appointment.status]} flex items-center gap-1`}>
              {STATUS_ICONS[appointment.status]}
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
            <div className="text-sm text-gray-600">
              Last updated: {new Date(appointment.updated_at).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Date & Time</Label>
              <div className="flex items-center gap-1 mt-1">
                <CalendarIcon className="h-4 w-4" />
                {appointment.appointment_date} at {appointment.appointment_time}
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Duration</Label>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4" />
                {appointment.duration_minutes} minutes
              </div>
            </div>
          </div>

          {/* Workflow Progress */}
          {workflow && (
            <div className="space-y-2">
              <Label className="text-gray-600">Workflow Progress</Label>
              <div className="space-y-2">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'pending' ? 'bg-yellow-500' :
                      step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                    }`} />
                    <span className={step.status === 'completed' ? 'text-green-700' : 'text-gray-600'}>
                      {step.name}
                    </span>
                    {step.completedAt && (
                      <span className="text-xs text-gray-500">
                        ({new Date(step.completedAt).toLocaleString()})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Actions */}
      {allowedTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Actions</CardTitle>
            <CardDescription>
              Actions you can perform on this appointment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notes for status changes */}
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this status change..."
                className="mt-1"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Approve/Reject buttons for doctors */}
              {userRole === 'doctor' && appointment.status === 'pending' && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={isRejecting}
                    variant="destructive"
                  >
                    {isRejecting ? 'Rejecting...' : 'Reject'}
                  </Button>
                </>
              )}

              {/* Complete button for doctors */}
              {userRole === 'doctor' && appointment.status === 'approved' && (
                <Button
                  onClick={() => setShowCompleteForm(true)}
                  disabled={isCompleting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Complete Appointment
                </Button>
              )}

              {/* Reschedule button */}
              {allowedTransitions.includes('pending') && (
                <Button
                  onClick={() => setShowRescheduleForm(true)}
                  disabled={isRescheduling}
                  variant="outline"
                >
                  Reschedule
                </Button>
              )}

              {/* Cancel button */}
              {allowedTransitions.includes('cancelled') && (
                <Button
                  onClick={() => setShowCancelForm(true)}
                  disabled={isCancelling}
                  variant="destructive"
                >
                  Cancel
                </Button>
              )}

              {/* Other status transitions */}
              {allowedTransitions
                .filter(status => !['approved', 'rejected', 'cancelled', 'completed'].includes(status))
                .map(status => (
                  <Button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    disabled={isUpdating}
                    variant="outline"
                  >
                    Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reschedule Form */}
      {showRescheduleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Reschedule Appointment</CardTitle>
            <CardDescription>
              Select a new date and time for the appointment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflicts && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {conflicts.conflictDetails}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reschedule-date">New Date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="reschedule-time">New Time</Label>
                <Input
                  id="reschedule-time"
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reschedule-reason">Reason for Rescheduling</Label>
              <Textarea
                id="reschedule-reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Why are you rescheduling this appointment?"
              />
            </div>

            {suggestedTimes.length > 0 && (
              <div>
                <Label>Suggested Alternative Times</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {suggestedTimes.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => useSuggestedTime(suggestion)}
                    >
                      {suggestion.date} at {suggestion.time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleReschedule}
                disabled={isRescheduling || !rescheduleDate || !rescheduleTime}
              >
                {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRescheduleForm(false);
                  setConflicts(null);
                  setSuggestedTimes([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Form */}
      {showCancelForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cancel Appointment</CardTitle>
            <CardDescription>
              Please provide a reason for cancellation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cancellation-reason">Reason for Cancellation</Label>
              <Textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Why are you cancelling this appointment?"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                disabled={isCancelling || !cancellationReason.trim()}
                variant="destructive"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancelForm(false)}
              >
                Keep Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Form */}
      {showCompleteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Appointment</CardTitle>
            <CardDescription>
              Add consultation notes and prescription details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="completion-notes">Consultation Notes</Label>
              <Textarea
                id="completion-notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add notes about the consultation..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="prescription">Prescription</Label>
              <Textarea
                id="prescription"
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="Add prescription details..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="follow-up"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="follow-up">Follow-up appointment required</Label>
            </div>

            {followUpRequired && (
              <div>
                <Label htmlFor="follow-up-date">Follow-up Date</Label>
                <Input
                  id="follow-up-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCompleting ? 'Completing...' : 'Complete Appointment'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCompleteForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}