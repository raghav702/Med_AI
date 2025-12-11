/**
 * Geolocation utilities for finding nearest doctors
 */

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface NearestDoctorsRequest {
  latitude: number;
  longitude: number;
  specialty?: string;
  radius_km?: number;
  limit?: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  address: string;
  rating: number;
  experience: number;
  price_range: string;
  works_for: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface NearestDoctorsResponse {
  message: string;
  search_params: {
    user_lat: number;
    user_lon: number;
    specialty: string;
    radius_km: number;
    limit: number;
  };
  doctors: Doctor[];
  error?: string;
}

/**
 * Get user's current location using browser geolocation API
 */
export const getUserLocation = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

/**
 * Find nearest doctors based on user location
 */
export const findNearestDoctors = async (
  request: NearestDoctorsRequest
): Promise<NearestDoctorsResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${API_BASE_URL}/doctors/nearest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: request.latitude,
        longitude: request.longitude,
        specialty: request.specialty || 'General Physician',
        radius_km: request.radius_km || 25,
        limit: request.limit || 5
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: NearestDoctorsResponse = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error finding nearest doctors:', error);
    throw error;
  }
};

/**
 * Get user location and find nearest doctors in one call
 */
export const findNearestDoctorsWithLocation = async (
  specialty?: string,
  radius_km?: number,
  limit?: number
): Promise<NearestDoctorsResponse> => {
  try {
    // Get user's location first
    const location = await getUserLocation();
    
    // Then find nearest doctors
    return await findNearestDoctors({
      latitude: location.latitude,
      longitude: location.longitude,
      specialty,
      radius_km,
      limit
    });
    
  } catch (error) {
    console.error('Error in findNearestDoctorsWithLocation:', error);
    throw error;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
};

/**
 * Get approximate location from IP address (fallback method)
 */
export const getLocationFromIP = async (): Promise<UserLocation> => {
  try {
    // Using ipapi.co for IP-based location (free tier)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        accuracy: 10000 // IP location is less accurate (±10km)
      };
    } else {
      throw new Error('IP location data not available');
    }
  } catch (error) {
    throw new Error('Failed to get location from IP address');
  }
};

/**
 * Get user location with automatic fallback (GPS -> IP -> Manual)
 */
export const getLocationWithFallback = async (): Promise<UserLocation> => {
  try {
    // Try GPS first (most accurate)
    return await getUserLocation();
  } catch (gpsError) {
    console.warn('GPS location failed, trying IP location:', gpsError);
    
    try {
      // Fallback to IP-based location
      return await getLocationFromIP();
    } catch (ipError) {
      console.warn('IP location failed:', ipError);
      
      // If both fail, throw error with helpful message
      throw new Error(
        'Unable to detect your location automatically. Please enable location access or enter coordinates manually.'
      );
    }
  }
};

/**
 * Check if geolocation is supported
 */
export const isGeolocationSupported = (): boolean => {
  return 'geolocation' in navigator;
};

/**
 * Request location permission (doesn't actually get location, just checks permission)
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (!isGeolocationSupported()) {
    return false;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'granted' || permission.state === 'prompt';
  } catch (error) {
    // Fallback: try to get location to test permission
    try {
      await getUserLocation();
      return true;
    } catch {
      return false;
    }
  }
};