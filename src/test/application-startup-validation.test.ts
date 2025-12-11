/**
 * Application Startup Validation Test
 * 
 * This test validates that the application can start up successfully
 * and all core services are properly initialized.
 */

import { describe, it, expect } from 'vitest';

describe('Application Startup Validation', () => {
  it('should validate that all core modules can be imported', async () => {
    // Test that all core services can be imported without errors
    const authModule = await import('@/services/auth');
    expect(authModule.authService).toBeDefined();
    expect(authModule.AuthService).toBeDefined();

    const databaseModule = await import('@/services/database');
    expect(databaseModule.databaseService).toBeDefined();
    expect(databaseModule.DatabaseService).toBeDefined();

    const realtimeModule = await import('@/services/realtime');
    expect(realtimeModule.realtimeService).toBeDefined();
    expect(realtimeModule.RealtimeService).toBeDefined();

    const sessionModule = await import('@/services/session-manager');
    expect(sessionModule.SessionManager).toBeDefined();
  });

  it('should validate that error handling is properly configured', async () => {
    const errorModule = await import('@/lib/error-handler');
    expect(errorModule.ErrorHandler).toBeDefined();
    expect(errorModule.ErrorHandler.handleAuthError).toBeTypeOf('function');
    expect(errorModule.ErrorHandler.handleDatabaseError).toBeTypeOf('function');
    expect(errorModule.ErrorHandler.handleNetworkError).toBeTypeOf('function');
  });

  it('should validate that configuration is accessible', async () => {
    const configModule = await import('@/lib/config');
    expect(configModule.getSupabaseConfig).toBeTypeOf('function');
    expect(configModule.getCurrentEnvironment).toBeTypeOf('function');
  });

  it('should validate that startup validation works', async () => {
    const validatorModule = await import('@/lib/startup-validator');
    expect(validatorModule.validateApplicationStartup).toBeTypeOf('function');
    expect(validatorModule.getUserFacingConfigErrors).toBeTypeOf('function');
  });

  it('should validate that React components can be imported', async () => {
    // Test core components
    const appModule = await import('@/App');
    expect(appModule.default).toBeDefined();

    const authContextModule = await import('@/contexts/AuthContext');
    expect(authContextModule.AuthProvider).toBeDefined();
    expect(authContextModule.useAuth).toBeDefined();

    const protectedRouteModule = await import('@/components/auth/ProtectedRoute');
    expect(protectedRouteModule.ProtectedRoute).toBeDefined();
  });

  it('should validate that all required types are available', async () => {
    const supabaseTypesModule = await import('@/types/supabase');
    expect(supabaseTypesModule).toBeDefined();

    const databaseTypesModule = await import('@/types/database');
    expect(databaseTypesModule).toBeDefined();
  });

  it('should validate service initialization without errors', () => {
    // These should not throw errors during import/initialization
    expect(() => {
      require('@/services/auth');
    }).not.toThrow();

    expect(() => {
      require('@/services/database');
    }).not.toThrow();

    expect(() => {
      require('@/services/realtime');
    }).not.toThrow();

    expect(() => {
      require('@/lib/error-handler');
    }).not.toThrow();
  });

  it('should validate that environment configuration is working', () => {
    // Test that we can access environment variables
    expect(import.meta.env).toBeDefined();
    
    // In test environment, these should be available
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });

  it('should validate that all critical paths are accessible', async () => {
    // Test that all critical application paths can be loaded
    const paths = [
      '@/App',
      '@/contexts/AuthContext',
      '@/services/auth',
      '@/services/database',
      '@/services/realtime',
      '@/lib/error-handler',
      '@/lib/config',
      '@/components/auth/ProtectedRoute',
      '@/pages/Login',
      '@/pages/Dashboard',
    ];

    for (const path of paths) {
      try {
        const module = await import(path);
        expect(module).toBeDefined();
      } catch (error) {
        throw new Error(`Failed to import critical path: ${path} - ${error}`);
      }
    }
  });

  it('should validate that the application has proper error boundaries', async () => {
    const errorBoundaryModule = await import('@/components/error');
    expect(errorBoundaryModule.ErrorBoundary).toBeDefined();
  });

  it('should validate that all UI components are accessible', async () => {
    // Test that key UI components can be imported
    const uiPaths = [
      '@/components/ui/button',
      '@/components/ui/input',
      '@/components/ui/card',
      '@/components/ui/toast',
      '@/components/ui/skeleton',
    ];

    for (const path of uiPaths) {
      try {
        const module = await import(path);
        expect(module).toBeDefined();
      } catch (error) {
        throw new Error(`Failed to import UI component: ${path} - ${error}`);
      }
    }
  });
});