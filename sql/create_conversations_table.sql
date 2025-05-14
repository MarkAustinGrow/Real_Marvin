-- Create conversations table for tracking tweet interactions and responses
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id TEXT NOT NULL UNIQUE,
    conversation_id TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    tweet_content TEXT,
    response_tweet_id TEXT,
    response_content TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_checked_at ON conversations(last_checked_at);

-- Description of fields:
-- id: Unique identifier for the conversation record
-- tweet_id: ID of the tweet that initiated the conversation (from Twitter)
-- conversation_id: ID of the conversation thread (from Twitter)
-- user_id: ID of the user who sent the tweet (from Twitter)
-- username: Username of the user who sent the tweet
-- tweet_content: Content of the tweet
-- response_tweet_id: ID of Marvin's response tweet (from Twitter)
-- response_content: Content of Marvin's response
-- is_processed: Flag indicating whether the tweet has been processed
-- created_at: Timestamp when the conversation record was created
-- responded_at: Timestamp when Marvin responded to the tweet
-- last_checked_at: Timestamp when the system last checked for replies in this conversation
