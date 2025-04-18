#!/bin/bash

# This script updates the Marvin AI Agent on the Linode server

echo "Updating Marvin AI Agent on Linode server..."

# SSH into the Linode server and run the update commands
ssh root@172.236.12.41 << 'EOF'
  # Navigate to the project directory
  cd /opt/real-marvin

  # Stop the current Docker container
  echo "Stopping the current Docker container..."
  docker-compose down

  # Pull the latest changes from the repository
  echo "Pulling the latest changes from the repository..."
  git pull

  # Install new dependencies
  echo "Installing new dependencies..."
  npm install

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

echo "Update completed successfully!"
