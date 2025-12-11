@echo off
echo 🚀 Deploying Medical AI Assistant from Git

REM Check gcloud authentication
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Not authenticated with gcloud
    echo Please run: gcloud auth login
    pause
    exit /b 1
)

REM Get project ID
for /f %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i
if "%PROJECT_ID%"=="" (
    echo No project set. Please set your project:
    echo gcloud config set project YOUR_PROJECT_ID
    pause
    exit /b 1
)

echo ✅ Using project: %PROJECT_ID%

echo 🔍 Checking if secrets exist in Secret Manager...

REM Check if required secrets exist
gcloud secrets describe google-api-key >nul 2>&1
if errorlevel 1 (
    echo ❌ Missing secret: google-api-key
    echo Please run setup-secrets.bat first
    pause
    exit /b 1
)

gcloud secrets describe supabase-url >nul 2>&1
if errorlevel 1 (
    echo ❌ Missing secret: supabase-url
    echo Please run setup-secrets.bat first
    pause
    exit /b 1
)

gcloud secrets describe supabase-anon-key >nul 2>&1
if errorlevel 1 (
    echo ❌ Missing secret: supabase-anon-key
    echo Please run setup-secrets.bat first
    pause
    exit /b 1
)

gcloud secrets describe supabase-service-role-key >nul 2>&1
if errorlevel 1 (
    echo ❌ Missing secret: supabase-service-role-key
    echo Please run setup-secrets.bat first
    pause
    exit /b 1
)

echo ✅ All required secrets found in Secret Manager

echo 🔧 Enabling required APIs...
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com

echo ✅ APIs enabled

echo 🔨 Building and deploying from Git...
gcloud builds submit --config cloudbuild-git.yaml --machine-type e2-standard-2 --disk-size 50GB

if errorlevel 1 (
    echo ❌ Deployment failed
    echo Check build logs for details
    pause
    exit /b 1
)

echo ✅ Deployment successful!

REM Get the service URL
for /f %%i in ('gcloud run services describe medical-assistant --region us-central1 --format="value(status.url)"') do set SERVICE_URL=%%i

echo 🌐 Your application is available at:
echo %SERVICE_URL%

echo 🔍 Testing deployment...
timeout /t 10 /nobreak >nul

REM Test health endpoint
curl -f "%SERVICE_URL%/health" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Health check failed, service might still be starting
    echo Check logs: gcloud run services logs read medical-assistant --region us-central1
) else (
    echo ✅ Health check passed!
)

echo.
echo 🎉 Git-based deployment completed successfully!
pause