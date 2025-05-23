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

-- Add comment to table
COMMENT ON TABLE x_accounts IS 'Stores X accounts to monitor for tweets';
