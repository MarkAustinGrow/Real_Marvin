@echo off
echo Testing API Call Logging System...
echo.

cd /d "%~dp0"

echo Compiling TypeScript...
npx tsc

if %errorlevel% neq 0 (
    echo Failed to compile TypeScript
    pause
    exit /b 1
)

echo Running API logging test...
node dist/src/test-api-logging.js

echo.
echo Test completed. Check the output above for results.
pause
