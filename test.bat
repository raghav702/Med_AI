@echo off
REM Test deployment script for Medical AI Assistant

setlocal enabledelayedexpansion

echo.
echo 🧪 Testing Medical AI Assistant Deployment
echo ==========================================

set /p SERVICE_URL="Enter your service URL (or press Enter for localhost:8080): "
if "%SERVICE_URL%"=="" set SERVICE_URL=http://localhost:8080

echo [INFO] Testing service at: %SERVICE_URL%

REM Test 1: Health Check
echo.
echo [TEST 1] Health Check...
curl -f -s "%SERVICE_URL%/health" > nul
if %errorlevel% equ 0 (
    echo [✅] Health check passed
) else (
    echo [❌] Health check failed
    goto end
)

REM Test 2: API Documentation
echo.
echo [TEST 2] API Documentation...
curl -f -s "%SERVICE_URL%/docs" > nul
if %errorlevel% equ 0 (
    echo [✅] API docs accessible
) else (
    echo [⚠️] API docs not accessible (may be expected)
)

REM Test 3: Frontend
echo.
echo [TEST 3] Frontend...
curl -f -s "%SERVICE_URL%/" > nul
if %errorlevel% equ 0 (
    echo [✅] Frontend accessible
) else (
    echo [❌] Frontend not accessible
)

REM Test 4: Task Types Endpoint
echo.
echo [TEST 4] Task Types API...
curl -f -s "%SERVICE_URL%/task-types" > nul
if %errorlevel% equ 0 (
    echo [✅] Task types API working
) else (
    echo [❌] Task types API failed
)

REM Test 5: Sample API Request (if service is running)
echo.
echo [TEST 5] Sample API Request...
echo {"message": "Hello", "task_type": "health_qa"} > temp_request.json
curl -f -s -X POST "%SERVICE_URL%/ask" ^
     -H "Content-Type: application/json" ^
     -d @temp_request.json > nul
if %errorlevel% equ 0 (
    echo [✅] API request successful
) else (
    echo [❌] API request failed (check environment variables)
)
del temp_request.json 2>nul

:end
echo.
echo 🎯 Testing completed!
echo.
echo 💡 If tests failed, check:
echo    - Service is running
echo    - Environment variables are set
echo    - Network connectivity
echo    - GCP secrets are configured
echo.
pause