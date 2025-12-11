import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientStatsService } from '@/services/patient-stats';
import { appointmentService } from '@/services/appointment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  IndianRupee, 
  Star,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import type { AppointmentWithDetails } from '@/types/database';

interface PatientAppointmentDashboardProps {
  patientId: string;
}

export function PatientAppointmentDashboard({ patientId }: PatientAppointmentDashboardProps) {
  // Fetch patient statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['patient-stats', patientId],
    queryFn: () => patientStatsService.getPatientStats(patientId),
    enabled: !!patientId,
  });

  // Fetch upcoming appointments
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['patient-upcoming-appointments', patientId],
    queryFn: () => appointmentService.getAppointmentsByPatient(patientId, {
      status: 'approved'
    }),
    enabled: !!patientId,
  });

  // Fetch favorite doctors
  const { data: favoriteDoctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['patient-favorite-doctors', patientId],
    queryFn: () => patientStatsService.getFavoriteDoctors(patientId, 3),
    enabled: !!patientId,
  });

  // Fetch appointment trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['patient-appointment-trends', patientId],
    queryFn: () => patientStatsService.getAppointmentTrends(patientId, 6),
    enabled: !!patientId,
  });

  const upcomingAppointments = upcomingData?.data?.filter(apt => 
    isAfter(new Date(apt.appointment_date), startOfDay(new Date()))
  ) || [];

  const nextAppointment = upcomingAppointments
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0];

  if (statsLoading || upcomingLoading || doctorsLoading || trendsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (statsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold">{stats?.total_appointments || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completed_appointments || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.upcoming_appointments || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">₹{stats?.total_spent || 0}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Appointment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Next Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nextAppointment.doctor.id}`} />
                    <AvatarFallback>
                      {nextAppointment.doctor.name?.[0]}
                      {nextAppointment.doctor.name?.split(' ')[1]?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      Dr. {nextAppointment.doctor.name}
                    </h3>
                    <p className="text-sm text-gray-600">{nextAppointment.doctor.specialty}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Date</p>
                    <p className="font-medium">{format(new Date(nextAppointment.appointment_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Time</p>
                    <p className="font-medium">{nextAppointment.appointment_time}</p>
                  </div>
                  {nextAppointment.reason && (
                    <div>
                      <p className="text-gray-600">Reason</p>
                      <p className="font-medium">{nextAppointment.reason}</p>
                    </div>
                  )}
                  {nextAppointment.doctor.price_range && (
                    <div>
                      <p className="text-gray-600">Price Range</p>
                      <p className="font-medium">₹{nextAppointment.doctor.price_range}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorite Doctors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Favorite Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {favoriteDoctors && favoriteDoctors.length > 0 ? (
              <div className="space-y-4">
                {favoriteDoctors.map((doctor) => (
                  <div key={doctor.doctorId} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dr. {doctor.doctorName}</h4>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{doctor.appointmentCount} visits</p>
                      {doctor.averageRating > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-600">{doctor.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No favorite doctors yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Trends */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Appointment Trends (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.map((trend) => (
                <div key={trend.month} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {format(new Date(trend.month + '-01'), 'MMMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>{trend.appointments} total</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>{trend.completed} completed</span>
                    </div>
                    {trend.cancelled > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>{trend.cancelled} cancelled</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Book Appointment</h4>
              <p className="text-sm text-gray-600">Schedule with a doctor</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Clock className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium">View History</h4>
              <p className="text-sm text-gray-600">See past appointments</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <h4 className="font-medium">Rate Doctors</h4>
              <p className="text-sm text-gray-600">Share your experience</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}