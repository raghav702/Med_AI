import { validateSupabaseConnection, supabase } from './supabase';
import { getConfigStatus } from './config';

/**
 * Development utility to test Supabase configuration
 */
export async function testSupabaseSetup() {
  console.log('🔧 Testing Supabase Configuration...');
  
  // Check configuration status
  const configStatus = getConfigStatus();
  console.log('Configuration Status:', configStatus);
  
  if (!configStatus.isConfigured) {
    console.error('❌ Configuration is invalid');
    configStatus.errors.forEach(error => console.error(error));
    return false;
  }
  
  console.log('✅ Configuration is valid');
  
  // Check if supabase client was created
  if (!supabase) {
    console.error('❌ Supabase client is not available');
    return false;
  }
  
  // Test connection
  console.log('🔗 Testing connection to Supabase...');
  const isConnected = await validateSupabaseConnection(supabase);
  
  if (isConnected) {
    console.log('✅ Successfully connected to Supabase');
    
    // Test basic auth functionality
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📝 Current session:', session ? 'Active' : 'None');
      
      // Test if we can access the auth API
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user ? user.email : 'Not authenticated');
      
      return true;
    } catch (error) {
      console.error('❌ Error testing auth functionality:', error);
      return false;
    }
  } else {
    console.error('❌ Failed to connect to Supabase');
    return false;
  }
}

/**
 * Logs helpful development information
 */
export function logDevInfo() {
  if (!import.meta.env.DEV) return;
  
  console.log('🚀 Supabase Integration - Development Mode');
  console.log('Environment:', import.meta.env.MODE);
  
  const configStatus = getConfigStatus();
  if (configStatus.isConfigured) {
    console.log('✅ Supabase is configured');
  } else {
    console.log('⚠️ Supabase configuration needed');
    console.log('Run testSupabaseSetup() in the console to diagnose issues');
  }
}

// Auto-run in development
if (import.meta.env.DEV) {
  logDevInfo();
}

// Make available globally in development
if (import.meta.env.DEV) {
  (window as any).testSupabaseSetup = testSupabaseSetup;
  (window as any).supabaseDevUtils = {
    testSetup: testSupabaseSetup,
    getConfigStatus,
    logDevInfo,
  };
}