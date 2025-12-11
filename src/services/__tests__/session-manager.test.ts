import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../session-manager';
import { Session } from '@/types/supabase';

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setSessionPreferences', () => {
    it('should store session preferences in localStorage', () => {
      const options = { persistent: true, rememberMe: true };
      
      SessionManager.setSessionPreferences(options);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'medical-app-session-prefs',
        JSON.stringify(options)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'medical-app-remember-me',
        JSON.stringify(true)
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        SessionManager.setSessionPreferences({ persistent: true, rememberMe: false });
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store session preferences:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getSessionPreferences', () => {
    it('should return stored preferences', () => {
      const storedPrefs = { persistent: true, rememberMe: true };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPrefs));
      
      const result = SessionManager.getSessionPreferences();
      
      expect(result).toEqual(storedPrefs);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('medical-app-session-prefs');
    });

    it('should return default preferences when none stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = SessionManager.getSessionPreferences();
      
      expect(result).toEqual({ persistent: true, rememberMe: false });
    });

    it('should handle localStorage errors and return defaults', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = SessionManager.getSessionPreferences();
      
      expect(result).toEqual({ persistent: true, rememberMe: false });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve session preferences:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isRememberMeEnabled', () => {
    it('should return true when remember me is enabled', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(true));
      
      const result = SessionManager.isRememberMeEnabled();
      
      expect(result).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('medical-app-remember-me');
    });

    it('should return false when remember me is disabled', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(false));
      
      const result = SessionManager.isRememberMeEnabled();
      
      expect(result).toBe(false);
    });

    it('should return false when no preference is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = SessionManager.isRememberMeEnabled();
      
      expect(result).toBe(false);
    });
  });

  describe('shouldAutoRefresh', () => {
    it('should return true when session is close to expiry and persistent', () => {
      const session = {
        expires_at: Math.floor((Date.now() + 4 * 60 * 1000) / 1000), // 4 minutes from now
      } as Session;
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ persistent: true, rememberMe: true }));
      
      const result = SessionManager.shouldAutoRefresh(session);
      
      expect(result).toBe(true);
    });

    it('should return false when session is not persistent', () => {
      const session = {
        expires_at: Math.floor((Date.now() + 4 * 60 * 1000) / 1000), // 4 minutes from now
      } as Session;
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ persistent: false, rememberMe: false }));
      
      const result = SessionManager.shouldAutoRefresh(session);
      
      expect(result).toBe(false);
    });

    it('should return false when session is not close to expiry', () => {
      const session = {
        expires_at: Math.floor((Date.now() + 10 * 60 * 1000) / 1000), // 10 minutes from now
      } as Session;
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ persistent: true, rememberMe: true }));
      
      const result = SessionManager.shouldAutoRefresh(session);
      
      expect(result).toBe(false);
    });

    it('should return false when no session provided', () => {
      const result = SessionManager.shouldAutoRefresh(null);
      
      expect(result).toBe(false);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return time until expiry in milliseconds', () => {
      const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes from now
      const session = {
        expires_at: Math.floor(expiryTime / 1000),
      } as Session;
      
      const result = SessionManager.getTimeUntilExpiry(session);
      
      expect(result).toBeGreaterThan(4 * 60 * 1000); // More than 4 minutes
      expect(result).toBeLessThan(6 * 60 * 1000); // Less than 6 minutes
    });

    it('should return 0 when session is expired', () => {
      const session = {
        expires_at: Math.floor((Date.now() - 1000) / 1000), // 1 second ago
      } as Session;
      
      const result = SessionManager.getTimeUntilExpiry(session);
      
      expect(result).toBe(0);
    });

    it('should return null when no session provided', () => {
      const result = SessionManager.getTimeUntilExpiry(null);
      
      expect(result).toBeNull();
    });
  });

  describe('isSessionExpired', () => {
    it('should return true when session is expired', () => {
      const session = {
        expires_at: Math.floor((Date.now() - 1000) / 1000), // 1 second ago
      } as Session;
      
      const result = SessionManager.isSessionExpired(session);
      
      expect(result).toBe(true);
    });

    it('should return false when session is not expired', () => {
      const session = {
        expires_at: Math.floor((Date.now() + 5 * 60 * 1000) / 1000), // 5 minutes from now
      } as Session;
      
      const result = SessionManager.isSessionExpired(session);
      
      expect(result).toBe(false);
    });

    it('should return false when no session provided', () => {
      const result = SessionManager.isSessionExpired(null);
      
      expect(result).toBe(false);
    });
  });

  describe('formatTimeUntilExpiry', () => {
    it('should format time with minutes and seconds', () => {
      const timeMs = 3 * 60 * 1000 + 45 * 1000; // 3 minutes 45 seconds
      
      const result = SessionManager.formatTimeUntilExpiry(timeMs);
      
      expect(result).toBe('3m 45s');
    });

    it('should format time with only seconds when less than a minute', () => {
      const timeMs = 30 * 1000; // 30 seconds
      
      const result = SessionManager.formatTimeUntilExpiry(timeMs);
      
      expect(result).toBe('30s');
    });

    it('should handle zero time', () => {
      const result = SessionManager.formatTimeUntilExpiry(0);
      
      expect(result).toBe('0s');
    });
  });

  describe('performLogoutCleanup', () => {
    it('should clear session storage and application cache', async () => {
      // Mock localStorage.key to return some Supabase keys
      localStorageMock.length = 3;
      localStorageMock.key
        .mockReturnValueOnce('supabase.auth.token')
        .mockReturnValueOnce('other-key')
        .mockReturnValueOnce('supabase.auth.user');
      
      await SessionManager.performLogoutCleanup();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.user');
      expect(sessionStorageMock.clear).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock supabase.auth.signOut to throw an error
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Supabase error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(SessionManager.performLogoutCleanup()).resolves.not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error during logout cleanup:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});