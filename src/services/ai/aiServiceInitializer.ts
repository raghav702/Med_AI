/**
 * AI Service Initializer
 * 
 * Handles initialization of AI services on application startup
 * Provides error handling and fallback configuration
 */

import { aiServiceManager } from './aiServiceManager';
import { AIConfigService } from './aiConfig';

export class AIServiceInitializer {
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize AI services
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private static async performInitialization(): Promise<void> {
    try {
      console.log('Initializing AI services...');

      // Validate configuration
      const validation = AIConfigService.validateConfiguration();
      if (!validation.isValid) {
        console.warn('AI configuration issues detected:', validation.errors);
        
        // Continue with initialization but log warnings
        validation.errors.forEach(error => console.warn(`AI Config: ${error}`));
      }

      // Get configuration
      const config = AIConfigService.getAIServiceConfig();
      
      console.log('AI Configuration Summary:', AIConfigService.getConfigSummary());

      // Initialize AI service manager
      await aiServiceManager.initialize(config);

      // Test the service
      const healthStatus = await aiServiceManager.getHealthStatus();
      console.log('AI Service Health Status:', healthStatus);

      if (healthStatus.overall === 'unavailable') {
        console.warn('All AI services are unavailable. The application will use fallback responses.');
      } else if (healthStatus.overall === 'degraded') {
        console.warn('Primary AI service is unavailable, using fallback services.');
      } else {
        console.log('AI services initialized successfully');
      }

      this.isInitialized = true;

    } catch (error) {
      console.error('Failed to initialize AI services:', error);
      
      // Don't throw the error - allow the app to continue with fallback responses
      console.warn('Application will continue with limited AI functionality');
      
      this.isInitialized = true; // Mark as initialized to prevent retry loops
    }
  }

  /**
   * Check if AI services are initialized
   */
  static isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get initialization status
   */
  static async getStatus(): Promise<{
    initialized: boolean;
    healthy: boolean;
    provider: string;
    details: any;
  }> {
    const status = {
      initialized: this.isInitialized,
      healthy: false,
      provider: 'unknown',
      details: null as any
    };

    if (this.isInitialized) {
      try {
        const healthStatus = await aiServiceManager.getHealthStatus();
        status.healthy = healthStatus.overall !== 'unavailable';
        status.details = healthStatus;
        
        const configSummary = AIConfigService.getConfigSummary();
        status.provider = configSummary.primaryProvider;
      } catch (error) {
        status.details = { error: error.message };
      }
    }

    return status;
  }

  /**
   * Reinitialize AI services (useful for configuration changes)
   */
  static async reinitialize(): Promise<void> {
    console.log('Reinitializing AI services...');
    
    // Cleanup existing services
    try {
      await aiServiceManager.cleanup();
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }

    // Reset state
    this.isInitialized = false;
    this.initializationPromise = null;

    // Initialize again
    return this.initialize();
  }

  /**
   * Cleanup AI services
   */
  static async cleanup(): Promise<void> {
    if (this.isInitialized) {
      try {
        await aiServiceManager.cleanup();
        this.isInitialized = false;
        this.initializationPromise = null;
        console.log('AI services cleaned up successfully');
      } catch (error) {
        console.error('Error during AI services cleanup:', error);
      }
    }
  }
}

// Auto-initialize on module load (can be disabled if needed)
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  AIServiceInitializer.initialize().catch(error => {
    console.error('Auto-initialization of AI services failed:', error);
  });
}