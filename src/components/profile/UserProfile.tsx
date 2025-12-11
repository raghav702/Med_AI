import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { databaseService, DatabaseServiceError } from '@/services/database';
import { UserProfile as UserProfileType, UpdateUserProfile } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ProfileSkeleton } from '@/components/ui/skeleton-loaders';
import { useNotifications } from '@/hooks/useNotifications';
import { useDataFetching, useFormSubmission } from '@/hooks/useLoadingState';
import { 
  User, 
  Edit, 
  Phone, 
  Calendar,
  Mail
} from 'lucide-react';
import { ProfileEditForm } from './ProfileEditForm';

interface UserProfileProps {
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ className }) => {
  const { user } = useAuth();
  const { showUpdateSuccess, showSaveSuccess } = useNotifications();
  
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const dataFetching = useDataFetching();
  const formSubmission = useFormSubmission();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        return;
      }

      const userProfile = await dataFetching.fetchData(
        async () => await databaseService.getUserProfile(user.id!),
        {
          errorMessage: 'Failed to load profile'
        }
      );
      
      if (userProfile !== null) {
        setProfile(userProfile);
      }
    };

    loadProfile();
  }, [user?.id]); // Remove dataFetching from dependencies

  // Handle profile update
  const handleProfileUpdate = async (data: UpdateUserProfile) => {
    if (!user?.id) return;

    await formSubmission.submitForm(
      async () => {
        // Update patient record (not user_profile)
        const updatedPatient = await databaseService.updatePatient(user.id!, data);
        // Fetch the updated user profile to refresh the view
        const updatedProfile = await databaseService.getUserProfile(user.id!);
        setProfile(updatedProfile);
        setIsEditing(false);
        return updatedProfile;
      },
      {
        successMessage: 'Profile updated successfully',
        errorMessage: 'Failed to update profile',
        onSuccess: () => showUpdateSuccess('Profile')
      }
    );
  };

  // Handle profile creation for new users
  const handleCreateProfile = async (data: UpdateUserProfile) => {
    if (!user?.id) return;

    await formSubmission.submitForm(
      async () => {
        // Create patient record
        await databaseService.createPatient({
          id: user.id!,
          ...data
        });
        // Fetch the user profile to refresh the view
        const updatedProfile = await databaseService.getUserProfile(user.id!);
        setProfile(updatedProfile);
        setIsEditing(false);
        return updatedProfile;
      },
      {
        successMessage: 'Profile created successfully',
        errorMessage: 'Failed to create profile',
        onSuccess: () => showSaveSuccess('Profile')
      }
    );
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email || 'User';
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  if (dataFetching.isLoading && !profile) {
    return (
      <div className={className}>
        <ProfileSkeleton />
      </div>
    );
  }

  if (dataFetching.error && !profile) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Error Loading Profile</h3>
                <p className="text-muted-foreground">{dataFetching.error}</p>
              </div>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={className}>
        <LoadingOverlay isLoading={formSubmission.isLoading} text="Saving profile...">
          <ProfileEditForm
            profile={profile}
            onSave={profile ? handleProfileUpdate : handleCreateProfile}
            onCancel={() => setIsEditing(false)}
            disabled={formSubmission.isLoading}
          />
        </LoadingOverlay>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={getDisplayName()} />
                <AvatarFallback className="text-lg font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{getDisplayName()}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(profile?.date_of_birth)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <p className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4" />
                  {profile?.phone || 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Status */}
          {profile && (
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Profile created: {formatDate(profile.created_at)}</span>
                <span>Last updated: {formatDate(profile.updated_at)}</span>
              </div>
            </div>
          )}

          {/* Create Profile CTA for new users */}
          {!profile && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Complete Your Profile</h3>
              <p className="text-muted-foreground mb-4">
                Add your personal information to get the most out of your account.
              </p>
              <Button onClick={() => setIsEditing(true)}>
                Create Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};