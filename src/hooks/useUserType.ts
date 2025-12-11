import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UserType = 'patient' | 'doctor' | null;

export const useUserType = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineUserType = () => {
      if (!user) {
        setUserType(null);
        setLoading(false);
        return;
      }

      // Check user metadata for user_type
      const metadata = user.user_metadata || {};
      const type = metadata.user_type as UserType;
      
      if (type === 'doctor' || type === 'patient') {
        setUserType(type);
      } else {
        // Default to patient if no type specified
        setUserType('patient');
      }
      
      setLoading(false);
    };

    determineUserType();
  }, [user]);

  return {
    userType,
    loading,
    isDoctor: userType === 'doctor',
    isPatient: userType === 'patient',
  };
};