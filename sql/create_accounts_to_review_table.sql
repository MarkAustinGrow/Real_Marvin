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
