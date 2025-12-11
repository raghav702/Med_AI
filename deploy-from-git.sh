#!/bin/bash
set -e

echo "🚀 Deploying Medical AI Assistant from Git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# This script deploys from Git without needing local .env.local
# Secrets must be already set up in Google Secret Manager

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

# Check if secrets exist
echo -e "${BLUE}🔍 Checking if secrets exist in Secret Manager...${NC}"

REQUIRED_SECRETS=("google-api-key" "supabase-url" "supabase-anon-key" "supabase-service-role-key")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! gcloud secrets describe "$secret" --quiet 2>/dev/null; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing secrets in Secret Manager:${NC}"
    printf '%s\n' "${MISSING_SECRETS[@]}" | sed 's/^/   - /'
    echo -e "\n${YELLOW}Please run ./setup-secrets.sh first to create the secrets${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required secrets found in Secret Manager${NC}"

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Build and deploy using Git-safe configuration
echo -e "${BLUE}🔨 Building and deploying from Git...${NC}"

gcloud builds submit \
    --config cloudbuild-git.yaml \
    --machine-type e2-standard-2 \
    --disk-size 50GB

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe medical-assistant \
        --region us-central1 \
        --format 'value(status.url)')
    
    echo -e "${GREEN}🌐 Your application is available at:${NC}"
    echo -e "${BLUE}$SERVICE_URL${NC}"
    
    # Test the deployment
    echo -e "${BLUE}🔍 Testing deployment...${NC}"
    sleep 10  # Give the service a moment to start
    
    if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed, service might still be starting${NC}"
        echo -e "${BLUE}Check logs: gcloud run services logs read medical-assistant --region us-central1${NC}"
    fi
    
    echo -e "\n${GREEN}🎉 Git-based deployment completed successfully!${NC}"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}Check build logs for details${NC}"
    exit 1
fi