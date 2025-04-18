#!/bin/bash

# This script fixes Docker container issues on the Linode server

echo "Fixing Docker container issues on Linode server..."

# SSH into the Linode server and run the fix commands
ssh root@172.236.12.41 << 'EOF'
  # Navigate to the project directory
  cd /opt/real-marvin

  # Stop and remove the container and associated volumes
  echo "Stopping and removing the container..."
  docker-compose down -v

  # Remove any dangling images
  echo "Cleaning up Docker images..."
  docker system prune -f

  # Pull the latest changes
  echo "Pulling the latest changes..."
  git pull

  # Rebuild and restart the Docker container
  echo "Rebuilding and restarting the Docker container..."
  docker-compose up -d --build

  # Show the logs to verify the application is running correctly
  echo "Showing the logs to verify the application is running correctly..."
  docker logs real-marvin

  # Display the web interface URL
  echo ""
  echo "Web interface is available at: http://172.236.12.41:3000"
  echo "Username: admin"
  echo "Password: marvin (or the value of ADMIN_PASSWORD in .env)"
EOF

echo "Fix completed. If the issue persists, try the following manual steps on the server:"
echo "1. docker-compose down -v"
echo "2. docker system prune -f"
echo "3. docker volume prune -f"
echo "4. docker-compose up -d --build"
