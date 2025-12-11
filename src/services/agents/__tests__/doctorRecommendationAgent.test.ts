import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorRecommendationAgent } from '../doctorRecommendationAgent';
import { doctorService } from '../../doctor';
import type { DoctorWithProfile } from '../../../types/database';

// Mock the doctor service
vi.mock('../../doctor', () => ({
  doctorService: {
    searchDoctors: vi.fn()
  }
}));

describe('DoctorRecommendationAgent', () => {
  let agent: DoctorRecommendationAgent;
  const mockDoctorService = vi.mocked(doctorService);

  beforeEach(() => {
    agent = new DoctorRecommendationAgent();
    vi.clearAllMocks();
  });

  const mockDoctor: DoctorWithProfile = {
    id: '1',
    license_number: 'MD123456',
    specialization: 'Cardiology',
    sub_specialization: 'Interventional Cardiology',
    years_of_experience: 15,
    consultation_fee: 250,
    bio: 'Experienced cardiologist',
    education: ['Harvard Medical School'],
    certifications: ['Board Certified Cardiologist'],
    languages_spoken: ['English', 'Spanish'],
    office_address: '123 Medical Center Dr, Boston, MA',
    office_phone: '555-0123',
    is_accepting_patients: true,
    rating: 4.5,
    total_reviews: 120,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    user_profile: {
      id: '1',
      first_name: 'John',
      last_name: 'Smith',
      user_role: 'doctor' as const,
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  };

  describe('recommendDoctors', () => {
    it('should recommend doctors based on specialty', async () => {
      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [mockDoctor],
        count: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const request = {
        specialties: ['cardiology'],
        urgencyLevel: 'medium' as const,
        maxResults: 5
      };

      const result = await agent.recommendDoctors(request);

      expect(result.doctors).toHaveLength(1);
      expect(result.doctors[0].specialization).toBe('Cardiology');
      expect(result.doctors[0].score).toBeGreaterThan(0);
      expect(result.recommendations.primarySpecialty).toBe('Cardiology');
    });

    it('should handle multiple specialties', async () => {
      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [mockDoctor],
        count: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const request = {
        specialties: ['cardiology', 'pulmonology'],
        urgencyLevel: 'high' as const,
        maxResults: 5
      };

      const result = await agent.recommendDoctors(request);

      // The agent maps specialties to multiple actual specializations, so expect more calls
      expect(mockDoctorService.searchDoctors).toHaveBeenCalled();
      expect(result.doctors).toHaveLength(1);
      expect(result.recommendations.primarySpecialty).toBeDefined();
      expect(result.recommendations.alternativeSpecialties).toBeDefined();
    });

    it('should provide urgency advice based on level', async () => {
      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [],
        count: 0,
        page: 1,
        limit: 10,
        total_pages: 0,
        has_next: false,
        has_previous: false
      });

      const emergencyRequest = {
        specialties: ['emergency'],
        urgencyLevel: 'emergency' as const
      };

      const result = await agent.recommendDoctors(emergencyRequest);

      expect(result.recommendations.urgencyAdvice).toContain('emergency');
      expect(result.recommendations.urgencyAdvice).toContain('911');
    });

    it('should handle location-based scoring', async () => {
      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [mockDoctor],
        count: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const request = {
        specialties: ['cardiology'],
        urgencyLevel: 'medium' as const,
        userLocation: {
          city: 'Boston',
          state: 'MA'
        }
      };

      const result = await agent.recommendDoctors(request);

      expect(result.doctors[0].scoreBreakdown.proximity).toBeGreaterThan(0);
      expect(result.doctors[0].distance).toBeDefined();
    });
  });

  describe('getEmergencyDoctors', () => {
    it('should return emergency doctors with high urgency', async () => {
      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [{ ...mockDoctor, specialization: 'Emergency Medicine' }],
        count: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const result = await agent.getEmergencyDoctors();

      expect(result).toHaveLength(1);
      expect(result[0].specialization).toBe('Emergency Medicine');
    });
  });

  describe('getDoctorsBySpecialty', () => {
    it('should return doctors for specific specialty', async () => {
      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [mockDoctor],
        count: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const result = await agent.getDoctorsBySpecialty('Cardiology');

      expect(result).toHaveLength(1);
      expect(result[0].specialization).toBe('Cardiology');
    });
  });

  describe('scoring algorithm', () => {
    it('should score doctors with perfect specialty match highly', async () => {
      const cardiologyDoctor = { ...mockDoctor, specialization: 'Cardiology', rating: 4.5 };
      const generalDoctor = { ...mockDoctor, id: '2', specialization: 'General Practice', rating: 4.5 };

      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [cardiologyDoctor, generalDoctor],
        count: 2,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const request = {
        specialties: ['cardiology'],
        urgencyLevel: 'medium' as const
      };

      const result = await agent.recommendDoctors(request);

      // Cardiology doctor should score higher than general practice for cardiology request
      const cardiologyScore = result.doctors.find(d => d.specialization === 'Cardiology')?.scoreBreakdown.specialtyMatch;
      const generalScore = result.doctors.find(d => d.specialization === 'General Practice')?.scoreBreakdown.specialtyMatch;

      expect(cardiologyScore).toBeGreaterThan(generalScore || 0);
    });

    it('should consider rating in scoring', async () => {
      const highRatedDoctor = { ...mockDoctor, rating: 4.8, total_reviews: 100 };
      const lowRatedDoctor = { ...mockDoctor, id: '2', rating: 3.0, total_reviews: 50 };

      mockDoctorService.searchDoctors.mockResolvedValue({
        data: [highRatedDoctor, lowRatedDoctor],
        count: 2,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });

      const request = {
        specialties: ['cardiology'],
        urgencyLevel: 'low' as const // Low urgency prioritizes rating
      };

      const result = await agent.recommendDoctors(request);

      const highRatedScore = result.doctors.find(d => d.rating === 4.8)?.scoreBreakdown.rating;
      const lowRatedScore = result.doctors.find(d => d.rating === 3.0)?.scoreBreakdown.rating;

      expect(highRatedScore).toBeGreaterThan(lowRatedScore || 0);
    });
  });
});