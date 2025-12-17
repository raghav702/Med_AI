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
        <div className="p-3 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-7 sm:h-8 w-36 sm:w-48" />
                <Skeleton className="h-4 w-64 sm:w-96" />
              </div>
              <div className="bg-card rounded-lg border p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4 sm:mb-6">
                  <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 sm:h-6 w-36 sm:w-48" />
                    <Skeleton className="h-4 w-28 sm:w-32" />
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
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
      <div className="p-3 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Manage your personal information and medical details
            </p>
          </div>
          
          <UserProfile />
        </div>
      </div>
    </NavigationLayout>
  );
};