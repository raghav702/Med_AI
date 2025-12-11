import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appointmentService } from '@/services/appointment';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { AppointmentWithDetails, AppointmentFilters, AppointmentStatus } from '@/types/database';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';

export const DoctorAppointmentManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  // Load appointments filtered by doctor_id (RLS enforced)
  const loadAppointments = async (statusFilter?: AppointmentStatus) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const filters: AppointmentFilters = statusFilter ? { status: statusFilter } : {};

      const result = await appointmentService.getAppointmentsByDoctor(
        user.id,
        filters,
        { limit: 50 }
      );

      setAppointments(result.data);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadAppointments('pending');
    } else if (activeTab === 'approved') {
      loadAppointments('approved');
    } else {
      loadAppointments();
    }
  }, [user?.id, activeTab]);

  // Handle appointment approval
  const handleApprove = async (appointmentId: string, notes?: string) => {
    try {
      setActionLoading(appointmentId);

      await appointmentService.approveAppointment(appointmentId, notes);

      toast({
        title: 'Appointment Approved',
        description: 'The appointment has been approved successfully.',
      });

      // Refresh the list
      await loadAppointments(activeTab === 'pending' ? 'pending' : activeTab === 'approved' ? 'approved' : undefined);
    } catch (err) {
      console.error('Error approving appointment:', err);
      toast({
        title: 'Error',
        description: 'Failed to approve appointment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle appointment rejection
  const handleReject = async (appointmentId: string, reason?: string) => {
    try {
      setActionLoading(appointmentId);

      await appointmentService.rejectAppointment(appointmentId, reason);

      toast({
        title: 'Appointment Rejected',
        description: 'The appointment has been rejected.',
      });

      // Refresh the list
      await loadAppointments(activeTab === 'pending' ? 'pending' : activeTab === 'approved' ? 'approved' : undefined);
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      toast({
        title: 'Error',
        description: 'Failed to reject appointment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Open action dialog
  const openActionDialog = (appointment: AppointmentWithDetails, action: 'approve' | 'reject') => {
    setSelectedAppointment(appointment);
    setActionType(action);
    setDoctorNotes(appointment.doctor_notes || '');
  };

  // Close action dialog
  const closeActionDialog = () => {
    setSelectedAppointment(null);
    setActionType(null);
    setDoctorNotes('');
  };

  // Handle action confirmation
  const handleActionConfirm = async () => {
    if (!selectedAppointment || !actionType) return;

    if (actionType === 'approve') {
      await handleApprove(selectedAppointment.id, doctorNotes.trim() || undefined);
    } else if (actionType === 'reject') {
      await handleReject(selectedAppointment.id, doctorNotes.trim() || undefined);
    }

    closeActionDialog();
  };

  // Get patient display name
  const getPatientName = (appointment: AppointmentWithDetails) => {
    const firstName = appointment.patient?.first_name || '';
    const lastName = appointment.patient?.last_name || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return appointment.patient?.user_profile?.email || 'Unknown Patient';
  };

  // Get patient initials
  const getPatientInitials = (appointment: AppointmentWithDetails) => {
    const firstName = appointment.patient?.first_name || '';
    const lastName = appointment.patient?.last_name || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return 'P';
  };

  // Format date and time
  const formatDateTime = (date: string, time: string) => {
    const appointmentDate = new Date(date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `${formattedDate} at ${time}`;
  };

  // Get status badge color
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

  // Get status icon
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

  // Render appointment card
  const renderAppointmentCard = (appointment: AppointmentWithDetails) => {
    return (
      <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>
              {getPatientInitials(appointment)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{getPatientName(appointment)}</h4>
              <Badge className={getStatusColor(appointment.status)}>
                {getStatusIcon(appointment.status)}
                <span className="ml-1 capitalize">{appointment.status}</span>
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDateTime(appointment.appointment_date, appointment.appointment_time)}</span>
              </div>

              {appointment.reason && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{appointment.reason}</span>
                </div>
              )}

              {appointment.patient_notes && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5" />
                  <span className="text-xs">{appointment.patient_notes}</span>
                </div>
              )}

              {appointment.doctor_notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <span className="text-xs font-medium">Your notes: {appointment.doctor_notes}</span>
                </div>
              )}
            </div>

            {appointment.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openActionDialog(appointment, 'approve')}
                  disabled={actionLoading === appointment.id}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openActionDialog(appointment, 'reject')}
                  disabled={actionLoading === appointment.id}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => loadAppointments()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Management
              </CardTitle>
              <CardDescription>
                View and manage your appointments
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadAppointments(activeTab === 'pending' ? 'pending' : activeTab === 'approved' ? 'approved' : undefined)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'approved' | 'all')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending
                {!loading && appointments.length > 0 && activeTab === 'pending' && (
                  <Badge variant="secondary" className="ml-2">
                    {appointments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No pending appointments
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any pending appointment requests at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map(renderAppointmentCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No approved appointments
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any approved appointments at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map(renderAppointmentCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No appointments
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any appointments yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map(renderAppointmentCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedAppointment && !!actionType} onOpenChange={closeActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Appointment' : 'Reject Appointment'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Add notes and confirm the appointment.'
                : 'Please provide a reason for rejecting this appointment.'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getPatientInitials(selectedAppointment)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{getPatientName(selectedAppointment)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedAppointment.appointment_date, selectedAppointment.appointment_time)}
                    </p>
                  </div>
                </div>
                {selectedAppointment.reason && (
                  <p className="text-sm">{selectedAppointment.reason}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  {actionType === 'approve' ? 'Doctor Notes (optional)' : 'Reason for rejection'}
                </label>
                <Textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'Any special instructions or notes for the patient...'
                      : 'Please explain why you are rejecting this appointment...'
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleActionConfirm}
              disabled={actionType === 'reject' && !doctorNotes.trim()}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'} Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
