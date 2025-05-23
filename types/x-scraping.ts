/**
 * TypeScript interfaces for X account monitoring functionality
 */

/**
 * Represents an X account to monitor
 */
export interface XAccount {
  id: number;
  handle: string;
  platform: string;
  priority: number;
  last_checked: string | null;
  activity_level: 'high' | 'medium' | 'low';
  tweets_per_week: number;
  next_check_date: string | null;
  last_tweet_date: string | null;
}

/**
 * Represents a cached tweet from an X account
 */
export interface TweetCache {
  id: number;
  account_id: number;
  tweet_id: string;
  tweet_text: string | null;
  tweet_url: string | null;
  created_at: string | null;
  fetched_at: string;
  engagement_score: number | null;
  summary: string | null;
  vibe_tags: string | null;
  embedding_vector: any | null; // Vector type
  processed_at: string | null;
  public_metrics: string | null;
  archived: boolean;
  memory_ids: any[]; // JSONB type
}

/**
 * Represents an account that needs review due to errors
 */
export interface AccountToReview {
  id: number;
  handle: string;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
  status: 'pending' | 'fixed' | 'ignored';
  notes: string | null;
}

/**
 * Represents API usage statistics for rate limiting
 */
export interface ApiUsageStats {
  id: number;
  date: string;
  calls_made: number;
  daily_limit: number;
  reset_time: string | null;
  created_at: string;
}

/**
 * Represents rate limit information from the Twitter API
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  day?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}
