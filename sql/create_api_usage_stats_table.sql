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
