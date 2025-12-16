import React from 'react';
import { UserProfile } from '@/components/profile';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { Skeleton } from '@/components/ui/skeleton';

export const Profile: React.FC = () => {
  const { user, initializing } = useAuth();

  // Show loading state while checking authentication
  if (initializing) {
    return (
      <NavigationLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </NavigationLayout>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <NavigationLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information and medical details
            </p>
          </div>
          
          <UserProfile />
        </div>
      </div>
    </NavigationLayout>
  );
};