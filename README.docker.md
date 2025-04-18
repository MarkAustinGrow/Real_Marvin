# Docker Setup for Marvin AI Agent

This document provides instructions for running the Marvin AI Agent using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory of the project. You can use the `.env.example` file as a template:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in your actual API keys and credentials:

```bash
nano .env
```

### 2. Building and Running the Container

To build and start the container in detached mode:

```bash
docker-compose up -d --build
```

To view the logs:

```bash
docker logs real-marvin
```

To follow the logs in real-time:

```bash
docker logs -f real-marvin
```

### 3. Stopping the Container

To stop the container:

```bash
docker-compose down
```

## Updating the Application

To update the application with the latest code:

```bash
git pull
docker-compose up -d --build
```

## Automatic Updates

You can set up a cron job to automatically update the application daily:

1. Create an update script:

```bash
nano update.sh
```

2. Add the following content:

```bash
#!/bin/bash
cd /path/to/Real-Marvin
git pull
docker-compose up -d --build
```

3. Make the script executable:

```bash
chmod +x update.sh
```

4. Add a cron job to run it daily:

```bash
crontab -e
```

5. Add the following line:

```
0 0 * * * /path/to/Real-Marvin/update.sh
```

## Troubleshooting

### Container fails to start

Check the logs for error messages:

```bash
docker logs real-marvin
```

### Missing environment variables

Make sure all required environment variables are set in the `.env` file.

### Database connection issues

Verify that the Supabase URL and key are correct in the `.env` file.
