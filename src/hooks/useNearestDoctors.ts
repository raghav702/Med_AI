import { useState, useCallback, useEffect } from 'react';
import {
  getUserLocation,
  getLocationWithFallback,
  findNearestDoctors,
  findNearestDoctorsWithLocation,
  type Doctor,
  type NearestDoctorsResponse,
  type UserLocation
} from '@/utils/geolocation';

interface UseNearestDoctorsState {
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  userLocation: UserLocation | null;
  searchParams: {
    specialty?: string;
    radius_km?: number;
    limit?: number;
  } | null;
}

interface UseNearestDoctorsReturn extends UseNearestDoctorsState {
  findDoctors: (specialty?: string, radius_km?: number, limit?: number) => Promise<void>;
  findDoctorsWithCoords: (
    latitude: number,
    longitude: number,
    specialty?: string,
    radius_km?: number,
    limit?: number
  ) => Promise<void>;
  findDoctorsAuto: (specialty?: string, radius_km?: number, limit?: number) => Promise<void>;
  getUserLocationOnly: () => Promise<void>;
  clearResults: () => void;
  refetch: () => Promise<void>;
  autoDetectLocation: () => Promise<void>;
}

export const useNearestDoctors = (): UseNearestDoctorsReturn => {
  const [state, setState] = useState<UseNearestDoctorsState>({
    doctors: [],
    loading: false,
    error: null,
    userLocation: null,
    searchParams: null
  });

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      doctors: [],
      error: null,
      searchParams: null
    }));
  }, []);

  const getUserLocationOnly = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const location = await getUserLocation();
      setState(prev => ({
        ...prev,
        userLocation: location,
        loading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
    }
  }, []);

  const findDoctors = useCallback(async (
    specialty?: string,
    radius_km?: number,
    limit?: number
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await findNearestDoctorsWithLocation(specialty, radius_km, limit);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setState(prev => ({
        ...prev,
        doctors: response.doctors,
        userLocation: {
          latitude: response.search_params.user_lat,
          longitude: response.search_params.user_lon
        },
        searchParams: {
          specialty: response.search_params.specialty,
          radius_km: response.search_params.radius_km,
          limit: response.search_params.limit
        },
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find doctors';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        doctors: []
      }));
    }
  }, []);

  const findDoctorsWithCoords = useCallback(async (
    latitude: number,
    longitude: number,
    specialty?: string,
    radius_km?: number,
    limit?: number
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await findNearestDoctors({
        latitude,
        longitude,
        specialty,
        radius_km,
        limit
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      setState(prev => ({
        ...prev,
        doctors: response.doctors,
        userLocation: { latitude, longitude },
        searchParams: {
          specialty: response.search_params.specialty,
          radius_km: response.search_params.radius_km,
          limit: response.search_params.limit
        },
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find doctors';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        doctors: []
      }));
    }
  }, []);

  const autoDetectLocation = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const location = await getLocationWithFallback();
      setState(prev => ({
        ...prev,
        userLocation: location,
        loading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to detect location';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
    }
  }, []);

  const findDoctorsAuto = useCallback(async (
    specialty?: string,
    radius_km?: number,
    limit?: number
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Use fallback location detection (GPS -> IP -> Error)
      const location = await getLocationWithFallback();
      
      const response = await findNearestDoctors({
        latitude: location.latitude,
        longitude: location.longitude,
        specialty,
        radius_km,
        limit
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      setState(prev => ({
        ...prev,
        doctors: response.doctors,
        userLocation: location,
        searchParams: {
          specialty: response.search_params.specialty,
          radius_km: response.search_params.radius_km,
          limit: response.search_params.limit
        },
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find doctors';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        doctors: []
      }));
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!state.userLocation || !state.searchParams) {
      return;
    }

    await findDoctorsWithCoords(
      state.userLocation.latitude,
      state.userLocation.longitude,
      state.searchParams.specialty,
      state.searchParams.radius_km,
      state.searchParams.limit
    );
  }, [state.userLocation, state.searchParams, findDoctorsWithCoords]);

  return {
    ...state,
    findDoctors,
    findDoctorsWithCoords,
    findDoctorsAuto,
    getUserLocationOnly,
    clearResults,
    refetch,
    autoDetectLocation
  };
};

export default useNearestDoctors;