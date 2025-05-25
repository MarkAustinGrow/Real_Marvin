@echo off
echo Testing API Rate Settings Service...
echo.

cd /d "%~dp0"

echo Running TypeScript compilation...
npx tsc src/test-rate-settings.ts --outDir dist --target es2020 --module commonjs --moduleResolution node --esModuleInterop true --allowSyntheticDefaultImports true --strict false --skipLibCheck true

if %ERRORLEVEL% neq 0 (
    echo TypeScript compilation failed!
    pause
    exit /b 1
)

echo.
echo Running rate settings test...
node dist/src/test-rate-settings.js

if %ERRORLEVEL% neq 0 (
    echo Rate settings test failed!
    pause
    exit /b 1
)

echo.
echo Rate settings test completed successfully!
pause
