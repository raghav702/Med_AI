#!/bin/bash
set -e

echo "🔍 Validating GCP Deployment Configuration"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log info
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}Checking deployment files...${NC}"

# Check if required files exist
REQUIRED_FILES=(
    "Dockerfile"
    "cloudbuild.yaml"
    "cloudbuild-minimal.yaml"
    "gcp-deploy.yaml"
    "gcp-setup.sh"
    "package.json"
    "assistant_chatbot/backend/requirements.txt"
    "assistant_chatbot/backend/main.py"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "Found $file"
    else
        log_error "Missing required file: $file"
    fi
done

# Check environment variables
echo -e "\n${BLUE}Checking environment variables...${NC}"

REQUIRED_ENV_VARS=("GOOGLE_API_KEY" "SUPABASE_URL" "SUPABASE_ANON_KEY")
OPTIONAL_ENV_VARS=("SUPABASE_SERVICE_ROLE_KEY" "PROJECT_ID")

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set"
    else
        log_success "Environment variable $var is set"
    fi
done

for var in "${OPTIONAL_ENV_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log_warning "Optional environment variable $var is not set"
    else
        log_success "Environment variable $var is set"
    fi
done

# Check gcloud CLI
echo -e "\n${BLUE}Checking gcloud CLI...${NC}"
if command -v gcloud &> /dev/null; then
    log_success "gcloud CLI is installed"
    
    # Check authentication
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_success "gcloud is authenticated"
    else
        log_error "gcloud is not authenticated. Run: gcloud auth login"
    fi
    
    # Check project
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -n "$PROJECT_ID" ]; then
        log_success "gcloud project is set: $PROJECT_ID"
    else
        log_error "gcloud project is not set. Run: gcloud config set project YOUR_PROJECT_ID"
    fi
else
    log_error "gcloud CLI is not installed"
fi

# Check Docker
echo -e "\n${BLUE}Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    log_success "Docker is installed"
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
    else
        log_warning "Docker daemon is not running"
    fi
else
    log_warning "Docker is not installed (optional for Cloud Build)"
fi

# Validate Dockerfile syntax
echo -e "\n${BLUE}Validating Dockerfile...${NC}"
if [ -f "Dockerfile" ]; then
    # Check for common issues
    if grep -q "COPY package\*.json" Dockerfile; then
        log_success "Dockerfile uses proper package.json caching"
    else
        log_warning "Dockerfile might not be optimized for package.json caching"
    fi
    
    if grep -q "USER app" Dockerfile; then
        log_success "Dockerfile uses non-root user"
    else
        log_warning "Dockerfile might be running as root user"
    fi
    
    if grep -q "HEALTHCHECK" Dockerfile; then
        log_success "Dockerfile includes health check"
    else
        log_warning "Dockerfile missing health check"
    fi
fi

# Validate Cloud Build configuration
echo -e "\n${BLUE}Validating Cloud Build configuration...${NC}"
if [ -f "cloudbuild.yaml" ] && [ -f "cloudbuild-minimal.yaml" ]; then
    log_success "Both cloudbuild.yaml and cloudbuild-minimal.yaml exist"
    
    # Check for required substitutions
    if grep -q "\$PROJECT_ID" cloudbuild.yaml; then
        log_success "cloudbuild.yaml uses PROJECT_ID substitution"
    else
        log_warning "cloudbuild.yaml might be missing PROJECT_ID substitution"
    fi
else
    log_error "Missing Cloud Build configuration files"
fi

# Validate backend dependencies
echo -e "\n${BLUE}Validating backend dependencies...${NC}"
if [ -f "assistant_chatbot/backend/requirements.txt" ]; then
    # Check for essential dependencies
    REQUIRED_DEPS=("fastapi" "uvicorn" "pydantic")
    for dep in "${REQUIRED_DEPS[@]}"; do
        if grep -q "$dep" assistant_chatbot/backend/requirements.txt; then
            log_success "Found required dependency: $dep"
        else
            log_error "Missing required dependency: $dep"
        fi
    done
else
    log_error "Missing backend requirements.txt"
fi

# Validate frontend dependencies
echo -e "\n${BLUE}Validating frontend dependencies...${NC}"
if [ -f "package.json" ]; then
    # Check for build script
    if grep -q '"build"' package.json; then
        log_success "package.json has build script"
    else
        log_error "package.json missing build script"
    fi
    
    # Check for essential dependencies
    if grep -q '"react"' package.json; then
        log_success "Found React dependency"
    else
        log_warning "React dependency not found"
    fi
else
    log_error "Missing package.json"
fi

# Summary
echo -e "\n${BLUE}=== VALIDATION SUMMARY ===${NC}"
if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 All validations passed! Your deployment configuration looks good.${NC}"
    else
        echo -e "${YELLOW}⚠️  Validation completed with $WARNINGS warnings. Consider addressing them.${NC}"
    fi
    echo -e "${GREEN}✅ Ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}❌ Validation failed with $ERRORS errors and $WARNINGS warnings.${NC}"
    echo -e "${RED}Please fix the errors before deploying.${NC}"
    exit 1
fi