import { supabase } from '@/lib/supabase';
import { Session } from '@/types/supabase';

/**
 * Session storage options
 */
export interface SessionStorageOptions {
  persistent: boolean;
  rememberMe: boolean;
}

/**
 * Session manager for handling session persistence and cleanup
 */
export class SessionManager {
  private static readonly REMEMBER_ME_KEY = 'medical-app-remember-me';
  private static readonly SESSION_PREFERENCES_KEY = 'medical-app-session-prefs';
  
  /**
   * Set session storage preferences
   */
  static setSessionPreferences(options: SessionStorageOptions): void {
    try {
      localStorage.setItem(
        this.SESSION_PREFERENCES_KEY,
        JSON.stringify(options)
      );
      
      // Store remember me preference separately for quick access
      localStorage.setItem(
        this.REMEMBER_ME_KEY,
        JSON.stringify(options.rememberMe)
      );
    } catch (error) {
      console.warn('Failed to store session preferences:', error);
    }
  }
  
  /**
   * Get session storage preferences
   */
  static getSessionPreferences(): SessionStorageOptions {
    try {
      const stored = localStorage.getItem(this.SESSION_PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to retrieve session preferences:', error);
    }
    
    // Default preferences
    return {
      persistent: true,
      rememberMe: false,
    };
  }
  
  /**
   * Check if remember me is enabled
   */
  static isRememberMeEnabled(): boolean {
    try {
      const stored = localStorage.getItem(this.REMEMBER_ME_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      console.warn('Failed to check remember me preference:', error);
      return false;
    }
  }
  
  /**
   * Configure session persistence based on user preferences
   */
  static async configureSessionPersistence(rememberMe: boolean): Promise<void> {
    if (!supabase) {
      console.warn('Supabase client not available');
      return;
    }
    
    try {
      // Update session preferences
      this.setSessionPreferences({
        persistent: rememberMe,
        rememberMe,
      });
      
      // If remember me is disabled, we should use session storage instead of local storage
      // This is handled by Supabase's persistSession option, but we can influence it
      // by clearing the stored session when remember me is disabled
      if (!rememberMe) {
        // Don't clear immediately, but mark for cleanup on next sign out
        sessionStorage.setItem('clear-on-signout', 'true');
      } else {
        sessionStorage.removeItem('clear-on-signout');
      }
    } catch (error) {
      console.error('Failed to configure session persistence:', error);
    }
  }
  
  /**
   * Perform comprehensive logout cleanup
   */
  static async performLogoutCleanup(): Promise<void> {
    try {
      // Clear Supabase session
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      // Clear session-related storage
      this.clearSessionStorage();
      
      // Clear any cached data
      this.clearApplicationCache();
      
      // Clear any real-time subscriptions (handled by components)
      // This is typically handled by the components themselves
      
    } catch (error) {
      console.error('Error during logout cleanup:', error);
      // Even if there's an error, we should still clear local data
      this.clearSessionStorage();
      this.clearApplicationCache();
    }
  }
  
  /**
   * Clear session-related storage
   */
  private static clearSessionStorage(): void {
    try {
      // Clear Supabase auth tokens
      const keysToRemove = [];
      
      // Find all Supabase-related keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          keysToRemove.push(key);
        }
      }
      
      // Remove Supabase keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Check if we should clear remember me preference
      const shouldClearRememberMe = sessionStorage.getItem('clear-on-signout');
      if (shouldClearRememberMe) {
        localStorage.removeItem(this.REMEMBER_ME_KEY);
        localStorage.removeItem(this.SESSION_PREFERENCES_KEY);
        sessionStorage.removeItem('clear-on-signout');
      }
      
      // Clear session storage
      sessionStorage.clear();
      
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }
  
  /**
   * Clear application-specific cached data
   */
  private static clearApplicationCache(): void {
    try {
      // Clear any application-specific cached data
      // This could include user profile cache, medical records cache, etc.
      const cacheKeys = [
        'user-profile-cache',
        'medical-records-cache',
        'dashboard-cache',
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
    } catch (error) {
      console.warn('Failed to clear application cache:', error);
    }
  }
  
  /**
   * Check if session should be automatically refreshed
   */
  static shouldAutoRefresh(session: Session | null): boolean {
    if (!session?.expires_at) return false;
    
    const preferences = this.getSessionPreferences();
    if (!preferences.persistent) return false;
    
    const now = Date.now();
    const expiresAt = session.expires_at * 1000;
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes
    
    return (expiresAt - now) <= refreshThreshold;
  }
  
  /**
   * Get time until session expires
   */
  static getTimeUntilExpiry(session: Session | null): number | null {
    if (!session?.expires_at) return null;
    
    const now = Date.now();
    const expiresAt = session.expires_at * 1000;
    const remaining = expiresAt - now;
    
    return remaining > 0 ? remaining : 0;
  }
  
  /**
   * Check if session is expired
   */
  static isSessionExpired(session: Session | null): boolean {
    if (!session?.expires_at) return false;
    
    const now = Date.now();
    const expiresAt = session.expires_at * 1000;
    
    return now >= expiresAt;
  }
  
  /**
   * Get formatted time until expiry
   */
  static formatTimeUntilExpiry(timeMs: number): string {
    const minutes = Math.floor(timeMs / (60 * 1000));
    const seconds = Math.floor((timeMs % (60 * 1000)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    
    return `${seconds}s`;
  }
}