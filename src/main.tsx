import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import and initialize startup validation
import { initializeStartupValidation } from './lib/startup-validator'
import './lib/supabase'
import './lib/dev-utils'

// Validate configuration on startup
const startupResult = initializeStartupValidation();

// Log startup result for debugging
if (import.meta.env.DEV) {
  console.log('🔍 Startup validation result:', startupResult);
}

createRoot(document.getElementById("root")!).render(<App />);
