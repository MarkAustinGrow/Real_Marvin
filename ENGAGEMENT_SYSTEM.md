# Marvin AI Agent - Engagement System

This document outlines the engagement system for Marvin AI Agent, which enables Marvin to interact with users who engage with his content on Twitter.

## Overview

The engagement system allows Marvin to:

1. Track user engagements (likes, reposts, replies, follows, mentions)
2. Identify recurring fans and engagement patterns
3. Respond to engagements with Marvin's signature witty, sarcastic personality
4. Generate daily wrap-ups of engagement activity

## Components

### 1. GrokService

The `GrokService` is responsible for generating humorous responses in Marvin's voice. It connects to the Grok API (with OpenAI fallback) to create witty replies to user engagements.

**Key Features:**
- Connects to the X.AI Grok API (https://api.x.ai/v1/chat/completions)
- Uses the grok-3-latest model for generating responses
- Generates responses based on engagement context
- Maintains Marvin's unique personality and tone
- Falls back to OpenAI if Grok API is unavailable

### 2. EngagementService

The `EngagementService` tracks and processes user engagements, applying rules to determine when to respond.

**Key Features:**
- Logs engagement events to the database
- Detects recurring fans based on engagement frequency
- Applies rules to determine when to respond to engagements
- Generates daily wrap-ups of engagement activity

### 3. TwitterService Extensions

The `TwitterService` has been extended with methods to monitor and fetch engagements from Twitter.

**Key Features:**
- Fetches likes, reposts, and replies for specific tweets
- Monitors mentions and interactions
- Processes engagement data into a standardized format

### 4. EngagementScheduler

The `EngagementScheduler` manages the timing of engagement monitoring and daily wrap-ups.

**Key Features:**
- Schedules engagement monitoring at regular intervals (every 30 minutes)
- Schedules daily wrap-up posts at 9:00 PM
- Manages the timing of engagement-related activities

## Database Schema

The system uses the existing `engagement_metrics` table in the database to store engagement data.

**Table Structure:**
- `id`: Unique identifier for the engagement record
- `user_id`: Twitter user ID of the engaging user
- `username`: Twitter username of the engaging user
- `engagement_type`: Type of engagement (like, repost, reply, follow, mention)
- `tweet_id`: ID of the tweet that was engaged with
- `tweet_content`: Content of the tweet or reply
- `created_at`: Timestamp when the engagement was recorded

## Engagement Rules

The system uses a set of rules to determine when to respond to engagements:

1. **Like Rule**: Respond if a user has liked 3 or more tweets within 7 days
2. **Repost Rule**: Respond if a verified user reposts Marvin's content
3. **Follow Rule**: Respond if an art-focused user follows Marvin
4. **Reply Rule**: Respond to first-time replies from users

Rules are prioritized, with higher-priority rules taking precedence when multiple rules match.

## Daily Wrap-Ups

At the end of each day (9:00 PM), the system generates a wrap-up of the day's engagements, highlighting:

- Top engaging users
- Engagement counts by type
- Notable interactions

This wrap-up is posted as a tweet in Marvin's voice, with his signature sarcastic tone.

## Configuration

### API Configuration

To use the Grok API for generating humorous responses, add the following to your `.env` file:

```
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROK_API_ENDPOINT=https://api.x.ai/v1/chat/completions
```

The system will automatically fall back to using OpenAI if the Grok API key is not provided.

## Testing

The system includes a test script (`src/test-engagement.ts`) that demonstrates the engagement functionality:

```bash
npm run test-engagement <tweet_id>
```

This script:
1. Monitors engagements for a specific tweet
2. Generates a sample humorous reply
3. Detects recurring fans
4. Generates a daily wrap-up
5. Simulates an engagement and response

## Integration

The engagement system is integrated into the main application in `src/index.ts`, where the engagement scheduler is started alongside the regular tweet scheduling.

## Future Enhancements

Potential future enhancements to the engagement system include:

1. More sophisticated user profiling to better target responses
2. Enhanced analytics to track engagement effectiveness
3. Integration with other platforms beyond Twitter
4. A/B testing of different response styles
5. Customizable engagement rules through a web interface
