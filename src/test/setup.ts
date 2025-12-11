import '@testing-library/jest-dom';

// Mock environment variables for testing
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key-' + 'a'.repeat(100), // Make it long enough to pass validation
    DEV: false,
  },
  writable: true,
});

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
});