import os
from pathlib import Path
from dotenv import load_dotenv

# Get the project root directory (2 levels up from this file)
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent.parent
env_path = project_root / ".env.local"

# Only load .env.local if it exists (for local development)
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"📁 Loaded environment from {env_path}")
else:
    print("☁️ Running in cloud environment (no .env.local file)")

# Google Gemini API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

if not GOOGLE_API_KEY:
    print("⚠️ WARNING: GOOGLE_API_KEY not found in environment variables")
    print(f"Looking for .env.local at: {env_path}")
    print("Please add GOOGLE_API_KEY to your .env.local file")
    print("Get your API key from: https://makersuite.google.com/app/apikey")
else:
    print(f"✓ Google API Key loaded successfully (length: {len(GOOGLE_API_KEY)})")

# Supabase Configuration
# Support both VITE_SUPABASE_URL (for local development) and SUPABASE_URL (for Cloud Run)
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

print(f"🔍 Debug - SUPABASE_URL from env: {SUPABASE_URL[:30] if SUPABASE_URL else 'EMPTY'}...")
print(f"🔍 Debug - SUPABASE_SERVICE_KEY exists: {bool(SUPABASE_SERVICE_KEY)}")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("⚠️ WARNING: Supabase configuration not found in environment variables")
    print(f"Looking for .env.local at: {env_path}")
    print("Please add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file")
else:
    print(f"✓ Supabase configuration loaded successfully")

# Initialize Supabase client (for use in other modules)
supabase = None
try:
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        # Test DNS resolution first
        import socket
        hostname = SUPABASE_URL.replace('https://', '').replace('http://', '').split('/')[0]
        print(f"🔍 Testing DNS resolution for: {hostname}")
        try:
            ip = socket.gethostbyname(hostname)
            print(f"✓ DNS resolved to: {ip}")
        except Exception as dns_err:
            print(f"❌ DNS resolution failed: {dns_err}")
        
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print(f"✓ Supabase client initialized successfully")
        
        # Test actual connection
        try:
            print("🔍 Testing Supabase connection...")
            test_response = supabase.table('doctors').select('id').limit(1).execute()
            print(f"✓ Supabase connection test successful!")
        except Exception as conn_err:
            print(f"❌ Supabase connection test failed: {conn_err}")
except Exception as e:
    print(f"⚠️ Failed to initialize Supabase client: {e}")
    import traceback
    traceback.print_exc()
