import React, { useState } from 'react';
import { UserProfile, UpdateUserProfile } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Save, 
  User, 
  Loader2
} from 'lucide-react';

interface ProfileEditFormProps {
  profile: UserProfile | null;
  onSave: (data: UpdateUserProfile) => Promise<void>;
  onCancel: () => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  profile,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Form state - simplified to match schema
  const [formData, setFormData] = useState<UpdateUserProfile>({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    date_of_birth: profile?.date_of_birth || '',
    phone: profile?.phone || ''
  });

  // UI state
  const [loading, setLoading] = useState(false);

  // Handle form field changes
  const handleInputChange = (field: keyof UpdateUserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Remove medication
  const removeMedication = (index: number) => {
    const medications = formData.medications || [];
    setFormData(prev => ({
      ...prev,
      medications: medications.filter((_, i) => i !== index)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await onSave(formData);
    } catch (error) {
      // Error is handled by parent component
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get display name for profile picture component
  const getDisplayName = () => {
    if (formData.first_name && formData.last_name) {
      return `${formData.first_name} ${formData.last_name}`;
    }
    if (formData.first_name) {
      return formData.first_name;
    }
    return user?.email || 'User';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {profile ? 'Edit Profile' : 'Create Profile'}
        </CardTitle>
        <CardDescription>
          {profile 
            ? 'Update your personal and medical information' 
            : 'Complete your profile to get started'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter your first name"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter your last name"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {profile ? 'Update Profile' : 'Create Profile'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};