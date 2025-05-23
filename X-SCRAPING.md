# X Account Monitoring and Tweet Scraping

This feature allows Marvin to monitor X (formerly Twitter) accounts and cache their tweets for analysis. This can be useful for:

1. Keeping track of influential accounts in your industry
2. Analyzing engagement patterns
3. Identifying trending topics
4. Gathering inspiration for content creation
5. Monitoring competitors

## Features

- **Account Management**: Add, remove, and update X accounts to monitor
- **Tweet Caching**: Fetch and store tweets from monitored accounts
- **Engagement Analysis**: Calculate engagement scores for tweets
- **Scheduled Monitoring**: Automatically check accounts based on their activity level
- **Rate Limit Handling**: Smart handling of Twitter API rate limits
- **Web Interface**: Manage accounts and view tweets through the admin interface

## How It Works

### Account Monitoring

Accounts are monitored based on their activity level:

- **High Activity**: Checked daily
- **Medium Activity**: Checked every 3 days
- **Low Activity**: Checked weekly

The system keeps track of when each account was last checked and when it should be checked next.

### Tweet Caching

When an account is checked, the system:

1. Fetches recent tweets from the X API
2. Calculates engagement scores for each tweet
3. Stores the tweets in the database
4. Updates the account's last checked timestamp

### Engagement Scoring

Engagement scores are calculated using a weighted formula:

- Retweets: 1.5x weight
- Quotes: 1.2x weight
- Replies: 1.0x weight
- Likes: 0.8x weight

This provides a single metric to compare tweet performance.

## Database Schema

### x_accounts Table

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| handle | text | X handle (without @) |
| platform | text | Always 'x' for now, could support other platforms in future |
| priority | integer | Priority (1-5, 1 is highest) |
| activity_level | text | 'high', 'medium', or 'low' |
| last_checked | timestamp | When the account was last checked |
| next_check_date | timestamp | When the account should be checked next |
| last_tweet_date | timestamp | Date of the most recent tweet |
| tweets_per_week | float | Average tweets per week |

### tweets_cache Table

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| account_id | integer | Foreign key to x_accounts |
| tweet_id | text | X tweet ID |
| tweet_text | text | Full text of the tweet |
| tweet_url | text | URL to the tweet |
| created_at | timestamp | When the tweet was created |
| fetched_at | timestamp | When the tweet was fetched |
| engagement_score | float | Calculated engagement score |
| summary | text | Short summary of the tweet |
| vibe_tags | text | Comma-separated hashtags |
| embedding_vector | vector | Vector embedding for semantic search |
| processed_at | timestamp | When the tweet was processed |
| public_metrics | jsonb | Raw engagement metrics |
| archived | boolean | Whether the tweet is archived |
| memory_ids | text[] | IDs of related memories |

### accounts_to_review Table

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| handle | text | X handle (without @) |
| error_message | text | Error message |
| error_code | text | Error code |
| created_at | timestamp | When the account was added to review |
| status | text | 'pending', 'approved', or 'rejected' |

### api_usage_stats Table

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| date | date | Date of the stats |
| calls_made | integer | Number of API calls made |
| daily_limit | integer | Daily API call limit |
| reset_time | timestamp | When the rate limit resets |
| created_at | timestamp | When the record was created |

## Usage

### Command Line

You can use the command line scripts to manage accounts and fetch tweets:

```bash
# Process accounts that are due for checking
./test-account-monitor.sh process [batchSize]

# List all accounts
./test-account-monitor.sh list

# Add a new account
./test-account-monitor.sh add <handle> [priority] [activity_level]

# Remove an account
./test-account-monitor.sh remove <id>

# Update an account field
./test-account-monitor.sh update <id> <field> <value>

# Fetch tweets for an account
./test-account-monitor.sh fetch <id> [count]
```

### Web Interface

The web interface provides a user-friendly way to manage accounts and view tweets:

1. **Accounts Tab**: View all monitored accounts and add new ones
2. **Tweets Tab**: View cached tweets for a selected account
3. **Process Tab**: Manually trigger the account processing

### Scheduler

The account monitoring process can be scheduled to run automatically:

```bash
# Start the scheduler
./account-monitor-scheduler.sh
```

The scheduler will process accounts based on their next check date and then schedule itself to run again after a configurable interval.

## Configuration

Configuration options are available in the `.env` file:

```
# Account Monitor Configuration
ACCOUNT_MONITOR_ENABLED=true
ACCOUNT_MONITOR_BATCH_SIZE=10
ACCOUNT_MONITOR_INTERVAL_MINUTES=60
ACCOUNT_MONITOR_INCLUDE_REPLIES=true
ACCOUNT_MONITOR_INCLUDE_RETWEETS=true
ACCOUNT_MONITOR_TWEETS_PER_ACCOUNT=10
```

## API Endpoints

The following API endpoints are available for the web interface:

- `GET /api/account-monitor/accounts`: Get all accounts
- `POST /api/account-monitor/add`: Add a new account
- `POST /api/account-monitor/remove`: Remove an account
- `POST /api/account-monitor/update`: Update an account
- `GET /api/account-monitor/tweets/:accountId`: Get tweets for an account
- `POST /api/account-monitor/fetch-tweets`: Fetch tweets for an account
- `POST /api/account-monitor/process`: Process accounts

## Future Enhancements

Potential future enhancements include:

1. **Content Analysis**: Analyze tweet content for sentiment, topics, and trends
2. **Engagement Prediction**: Predict which tweets will get high engagement
3. **Content Recommendations**: Recommend content ideas based on trending topics
4. **Competitor Analysis**: Compare your engagement with competitors
5. **Automated Reporting**: Generate reports on account performance
6. **Multi-platform Support**: Extend to other social media platforms
