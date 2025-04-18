#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Pull the latest changes from the repository
echo "Pulling latest changes from the repository..."
git pull

# Rebuild and restart the Docker container
echo "Rebuilding and restarting the Docker container..."
docker-compose up -d --build

echo "Update completed successfully!"
