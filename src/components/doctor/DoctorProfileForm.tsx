import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAuth } from "@/contexts/AuthContext";
import { useFormSubmission } from "@/hooks/useLoadingState";
import { useNotifications } from "@/hooks/useNotifications";
import { doctorService } from "@/services/doctor";
import { databaseService } from "@/services/database";
import type { Doctor, UpdateDoctor, UserProfile, UpdateUserProfile } from "@/types/database";
import { Stethoscope, MapPin, Phone, Globe, DollarSign, Calendar, User, FileText } from "lucide-react";

interface DoctorProfileFormProps {
  doctorProfile?: Doctor | null;
  userProfile?: UserProfile | null;
  onProfileUpdate?: (doctor: Doctor, userProfile: UserProfile) => void;
}

export const DoctorProfileForm: React.FC<DoctorProfileFormProps> = ({
  doctorProfile,
  userProfile,
  onProfileUpdate
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const formSubmission = useFormSubmission();

  const [formData, setFormData] = useState({
    // User profile data
    firstName: userProfile?.first_name || "",
    lastName: userProfile?.last_name || "",
    dateOfBirth: userProfile?.date_of_birth || "",
    phoneNumber: userProfile?.phone_number || "",
    
    // Doctor profile data
    licenseNumber: doctorProfile?.license_number || "",
    specialization: doctorProfile?.specialization || "",
    subSpecialization: doctorProfile?.sub_specialization || "",
    yearsOfExperience: doctorProfile?.years_of_experience?.toString() || "",
    consultationFee: doctorProfile?.consultation_fee?.toString() || "",
    bio: doctorProfile?.bio || "",
    education: doctorProfile?.education?.join("\n") || "",
    certifications: doctorProfile?.certifications?.join("\n") || "",
    languagesSpoken: doctorProfile?.languages_spoken || ["English"],
    officeAddress: doctorProfile?.office_address || "",
    officePhone: doctorProfile?.office_phone || "",
    isAcceptingPatients: doctorProfile?.is_accepting_patients ?? true,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Basic validation
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    
    if (!formData.licenseNumber.trim()) {
      errors.licenseNumber = "Medical license number is required";
    }
    
    if (!formData.specialization) {
      errors.specialization = "Specialization is required";
    }
    
    if (!formData.consultationFee) {
      errors.consultationFee = "Consultation fee is required";
    } else {
      const fee = parseFloat(formData.consultationFee);
      if (isNaN(fee) || fee < 0) {
        errors.consultationFee = "Please enter a valid consultation fee";
      } else if (fee > 10000) {
        errors.consultationFee = "Consultation fee cannot exceed $10,000";
      }
    }
    
    if (formData.yearsOfExperience && formData.yearsOfExperience.trim()) {
      const years = parseInt(formData.yearsOfExperience);
      if (isNaN(years) || years < 0) {
        errors.yearsOfExperience = "Please enter a valid number of years";
      } else if (years > 70) {
        errors.yearsOfExperience = "Years of experience cannot exceed 70";
      }
    }
    
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        errors.phoneNumber = "Please enter a valid phone number";
      }
    }
    
    if (formData.officePhone && formData.officePhone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.officePhone.replace(/[\s\-\(\)]/g, ''))) {
        errors.officePhone = "Please enter a valid office phone number";
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.id) {
      return;
    }

    await formSubmission.submitForm(
      async () => {
        // Update user profile
        const userProfileData: UpdateUserProfile = {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          date_of_birth: formData.dateOfBirth || undefined,
          phone_number: formData.phoneNumber.trim() || undefined,
        };

        // Update doctor profile
        const doctorProfileData: UpdateDoctor = {
          license_number: formData.licenseNumber.trim(),
          specialization: formData.specialization,
          sub_specialization: formData.subSpecialization.trim() || undefined,
          years_of_experience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
          consultation_fee: parseFloat(formData.consultationFee),
          bio: formData.bio.trim() || undefined,
          education: formData.education.trim() ? formData.education.split('\n').map(e => e.trim()).filter(e => e) : undefined,
          certifications: formData.certifications.trim() ? formData.certifications.split('\n').map(c => c.trim()).filter(c => c) : undefined,
          languages_spoken: formData.languagesSpoken,
          office_address: formData.officeAddress.trim() || undefined,
          office_phone: formData.officePhone.trim() || undefined,
          is_accepting_patients: formData.isAcceptingPatients,
        };

        // Update both profiles
        const [updatedUserProfile, updatedDoctorProfile] = await Promise.all([
          databaseService.updateUserProfile(user.id, userProfileData),
          doctorService.updateDoctorProfile(user.id, doctorProfileData)
        ]);

        return { updatedUserProfile, updatedDoctorProfile };
      },
      {
        successMessage: 'Profile updated successfully!',
        errorMessage: 'Failed to update profile. Please try again.',
        onSuccess: (result) => {
          showSuccess('Your profile has been updated successfully!');
          onProfileUpdate?.(result.updatedDoctorProfile, result.updatedUserProfile);
        },
        onError: (error) => {
          showError('Failed to update profile. Please try again.');
          console.error('Profile update error:', error);
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your basic personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className={fieldErrors.firstName ? "border-red-500" : ""}
                disabled={formSubmission.isLoading}
                required
              />
              {fieldErrors.firstName && (
                <p className="text-sm text-red-500">{fieldErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className={fieldErrors.lastName ? "border-red-500" : ""}
                disabled={formSubmission.isLoading}
                required
              />
              {fieldErrors.lastName && (
                <p className="text-sm text-red-500">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                disabled={formSubmission.isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                className={fieldErrors.phoneNumber ? "border-red-500" : ""}
                placeholder="Your personal phone number"
                disabled={formSubmission.isLoading}
              />
              {fieldErrors.phoneNumber && (
                <p className="text-sm text-red-500">{fieldErrors.phoneNumber}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Professional Information
          </CardTitle>
          <CardDescription>
            Update your medical credentials and specialization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Medical License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                className={fieldErrors.licenseNumber ? "border-red-500" : ""}
                disabled={formSubmission.isLoading}
                required
              />
              {fieldErrors.licenseNumber && (
                <p className="text-sm text-red-500">{fieldErrors.licenseNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Select 
                value={formData.specialization} 
                onValueChange={(value) => handleInputChange("specialization", value)}
                disabled={formSubmission.isLoading}
              >
                <SelectTrigger className={fieldErrors.specialization ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select your specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="neurology">Neurology</SelectItem>
                  <SelectItem value="orthopedics">Orthopedics</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="internal-medicine">Internal Medicine</SelectItem>
                  <SelectItem value="psychiatry">Psychiatry</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                  <SelectItem value="dermatology">Dermatology</SelectItem>
                  <SelectItem value="oncology">Oncology</SelectItem>
                  <SelectItem value="gynecology">Gynecology</SelectItem>
                  <SelectItem value="ophthalmology">Ophthalmology</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.specialization && (
                <p className="text-sm text-red-500">{fieldErrors.specialization}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subSpecialization">Sub-specialization (Optional)</Label>
              <Input
                id="subSpecialization"
                value={formData.subSpecialization}
                onChange={(e) => handleInputChange("subSpecialization", e.target.value)}
                placeholder="e.g., Interventional Cardiology"
                disabled={formSubmission.isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                max="70"
                value={formData.yearsOfExperience}
                onChange={(e) => handleInputChange("yearsOfExperience", e.target.value)}
                className={fieldErrors.yearsOfExperience ? "border-red-500" : ""}
                disabled={formSubmission.isLoading}
              />
              {fieldErrors.yearsOfExperience && (
                <p className="text-sm text-red-500">{fieldErrors.yearsOfExperience}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consultationFee" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Consultation Fee ($)
            </Label>
            <Input
              id="consultationFee"
              type="number"
              min="0"
              max="10000"
              step="0.01"
              value={formData.consultationFee}
              onChange={(e) => handleInputChange("consultationFee", e.target.value)}
              className={fieldErrors.consultationFee ? "border-red-500" : ""}
              disabled={formSubmission.isLoading}
              required
            />
            {fieldErrors.consultationFee && (
              <p className="text-sm text-red-500">{fieldErrors.consultationFee}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Professional Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Brief description of your practice and expertise..."
              className="min-h-[100px] resize-none"
              disabled={formSubmission.isLoading}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.bio.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education (One per line)</Label>
            <Textarea
              id="education"
              value={formData.education}
              onChange={(e) => handleInputChange("education", e.target.value)}
              placeholder="e.g., MD - Harvard Medical School&#10;Residency - Johns Hopkins Hospital"
              className="min-h-[80px] resize-none"
              disabled={formSubmission.isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications (One per line)</Label>
            <Textarea
              id="certifications"
              value={formData.certifications}
              onChange={(e) => handleInputChange("certifications", e.target.value)}
              placeholder="e.g., Board Certified in Cardiology&#10;Advanced Cardiac Life Support (ACLS)"
              className="min-h-[80px] resize-none"
              disabled={formSubmission.isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Office Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Office Information
          </CardTitle>
          <CardDescription>
            Update your practice location and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="officeAddress">Office Address</Label>
            <Input
              id="officeAddress"
              value={formData.officeAddress}
              onChange={(e) => handleInputChange("officeAddress", e.target.value)}
              placeholder="Your practice address"
              disabled={formSubmission.isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="officePhone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Office Phone
            </Label>
            <Input
              id="officePhone"
              type="tel"
              value={formData.officePhone}
              onChange={(e) => handleInputChange("officePhone", e.target.value)}
              className={fieldErrors.officePhone ? "border-red-500" : ""}
              placeholder="Your office phone number"
              disabled={formSubmission.isLoading}
            />
            {fieldErrors.officePhone && (
              <p className="text-sm text-red-500">{fieldErrors.officePhone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Languages Spoken
            </Label>
            <div className="flex flex-wrap gap-2">
              {["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"].map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => {
                    const currentLanguages = formData.languagesSpoken;
                    if (currentLanguages.includes(language)) {
                      if (currentLanguages.length > 1) { // Keep at least one language
                        handleInputChange("languagesSpoken", currentLanguages.filter(l => l !== language));
                      }
                    } else {
                      handleInputChange("languagesSpoken", [...currentLanguages, language]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition-all duration-200 ${
                    formData.languagesSpoken.includes(language)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  }`}
                  disabled={formSubmission.isLoading}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAcceptingPatients"
              checked={formData.isAcceptingPatients}
              onChange={(e) => handleInputChange("isAcceptingPatients", e.target.checked)}
              className="rounded border-border"
              disabled={formSubmission.isLoading}
            />
            <Label htmlFor="isAcceptingPatients" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Currently accepting new patients
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <LoadingButton
          type="submit"
          loading={formSubmission.isLoading}
          loadingText="Updating Profile..."
          className="px-8"
        >
          Update Profile
        </LoadingButton>
      </div>
    </form>
  );
};