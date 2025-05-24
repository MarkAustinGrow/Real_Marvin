@echo off
echo Optimizing Account Monitoring Tiers...
echo.

cd /d "%~dp0"

echo Compiling TypeScript...
npx tsc

if %errorlevel% neq 0 (
    echo Failed to compile TypeScript
    pause
    exit /b 1
)

echo Running account tier optimization...
node dist/src/optimize-account-tiers.js

echo.
echo Optimization completed. Check the output above for results.
pause
