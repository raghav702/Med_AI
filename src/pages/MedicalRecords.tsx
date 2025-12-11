import React from 'react';
import { AppointmentHistoryWithRatings } from '@/components/appointments/AppointmentHistoryWithRatings';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Medical Records page component
 * 
 * Displays appointment history as medical records (Requirement 7.4)
 * Shows completed, cancelled, and rejected appointments
 */
const MedicalRecords = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view your medical records.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Medical Records</h1>
          <p className="text-muted-foreground mt-2">
            View your appointment history and provide feedback
          </p>
        </div>
        
        <AppointmentHistoryWithRatings patientId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default MedicalRecords;