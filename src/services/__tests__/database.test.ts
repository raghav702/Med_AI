import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type {
  UserProfile,
  CreateUserProfile,
  UpdateUserProfile,
  MedicalRecord,
  CreateMedicalRecord,
  UpdateMedicalRecord
} from '@/types/database';

// Mock the supabase import with a factory function
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  }
}));

// Import after mocking
import { DatabaseService, DatabaseServiceError } from '../database';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockQuery: any;
  let mockSupabase: any;

  beforeEach(async () => {
    // Get the mocked supabase
    const { supabase } = await import('@/lib/supabase');
    mockSupabase = supabase;
    
    databaseService = new DatabaseService();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a mock query builder
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe('Service Availability', () => {
    it('should return true when supabase is available', () => {
      expect(databaseService.isServiceAvailable()).toBe(true);
    });

    it('should validate connection successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });
      
      const isValid = await databaseService.validateConnection();
      expect(isValid).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should handle connection validation failure', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Connection failed' } 
      });
      
      const isValid = await databaseService.validateConnection();
      expect(isValid).toBe(false);
    });
  });

  describe('User Profile Operations', () => {
    const mockUserId = 'user-123';
    const mockUserProfile: UserProfile = {
      id: mockUserId,
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-01',
      phone_number: '+1234567890',
      emergency_contact: 'Jane Doe',
      medical_conditions: ['Hypertension'],
      allergies: ['Peanuts'],
      medications: ['Lisinopril'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    describe('getUserProfile', () => {
      it('should get user profile successfully', async () => {
        mockQuery.single.mockResolvedValue({ data: mockUserProfile, error: null });
        
        const result = await databaseService.getUserProfile(mockUserId);
        
        expect(result).toEqual(mockUserProfile);
        expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
        expect(mockQuery.select).toHaveBeenCalledWith('*');
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockUserId);
      });

      it('should return null when user profile not found', async () => {
        mockQuery.single.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        });
        
        const result = await databaseService.getUserProfile(mockUserId);
        expect(result).toBeNull();
      });

      it('should throw error for invalid user ID', async () => {
        await expect(databaseService.getUserProfile('')).rejects.toThrow(
          DatabaseServiceError
        );
      });

      it('should handle database errors', async () => {
        mockQuery.single.mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error', code: 'DB_ERROR' } 
        });
        
        await expect(databaseService.getUserProfile(mockUserId)).rejects.toThrow(
          DatabaseServiceError
        );
      });
    });

    describe('createUserProfile', () => {
      const createData: CreateUserProfile = {
        id: mockUserId,
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01'
      };

      it('should create user profile successfully', async () => {
        mockQuery.single.mockResolvedValue({ data: mockUserProfile, error: null });
        
        const result = await databaseService.createUserProfile(createData);
        
        expect(result).toEqual(mockUserProfile);
        expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
        expect(mockQuery.insert).toHaveBeenCalledWith([createData]);
        expect(mockQuery.select).toHaveBeenCalled();
      });

      it('should throw error for missing user ID', async () => {
        const invalidData = { ...createData, id: '' };
        
        await expect(databaseService.createUserProfile(invalidData)).rejects.toThrow(
          DatabaseServiceError
        );
      });

      it('should handle duplicate record error', async () => {
        mockQuery.single.mockResolvedValue({ 
          data: null, 
          error: { code: '23505', message: 'Duplicate key' } 
        });
        
        await expect(databaseService.createUserProfile(createData)).rejects.toThrow(
          'Record already exists'
        );
      });
    });

    describe('updateUserProfile', () => {
      const updateData: UpdateUserProfile = {
        first_name: 'Jane',
        phone_number: '+0987654321'
      };

      it('should update user profile successfully', async () => {
        const updatedProfile = { ...mockUserProfile, ...updateData };
        mockQuery.single.mockResolvedValue({ data: updatedProfile, error: null });
        
        const result = await databaseService.updateUserProfile(mockUserId, updateData);
        
        expect(result).toEqual(updatedProfile);
        expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
        expect(mockQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            ...updateData,
            updated_at: expect.any(String)
          })
        );
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockUserId);
      });

      it('should throw error for invalid user ID', async () => {
        await expect(databaseService.updateUserProfile('', updateData)).rejects.toThrow(
          DatabaseServiceError
        );
      });
    });

    describe('deleteUserProfile', () => {
      it('should delete user profile successfully', async () => {
        mockQuery.single = vi.fn().mockResolvedValue({ data: null, error: null });
        
        await databaseService.deleteUserProfile(mockUserId);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
        expect(mockQuery.delete).toHaveBeenCalled();
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockUserId);
      });

      it('should throw error for invalid user ID', async () => {
        await expect(databaseService.deleteUserProfile('')).rejects.toThrow(
          DatabaseServiceError
        );
      });
    });

    describe('getUserProfileSummary', () => {
      it('should get user profile summary successfully', async () => {
        const mockRecordsData = [
          { id: 'record-1', date_recorded: '2024-01-15' },
          { id: 'record-2', date_recorded: '2024-01-10' }
        ];

        // Mock profile query
        mockQuery.single.mockResolvedValueOnce({ data: mockUserProfile, error: null });
        
        // Mock records query
        mockQuery.single = vi.fn();
        const mockRecordsQuery = {
          ...mockQuery,
          single: undefined
        };
        mockSupabase.from.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockRecordsQuery);
        mockRecordsQuery.order = vi.fn().mockResolvedValue({ 
          data: mockRecordsData, 
          error: null 
        });
        
        const result = await databaseService.getUserProfileSummary(mockUserId);
        
        expect(result).toEqual({
          ...mockUserProfile,
          condition_count: 1,
          allergy_count: 1,
          medication_count: 1,
          total_medical_records: 2,
          latest_record_date: '2024-01-15'
        });
      });

      it('should return null when user profile not found', async () => {
        mockQuery.single.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        });
        
        const result = await databaseService.getUserProfileSummary(mockUserId);
        expect(result).toBeNull();
      });
    });
  });

  describe('Medical Records Operations', () => {
    const mockUserId = 'user-123';
    const mockRecordId = 'record-123';
    const mockMedicalRecord: MedicalRecord = {
      id: mockRecordId,
      user_id: mockUserId,
      record_type: 'lab_result',
      title: 'Blood Test',
      description: 'Annual blood work',
      date_recorded: '2024-01-15',
      provider_name: 'Dr. Smith',
      attachments: [],
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    };

    describe('getMedicalRecords', () => {
      it('should get medical records with pagination', async () => {
        const mockResponse = {
          data: [mockMedicalRecord],
          error: null,
          count: 1
        };
        
        mockQuery.range = vi.fn().mockResolvedValue(mockResponse);
        
        const result = await databaseService.getMedicalRecords(mockUserId);
        
        expect(result).toEqual({
          data: [mockMedicalRecord],
          count: 1,
          page: 1,
          limit: 10,
          total_pages: 1,
          has_next: false,
          has_previous: false
        });
        
        expect(mockSupabase.from).toHaveBeenCalledWith('medical_records');
        expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
        expect(mockQuery.order).toHaveBeenCalledWith('date_recorded', { ascending: false });
      });

      it('should apply filters correctly', async () => {
        const filters = {
          record_type: 'lab_result' as const,
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          provider_name: 'Dr. Smith',
          search: 'blood'
        };
        
        mockQuery.range = vi.fn().mockResolvedValue({
          data: [mockMedicalRecord],
          error: null,
          count: 1
        });
        
        await databaseService.getMedicalRecords(mockUserId, filters);
        
        expect(mockQuery.eq).toHaveBeenCalledWith('record_type', 'lab_result');
        expect(mockQuery.gte).toHaveBeenCalledWith('date_recorded', '2024-01-01');
        expect(mockQuery.lte).toHaveBeenCalledWith('date_recorded', '2024-01-31');
        expect(mockQuery.ilike).toHaveBeenCalledWith('provider_name', '%Dr. Smith%');
        expect(mockQuery.or).toHaveBeenCalledWith('title.ilike.%blood%,description.ilike.%blood%');
      });

      it('should throw error for invalid user ID', async () => {
        await expect(databaseService.getMedicalRecords('')).rejects.toThrow(
          DatabaseServiceError
        );
      });
    });

    describe('getMedicalRecord', () => {
      it('should get single medical record successfully', async () => {
        mockQuery.single.mockResolvedValue({ data: mockMedicalRecord, error: null });
        
        const result = await databaseService.getMedicalRecord(mockRecordId, mockUserId);
        
        expect(result).toEqual(mockMedicalRecord);
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockRecordId);
        expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      });

      it('should return null when record not found', async () => {
        mockQuery.single.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        });
        
        const result = await databaseService.getMedicalRecord(mockRecordId, mockUserId);
        expect(result).toBeNull();
      });
    });

    describe('createMedicalRecord', () => {
      const createData: CreateMedicalRecord = {
        user_id: mockUserId,
        record_type: 'lab_result',
        title: 'Blood Test',
        description: 'Annual blood work',
        date_recorded: '2024-01-15',
        provider_name: 'Dr. Smith'
      };

      it('should create medical record successfully', async () => {
        mockQuery.single.mockResolvedValue({ data: mockMedicalRecord, error: null });
        
        const result = await databaseService.createMedicalRecord(createData);
        
        expect(result).toEqual(mockMedicalRecord);
        expect(mockQuery.insert).toHaveBeenCalledWith([{
          ...createData,
          attachments: []
        }]);
      });

      it('should throw error for missing required fields', async () => {
        const invalidData = { ...createData, title: '' };
        
        await expect(databaseService.createMedicalRecord(invalidData)).rejects.toThrow(
          'User ID, title, record type, and date recorded are required'
        );
      });
    });

    describe('updateMedicalRecord', () => {
      const updateData: UpdateMedicalRecord = {
        title: 'Updated Blood Test',
        description: 'Updated description'
      };

      it('should update medical record successfully', async () => {
        const updatedRecord = { ...mockMedicalRecord, ...updateData };
        mockQuery.single.mockResolvedValue({ data: updatedRecord, error: null });
        
        const result = await databaseService.updateMedicalRecord(
          mockRecordId, 
          mockUserId, 
          updateData
        );
        
        expect(result).toEqual(updatedRecord);
        expect(mockQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            ...updateData,
            updated_at: expect.any(String)
          })
        );
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockRecordId);
        expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      });
    });

    describe('deleteMedicalRecord', () => {
      it('should delete medical record successfully', async () => {
        mockQuery.single = vi.fn().mockResolvedValue({ data: null, error: null });
        
        await databaseService.deleteMedicalRecord(mockRecordId, mockUserId);
        
        expect(mockQuery.delete).toHaveBeenCalled();
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockRecordId);
        expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      });
    });

    describe('getMedicalRecordStats', () => {
      it('should get medical record statistics', async () => {
        const mockStatsData = [
          { record_type: 'lab_result', date_recorded: '2024-01-15' },
          { record_type: 'lab_result', date_recorded: '2024-01-10' },
          { record_type: 'prescription', date_recorded: '2024-01-12' }
        ];
        
        mockQuery.order = vi.fn().mockResolvedValue({ 
          data: mockStatsData, 
          error: null 
        });
        
        const result = await databaseService.getMedicalRecordStats(mockUserId);
        
        expect(result).toEqual([
          { record_type: 'lab_result', count: 2, latest_date: '2024-01-15' },
          { record_type: 'prescription', count: 1, latest_date: '2024-01-12' }
        ]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable error', async () => {
      // Mock supabase as null
      vi.doMock('@/lib/supabase', () => ({
        supabase: null
      }));
      
      const service = new DatabaseService();
      
      await expect(service.getUserProfile('user-123')).rejects.toThrow(
        'Database service not available'
      );
    });

    it('should handle access denied error', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: '42501', message: 'Access denied' } 
      });
      
      await expect(databaseService.getUserProfile('user-123')).rejects.toThrow(
        'Access denied'
      );
    });

    it('should handle network errors', async () => {
      mockQuery.single.mockRejectedValue(new Error('fetch failed'));
      
      await expect(databaseService.getUserProfile('user-123')).rejects.toThrow(
        'Network error'
      );
    });
  });
});