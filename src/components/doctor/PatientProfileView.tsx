import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { appointmentService } from '@/services/appointment';
import { useAuth } from '@/contexts/AuthContext';
import type { PatientWithProfile, AppointmentWithDetails, AppointmentFilters } from '@/types/database';
import {
  User,
  Phone,
  Calendar,
  Heart,
  AlertTriangle,
  Pill,
  FileText,
  Clock,
  MapPin,
  Shield,
  Activity,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface PatientProfileViewProps {
  patient: PatientWithProfile;
  onBack?: () => void;
}

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({ 
  patient, 
  onBack 
}) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // Load patient's appointments with this doctor
  const loadAppointments = async () => {
    if (!user?.id || !patient.id) return;

    try {
      setAppointmentsLoading(true);
      setAppointmentsError(null);

      const filters: AppointmentFilters = {
        patient_id: patient.id
      };

      const result = await appointmentService.getAppointmentsByDoctor(
        user.id, 
        filters, 
        { limit: 10 }
      );

      setAppointments(result.data);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setAppointmentsError('Failed to load appointment history.');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user?.id, patient.id]);

  // Get patient display name
  const getPatientName = () => {
    const firstName = patient.user_profile?.first_name || '';
    const lastName = patient.user_profile?.last_name || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return 'Unknown Patient';
  };

  // Get patient initials
  const getPatientInitials = () => {
    const firstName = patient.user_profile?.first_name || '';
    const lastName = patient.user_profile?.last_name || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return 'P';
  };

  // Calculate age
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format appointment status
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      approved: { variant: 'default' as const, label: 'Approved' },
      completed: { variant: 'default' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
      no_show: { variant: 'outline' as const, label: 'No Show' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const age = calculateAge(patient.user_profile?.date_of_birth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {getPatientInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{getPatientName()}</h1>
            <p className="text-muted-foreground">
              Patient Profile • {age ? `${age} years old` : 'Age unknown'}
            </p>
          </div>
        </div>
        <Badge variant={patient.user_profile?.is_active ? 'default' : 'secondary'}>
          {patient.user_profile?.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical History</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-sm">{patient.user_profile?.first_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-sm">{patient.user_profile?.last_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">
                      {patient.user_profile?.date_of_birth 
                        ? formatDate(patient.user_profile.date_of_birth)
                        : 'Not provided'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Blood Type</label>
                    <p className="text-sm">{patient.blood_type || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-sm">{patient.user_profile?.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Emergency Contact</label>
                  <p className="text-sm">{patient.emergency_contact_name || 'Not provided'}</p>
                  {patient.emergency_contact_phone && (
                    <p className="text-xs text-muted-foreground">{patient.emergency_contact_phone}</p>
                  )}
                  {patient.emergency_contact_relationship && (
                    <p className="text-xs text-muted-foreground">({patient.emergency_contact_relationship})</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preferred Language</label>
                  <p className="text-sm">{patient.preferred_language || 'English'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Physical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Physical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Height</label>
                    <p className="text-sm">
                      {patient.height_cm ? `${patient.height_cm} cm` : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Weight</label>
                    <p className="text-sm">
                      {patient.weight_kg ? `${patient.weight_kg} kg` : 'Not provided'}
                    </p>
                  </div>
                </div>
                {patient.height_cm && patient.weight_kg && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">BMI</label>
                    <p className="text-sm">
                      {((patient.weight_kg / Math.pow(patient.height_cm / 100, 2))).toFixed(1)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insurance Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Insurance Provider</label>
                  <p className="text-sm">{patient.insurance_provider || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Policy Number</label>
                  <p className="text-sm">{patient.insurance_policy_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Primary Care Doctor</label>
                  <p className="text-sm">{patient.primary_care_doctor || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medical Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Medical Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.user_profile?.medical_conditions?.length ? (
                  <div className="space-y-2">
                    {patient.user_profile.medical_conditions.map((condition, index) => (
                      <Badge key={index} variant="outline">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No medical conditions recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.user_profile?.allergies?.length ? (
                  <div className="space-y-2">
                    {patient.user_profile.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No allergies recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Current Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.user_profile?.medications?.length ? (
                  <div className="space-y-2">
                    {patient.user_profile.medications.map((medication, index) => (
                      <Badge key={index} variant="secondary">
                        {medication}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No current medications recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medical_history ? (
                  <p className="text-sm whitespace-pre-wrap">{patient.medical_history}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No medical history recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment History
              </CardTitle>
              <CardDescription>
                Previous and upcoming appointments with this patient
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-6 w-[80px]" />
                    </div>
                  ))}
                </div>
              ) : appointmentsError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{appointmentsError}</AlertDescription>
                </Alert>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No appointments found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This patient hasn't had any appointments with you yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatDate(appointment.appointment_date)} at {appointment.appointment_time}
                          </span>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.reason_for_visit}
                        </p>
                        {appointment.doctor_notes && (
                          <p className="text-sm text-muted-foreground">
                            Notes: {appointment.doctor_notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${appointment.consultation_fee}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.duration_minutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};