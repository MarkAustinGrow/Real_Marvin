@echo off
echo 🔍 Testing Rate Limiting Improvements
echo ======================================

REM Check if Docker container is running
docker ps | findstr "real-marvin" >nul
if errorlevel 1 (
    echo ❌ Marvin container is not running
    echo Please start the container first with: docker start real-marvin
    exit /b 1
)

echo ✅ Marvin container is running
echo.

echo 📊 Checking recent logs for rate limiting improvements...
echo.

REM Check for smart scheduling
echo 🕐 Smart Scheduling:
docker logs real-marvin --tail 50 | findstr /i "smart peak off-peak overnight next.engagement.check"
echo.

REM Check for emergency quota mode
echo 🚨 Emergency Quota Protection:
docker logs real-marvin --tail 100 | findstr /i "emergency quota"
echo.

REM Check for rate limit handling
echo ⚠️  Rate Limit Handling:
docker logs real-marvin --tail 100 | findstr /i "rate.limit 429 skipping"
echo.

REM Check for API optimization
echo 🎯 API Call Optimization:
docker logs real-marvin --tail 100 | findstr /i "optimized expensive cached"
echo.

REM Check current engagement monitoring frequency
echo 📈 Current Engagement Monitoring:
docker logs real-marvin --tail 20 | findstr /i "engagement.monitoring"
echo.

echo 🔧 Recommendations:
echo 1. Monitor logs for 'Emergency quota mode activated' messages
echo 2. Look for 'Next engagement check in X minutes' with varying intervals
echo 3. Verify 'Skipping expensive engagement calls' messages
echo 4. Check that rate limit violations have stopped
echo.

echo 📋 To continue monitoring:
echo docker logs -f real-marvin ^| findstr /i "engagement quota rate.limit"

pause
