import { EnvironmentConfig, ConfigValidationResult } from './supabase';

/**
 * Environment types
 */
export type Environment = 'development' | 'production' | 'test' | 'staging';

/**
 * Configuration validation error types
 */
export interface ConfigError {
  type: 'missing' | 'invalid' | 'warning';
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Enhanced configuration validation result
 */
export interface EnhancedConfigValidationResult {
  isValid: boolean;
  environment: Environment;
  errors: ConfigError[];
  warnings: ConfigError[];
  hasRequiredVars: boolean;
  canConnect: boolean;
}

/**
 * Configuration documentation and guidance
 */
export const CONFIG_GUIDANCE = {
  SETUP_INSTRUCTIONS: `
🚀 Supabase Configuration Setup

1. Create a Supabase project:
   • Visit https://supabase.com and create a new project
   • Wait for the project to be fully initialized

2. Get your credentials:
   • Go to Settings > API in your Supabase dashboard
   • Copy your Project URL and anon/public key

3. Set up environment variables:
   • Create a .env.local file in your project root
   • Add the following variables:
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key

4. Restart your development server:
   • Stop the current server (Ctrl+C)
   • Run: npm run dev or yarn dev

5. Verify the setup:
   • Check the config status indicator in the bottom-right corner
   • Open browser console and run: testSupabaseSetup()
`,
  
  PRODUCTION_DEPLOYMENT: `
🚀 Production Deployment Guide

Environment Variables:
• Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting platform
• Use your production Supabase project credentials
• Never commit .env files with real credentials to version control

Platform-Specific Instructions:

Vercel:
• Add environment variables in Project Settings > Environment Variables
• Set for Production, Preview, and Development environments

Netlify:
• Add environment variables in Site Settings > Environment Variables
• Deploy from your main branch

Railway/Render:
• Add environment variables in your service settings
• Ensure variables are available at build time

Security Checklist:
✅ Use HTTPS URLs only
✅ Keep anon keys secure (they're safe for client-side use)
✅ Enable Row Level Security (RLS) in your database
✅ Review your Supabase security settings
`,

  TROUBLESHOOTING: `
🔧 Common Configuration Issues

Issue: "VITE_SUPABASE_URL is missing"
• Solution: Create .env.local file with your Supabase project URL
• Check: File is in project root, not in src/ folder

Issue: "Invalid URL format"
• Solution: Ensure URL starts with https:// and ends with .supabase.co
• Example: https://abcdefghijklmnop.supabase.co

Issue: "Connection failed"
• Check: Your Supabase project is active and not paused
• Check: Network connectivity and firewall settings
• Check: API keys are correct and not expired

Issue: "Environment variables not loading"
• Solution: Restart your development server after adding .env.local
• Check: Variable names start with VITE_ prefix
• Check: No spaces around the = sign in .env.local

Development vs Production:
• Development: Use .env.local file (not committed to git)
• Production: Set variables in your hosting platform
• Test: Use separate Supabase project for testing
`,
};

/**
 * Gets the current environment
 */
export function getCurrentEnvironment(): Environment {
  const mode = import.meta.env.MODE;
  
  switch (mode) {
    case 'development':
      return 'development';
    case 'production':
      return 'production';
    case 'test':
      return 'test';
    case 'staging':
      return 'staging';
    default:
      return import.meta.env.DEV ? 'development' : 'production';
  }
}

/**
 * Validates a Supabase URL
 */
function validateSupabaseUrl(url: string): ConfigError[] {
  const errors: ConfigError[] = [];
  
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (urlObj.protocol !== 'https:') {
      errors.push({
        type: 'invalid',
        field: 'VITE_SUPABASE_URL',
        message: 'Supabase URL must use HTTPS protocol',
        suggestion: 'Ensure your URL starts with https://'
      });
    }
    
    // Check if it looks like a Supabase URL
    if (!urlObj.hostname.includes('supabase.co')) {
      errors.push({
        type: 'warning',
        field: 'VITE_SUPABASE_URL',
        message: 'URL doesn\'t appear to be a standard Supabase URL',
        suggestion: 'Verify this is your correct Supabase project URL'
      });
    }
    
    // Check for localhost (development warning)
    if (urlObj.hostname.includes('localhost') || urlObj.hostname.includes('127.0.0.1')) {
      errors.push({
        type: 'warning',
        field: 'VITE_SUPABASE_URL',
        message: 'Using localhost Supabase instance',
        suggestion: 'This is fine for local development with self-hosted Supabase'
      });
    }
    
  } catch {
    errors.push({
      type: 'invalid',
      field: 'VITE_SUPABASE_URL',
      message: 'Invalid URL format',
      suggestion: 'Ensure the URL is properly formatted (e.g., https://your-project.supabase.co)'
    });
  }
  
  return errors;
}

/**
 * Validates a Supabase anon key
 */
function validateSupabaseAnonKey(key: string): ConfigError[] {
  const errors: ConfigError[] = [];
  
  // Check minimum length
  if (key.length < 100) {
    errors.push({
      type: 'invalid',
      field: 'VITE_SUPABASE_ANON_KEY',
      message: 'Anon key appears to be too short',
      suggestion: 'Verify you copied the complete anon/public key from Supabase dashboard'
    });
  }
  
  // Check if it looks like a JWT token
  if (!key.includes('.') || key.split('.').length !== 3) {
    errors.push({
      type: 'invalid',
      field: 'VITE_SUPABASE_ANON_KEY',
      message: 'Anon key doesn\'t appear to be a valid JWT token',
      suggestion: 'Ensure you copied the anon/public key, not the service role key'
    });
  }
  
  // Check for placeholder values
  if (key.includes('your_') || key.includes('replace_') || key.includes('example')) {
    errors.push({
      type: 'invalid',
      field: 'VITE_SUPABASE_ANON_KEY',
      message: 'Anon key appears to be a placeholder value',
      suggestion: 'Replace with your actual Supabase anon/public key'
    });
  }
  
  return errors;
}

/**
 * Enhanced environment configuration validation
 */
export function validateEnvironmentConfig(): EnhancedConfigValidationResult {
  const environment = getCurrentEnvironment();
  const errors: ConfigError[] = [];
  const warnings: ConfigError[] = [];
  
  // Get environment variables
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Validate URL
  if (!url) {
    errors.push({
      type: 'missing',
      field: 'VITE_SUPABASE_URL',
      message: 'Supabase URL is required',
      suggestion: environment === 'development' 
        ? 'Add VITE_SUPABASE_URL to your .env.local file'
        : 'Set VITE_SUPABASE_URL environment variable in your hosting platform'
    });
  } else {
    const urlErrors = validateSupabaseUrl(url);
    errors.push(...urlErrors.filter(e => e.type !== 'warning'));
    warnings.push(...urlErrors.filter(e => e.type === 'warning'));
  }
  
  // Validate anon key
  if (!anonKey) {
    errors.push({
      type: 'missing',
      field: 'VITE_SUPABASE_ANON_KEY',
      message: 'Supabase anon key is required',
      suggestion: environment === 'development'
        ? 'Add VITE_SUPABASE_ANON_KEY to your .env.local file'
        : 'Set VITE_SUPABASE_ANON_KEY environment variable in your hosting platform'
    });
  } else {
    const keyErrors = validateSupabaseAnonKey(anonKey);
    errors.push(...keyErrors.filter(e => e.type !== 'warning'));
    warnings.push(...keyErrors.filter(e => e.type === 'warning'));
  }
  
  // Environment-specific validations
  if (environment === 'production') {
    // Production-specific checks
    if (url && !url.includes('supabase.co')) {
      warnings.push({
        type: 'warning',
        field: 'VITE_SUPABASE_URL',
        message: 'Using non-standard Supabase URL in production',
        suggestion: 'Ensure this is intentional and the URL is secure'
      });
    }
  }
  
  if (environment === 'development') {
    // Development-specific guidance
    if (errors.length > 0) {
      errors.push({
        type: 'missing',
        field: 'setup',
        message: 'Development setup required',
        suggestion: 'Follow the setup instructions to configure Supabase'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    environment,
    errors,
    warnings,
    hasRequiredVars: !!url && !!anonKey,
    canConnect: errors.length === 0,
  };
}

/**
 * Gets environment configuration with validation
 */
export function getEnvironmentConfig(): EnvironmentConfig | null {
  const validation = validateEnvironmentConfig();
  
  if (!validation.isValid) {
    const errorMessage = `Environment configuration is invalid:\n${validation.errors.map(e => e.message).join('\n')}`;
    
    // In development, provide helpful guidance
    if (import.meta.env.DEV) {
      console.error('🔧 Supabase Setup Required');
      console.error(errorMessage);
      console.info(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS);
    }
    
    return null;
  }
  
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/**
 * Checks if the application is properly configured
 */
export function isConfigured(): boolean {
  const config = getEnvironmentConfig();
  return config !== null;
}

/**
 * Gets configuration status for debugging and display
 */
export function getConfigStatus() {
  const validation = validateEnvironmentConfig();
  
  return {
    isConfigured: validation.isValid,
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    errors: validation.errors.map(e => e.message),
    warnings: validation.warnings.map(w => w.message),
    environment: validation.environment,
    detailedValidation: validation,
  };
}

/**
 * Logs configuration status with helpful information
 */
export function logConfigurationStatus(): void {
  const validation = validateEnvironmentConfig();
  const isDev = validation.environment === 'development';
  
  // Disabled console logging for cleaner console
  // console.group(`🔧 Supabase Configuration Status (${validation.environment})`);
  
  // if (validation.isValid) {
  //   console.log('✅ Configuration is valid');
  //   console.log(`📍 Environment: ${validation.environment}`);
  //   console.log(`🔗 URL: ${import.meta.env.VITE_SUPABASE_URL}`);
  //   console.log(`🔑 Anon Key: ${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`);
  // } else {
  //   console.error('❌ Configuration is invalid');
    
  //   // Log errors
  //   if (validation.errors.length > 0) {
  //     console.group('🚨 Errors:');
  //     validation.errors.forEach(error => {
  //       console.error(`• ${error.message}`);
  //       if (error.suggestion) {
  //         console.info(`  💡 ${error.suggestion}`);
  //       }
  //     });
  //     console.groupEnd();
  //   }
    
  //   // Show setup instructions in development
  //   if (isDev && validation.errors.some(e => e.type === 'missing')) {
  //     console.group('📋 Setup Instructions:');
  //     console.info(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS);
  //     console.groupEnd();
  //   }
  // }
  
  // // Log warnings
  // if (validation.warnings.length > 0) {
  //   console.group('⚠️ Warnings:');
  //   validation.warnings.forEach(warning => {
  //     console.warn(`• ${warning.message}`);
  //     if (warning.suggestion) {
  //       console.info(`  💡 ${warning.suggestion}`);
  //     }
  //   });
  //   console.groupEnd();
  // }
  
  // console.groupEnd();
}

/**
 * Validates configuration on application startup
 */
export function validateConfigurationOnStartup(): boolean {
  const validation = validateEnvironmentConfig();
  
  // Always log configuration status
  logConfigurationStatus();
  
  // In development, provide helpful guidance
  if (validation.environment === 'development' && !validation.isValid) {
    console.group('🚀 Getting Started');
    console.info('It looks like this is your first time running the app.');
    console.info('Follow these steps to set up Supabase integration:');
    console.info(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS);
    console.groupEnd();
    
    // Make troubleshooting available globally
    (window as any).supabaseConfigHelp = {
      showSetupInstructions: () => console.info(CONFIG_GUIDANCE.SETUP_INSTRUCTIONS),
      showTroubleshooting: () => console.info(CONFIG_GUIDANCE.TROUBLESHOOTING),
      showProductionGuide: () => console.info(CONFIG_GUIDANCE.PRODUCTION_DEPLOYMENT),
      checkConfig: () => logConfigurationStatus(),
    };
    
    console.info('💡 Run supabaseConfigHelp.showSetupInstructions() for setup help');
  }
  
  // In production, fail fast if configuration is invalid
  if (validation.environment === 'production' && !validation.isValid) {
    const errorMessage = `Production configuration is invalid:\n${validation.errors.map(e => `• ${e.message}`).join('\n')}`;
    console.error(errorMessage);
    
    // Don't throw in production to avoid breaking the app completely
    // Instead, let the app handle graceful degradation
    return false;
  }
  
  return validation.isValid;
}