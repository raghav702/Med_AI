import { supabase } from '@/lib/supabase';
import { databaseService } from './database';
import { doctorService } from './doctor';
import type { CreateUserProfile, CreateDoctor } from '@/types/database';
import type { SignUpUserData } from './auth';

/**
 * Profile setup service for handling post-registration profile creation
 */
export class ProfileSetupService {
  /**
   * Create user profile and doctor profile after successful registration
   */
  static async setupUserProfile(userId: string, userData: SignUpUserData): Promise<void> {
    if (!userId || !userData) {
      throw new Error('User ID and user data are required for profile setup');
    }

    try {
      // Create basic user profile
      const userProfileData: CreateUserProfile = {
        id: userId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        user_role: userData.userType || 'patient',
        is_active: true,
      };

      // Create user profile first
      await databaseService.createUserProfile(userProfileData);

      // If user is a doctor, create doctor profile
      if (userData.userType === 'doctor') {
        await this.setupDoctorProfile(userId, userData);
      }
    } catch (error) {
      console.error('Error setting up user profile:', error);
      throw new Error('Failed to set up user profile. Please try again.');
    }
  }

  /**
   * Create doctor profile with provided data
   */
  private static async setupDoctorProfile(userId: string, userData: SignUpUserData): Promise<void> {
    if (!userData.specialization || !userData.licenseNumber) {
      throw new Error('Specialization and license number are required for doctor profile');
    }

    const doctorProfileData: CreateDoctor = {
      id: userId,
      license_number: userData.licenseNumber,
      specialization: userData.specialization,
      consultation_fee: userData.consultationFee || 0,
      years_of_experience: userData.yearsOfExperience,
      bio: userData.bio,
      office_address: userData.officeAddress,
      office_phone: userData.officePhone,
      languages_spoken: userData.languagesSpoken || ['English'],
      is_accepting_patients: true,
    };

    await doctorService.createDoctorProfile(doctorProfileData);
  }

  /**
   * Handle Supabase auth trigger for profile creation
   * This can be called from a database trigger or webhook
   */
  static async handleAuthTrigger(userId: string, userMetadata: any): Promise<void> {
    try {
      const userData: SignUpUserData = {
        firstName: userMetadata.first_name,
        lastName: userMetadata.last_name,
        userType: userMetadata.user_type || 'patient',
        specialization: userMetadata.specialization,
        licenseNumber: userMetadata.license_number,
        consultationFee: userMetadata.consultation_fee,
        yearsOfExperience: userMetadata.years_of_experience,
        bio: userMetadata.bio,
        officeAddress: userMetadata.office_address,
        officePhone: userMetadata.office_phone,
        languagesSpoken: userMetadata.languages_spoken,
      };

      await this.setupUserProfile(userId, userData);
    } catch (error) {
      console.error('Error handling auth trigger:', error);
      // Don't throw here as this might be called from a trigger
    }
  }

  /**
   * Check if user profile setup is complete
   */
  static async isProfileSetupComplete(userId: string): Promise<boolean> {
    try {
      const userProfile = await databaseService.getUserProfile(userId);
      if (!userProfile) {
        return false;
      }

      // If user is a doctor, check if doctor profile exists
      if (userProfile.user_role === 'doctor') {
        const doctorProfile = await doctorService.getDoctorProfile(userId);
        return doctorProfile !== null;
      }

      return true;
    } catch (error) {
      console.error('Error checking profile setup:', error);
      return false;
    }
  }

  /**
   * Complete profile setup for existing users who haven't completed it
   */
  static async completeProfileSetup(userId: string, userData: SignUpUserData): Promise<void> {
    const isComplete = await this.isProfileSetupComplete(userId);
    if (!isComplete) {
      await this.setupUserProfile(userId, userData);
    }
  }
}

export const profileSetupService = ProfileSetupService;