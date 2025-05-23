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
