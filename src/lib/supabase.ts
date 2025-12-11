import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase configuration interface
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates the Supabase configuration from environment variables
 */
export function validateSupabaseConfig(): ConfigValidationResult {
  const errors: string[] = [];
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url) {
    errors.push('VITE_SUPABASE_URL environment variable is required');
  } else if (!url.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }
  
  if (!anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY environment variable is required');
  } else if (anonKey.length < 100) {
    errors.push('VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets the Supabase configuration from environment variables
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const validation = validateSupabaseConfig();
  
  if (!validation.isValid) {
    const errorMessage = `Supabase configuration is invalid:\n${validation.errors.join('\n')}`;
    console.error(errorMessage);
    return null;
  }
  
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/**
 * Creates and configures the Supabase client
 */
function createSupabaseClient(): SupabaseClient | null {
  try {
    const config = getSupabaseConfig();
    
    if (!config) {
      console.warn('⚠️ Supabase configuration is missing or invalid');
      console.warn('The app will continue to work, but Supabase features will be disabled.');
      console.warn('Please set up your environment variables to enable Supabase integration.');
      return null;
    }
    
    const client = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    
    return client;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    console.error('The app will continue to work, but Supabase features will be disabled.');
    console.error('Please set up your environment variables to enable Supabase integration.');
    return null;
  }
}

/**
 * Validates the connection to Supabase
 */
export async function validateSupabaseConnection(client: SupabaseClient): Promise<boolean> {
  try {
    // Test the connection by attempting to get the current session
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      console.error('Supabase connection validation failed:', error.message);
      return false;
    }
    
    console.log('Supabase connection validated successfully');
    return true;
  } catch (error) {
    console.error('Supabase connection validation error:', error);
    return false;
  }
}

// Create and export the Supabase client instance
export const supabase = createSupabaseClient();

// Validate connection on initialization (in development)
if (import.meta.env.DEV && supabase) {
  validateSupabaseConnection(supabase).then((isValid) => {
    if (isValid) {
      console.log('✅ Supabase client initialized successfully');
    } else {
      console.warn('⚠️ Supabase connection validation failed');
    }
  });
} else if (import.meta.env.DEV && !supabase) {
  console.warn('⚠️ Supabase client not initialized - check your environment variables');
}

export default supabase;

/**
 * Helper function to check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}