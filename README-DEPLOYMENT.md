# Medical AI Assistant - GCP Minimal Cost Deployment

Deploy your Medical AI Assistant on Google Cloud Platform with the lowest possible cost configuration.

## 💰 Expected Monthly Costs

| Usage Level | Requests/Month | Estimated Cost |
|-------------|----------------|----------------|
| **Minimal** | 100 | **$0.00** (Free tier) |
| **Light** | 1,000 | **$0.00** (Free tier) |
| **Moderate** | 10,000 | **$0.16** |
| **Heavy** | 100,000 | **$1.60** |

*Additional fixed costs: Container Registry (~$0.10/month), Secret Manager (~$0.06/month)*

## 🚀 Quick Deployment

### Prerequisites
1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Environment variables** set:
   ```bash
   export GOOGLE_API_KEY="your-google-api-key"
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_ANON_KEY="your-supabase-anon-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"  # optional
   ```

### One-Command Deployment
```bash
# Make script executable (Linux/Mac)
chmod +x gcp-setup-minimal.sh

# Deploy
./gcp-setup-minimal.sh
```

### Manual Deployment Steps

#### 1. Setup Project
```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com
```

#### 2. Create Secrets
```bash
# Create secrets for environment variables
echo '{"google-api-key":"'$GOOGLE_API_KEY'","supabase-url":"'$SUPABASE_URL'","supabase-anon-key":"'$SUPABASE_ANON_KEY'"}' | \
gcloud secrets create medical-assistant-secrets --data-file=-
```

#### 3. Build and Deploy
```bash
# Build and deploy with minimal cost configuration
gcloud builds submit --config cloudbuild-minimal.yaml
```

## 🎯 Cost Optimization Features

### ✅ Enabled Optimizations
- **Scale to Zero**: No charges when not in use
- **Minimal Resources**: 1 vCPU, 1GB RAM (lowest for AI workload)
- **High Concurrency**: 80 requests per instance
- **CPU Throttling**: CPU only allocated during requests
- **Cheapest Region**: us-central1
- **Efficient Build**: Smaller machine type, cached builds

### 📊 Resource Configuration
```yaml
Resources:
  CPU: 1 vCPU (throttled)
  Memory: 1GB
  Min Instances: 0 (scale to zero)
  Max Instances: 10
  Concurrency: 80 requests/instance
  Timeout: 5 minutes
```

## 📈 Cost Monitoring

### Monitor Current Costs
```bash
# Check service status and configuration
gcloud run services describe medical-assistant --region us-central1

# Monitor costs with our custom script
python gcp-cost-monitor.py --project YOUR_PROJECT_ID --requests 1000
```

### View Usage Metrics
```bash
# View service logs
gcloud run services logs read medical-assistant --region us-central1

# Get service URL
gcloud run services describe medical-assistant --region us-central1 --format 'value(status.url)'
```

## 🔧 Management Commands

### Update Deployment
```bash
# Rebuild and deploy
gcloud builds submit --config cloudbuild-minimal.yaml
```

### Update Secrets
```bash
# Update environment variables
echo '{"google-api-key":"NEW_KEY","supabase-url":"NEW_URL"}' | \
gcloud secrets versions add medical-assistant-secrets --data-file=-
```

### Scale Configuration
```bash
# Update service configuration
gcloud run services update medical-assistant \
    --region us-central1 \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 20
```

### Delete Service
```bash
# Delete the service (stops all charges)
gcloud run services delete medical-assistant --region us-central1

# Delete secrets
gcloud secrets delete medical-assistant-secrets
```

## 🚨 Cost Alerts

### Set Up Billing Alerts
1. Go to [Google Cloud Console > Billing](https://console.cloud.google.com/billing)
2. Select your billing account
3. Go to "Budgets & alerts"
4. Create budget with $5 threshold
5. Set up email notifications

### Monitor with Script
```bash
# Run cost monitoring weekly
python gcp-cost-monitor.py --project YOUR_PROJECT_ID --requests 5000

# Set up cron job for regular monitoring
echo "0 9 * * 1 cd /path/to/project && python gcp-cost-monitor.py --project YOUR_PROJECT_ID" | crontab -
```

## 🔍 Troubleshooting

### Common Issues

#### Build Fails
```bash
# Check build logs
gcloud builds list --limit 5

# View specific build log
gcloud builds log BUILD_ID
```

#### Service Not Responding
```bash
# Check service status
gcloud run services describe medical-assistant --region us-central1

# View recent logs
gcloud run services logs read medical-assistant --region us-central1 --limit 50
```

#### High Costs
```bash
# Check actual usage
python gcp-cost-monitor.py --project YOUR_PROJECT_ID

# Reduce resources if needed
gcloud run services update medical-assistant \
    --region us-central1 \
    --memory 512Mi \
    --concurrency 100
```

## 🎯 Further Cost Optimization

### If Usage Grows
1. **Increase Concurrency**: Handle more requests per instance
2. **Optimize Code**: Reduce request processing time
3. **Cache Responses**: Use Cloud Memorystore for frequent queries
4. **Batch Processing**: Group similar requests

### Alternative Architectures
- **Cloud Functions**: For very low usage (< 100 requests/month)
- **Compute Engine**: For consistent high usage (> 1M requests/month)
- **GKE Autopilot**: For complex multi-service applications

## 📞 Support

### Getting Help
1. **Check logs first**: `gcloud run services logs read medical-assistant --region us-central1`
2. **Verify configuration**: `gcloud run services describe medical-assistant --region us-central1`
3. **Test health endpoint**: `curl https://YOUR_SERVICE_URL/health`
4. **Monitor costs**: `python gcp-cost-monitor.py --project YOUR_PROJECT_ID`

### Useful Links
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GCP Free Tier](https://cloud.google.com/free)
- [Cost Management](https://cloud.google.com/cost-management)

---

**🎉 Your Medical AI Assistant is now running on GCP with minimal cost configuration!**

The service will automatically scale to zero when not in use, ensuring you only pay for actual usage. With the free tier, you can handle up to 2 million requests per month at no cost!