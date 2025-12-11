import { doctorService } from '../doctor';
import type { Doctor, DoctorWithProfile, DoctorSearchFilters } from '../../types/database';
import type { Location } from '../../types/conversation';

export interface DoctorRecommendationRequest {
  specialties: string[];
  userLocation?: Location;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  maxResults?: number;
  maxConsultationFee?: number;
  preferredLanguages?: string[];
}

export interface ScoredDoctor extends DoctorWithProfile {
  score: number;
  scoreBreakdown: {
    specialtyMatch: number;
    rating: number;
    proximity: number;
    availability: number;
    fee: number;
  };
  distance?: number;
}

export interface DoctorRecommendationResult {
  doctors: ScoredDoctor[];
  totalFound: number;
  searchCriteria: DoctorRecommendationRequest;
  recommendations: {
    primarySpecialty: string;
    alternativeSpecialties: string[];
    urgencyAdvice: string;
  };
}

/**
 * Agent responsible for finding and ranking doctors based on symptoms, location, and preferences
 */
export class DoctorRecommendationAgent {
  private readonly SPECIALTY_MAPPINGS: Record<string, string[]> = {
    // Map common symptom specialties to actual doctor specializations
    'cardiology': ['Cardiology', 'Cardiovascular Surgery'],
    'pulmonology': ['Pulmonology', 'Respiratory Medicine'],
    'gastroenterology': ['Gastroenterology', 'Digestive Health'],
    'neurology': ['Neurology', 'Neurological Surgery'],
    'orthopedics': ['Orthopedics', 'Orthopedic Surgery'],
    'rheumatology': ['Rheumatology', 'Autoimmune Disorders'],
    'ent': ['ENT', 'Otolaryngology'],
    'general': ['General Practice', 'Family Medicine', 'Internal Medicine'],
    'emergency': ['Emergency Medicine', 'Urgent Care'],
    'infectious disease': ['Infectious Disease', 'Internal Medicine'],
    'dermatology': ['Dermatology', 'Skin Care'],
    'psychiatry': ['Psychiatry', 'Mental Health'],
    'endocrinology': ['Endocrinology', 'Diabetes Care']
  };

  private readonly URGENCY_WEIGHTS = {
    emergency: { proximity: 0.6, availability: 0.3, rating: 0.1 },
    high: { proximity: 0.4, availability: 0.3, rating: 0.3 },
    medium: { proximity: 0.3, availability: 0.2, rating: 0.5 },
    low: { proximity: 0.2, availability: 0.1, rating: 0.7 }
  };

  /**
   * Find and rank doctors based on the recommendation request
   */
  async recommendDoctors(request: DoctorRecommendationRequest): Promise<DoctorRecommendationResult> {
    try {
      // Map symptom specialties to actual doctor specializations
      const mappedSpecialties = this.mapSpecialties(request.specialties);
      
      // Get primary and alternative specialties
      const primarySpecialty = mappedSpecialties[0] || 'General Practice';
      const alternativeSpecialties = mappedSpecialties.slice(1);

      // Search for doctors in each specialty
      const allDoctors = await this.searchDoctorsBySpecialties(mappedSpecialties, request);
      
      // Score and rank doctors
      const scoredDoctors = await this.scoreDoctors(allDoctors, request);
      
      // Sort by score and limit results
      const maxResults = request.maxResults || 5;
      const topDoctors = scoredDoctors
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      return {
        doctors: topDoctors,
        totalFound: allDoctors.length,
        searchCriteria: request,
        recommendations: {
          primarySpecialty,
          alternativeSpecialties,
          urgencyAdvice: this.getUrgencyAdvice(request.urgencyLevel)
        }
      };
    } catch (error) {
      console.error('Error in doctor recommendation:', error);
      throw new Error('Failed to get doctor recommendations. Please try again.');
    }
  }

  /**
   * Map symptom-based specialties to actual doctor specializations
   */
  private mapSpecialties(specialties: string[]): string[] {
    const mapped = new Set<string>();
    
    for (const specialty of specialties) {
      const normalizedSpecialty = specialty.toLowerCase();
      const mappedSpecialties = this.SPECIALTY_MAPPINGS[normalizedSpecialty];
      
      if (mappedSpecialties) {
        mappedSpecialties.forEach(s => mapped.add(s));
      } else {
        // If no mapping found, try to use the specialty as-is (capitalized)
        mapped.add(this.capitalizeSpecialty(specialty));
      }
    }

    // Always include general practice as fallback
    if (mapped.size === 0) {
      mapped.add('General Practice');
    }

    return Array.from(mapped);
  }

  /**
   * Search for doctors across multiple specialties
   */
  private async searchDoctorsBySpecialties(
    specialties: string[], 
    request: DoctorRecommendationRequest
  ): Promise<DoctorWithProfile[]> {
    const allDoctors: DoctorWithProfile[] = [];
    const seenDoctorIds = new Set<string>();

    for (const specialty of specialties) {
      try {
        const filters: DoctorSearchFilters = {
          specialization: specialty,
          accepting_patients: true,
          max_consultation_fee: request.maxConsultationFee,
          languages_spoken: request.preferredLanguages
        };

        const result = await doctorService.searchDoctors(filters, { limit: 20 });
        
        // Add unique doctors to the list
        for (const doctor of result.data) {
          if (!seenDoctorIds.has(doctor.id)) {
            allDoctors.push(doctor);
            seenDoctorIds.add(doctor.id);
          }
        }
      } catch (error) {
        console.error(`Error searching for ${specialty} doctors:`, error);
        // Continue with other specialties even if one fails
      }
    }

    return allDoctors;
  }

  /**
   * Score doctors based on multiple factors
   */
  private async scoreDoctors(
    doctors: DoctorWithProfile[], 
    request: DoctorRecommendationRequest
  ): Promise<ScoredDoctor[]> {
    const weights = this.URGENCY_WEIGHTS[request.urgencyLevel];
    
    return doctors.map(doctor => {
      const scoreBreakdown = {
        specialtyMatch: this.calculateSpecialtyScore(doctor, request.specialties),
        rating: this.calculateRatingScore(doctor),
        proximity: this.calculateProximityScore(doctor, request.userLocation),
        availability: this.calculateAvailabilityScore(doctor),
        fee: this.calculateFeeScore(doctor, request.maxConsultationFee)
      };

      // Calculate weighted total score
      const score = 
        scoreBreakdown.specialtyMatch * 0.3 +
        scoreBreakdown.rating * weights.rating +
        scoreBreakdown.proximity * weights.proximity +
        scoreBreakdown.availability * weights.availability +
        scoreBreakdown.fee * 0.1;

      return {
        ...doctor,
        score: Math.round(score * 100) / 100, // Round to 2 decimal places
        scoreBreakdown,
        distance: this.calculateDistance(doctor, request.userLocation)
      };
    });
  }

  /**
   * Calculate specialty match score (0-100)
   */
  private calculateSpecialtyScore(doctor: DoctorWithProfile, requestedSpecialties: string[]): number {
    const doctorSpecialty = doctor.specialization.toLowerCase();
    const doctorSubSpecialty = doctor.sub_specialization?.toLowerCase();
    
    // Check for exact matches
    for (const specialty of requestedSpecialties) {
      const normalizedSpecialty = specialty.toLowerCase();
      const mappedSpecialties = this.SPECIALTY_MAPPINGS[normalizedSpecialty] || [specialty];
      
      for (const mapped of mappedSpecialties) {
        if (doctorSpecialty.includes(mapped.toLowerCase())) {
          return 100; // Perfect match
        }
        if (doctorSubSpecialty && doctorSubSpecialty.includes(mapped.toLowerCase())) {
          return 90; // Sub-specialty match
        }
      }
    }

    // Check for partial matches
    for (const specialty of requestedSpecialties) {
      if (doctorSpecialty.includes(specialty.toLowerCase()) || 
          (doctorSubSpecialty && doctorSubSpecialty.includes(specialty.toLowerCase()))) {
        return 70; // Partial match
      }
    }

    // General practice can handle most conditions
    if (doctorSpecialty.includes('general') || doctorSpecialty.includes('family')) {
      return 50; // General match
    }

    return 20; // No match but still a qualified doctor
  }

  /**
   * Calculate rating score (0-100)
   */
  private calculateRatingScore(doctor: DoctorWithProfile): number {
    const rating = doctor.rating || 0;
    const reviewCount = doctor.total_reviews || 0;
    
    // Base score from rating (0-5 scale converted to 0-100)
    let score = (rating / 5) * 100;
    
    // Adjust based on number of reviews (more reviews = more reliable)
    if (reviewCount >= 50) {
      score *= 1.0; // Full confidence
    } else if (reviewCount >= 20) {
      score *= 0.9; // High confidence
    } else if (reviewCount >= 10) {
      score *= 0.8; // Medium confidence
    } else if (reviewCount >= 5) {
      score *= 0.7; // Low confidence
    } else {
      score *= 0.5; // Very low confidence
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate proximity score (0-100)
   */
  private calculateProximityScore(doctor: DoctorWithProfile, userLocation?: Location): number {
    if (!userLocation || !doctor.office_address) {
      return 50; // Neutral score if location data unavailable
    }

    const distance = this.calculateDistance(doctor, userLocation);
    
    if (distance === null) {
      return 50; // Neutral score if distance can't be calculated
    }

    // Score based on distance (closer = higher score)
    if (distance <= 5) return 100;      // Within 5 miles
    if (distance <= 10) return 90;      // Within 10 miles
    if (distance <= 20) return 75;      // Within 20 miles
    if (distance <= 50) return 50;      // Within 50 miles
    if (distance <= 100) return 25;     // Within 100 miles
    return 10;                          // Over 100 miles
  }

  /**
   * Calculate availability score (0-100)
   */
  private calculateAvailabilityScore(doctor: DoctorWithProfile): number {
    // This is a simplified implementation
    // In a real system, you would check actual appointment availability
    
    if (!doctor.is_accepting_patients) {
      return 0; // Not accepting patients
    }

    // Base score for accepting patients
    let score = 70;
    
    // Adjust based on years of experience (more experienced might be busier)
    const experience = doctor.years_of_experience || 0;
    if (experience < 5) {
      score += 20; // Newer doctors might have more availability
    } else if (experience > 20) {
      score -= 10; // Very experienced doctors might be busier
    }
    
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate fee score (0-100) - lower fees get higher scores
   */
  private calculateFeeScore(doctor: DoctorWithProfile, maxFee?: number): number {
    const fee = doctor.consultation_fee || 0;
    
    if (maxFee && fee > maxFee) {
      return 0; // Exceeds budget
    }
    
    // Score based on fee ranges (lower fees get higher scores)
    if (fee <= 100) return 100;
    if (fee <= 200) return 80;
    if (fee <= 300) return 60;
    if (fee <= 500) return 40;
    return 20;
  }

  /**
   * Calculate distance between doctor and user (simplified implementation)
   */
  private calculateDistance(doctor: DoctorWithProfile, userLocation?: Location): number | null {
    if (!userLocation || !doctor.office_address) {
      return null;
    }

    // This is a simplified implementation
    // In a real system, you would use a geocoding service to get coordinates
    // and calculate actual distance using the Haversine formula
    
    // For now, return a mock distance based on city matching
    if (userLocation.city && doctor.office_address.toLowerCase().includes(userLocation.city.toLowerCase())) {
      return Math.random() * 10; // Random distance within city (0-10 miles)
    }
    
    return Math.random() * 50 + 10; // Random distance outside city (10-60 miles)
  }

  /**
   * Get urgency-specific advice
   */
  private getUrgencyAdvice(urgencyLevel: string): string {
    switch (urgencyLevel) {
      case 'emergency':
        return 'Seek immediate emergency care. Call 911 or go to the nearest emergency room.';
      case 'high':
        return 'Schedule an appointment as soon as possible, preferably within 24 hours.';
      case 'medium':
        return 'Schedule an appointment within the next few days to a week.';
      case 'low':
        return 'Schedule a routine appointment when convenient.';
      default:
        return 'Consult with a healthcare provider for proper evaluation.';
    }
  }

  /**
   * Capitalize specialty name properly
   */
  private capitalizeSpecialty(specialty: string): string {
    return specialty
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Filter doctors by emergency criteria for urgent cases
   */
  async getEmergencyDoctors(userLocation?: Location): Promise<ScoredDoctor[]> {
    const emergencyRequest: DoctorRecommendationRequest = {
      specialties: ['Emergency Medicine', 'Urgent Care'],
      userLocation,
      urgencyLevel: 'emergency',
      maxResults: 3
    };

    const result = await this.recommendDoctors(emergencyRequest);
    return result.doctors;
  }

  /**
   * Get doctors for a specific specialty with basic filtering
   */
  async getDoctorsBySpecialty(
    specialty: string, 
    userLocation?: Location,
    maxResults: number = 5
  ): Promise<ScoredDoctor[]> {
    const request: DoctorRecommendationRequest = {
      specialties: [specialty],
      userLocation,
      urgencyLevel: 'medium',
      maxResults
    };

    const result = await this.recommendDoctors(request);
    return result.doctors;
  }
}

// Export singleton instance
export const doctorRecommendationAgent = new DoctorRecommendationAgent();