#!/bin/bash
set -e

echo "🔐 Setting up GCP Secrets for Medical AI Assistant"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# This script should be run ONCE before deployment
# It creates the secrets in Google Secret Manager using your local .env.local file

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo -e "${YELLOW}Please create .env.local with your API keys first${NC}"
    exit 1
fi

# Load environment variables from .env.local
echo -e "${BLUE}📁 Loading environment variables from .env.local...${NC}"

export GOOGLE_API_KEY=$(grep "^GOOGLE_API_KEY=" .env.local | cut -d '=' -f2)
export SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.local | cut -d '=' -f2)
export SUPABASE_ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2)
export SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2)

# Validate required variables
echo -e "${BLUE}🔍 Validating environment variables...${NC}"

if [ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "your_google_api_key_here" ]; then
    echo -e "${RED}❌ GOOGLE_API_KEY is not set or is placeholder${NC}"
    exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL is not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_ANON_KEY is not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is not set${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are valid${NC}"

# Check gcloud authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No project set. Please set your project:${NC}"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"

# Enable Secret Manager API
echo -e "${BLUE}🔧 Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe "$secret_name" --quiet 2>/dev/null; then
        echo -e "${YELLOW}Updating existing secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        echo -e "${BLUE}Creating new secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
    fi
}

# Create individual secrets
echo -e "${BLUE}🔐 Creating/updating secrets in Google Secret Manager...${NC}"

create_or_update_secret "google-api-key" "$GOOGLE_API_KEY"
create_or_update_secret "supabase-url" "$SUPABASE_URL"
create_or_update_secret "supabase-anon-key" "$SUPABASE_ANON_KEY"
create_or_update_secret "supabase-service-role-key" "$SUPABASE_SERVICE_ROLE_KEY"

echo -e "${GREEN}✅ All secrets created successfully!${NC}"

echo -e "\n${BLUE}📝 Next steps:${NC}"
echo -e "1. Push your code to Git (secrets are now safely stored in GCP)"
echo -e "2. Set up Cloud Build trigger or run manual deployment"
echo -e "3. Deploy using: gcloud builds submit --config cloudbuild-git.yaml"

echo -e "\n${YELLOW}⚠️  Important Security Notes:${NC}"
echo -e "- Your .env.local file is gitignored and won't be pushed"
echo -e "- Secrets are stored securely in Google Secret Manager"
echo -e "- Never commit API keys or secrets to Git"
echo -e "- This setup script should only be run once per project"

echo -e "\n${GREEN}🎉 Secret setup completed successfully!${NC}"