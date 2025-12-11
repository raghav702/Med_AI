import { useState, useEffect } from "react";
import { DoctorDashboardLayout } from "@/components/layout/DoctorDashboardLayout";
import { DoctorProfileForm } from "@/components/doctor/DoctorProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { doctorService } from "@/services/doctor";
import { databaseService } from "@/services/database";
import type { Doctor, UserProfile } from "@/types/database";
import { AlertCircle, Stethoscope } from "lucide-react";

export const DoctorProfile: React.FC = () => {
  const { user } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load doctor profile and availability
  useEffect(() => {
    const loadDoctorData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Load user profile and doctor profile in parallel
        const [userProfileResult, doctorProfileResult] = await Promise.allSettled([
          databaseService.getUserProfile(user.id),
          doctorService.getDoctorProfile(user.id)
        ]);

        // Handle user profile result
        if (userProfileResult.status === 'fulfilled') {
          setUserProfile(userProfileResult.value);
        } else {
          console.error('Failed to load user profile:', userProfileResult.reason);
        }

        // Handle doctor profile result
        if (doctorProfileResult.status === 'fulfilled') {
          setDoctorProfile(doctorProfileResult.value);
        } else {
          console.error('Failed to load doctor profile:', doctorProfileResult.reason);
          // If doctor profile doesn't exist, we'll show a message to complete setup
        }

      } catch (err) {
        console.error('Error loading doctor data:', err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDoctorData();
  }, [user?.id]);

  const handleProfileUpdate = (updatedDoctor: Doctor, updatedUserProfile: UserProfile) => {
    setDoctorProfile(updatedDoctor);
    setUserProfile(updatedUserProfile);
  };

  if (loading) {
    return (
      <DoctorDashboardLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          </div>
        </div>
      </DoctorDashboardLayout>
    );
  }

  if (error) {
    return (
      <DoctorDashboardLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </DoctorDashboardLayout>
    );
  }

  return (
    <DoctorDashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Doctor Profile</h1>
            <p className="text-muted-foreground">
              Manage your professional profile and availability settings
            </p>
          </div>

          {/* Profile Setup Alert */}
          {!doctorProfile && (
            <Alert>
              <Stethoscope className="h-4 w-4" />
              <AlertDescription>
                Complete your doctor profile setup to start accepting patients and managing appointments.
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Form */}
          <DoctorProfileForm
            doctorProfile={doctorProfile}
            userProfile={userProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>
      </div>
    </DoctorDashboardLayout>
  );
};