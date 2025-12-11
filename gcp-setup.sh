#!/bin/bash
set -e

echo "🚀 Setting up Medical AI Assistant on GCP (Minimal Cost Configuration)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo -e "${YELLOW}Please install it from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if user is authenticated
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

# Check required environment variables
REQUIRED_VARS=("GOOGLE_API_KEY" "SUPABASE_URL" "SUPABASE_ANON_KEY")
OPTIONAL_VARS=("SUPABASE_SERVICE_ROLE_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

# Check optional variables and warn if missing
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠️  Optional variable $var is not set${NC}"
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}" | sed 's/^/   - /'
    echo -e "${YELLOW}Please set these variables and run again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create secrets for environment variables
echo -e "${BLUE}🔐 Creating secrets...${NC}"

# Create a temporary secrets file
SECRETS_FILE=$(mktemp)
cat > "$SECRETS_FILE" << EOF
{
  "google-api-key": "$GOOGLE_API_KEY",
  "supabase-url": "$SUPABASE_URL",
  "supabase-anon-key": "$SUPABASE_ANON_KEY",
  "supabase-service-role-key": "${SUPABASE_SERVICE_ROLE_KEY:-}"
}
EOF

# Create or update the secret
if gcloud secrets describe medical-assistant-secrets --quiet 2>/dev/null; then
    echo -e "${YELLOW}Secret exists, updating...${NC}"
    gcloud secrets versions add medical-assistant-secrets --data-file="$SECRETS_FILE"
else
    echo -e "${BLUE}Creating new secret...${NC}"
    gcloud secrets create medical-assistant-secrets --data-file="$SECRETS_FILE"
fi

# Clean up temporary file
rm "$SECRETS_FILE"
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
    if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed, but deployment completed${NC}"
        echo -e "${YELLOW}The service might need a moment to start up${NC}"
    fi
    
    # Cost optimization tips
    echo -e "\n${BLUE}💰 Cost Optimization Tips:${NC}"
    echo -e "${GREEN}✅ Configured to scale to zero when not in use${NC}"
    echo -e "${GREEN}✅ Using minimal resource allocation (1GB RAM, 1 vCPU)${NC}"
    echo -e "${GREEN}✅ High concurrency setting to reduce instance count${NC}"
    echo -e "${GREEN}✅ Using cheapest region (us-central1)${NC}"
    
    echo -e "\n${YELLOW}📊 Expected monthly costs (with minimal usage):${NC}"
    echo -e "   - Cloud Run: ~$0-5/month (pay per request)"
    echo -e "   - Container Registry: ~$0.10/month"
    echo -e "   - Secret Manager: ~$0.06/month"
    echo -e "   - Total: ~$0.16-5.16/month"
    
    echo -e "\n${BLUE}📝 Management commands:${NC}"
    echo -e "   View logs: gcloud run services logs read medical-assistant --region us-central1"
    echo -e "   Update service: gcloud builds submit --config cloudbuild-minimal.yaml"
    echo -e "   Delete service: gcloud run services delete medical-assistant --region us-central1"
    
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi