import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentService } from '@/services/appointment';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, MapPin, Plus, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';

/**
 * Simplified Appointments page
 * Single scrollable view with all appointments
 */
const Appointments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch patient appointments
  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0, page: 1, limit: 10, total_pages: 0 };
      try {
        return await appointmentService.getAppointmentsByPatient(user.id);
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
        return { data: [], count: 0, page: 1, limit: 10, total_pages: 0 };
      }
    },
    enabled: !!user?.id,
    retry: false,
  });

  const appointments = appointmentsData?.data || [];

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return await appointmentService.updateAppointmentStatus(appointmentId, 'cancelled');
    },
    onSuccess: () => {
      toast({
        title: 'Appointment Cancelled',
        description: 'Your appointment has been cancelled successfully.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to cancel appointment:', error);
    },
  });

  const handleCancelAppointment = (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelMutation.mutate(appointmentId);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const variant = variants[status] || variants.cancelled;
    return (
      <Badge className={variant.color}>
        {variant.icon}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => {
    const canCancel = ['pending', 'approved'].includes(appointment.status);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment.doctor.id}`} />
                <AvatarFallback>
                  {appointment.doctor.name?.[0]}
                  {appointment.doctor.name?.split(' ')[1]?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">Dr. {appointment.doctor.name}</h3>
                  {getStatusBadge(appointment.status)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{appointment.doctor.specialty}</p>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</span>
                    <Clock className="h-3.5 w-3.5 ml-2" />
                    <span>{appointment.appointment_time}</span>
                  </div>
                  {appointment.doctor.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{appointment.doctor.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelAppointment(appointment.id)}
                disabled={cancelMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-gray-600 mt-1">
              {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
            </p>
          </div>
          <Button onClick={() => navigate('/doctor-discovery')}>
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load appointments. Please try again.
            </AlertDescription>
          </Alert>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Appointments Yet</h3>
              <p className="text-gray-600 mb-4">
                Book your first appointment to get started
              </p>
              <Button onClick={() => navigate('/doctor-discovery')}>
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Appointments;