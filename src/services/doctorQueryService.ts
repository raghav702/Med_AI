import { supabase } from '@/lib/supabase';
import type { Doctor } from '@/types/database';

/**
 * Location interface for geographic filtering
 */
export interface Location {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers, default 50km
}

/**
 * Doctor query filters for AI Medical Assistant
 */
export interface DoctorQueryFilters {
  specialty?: string;
  location?: Location;
  maxConsultationFee?: number;
  minRating?: number;
  acceptingPatients?: boolean;
  languages?: string[];
  limit?: number;
}

/**
 * Doctor with calculated distance for location-based queries
 */
export interface DoctorWithDistance extends Doctor {
  distance?: number; // in kilometers
  isAvailableToday?: boolean;
}

/**
 * Availability check result
 */
export interface AvailabilityInfo {
  doctorId: string;
  isAvailableToday: boolean;
  nextAvailableSlot?: {
    date: string;
    time: string;
    dayOfWeek: string;
  };
  todaySlots: Array<{
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Doctor Query Service for AI Medical Assistant
 * Provides specialized querying functions for doctor discovery and recommendation
 */
export class DoctorQueryService {
  /**
   * Query doctors by specialty with optional location and other filters
   */
  async queryDoctorsBySpecialty(
    specialty: string,
    filters: Omit<DoctorQueryFilters, 'specialty'> = {}
  ): Promise<DoctorWithDistance[]> {
    if (!supabase) {
      throw new Error('Database service not available');
    }

    try {
      let query = supabase
        .from('doctors')
        .select('*')
        .eq('specialty', specialty);

      // Apply filters
      if (filters.acceptingPatients !== false) {
        query = query.eq('is_accepting_patients', true);
      }

      if (filters.maxConsultationFee) {
        query = query.lte('consultation_fee', filters.maxConsultationFee);
      }

      if (filters.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters.languages && filters.languages.length > 0) {
        query = query.overlaps('languages_spoken', filters.languages);
      }

      // Order by rating and limit results
      const limit = filters.limit || 10;
      query = query
        .order('rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(limit);

      const { data: doctors, error } = await query;

      if (error) {
        throw new Error(`Failed to query doctors: ${error.message}`);
      }

      if (!doctors || doctors.length === 0) {
        return [];
      }

      // Apply location filtering if provided
      let doctorsWithDistance = doctors as DoctorWithDistance[];
      
      if (filters.location) {
        doctorsWithDistance = this.calculateDistances(doctors, filters.location);
        
        // Filter by radius if specified
        const radius = filters.location.radius || 50;
        doctorsWithDistance = doctorsWithDistance.filter(
          doctor => doctor.distance === undefined || doctor.distance <= radius
        );

        // Sort by distance for location-based queries
        doctorsWithDistance.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      }

      return doctorsWithDistance;
    } catch (error) {
      console.error('Error querying doctors by specialty:', error);
      throw error;
    }
  }

  /**
   * Find doctors by location with optional specialty filter
   */
  async queryDoctorsByLocation(
    location: Location,
    specialty?: string,
    filters: Omit<DoctorQueryFilters, 'location' | 'specialty'> = {}
  ): Promise<DoctorWithDistance[]> {
    if (!supabase) {
      throw new Error('Database service not available');
    }

    try {
      let query = supabase
        .from('doctors')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      // Apply specialty filter if provided
      if (specialty) {
        query = query.eq('specialty', specialty);
      }

      // Apply other filters
      if (filters.acceptingPatients !== false) {
        query = query.eq('is_accepting_patients', true);
      }

      if (filters.maxConsultationFee) {
        query = query.lte('consultation_fee', filters.maxConsultationFee);
      }

      if (filters.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters.languages && filters.languages.length > 0) {
        query = query.overlaps('languages_spoken', filters.languages);
      }

      const { data: doctors, error } = await query;

      if (error) {
        throw new Error(`Failed to query doctors by location: ${error.message}`);
      }

      if (!doctors || doctors.length === 0) {
        return [];
      }

      // Calculate distances and filter by radius
      const doctorsWithDistance = this.calculateDistances(doctors, location);
      const radius = location.radius || 50;
      
      const filteredDoctors = doctorsWithDistance
        .filter(doctor => doctor.distance !== undefined && doctor.distance <= radius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      // Apply limit
      const limit = filters.limit || 10;
      return filteredDoctors.slice(0, limit);
    } catch (error) {
      console.error('Error querying doctors by location:', error);
      throw error;
    }
  }

  /**
   * Check availability for multiple doctors
   */
  async checkDoctorAvailability(doctorIds: string[]): Promise<AvailabilityInfo[]> {
    if (!supabase || doctorIds.length === 0) {
      return [];
    }

    try {
      const today = new Date();
      const dayOfWeek = this.getDayOfWeek(today);

      const { data: availability, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .in('doctor_id', doctorIds)
        .eq('is_available', true);

      if (error) {
        throw new Error(`Failed to check availability: ${error.message}`);
      }

      // Process availability for each doctor
      const availabilityInfo: AvailabilityInfo[] = doctorIds.map(doctorId => {
        const doctorAvailability = availability?.filter(a => a.doctor_id === doctorId) || [];
        
        // Check today's availability
        const todaySlots = doctorAvailability
          .filter(a => a.day_of_week === dayOfWeek)
          .map(a => ({
            startTime: a.start_time,
            endTime: a.end_time
          }));

        const isAvailableToday = todaySlots.length > 0;

        // Find next available slot if not available today
        let nextAvailableSlot;
        if (!isAvailableToday && doctorAvailability.length > 0) {
          nextAvailableSlot = this.findNextAvailableSlot(doctorAvailability, today);
        }

        return {
          doctorId,
          isAvailableToday,
          nextAvailableSlot,
          todaySlots
        };
      });

      return availabilityInfo;
    } catch (error) {
      console.error('Error checking doctor availability:', error);
      throw error;
    }
  }

  /**
   * Get top-rated doctors by specialty
   */
  async getTopRatedDoctors(
    specialty: string,
    limit: number = 5,
    location?: Location
  ): Promise<DoctorWithDistance[]> {
    return this.queryDoctorsBySpecialty(specialty, {
      minRating: 4.0,
      limit,
      location
    });
  }

  /**
   * Search doctors with flexible text matching
   */
  async searchDoctors(
    searchTerm: string,
    filters: DoctorQueryFilters = {}
  ): Promise<DoctorWithDistance[]> {
    if (!supabase) {
      throw new Error('Database service not available');
    }

    try {
      let query = supabase
        .from('doctors')
        .select('*');

      // Search in name, specialty, and bio
      query = query.or(`name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);

      // Apply filters
      if (filters.specialty) {
        query = query.eq('specialty', filters.specialty);
      }

      if (filters.acceptingPatients !== false) {
        query = query.eq('is_accepting_patients', true);
      }

      if (filters.maxConsultationFee) {
        query = query.lte('consultation_fee', filters.maxConsultationFee);
      }

      if (filters.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters.languages && filters.languages.length > 0) {
        query = query.overlaps('languages_spoken', filters.languages);
      }

      // Order by relevance (rating and reviews)
      const limit = filters.limit || 10;
      query = query
        .order('rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(limit);

      const { data: doctors, error } = await query;

      if (error) {
        throw new Error(`Failed to search doctors: ${error.message}`);
      }

      if (!doctors || doctors.length === 0) {
        return [];
      }

      // Apply location filtering if provided
      let doctorsWithDistance = doctors as DoctorWithDistance[];
      
      if (filters.location) {
        doctorsWithDistance = this.calculateDistances(doctors, filters.location);
        
        const radius = filters.location.radius || 50;
        doctorsWithDistance = doctorsWithDistance.filter(
          doctor => doctor.distance === undefined || doctor.distance <= radius
        );

        doctorsWithDistance.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      }

      return doctorsWithDistance;
    } catch (error) {
      console.error('Error searching doctors:', error);
      throw error;
    }
  }

  /**
   * Calculate distances between doctors and a location using Haversine formula
   */
  private calculateDistances(doctors: Doctor[], location: Location): DoctorWithDistance[] {
    return doctors.map(doctor => {
      let distance: number | undefined;

      if (doctor.lat && doctor.lng) {
        distance = this.calculateHaversineDistance(
          location.latitude,
          location.longitude,
          doctor.lat,
          doctor.lng
        );
      }

      return {
        ...doctor,
        distance
      };
    });
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get day of week string from date
   */
  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Find next available slot for a doctor
   */
  private findNextAvailableSlot(
    availability: any[],
    fromDate: Date
  ): { date: string; time: string; dayOfWeek: string } | undefined {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Look for the next 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dayOfWeek = daysOfWeek[checkDate.getDay()];
      
      const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
      if (dayAvailability.length > 0) {
        return {
          date: checkDate.toISOString().split('T')[0],
          time: dayAvailability[0].start_time,
          dayOfWeek
        };
      }
    }
    
    return undefined;
  }
}

// Export singleton instance
export const doctorQueryService = new DoctorQueryService();