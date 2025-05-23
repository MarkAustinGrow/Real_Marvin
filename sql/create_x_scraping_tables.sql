-- SQL script to create all tables for X account monitoring and tweet scraping

-- Create table for storing X accounts to monitor
CREATE TABLE IF NOT EXISTS x_accounts (
    id SERIAL PRIMARY KEY,
    handle TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'x',
    priority INTEGER NOT NULL DEFAULT 3,
    activity_level TEXT NOT NULL DEFAULT 'medium',
    last_checked TIMESTAMP WITH TIME ZONE,
    next_check_date TIMESTAMP WITH TIME ZONE,
    last_tweet_date TIMESTAMP WITH TIME ZONE,
    tweets_per_week FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on handle for faster lookups
CREATE INDEX IF NOT EXISTS idx_x_accounts_handle ON x_accounts(handle);

-- Create index on next_check_date for faster queries
CREATE INDEX IF NOT EXISTS idx_x_accounts_next_check_date ON x_accounts(next_check_date);

-- Add comment to table
COMMENT ON TABLE x_accounts IS 'Stores X accounts to monitor for tweets';

-- Create table for storing cached tweets
CREATE TABLE IF NOT EXISTS tweets_cache (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
    tweet_id TEXT NOT NULL,
    tweet_text TEXT,
    tweet_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    engagement_score FLOAT,
    summary TEXT,
    vibe_tags TEXT,
    embedding_vector VECTOR(1536),
    processed_at TIMESTAMP WITH TIME ZONE,
    public_metrics JSONB,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    memory_ids TEXT[],
    UNIQUE(account_id, tweet_id)
);

-- Create index on account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tweets_cache_account_id ON tweets_cache(account_id);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_tweets_cache_created_at ON tweets_cache(created_at);

-- Create index on engagement_score for faster sorting
CREATE INDEX IF NOT EXISTS idx_tweets_cache_engagement_score ON tweets_cache(engagement_score DESC);

-- Add comment to table
COMMENT ON TABLE tweets_cache IS 'Stores cached tweets from monitored X accounts';

-- Create table for storing accounts that need review
CREATE TABLE IF NOT EXISTS accounts_to_review (
    id SERIAL PRIMARY KEY,
    handle TEXT NOT NULL UNIQUE,
    error_message TEXT,
    error_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_to_review_status ON accounts_to_review(status);

-- Add comment to table
COMMENT ON TABLE accounts_to_review IS 'Stores X accounts that encountered errors and need manual review';

-- Create table for storing API usage statistics
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    calls_made INTEGER NOT NULL DEFAULT 0,
    daily_limit INTEGER NOT NULL DEFAULT 0,
    reset_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_date ON api_usage_stats(date);

-- Add comment to table
COMMENT ON TABLE api_usage_stats IS 'Stores daily API usage statistics for rate limiting';

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_x_accounts_updated_at
BEFORE UPDATE ON x_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
