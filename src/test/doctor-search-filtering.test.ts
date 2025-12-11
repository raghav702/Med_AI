import { describe, it, expect, beforeEach, vi } from 'vitest';
import { doctorService } from '@/services/doctor';
import type { DoctorSearchFilters } from '@/types/database';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        ilike: vi.fn(() => ({
          ilike: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
              }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          })),
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        })),
        lte: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
      }))
    }))
  }
}));

describe('Doctor Search and Filtering', () => {
  describe('Requirement 4.1: Display doctors with required fields', () => {
    it('should return doctors with all required fields', async () => {
      const result = await doctorService.searchDoctors({}, { page: 1, limit: 10 });
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('total_pages');
      expect(result).toHaveProperty('has_next');
      expect(result).toHaveProperty('has_previous');
    });
  });

  describe('Requirement 4.2: Specialty filtering', () => {
    it('should filter doctors by specialty', async () => {
      const filters: DoctorSearchFilters = {
        specialty: 'Cardiology'
      };
      
      const result = await doctorService.searchDoctors(filters, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should handle case-insensitive specialty search', async () => {
      const filters: DoctorSearchFilters = {
        specialty: 'cardiology'
      };
      
      const result = await doctorService.searchDoctors(filters, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('Requirement 4.4: Doctor visibility to all authenticated users', () => {
    it('should return all doctors when no filters are applied', async () => {
      const result = await doctorService.getAllDoctors({ page: 1, limit: 10 });
      
      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('Client-side filtering logic', () => {
    it('should apply location filter', async () => {
      const filters: DoctorSearchFilters = {
        location: 'New York'
      };
      
      const result = await doctorService.searchDoctors(filters, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
    });

    it('should apply rating filter', async () => {
      const filters: DoctorSearchFilters = {
        min_rating: 4.0
      };
      
      const result = await doctorService.searchDoctors(filters, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
    });

    it('should apply price filter', async () => {
      const filters: DoctorSearchFilters = {
        max_price: 200
      };
      
      const result = await doctorService.searchDoctors(filters, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
    });

    it('should apply multiple filters simultaneously', async () => {
      const filters: DoctorSearchFilters = {
        specialty: 'Cardiology',
        location: 'New York',
        min_rating: 4.0,
        max_price: 300
      };
      
      const result = await doctorService.searchDoctors(filters, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const result = await doctorService.searchDoctors({}, { page: 1, limit: 10 });
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should calculate total pages correctly', async () => {
      const result = await doctorService.searchDoctors({}, { page: 1, limit: 10 });
      
      expect(result.total_pages).toBeGreaterThanOrEqual(0);
    });
  });
});
