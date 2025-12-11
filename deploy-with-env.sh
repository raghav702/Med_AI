#!/bin/bash
set -e

echo "🚀 Deploying Medical AI Assistant to GCP using .env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📁 Loading environment variables from .env.local...${NC}"
    
    # Export variables needed for deployment
    export GOOGLE_API_KEY=$(grep "^GOOGLE_API_KEY=" .env.local | cut -d '=' -f2)
    export SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.local | cut -d '=' -f2)
    export SUPABASE_ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2)
    export SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2)
    
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env.local file not found${NC}"
    exit 1
fi

# Validate required variables
echo -e "${BLUE}🔍 Validating environment variables...${NC}"

if [ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "your_google_api_key_here" ]; then
    echo -e "${RED}❌ GOOGLE_API_KEY is not set or is placeholder${NC}"
    exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project-id.supabase.co" ]; then
    echo -e "${RED}❌ SUPABASE_URL is not set or is placeholder${NC}"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ] || [ "$SUPABASE_ANON_KEY" = "your_supabase_anon_key_here" ]; then
    echo -e "${RED}❌ SUPABASE_ANON_KEY is not set or is placeholder${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "your_supabase_service_role_key_here" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is not set or is placeholder${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are valid${NC}"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo -e "${YELLOW}Please install it from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get or set project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No project set. Please set your project:${NC}"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create secrets for environment variables
echo -e "${BLUE}🔐 Creating/updating secrets...${NC}"

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

# Create individual secrets (more secure than one combined secret)
create_or_update_secret "google-api-key" "$GOOGLE_API_KEY"
create_or_update_secret "supabase-url" "$SUPABASE_URL"
create_or_update_secret "supabase-anon-key" "$SUPABASE_ANON_KEY"
create_or_update_secret "supabase-service-role-key" "$SUPABASE_SERVICE_ROLE_KEY"

echo -e "${GREEN}✅ Secrets configured${NC}"

# Build and deploy
echo -e "${BLUE}🔨 Building and deploying application...${NC}"

# Submit build with minimal cost configuration
gcloud builds submit \
    --config cloudbuild-minimal.yaml \
    --machine-type e2-standard-2 \
    --disk-size 50GB \
    --substitutions _PROJECT_ID="$PROJECT_ID"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build and deployment successful!${NC}"
    
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
        
        # Show health response
        echo -e "${BLUE}Health check response:${NC}"
        curl -s "$SERVICE_URL/health" | python3 -m json.tool 2>/dev/null || curl -s "$SERVICE_URL/health"
        
    else
        echo -e "${YELLOW}⚠️  Health check failed, but deployment completed${NC}"
        echo -e "${YELLOW}The service might need a moment to start up${NC}"
        echo -e "${BLUE}You can check the logs with:${NC}"
        echo -e "gcloud run services logs read medical-assistant --region us-central1"
    fi
    
    # Cost optimization summary
    echo -e "\n${BLUE}💰 Cost Optimization Summary:${NC}"
    echo -e "${GREEN}✅ Configured to scale to zero when not in use${NC}"
    echo -e "${GREEN}✅ Using minimal resource allocation (1GB RAM, 1 vCPU)${NC}"
    echo -e "${GREEN}✅ High concurrency setting to reduce instance count${NC}"
    echo -e "${GREEN}✅ Using cheapest region (us-central1)${NC}"
    
    echo -e "\n${YELLOW}📊 Expected monthly costs (with minimal usage):${NC}"
    echo -e "   - Cloud Run: ~$0-5/month (pay per request)"
    echo -e "   - Container Registry: ~$0.10/month"
    echo -e "   - Secret Manager: ~$0.24/month (4 secrets)"
    echo -e "   - Total: ~$0.34-5.34/month"
    
    echo -e "\n${BLUE}📝 Useful commands:${NC}"
    echo -e "   View logs: gcloud run services logs read medical-assistant --region us-central1"
    echo -e "   Update service: ./deploy-with-env.sh"
    echo -e "   Delete service: gcloud run services delete medical-assistant --region us-central1"
    echo -e "   Test deployment: ./test-deployment.sh"
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    
else
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}Check the build logs for details:${NC}"
    echo -e "gcloud builds log --region=global"
    exit 1
fi