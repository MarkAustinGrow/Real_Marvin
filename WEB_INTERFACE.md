# Marvin AI Agent - Web Interface

This document provides information about the web interface for the Marvin AI Agent, which allows you to test tweet generation and posting outside of the scheduled times.

## Overview

The Marvin AI Agent now includes a web interface that provides:

1. A status dashboard showing when the next scheduled tweet will be posted
2. A test interface for generating and posting tweets on demand
3. The ability to preview tweets before posting them

## Accessing the Web Interface

The web interface is available at:

```
http://your-server-ip:3000
```

For example, if your Linode server IP is 172.236.12.41, the URL would be:

```
http://172.236.12.41:3000
```

## Authentication

The web interface is protected with basic authentication:

- **Username**: admin
- **Password**: marvin (default)

You can change the password by setting the `ADMIN_PASSWORD` environment variable in your `.env` file or in the Docker Compose configuration.

## Features

### Status Dashboard

The status dashboard shows:

- The current status of the Marvin AI Agent
- When the next scheduled tweet will be posted
- How much time remains until the next tweet

### Test Tweet Generation

You can generate and post test tweets:

1. Select a category from the dropdown menu
2. Click "Preview Tweet" to see how the tweet will look without posting it
3. Click "Post Test Tweet" to generate and post a tweet immediately

### Engagement Rules Management

The engagement rules section allows you to configure how Marvin responds to user interactions:

1. View existing engagement rules
2. Add new rules with the "Add Rule" button
3. Edit rule parameters:
   - Engagement Type (like, repost, reply, follow, mention, any)
   - Condition (count, verified, first_time, art_focused)
   - Threshold and timeframe for count-based conditions
   - Action (reply or log_only)
   - Priority (higher numbers take precedence)
4. Delete rules you no longer need
5. Save changes with the "Save Rules" button

Rules are evaluated in priority order, with the highest priority rule that matches being applied first.

### Categories

The following categories are available for tweet generation:

- Drip Drop
- Toolbox
- Neural Notes
- Field Notes
- Push Lab
- News

## Security Considerations

The web interface is protected with basic authentication, but for additional security:

1. Consider using a reverse proxy like Nginx with HTTPS
2. Restrict access to the web interface to trusted IP addresses
3. Use a strong password for the admin user
4. Consider setting up a firewall to restrict access to port 3000

## Troubleshooting

### Web Interface Not Accessible

If you cannot access the web interface:

1. Verify that the Docker container is running: `docker ps`
2. Check if port 3000 is exposed: `docker-compose ps`
3. Ensure your firewall allows traffic on port 3000
4. Check the logs for any errors: `docker logs real-marvin`

### Authentication Issues

If you're having trouble with authentication:

1. Make sure you're using the correct username (admin)
2. Check if the ADMIN_PASSWORD environment variable is set correctly
3. Try restarting the container: `docker-compose restart`

### Tweet Generation Errors

If you encounter errors when generating or posting tweets:

1. Check the browser console for any JavaScript errors
2. Look at the Docker logs for server-side errors: `docker logs real-marvin`
3. Verify that your API keys are correctly set in the `.env` file
