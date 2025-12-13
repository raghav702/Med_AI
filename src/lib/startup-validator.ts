/**
 * Application startup configuration validator
 * 
 * This module handles configuration validation when the application starts,
 * providing clear error messages and guidance for setup issues.
 */

import { validateConfigurationOnStartup, getCurrentEnvironment, CONFIG_GUIDANCE } from './config';
import { isSupabaseAvailable } from './supabase';

/**
 * Startup validation result
 */
export interface StartupValidationResult {
  canProceed: boolean;
  hasConfiguration: boolean;
  hasConnection: boolean;
  environment: string;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration error that should be displayed to users
 */
export interface UserFacingConfigError {
  title: string;
  message: string;
  action?: string;
  isBlocking: boolean;
}

/**
 * Validates the application configuration on startup
 */
export function validateApplicationStartup(): StartupValidationResult {
  console.log('🚀 Starting application configuration validation...');
  
  const environment = getCurrentEnvironment();
  const hasConfiguration = validateConfigurationOnStartup();
  const hasConnection = isSupabaseAvailable();
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check configuration
  if (!hasConfiguration) {
    if (environment === 'development') {
      errors.push('Supabase configuration is missing or invalid');
      warnings.push('The app will run in demo mode without backend functionality');
    } else {
      // In production, make this a warning, not an error
      warnings.push('Supabase configuration may be incomplete - some features may not work');
    }
  }
  
  // Check connection
  if (hasConfiguration && !hasConnection) {
    warnings.push('Supabase client could not be initialized');
  }
  
  // Determine if app can proceed
  const canProceed = environment === 'development' || hasConfiguration;
  
  const result: StartupValidationResult = {
    canProceed,
    hasConfiguration,
    hasConnection,
    environment,
    errors,
    warnings,
  };
  
  // Log final status
  if (canProceed) {
    if (hasConfiguration && hasConnection) {
      console.log('✅ Application startup validation passed');
    } else {
      console.warn('⚠️ Application starting with limited functionality');
    }
  } else {
    console.error('❌ Application startup validation failed');
  }
  
  return result;
}

/**
 * Gets user-facing configuration errors for display in UI
 */
export function getUserFacingConfigErrors(): UserFacingConfigError[] {
  const environment = getCurrentEnvironment();
  const hasConfig = validateConfigurationOnStartup();
  const hasConnection = isSupabaseAvailable();
  
  const errors: UserFacingConfigError[] = [];
  
  if (!hasConfig) {
    if (environment === 'development') {
      errors.push({
        title: 'Supabase Setup Required',
        message: 'To use authentication and data features, you need to configure Supabase.',
        action: 'Follow the setup instructions in the browser console',
        isBlocking: false,
      });
    } else {
      errors.push({
        title: 'Configuration Error',
        message: 'The application is not properly configured for this environment.',
        isBlocking: true,
      });
    }
  } else if (!hasConnection) {
    errors.push({
      title: 'Connection Issue',
      message: 'Unable to connect to Supabase. Check your configuration and network connection.',
      action: 'Verify your Supabase project is active and accessible',
      isBlocking: false,
    });
  }
  
  return errors;
}

/**
 * Shows configuration help in the console
 */
export function showConfigurationHelp(): void {
  const environment = getCurrentEnvironment();
  
  console.group('📚 Supabase Configuration Help');
  
  if (environment === 'development') {
    console.info('🔧 Development Setup:');
    console.info(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS);
  } else {
    console.info('🚀 Production Deployment:');
    console.info(CONFIG_GUIDANCE.PRODUCTION_DEPLOYMENT);
  }
  
  console.info('🔧 Troubleshooting:');
  console.info(CONFIG_GUIDANCE.TROUBLESHOOTING);
  
  console.groupEnd();
}

/**
 * Initializes startup validation and makes help available globally
 */
export function initializeStartupValidation(): StartupValidationResult {
  const result = validateApplicationStartup();
  
  // Make configuration help available globally in development
  if (result.environment === 'development') {
    (window as any).showSupabaseHelp = showConfigurationHelp;
    
    if (!result.hasConfiguration) {
      console.info('💡 Run showSupabaseHelp() in the console for setup instructions');
    }
  }
  
  return result;
}