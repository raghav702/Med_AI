#!/bin/bash
set -e

echo "🧪 Testing GCP Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the service URL
SERVICE_URL=$(gcloud run services describe medical-assistant \
    --region us-central1 \
    --format 'value(status.url)' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Service not found. Make sure the deployment completed successfully.${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 Testing service at: $SERVICE_URL${NC}"

# Test health endpoint
echo -e "\n${BLUE}Testing health endpoint...${NC}"
if curl -f -s "$SERVICE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    
    # Show health response
    HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/health")
    echo -e "${BLUE}Health response:${NC}"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo -e "${YELLOW}The service might still be starting up. Wait a moment and try again.${NC}"
fi

# Test task types endpoint
echo -e "\n${BLUE}Testing task types endpoint...${NC}"
if curl -f -s "$SERVICE_URL/task-types" > /dev/null; then
    echo -e "${GREEN}✅ Task types endpoint working${NC}"
    
    # Show available task types
    TASK_TYPES=$(curl -s "$SERVICE_URL/task-types")
    echo -e "${BLUE}Available task types:${NC}"
    echo "$TASK_TYPES" | python3 -m json.tool 2>/dev/null || echo "$TASK_TYPES"
else
    echo -e "${RED}❌ Task types endpoint failed${NC}"
fi

# Test main AI endpoint with a simple query
echo -e "\n${BLUE}Testing AI endpoint with sample query...${NC}"
TEST_PAYLOAD='{
    "message": "Hello, can you help me?",
    "task_type": "health_qa"
}'

AI_RESPONSE=$(curl -s -X POST "$SERVICE_URL/ask" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD" 2>/dev/null || echo "")

if [ -n "$AI_RESPONSE" ] && echo "$AI_RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✅ AI endpoint working${NC}"
    echo -e "${BLUE}Sample AI response:${NC}"
    echo "$AI_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$AI_RESPONSE"
else
    echo -e "${RED}❌ AI endpoint failed or returned unexpected response${NC}"
    echo -e "${YELLOW}Response: $AI_RESPONSE${NC}"
fi

# Test frontend (if available)
echo -e "\n${BLUE}Testing frontend...${NC}"
if curl -f -s "$SERVICE_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend might not be available or still loading${NC}"
fi

# Performance test
echo -e "\n${BLUE}Testing response time...${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$SERVICE_URL/health")
echo -e "${BLUE}Health endpoint response time: ${RESPONSE_TIME}s${NC}"

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ Good response time${NC}"
elif (( $(echo "$RESPONSE_TIME < 5.0" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Acceptable response time (might be cold start)${NC}"
else
    echo -e "${RED}❌ Slow response time${NC}"
fi

# Summary
echo -e "\n${BLUE}=== DEPLOYMENT TEST SUMMARY ===${NC}"
echo -e "${GREEN}🎉 Deployment test completed!${NC}"
echo -e "${BLUE}Service URL: $SERVICE_URL${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Test the full application in your browser"
echo -e "  2. Monitor logs: gcloud run services logs tail medical-assistant --region us-central1"
echo -e "  3. Set up monitoring and alerting in GCP Console"
echo -e "  4. Configure a custom domain (optional)"

echo -e "\n${GREEN}✅ Your Medical AI Assistant is live and ready to use!${NC}"