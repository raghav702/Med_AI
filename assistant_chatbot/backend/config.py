import os
from pathlib import Path
from dotenv import load_dotenv

# Get the project root directory (2 levels up from this file)
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent.parent
env_path = project_root / ".env.local"

# Load environment variables from .env.local
load_dotenv(dotenv_path=env_path)

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
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

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
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
except Exception as e:
    print(f"⚠️ Failed to initialize Supabase client: {e}")
