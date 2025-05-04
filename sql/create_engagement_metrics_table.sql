-- SQL script to create the engagement_metrics table
-- This table stores user engagement data for Marvin's tweets

-- Create the engagement_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS engagement_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    engagement_type TEXT NOT NULL CHECK (engagement_type IN ('like', 'repost', 'reply', 'follow', 'mention')),
    tweet_id TEXT NOT NULL,
    tweet_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add indexes for common queries
    INDEX idx_user_id (user_id),
    INDEX idx_engagement_type (engagement_type),
    INDEX idx_created_at (created_at),
    INDEX idx_tweet_id (tweet_id)
);

-- Add a comment to the table
COMMENT ON TABLE engagement_metrics IS 'Stores user engagement data for Marvin''s tweets';

-- Add comments to the columns
COMMENT ON COLUMN engagement_metrics.id IS 'Unique identifier for the engagement record';
COMMENT ON COLUMN engagement_metrics.user_id IS 'Twitter user ID of the engaging user';
COMMENT ON COLUMN engagement_metrics.username IS 'Twitter username of the engaging user';
COMMENT ON COLUMN engagement_metrics.engagement_type IS 'Type of engagement (like, repost, reply, follow, mention)';
COMMENT ON COLUMN engagement_metrics.tweet_id IS 'ID of the tweet that was engaged with';
COMMENT ON COLUMN engagement_metrics.tweet_content IS 'Content of the tweet or reply';
COMMENT ON COLUMN engagement_metrics.created_at IS 'Timestamp when the engagement was recorded';

-- Create a view for recurring fans (users who engage frequently)
CREATE OR REPLACE VIEW recurring_fans AS
SELECT 
    user_id,
    username,
    COUNT(*) as engagement_count,
    array_agg(DISTINCT engagement_type) as engagement_types,
    MIN(created_at) as first_engagement,
    MAX(created_at) as last_engagement
FROM 
    engagement_metrics
WHERE 
    created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
    user_id, username
HAVING 
    COUNT(*) >= 3
ORDER BY 
    COUNT(*) DESC;

-- Create a view for daily engagement summary
CREATE OR REPLACE VIEW daily_engagement_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as day,
    engagement_type,
    COUNT(*) as count
FROM 
    engagement_metrics
GROUP BY 
    DATE_TRUNC('day', created_at), engagement_type
ORDER BY 
    day DESC, count DESC;
