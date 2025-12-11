# Git-Based GCP Deployment Guide

This guide shows you how to securely deploy your Medical AI Assistant to GCP using Git, without exposing sensitive API keys.

## 🔒 **Security-First Approach**

✅ **What's Safe to Push to Git:**
- All deployment configuration files
- Docker configuration
- Application source code
- Build scripts (without secrets)

❌ **What Should NEVER be in Git:**
- `.env.local` (already gitignored)
- API keys or secrets
- Database credentials
- Any sensitive configuration

## 🚀 **Deployment Process**

### **Step 1: One-Time Secret Setup**

Before your first deployment, you need to securely store your secrets in Google Cloud Secret Manager:

```bash
# Make the script executable
chmod +x setup-secrets.sh

# Run the secret setup (uses your local .env.local)
./setup-secrets.sh
```

This script:
- Reads your `.env.local` file (which stays local)
- Creates secure secrets in Google Cloud Secret Manager
- Validates all required credentials

### **Step 2: Push to Git**

Now you can safely push everything to Git:

```bash
# Add all files (secrets are gitignored)
git add .

# Commit your changes
git commit -m "Add GCP deployment configuration"

# Push to your repository
git push origin main
```

### **Step 3: Deploy from Git**

Deploy your application using the Git-safe configuration:

```bash
# Make the deployment script executable
chmod +x deploy-from-git.sh

# Deploy from Git (no local secrets needed)
./deploy-from-git.sh
```

## 📁 **Deployment Files Overview**

| File | Purpose | Safe for Git? |
|------|---------|---------------|
| `cloudbuild-git.yaml` | Git-safe build configuration | ✅ Yes |
| `setup-secrets.sh` | One-time secret setup script | ✅ Yes |
| `deploy-from-git.sh` | Git-based deployment script | ✅ Yes |
| `.env.local` | Your local API keys | ❌ No (gitignored) |
| `Dockerfile` | Container configuration | ✅ Yes |

## 🔄 **Continuous Deployment Options**

### **Option 1: Manual Deployment**
```bash
# After pushing changes to Git
./deploy-from-git.sh
```

### **Option 2: Cloud Build Trigger (Recommended)**

Set up automatic deployment when you push to Git:

1. **Go to Google Cloud Console → Cloud Build → Triggers**
2. **Click "Create Trigger"**
3. **Configure:**
   - **Name:** `medical-assistant-deploy`
   - **Event:** Push to a branch
   - **Source:** Your GitHub repository
   - **Branch:** `^main$`
   - **Configuration:** Cloud Build configuration file
   - **Location:** `cloudbuild-git.yaml`

4. **Save the trigger**

Now every push to `main` branch will automatically deploy your app!

### **Option 3: GitHub Actions (Alternative)**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GCP
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Cloud SDK
      uses: google-github-actions/setup-gcloud@v0
      with:
        project_id: ${{ secrets.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true
    
    - name: Deploy to Cloud Run
      run: |
        gcloud builds submit --config cloudbuild-git.yaml
```

## 🔐 **Secret Management**

### **How Secrets Work:**
1. **Local Development:** Uses `.env.local` (gitignored)
2. **Production:** Uses Google Secret Manager (secure)
3. **Deployment:** References secrets by name, not value

### **Updating Secrets:**
```bash
# Update a secret value
echo -n "new_api_key_value" | gcloud secrets versions add google-api-key --data-file=-

# List secret versions
gcloud secrets versions list google-api-key
```

### **Viewing Secrets (for debugging):**
```bash
# View secret value (requires proper permissions)
gcloud secrets versions access latest --secret="google-api-key"
```

## 🧪 **Testing Your Deployment**

After deployment, test your application:

```bash
# Run the test script
./test-deployment.sh

# Or manually test endpoints
curl https://your-service-url/health
curl https://your-service-url/task-types
```

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **1. Secrets Not Found**
```bash
# Error: Secret "google-api-key" not found
# Solution: Run the setup script first
./setup-secrets.sh
```

#### **2. Build Fails**
```bash
# Check build logs
gcloud builds log [BUILD_ID]

# Common causes:
# - Missing dependencies in requirements.txt
# - Docker build errors
# - Insufficient permissions
```

#### **3. Service Won't Start**
```bash
# Check service logs
gcloud run services logs read medical-assistant --region us-central1

# Common causes:
# - Invalid secret values
# - Missing environment variables
# - Application startup errors
```

## 📊 **Monitoring and Maintenance**

### **View Logs:**
```bash
# Real-time logs
gcloud run services logs tail medical-assistant --region us-central1

# Recent logs
gcloud run services logs read medical-assistant --region us-central1 --limit 100
```

### **Update Deployment:**
```bash
# After making code changes
git add .
git commit -m "Update application"
git push origin main

# Then deploy
./deploy-from-git.sh
```

### **Rollback if Needed:**
```bash
# List revisions
gcloud run revisions list --service medical-assistant --region us-central1

# Rollback to previous revision
gcloud run services update-traffic medical-assistant --to-revisions REVISION_NAME=100 --region us-central1
```

## 💰 **Cost Optimization**

Your deployment is configured for minimal costs:
- **Scale to zero** when not in use
- **Minimal resources** (1GB RAM, 1 vCPU)
- **Pay per request** pricing model
- **Expected cost:** ~$0.34-5.34/month

## 🎯 **Best Practices**

1. **Never commit secrets** to Git
2. **Use separate environments** (dev/staging/prod)
3. **Monitor your costs** in GCP Console
4. **Set up alerting** for errors and costs
5. **Regular security updates** for dependencies
6. **Backup your secrets** securely

## 🆘 **Getting Help**

If you encounter issues:

1. **Check the logs** first
2. **Verify secrets** are properly set
3. **Test locally** before deploying
4. **Review GCP quotas** and permissions
5. **Check the troubleshooting section** above

## 🎉 **You're Ready!**

Your secure, Git-based deployment workflow is now set up. You can safely collaborate on your project without exposing sensitive credentials.

**Quick Start:**
1. `./setup-secrets.sh` (one time only)
2. `git push origin main`
3. `./deploy-from-git.sh`

Happy deploying! 🚀