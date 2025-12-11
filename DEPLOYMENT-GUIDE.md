# GCP Deployment Guide - Medical AI Assistant

This guide will help you deploy your Medical AI Assistant to Google Cloud Platform with optimal cost settings.

## 📋 Prerequisites

### Required Tools
- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install)
- [Docker](https://docs.docker.com/get-docker/) (optional, for local testing)
- Git (for version control)

### Required Environment Variables
Set these environment variables before deployment:

```bash
# Required
export GOOGLE_API_KEY="your_google_api_key_here"
export SUPABASE_URL="https://your-project-id.supabase.co"
export SUPABASE_ANON_KEY="your_supabase_anon_key_here"

# Optional but recommended
export SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key_here"
```

## 🚀 Quick Deployment

### Option 1: Automated Setup (Recommended)
```bash
# Make the setup script executable (Linux/Mac)
chmod +x gcp-setup.sh

# Run the automated setup
./gcp-setup.sh
```

### Option 2: Manual Deployment
```bash
# 1. Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# 2. Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com

# 3. Create secrets
gcloud secrets create medical-assistant-secrets --data-file=<(echo '{}')

# 4. Add secret values
echo -n "$GOOGLE_API_KEY" | gcloud secrets versions add medical-assistant-secrets --data-file=-
# Repeat for other secrets...

# 5. Deploy using Cloud Build
gcloud builds submit --config cloudbuild-minimal.yaml
```

## 📁 Deployment Files Overview

| File | Purpose | Description |
|------|---------|-------------|
| `Dockerfile` | Container build | Multi-stage build for frontend + backend |
| `cloudbuild.yaml` | Full build config | Complete build with all features |
| `cloudbuild-minimal.yaml` | Minimal build config | Cost-optimized build (recommended) |
| `gcp-deploy.yaml` | Kubernetes config | Alternative deployment method |
| `gcp-setup.sh` | Automated setup | One-command deployment script |
| `validate-deployment.sh` | Validation | Pre-deployment checks |

## 🔧 Configuration Details

### Cost Optimization Settings
- **Scale to zero**: No charges when not in use
- **Minimal resources**: 1GB RAM, 1 vCPU
- **High concurrency**: 80 requests per instance
- **Efficient region**: us-central1 (cheapest)
- **CPU throttling**: Only allocate CPU during requests

### Expected Monthly Costs
- **Cloud Run**: $0-5/month (pay per request)
- **Container Registry**: ~$0.10/month
- **Secret Manager**: ~$0.06/month
- **Total**: ~$0.16-5.16/month

## 🔍 Pre-Deployment Validation

Run the validation script to check your configuration:

```bash
# Linux/Mac
chmod +x validate-deployment.sh
./validate-deployment.sh

# Windows (PowerShell)
bash validate-deployment.sh
```

## 🏥 Health Checks

Your deployed application includes several health endpoints:

- `GET /health` - Basic health check
- `GET /task-types` - Available AI task types
- `POST /ask` - Main AI interaction endpoint
- `POST /doctors/nearest` - Location-based doctor search

## 🔐 Security Configuration

### Secrets Management
All sensitive data is stored in Google Secret Manager:
- `GOOGLE_API_KEY` - For AI model access
- `SUPABASE_URL` - Database connection
- `SUPABASE_ANON_KEY` - Public database access
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database access

### Network Security
- HTTPS enforced by default
- CORS configured for frontend access
- Non-root container user
- Minimal attack surface

## 📊 Monitoring and Logs

### Viewing Logs
```bash
# View application logs
gcloud run services logs read medical-assistant --region us-central1

# Follow logs in real-time
gcloud run services logs tail medical-assistant --region us-central1
```

### Structured Logging
The application uses structured JSON logging for:
- Request/response tracking
- Error monitoring
- Tool execution tracking
- Emergency detection
- Performance metrics

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# Rebuild and deploy
gcloud builds submit --config cloudbuild-minimal.yaml

# Or use the setup script
./gcp-setup.sh
```

### Managing Secrets
```bash
# Update a secret
echo -n "new_value" | gcloud secrets versions add medical-assistant-secrets --data-file=-

# List secret versions
gcloud secrets versions list medical-assistant-secrets
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
gcloud builds log [BUILD_ID]

# Common fixes:
# 1. Ensure all environment variables are set
# 2. Check Docker syntax in Dockerfile
# 3. Verify package.json and requirements.txt
```

#### Deployment Failures
```bash
# Check service status
gcloud run services describe medical-assistant --region us-central1

# Common fixes:
# 1. Verify secrets are created and accessible
# 2. Check health endpoint responds
# 3. Ensure proper port configuration (8000)
```

#### Runtime Errors
```bash
# View recent logs
gcloud run services logs read medical-assistant --region us-central1 --limit 50

# Common fixes:
# 1. Check environment variable values
# 2. Verify external API connectivity (Google AI, Supabase)
# 3. Check database permissions
```

### Getting Help
1. Check the application logs first
2. Verify all environment variables are set correctly
3. Ensure external services (Supabase, Google AI) are accessible
4. Review the structured logs for specific error patterns

## 🎯 Performance Optimization

### Cold Start Reduction
- Minimal container size
- Efficient dependency installation
- Health check optimization
- Keep-alive requests

### Cost Monitoring
```bash
# Monitor usage
gcloud run services describe medical-assistant --region us-central1 --format="value(status.traffic)"

# Set up billing alerts in GCP Console
```

## 🔒 Production Checklist

- [ ] All environment variables configured
- [ ] Secrets properly stored in Secret Manager
- [ ] Health checks responding
- [ ] HTTPS enforced
- [ ] Monitoring and alerting configured
- [ ] Backup strategy for Supabase data
- [ ] Rate limiting configured (if needed)
- [ ] Domain name configured (optional)

## 📞 Support

For deployment issues:
1. Run `validate-deployment.sh` first
2. Check the troubleshooting section
3. Review GCP documentation for Cloud Run
4. Check application logs for specific errors

Your Medical AI Assistant is now ready for production deployment on GCP! 🎉