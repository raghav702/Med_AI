import { describe, it, expect } from 'vitest';
import { DatabaseService, DatabaseServiceError } from '../database';

describe('DatabaseService Integration', () => {
  const databaseService = new DatabaseService();

  describe('Service Initialization', () => {
    it('should initialize without errors', () => {
      expect(databaseService).toBeDefined();
      expect(databaseService.isServiceAvailable).toBeDefined();
      expect(databaseService.validateConnection).toBeDefined();
    });

    it('should have all required methods', () => {
      // User Profile methods
      expect(typeof databaseService.getUserProfile).toBe('function');
      expect(typeof databaseService.createUserProfile).toBe('function');
      expect(typeof databaseService.updateUserProfile).toBe('function');
      expect(typeof databaseService.deleteUserProfile).toBe('function');
      expect(typeof databaseService.getUserProfileSummary).toBe('function');

      // Medical Records methods
      expect(typeof databaseService.getMedicalRecords).toBe('function');
      expect(typeof databaseService.getMedicalRecord).toBe('function');
      expect(typeof databaseService.createMedicalRecord).toBe('function');
      expect(typeof databaseService.updateMedicalRecord).toBe('function');
      expect(typeof databaseService.deleteMedicalRecord).toBe('function');
      expect(typeof databaseService.getMedicalRecordStats).toBe('function');

      // Utility methods
      expect(typeof databaseService.isServiceAvailable).toBe('function');
      expect(typeof databaseService.validateConnection).toBe('function');
    });
  });

  describe('Input Validation', () => {
    it('should throw error for empty user ID in getUserProfile', async () => {
      await expect(databaseService.getUserProfile('')).rejects.toThrow(
        DatabaseServiceError
      );
      
      await expect(databaseService.getUserProfile('')).rejects.toThrow(
        'User ID is required'
      );
    });

    it('should throw error for empty user ID in updateUserProfile', async () => {
      await expect(databaseService.updateUserProfile('', {})).rejects.toThrow(
        DatabaseServiceError
      );
    });

    it('should throw error for empty user ID in deleteUserProfile', async () => {
      await expect(databaseService.deleteUserProfile('')).rejects.toThrow(
        DatabaseServiceError
      );
    });

    it('should throw error for missing required fields in createUserProfile', async () => {
      await expect(databaseService.createUserProfile({ id: '' } as any)).rejects.toThrow(
        DatabaseServiceError
      );
    });

    it('should throw error for empty user ID in getMedicalRecords', async () => {
      await expect(databaseService.getMedicalRecords('')).rejects.toThrow(
        DatabaseServiceError
      );
    });

    it('should throw error for missing required fields in createMedicalRecord', async () => {
      const invalidData = {
        user_id: '',
        record_type: 'lab_result' as const,
        title: '',
        date_recorded: '2024-01-01'
      };

      await expect(databaseService.createMedicalRecord(invalidData)).rejects.toThrow(
        'User ID, title, record type, and date recorded are required'
      );
    });
  });

  describe('Error Handling', () => {
    it('should create proper DatabaseServiceError instances', () => {
      const error = new DatabaseServiceError('Test message', 'TEST_CODE', { detail: 'test' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DatabaseServiceError);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('DatabaseServiceError');
    });
  });

  describe('Service Availability', () => {
    it('should report service availability', () => {
      const isAvailable = databaseService.isServiceAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should validate connection', async () => {
      // This test will pass regardless of actual connection status
      // since we're testing the method exists and returns a boolean
      const isValid = await databaseService.validateConnection();
      expect(typeof isValid).toBe('boolean');
    });
  });
});