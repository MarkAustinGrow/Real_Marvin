#!/bin/bash

# This script runs the Marvin AI Agent locally for testing

echo "Starting Marvin AI Agent locally for testing..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please edit the .env file with your API keys before continuing."
  exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the TypeScript files
echo "Building TypeScript files..."
npm run build

# Set environment variables for local testing
export NODE_ENV=development
export WEB_PORT=3000
export ADMIN_PASSWORD=marvin

# Run the application
echo "Starting the application..."
echo "Web interface will be available at: http://localhost:3000"
echo "Username: admin"
echo "Password: marvin"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Start the application
npm start
