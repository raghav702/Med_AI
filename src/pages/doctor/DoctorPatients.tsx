import React, { useState } from 'react';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { PatientList } from '@/components/doctor/PatientList';
import { PatientProfileView } from '@/components/doctor/PatientProfileView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PatientWithProfile } from '@/types/database';
import { Users, Search } from 'lucide-react';

export const DoctorPatients: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<PatientWithProfile | null>(null);

  const handlePatientSelect = (patient: PatientWithProfile) => {
    setSelectedPatient(patient);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
  };

  if (selectedPatient) {
    return (
      <NavigationLayout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <PatientProfileView 
              patient={selectedPatient} 
              onBack={handleBackToList}
            />
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Patient Management</h1>
              <p className="text-muted-foreground mt-2">
                View and manage your patients and their medical information
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Advanced Search
              </Button>
            </div>
          </div>

          {/* Patient Lists */}
          <Tabs defaultValue="my-patients" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="my-patients" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Patients
              </TabsTrigger>
              <TabsTrigger value="all-patients" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                All Patients
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-patients" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Patients</CardTitle>
                  <CardDescription>
                    Patients who have had appointments with you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PatientList 
                    onPatientSelect={handlePatientSelect}
                    showMyPatientsOnly={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all-patients" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Patients</CardTitle>
                  <CardDescription>
                    Search and view all patients in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PatientList 
                    onPatientSelect={handlePatientSelect}
                    showMyPatientsOnly={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </NavigationLayout>
  );
};