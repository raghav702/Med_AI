import React from 'react';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { DoctorAppointmentManagement } from '@/components/doctor/DoctorAppointmentManagement';

export const DoctorAppointments: React.FC = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Appointments
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your appointment requests and schedule
            </p>
          </div>

          <DoctorAppointmentManagement />
        </div>
      </div>
    </NavigationLayout>
  );
};
