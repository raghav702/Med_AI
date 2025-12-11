@echo off
echo 🔐 Setting up GCP Secrets for Medical AI Assistant

REM Check if .env.local exists
if not exist ".env.local" (
    echo ❌ .env.local file not found
    echo Please create .env.local with your API keys first
    pause
    exit /b 1
)

echo 📁 Loading environment variables from .env.local...

REM Extract environment variables from .env.local
for /f "tokens=1,2 delims==" %%a in ('findstr "^GOOGLE_API_KEY=" .env.local') do set GOOGLE_API_KEY=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr "^VITE_SUPABASE_URL=" .env.local') do set SUPABASE_URL=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr "^VITE_SUPABASE_ANON_KEY=" .env.local') do set SUPABASE_ANON_KEY=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr "^SUPABASE_SERVICE_ROLE_KEY=" .env.local') do set SUPABASE_SERVICE_ROLE_KEY=%%b

echo 🔍 Validating environment variables...

if "%GOOGLE_API_KEY%"=="" (
    echo ❌ GOOGLE_API_KEY is not set
    pause
    exit /b 1
)

if "%SUPABASE_URL%"=="" (
    echo ❌ SUPABASE_URL is not set
    pause
    exit /b 1
)

if "%SUPABASE_ANON_KEY%"=="" (
    echo ❌ SUPABASE_ANON_KEY is not set
    pause
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ❌ SUPABASE_SERVICE_ROLE_KEY is not set
    pause
    exit /b 1
)

echo ✅ All required environment variables are valid

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

echo 🔧 Enabling Secret Manager API...
gcloud services enable secretmanager.googleapis.com

echo 🔐 Creating/updating secrets in Google Secret Manager...

REM Create or update secrets
echo Creating google-api-key secret...
echo %GOOGLE_API_KEY% | gcloud secrets create google-api-key --data-file=- 2>nul || (
    echo %GOOGLE_API_KEY% | gcloud secrets versions add google-api-key --data-file=-
)

echo Creating supabase-url secret...
echo %SUPABASE_URL% | gcloud secrets create supabase-url --data-file=- 2>nul || (
    echo %SUPABASE_URL% | gcloud secrets versions add supabase-url --data-file=-
)

echo Creating supabase-anon-key secret...
echo %SUPABASE_ANON_KEY% | gcloud secrets create supabase-anon-key --data-file=- 2>nul || (
    echo %SUPABASE_ANON_KEY% | gcloud secrets versions add supabase-anon-key --data-file=-
)

echo Creating supabase-service-role-key secret...
echo %SUPABASE_SERVICE_ROLE_KEY% | gcloud secrets create supabase-service-role-key --data-file=- 2>nul || (
    echo %SUPABASE_SERVICE_ROLE_KEY% | gcloud secrets versions add supabase-service-role-key --data-file=-
)

echo ✅ All secrets created successfully!
echo.
echo 📝 Next steps:
echo 1. Push your code to Git (secrets are now safely stored in GCP)
echo 2. Set up Cloud Build trigger or run manual deployment
echo 3. Deploy using: gcloud builds submit --config cloudbuild-git.yaml
echo.
echo ⚠️  Important Security Notes:
echo - Your .env.local file is gitignored and won't be pushed
echo - Secrets are stored securely in Google Secret Manager
echo - Never commit API keys or secrets to Git
echo - This setup script should only be run once per project
echo.
echo 🎉 Secret setup completed successfully!
pause