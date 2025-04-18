@echo off
REM This script runs the Marvin AI Agent locally for testing on Windows

echo Starting Marvin AI Agent locally for testing...

REM Check if .env file exists
if not exist .env (
  echo Creating .env file from .env.example...
  copy .env.example .env
  echo Please edit the .env file with your API keys before continuing.
  exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

REM Build the TypeScript files
echo Building TypeScript files...
call npm run build

REM Set environment variables for local testing
set NODE_ENV=development
set WEB_PORT=3000
set ADMIN_PASSWORD=marvin

REM Run the application
echo Starting the application...
echo Web interface will be available at: http://localhost:3000
echo Username: admin
echo Password: marvin
echo.
echo Press Ctrl+C to stop the application
echo.

REM Start the application
call npm start
