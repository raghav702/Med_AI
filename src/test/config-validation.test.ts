import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env before importing the modules
const mockEnv = {
  DEV: true,
  MODE: 'development',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
};

// Mock the import.meta object
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  },
  writable: true
});

// Now import the modules after mocking
import { validateEnvironmentConfig, getCurrentEnvironment, CONFIG_GUIDANCE } from '../lib/config';
import { validateApplicationStartup, getUserFacingConfigErrors } from '../lib/startup-validator';

describe('Configuration Validation', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    mockEnv.VITE_SUPABASE_URL = '';
    mockEnv.VITE_SUPABASE_ANON_KEY = '';
    mockEnv.DEV = true;
    mockEnv.MODE = 'development';
  });

  describe('validateEnvironmentConfig', () => {
    it('should return invalid when no environment variables are set', () => {
      const result = validateEnvironmentConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.environment).toBe('development');
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('VITE_SUPABASE_URL');
      expect(result.errors[1].field).toBe('VITE_SUPABASE_ANON_KEY');
    });

    it('should return valid when all required variables are set correctly', () => {
      mockEnv.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
      mockEnv.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjQ0ODAwMCwiZXhwIjoxOTU4MDI0MDAwfQ.test';
      
      const result = validateEnvironmentConfig();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.hasRequiredVars).toBe(true);
    });

    it('should detect invalid URL format', () => {
      mockEnv.VITE_SUPABASE_URL = 'not-a-valid-url';
      mockEnv.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjQ0ODAwMCwiZXhwIjoxOTU4MDI0MDAwfQ.test';
      
      const result = validateEnvironmentConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid URL format'))).toBe(true);
    });

    it('should detect non-HTTPS URLs', () => {
      mockEnv.VITE_SUPABASE_URL = 'http://test-project.supabase.co';
      mockEnv.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjQ0ODAwMCwiZXhwIjoxOTU4MDI0MDAwfQ.test';
      
      const result = validateEnvironmentConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('HTTPS protocol'))).toBe(true);
    });

    it('should detect invalid anon key format', () => {
      mockEnv.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
      mockEnv.VITE_SUPABASE_ANON_KEY = 'short-key';
      
      const result = validateEnvironmentConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true);
    });

    it('should warn about localhost URLs', () => {
      mockEnv.VITE_SUPABASE_URL = 'https://localhost:54321';
      mockEnv.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjQ0ODAwMCwiZXhwIjoxOTU4MDI0MDAwfQ.test';
      
      const result = validateEnvironmentConfig();
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('localhost'))).toBe(true);
    });
  });

  describe('getCurrentEnvironment', () => {
    it('should return development for DEV mode', () => {
      mockEnv.MODE = 'development';
      mockEnv.DEV = true;
      
      const env = getCurrentEnvironment();
      expect(env).toBe('development');
    });

    it('should return production for production mode', () => {
      mockEnv.MODE = 'production';
      mockEnv.DEV = false;
      
      const env = getCurrentEnvironment();
      expect(env).toBe('production');
    });
  });

  describe('validateApplicationStartup', () => {
    it('should allow development to proceed even with invalid config', () => {
      mockEnv.MODE = 'development';
      mockEnv.DEV = true;
      
      const result = validateApplicationStartup();
      
      expect(result.canProceed).toBe(true);
      expect(result.environment).toBe('development');
    });

    it('should not allow production to proceed with invalid config', () => {
      mockEnv.MODE = 'production';
      mockEnv.DEV = false;
      
      const result = validateApplicationStartup();
      
      expect(result.canProceed).toBe(false);
      expect(result.environment).toBe('production');
    });
  });

  describe('getUserFacingConfigErrors', () => {
    it('should return setup error for development with missing config', () => {
      mockEnv.MODE = 'development';
      mockEnv.DEV = true;
      
      const errors = getUserFacingConfigErrors();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].title).toBe('Supabase Setup Required');
      expect(errors[0].isBlocking).toBe(false);
    });

    it('should return blocking error for production with missing config', () => {
      mockEnv.MODE = 'production';
      mockEnv.DEV = false;
      
      const errors = getUserFacingConfigErrors();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].title).toBe('Configuration Error');
      expect(errors[0].isBlocking).toBe(true);
    });

    it('should return no errors when config is valid', () => {
      mockEnv.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
      mockEnv.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjQ0ODAwMCwiZXhwIjoxOTU4MDI0MDAwfQ.test';
      
      const errors = getUserFacingConfigErrors();
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('CONFIG_GUIDANCE', () => {
    it('should contain setup instructions', () => {
      expect(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS).toContain('Supabase Configuration Setup');
      expect(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS).toContain('supabase.com');
      expect(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS).toContain('.env.local');
    });

    it('should contain production deployment guide', () => {
      expect(CONFIG_GUIDANCE.PRODUCTION_DEPLOYMENT).toContain('Production Deployment Guide');
      expect(CONFIG_GUIDANCE.PRODUCTION_DEPLOYMENT).toContain('Vercel');
      expect(CONFIG_GUIDANCE.PRODUCTION_DEPLOYMENT).toContain('Netlify');
    });

    it('should contain troubleshooting information', () => {
      expect(CONFIG_GUIDANCE.TROUBLESHOOTING).toContain('Common Configuration Issues');
      expect(CONFIG_GUIDANCE.TROUBLESHOOTING).toContain('VITE_SUPABASE_URL is missing');
    });
  });
});