# X Account Scraping Integration Plan

This document outlines the step-by-step plan for integrating the X (Twitter) account monitoring functionality from the Marvin-Account-Monitor application into the main Real-Marvin codebase. This integration will allow us to consolidate all functionality onto a single VM, simplifying maintenance and reducing infrastructure costs.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Integration Phases](#integration-phases)
3. [Phase 1: Database Schema Integration](#phase-1-database-schema-integration)
4. [Phase 2: Core Service Implementation](#phase-2-core-service-implementation)
5. [Phase 3: Scheduler Implementation](#phase-3-scheduler-implementation)
6. [Phase 4: Web Interface Integration](#phase-4-web-interface-integration)
7. [Phase 5: Testing and Deployment](#phase-5-testing-and-deployment)
8. [Technical Considerations](#technical-considerations)
9. [Rollback Plan](#rollback-plan)

## Project Overview

### Current State

- **Marvin-Account-Monitor**: A standalone Node.js application that monitors X accounts and caches their recent tweets in Supabase.
- **Real-Marvin**: The main application that generates content, interacts with social media, and maintains Marvin's blog.

### Integration Goals

1. Port all functionality from Marvin-Account-Monitor to Real-Marvin
2. Maintain all existing features and capabilities
3. Ensure seamless integration with minimal disruption
4. Improve data flow between tweet monitoring and content generation
5. Consolidate infrastructure onto a single VM

## Integration Phases

The integration will be completed in five phases:

1. Database Schema Integration
2. Core Service Implementation
3. Scheduler Implementation
4. Web Interface Integration
5. Testing and Deployment

## Phase 1: Database Schema Integration

### Step 1.1: Create SQL Migration Scripts

Create SQL scripts to add the necessary tables to the existing Supabase database:

```sql
-- Create the x_accounts table
CREATE TABLE IF NOT EXISTS x_accounts (
  id SERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  platform TEXT DEFAULT 'x',
  priority INTEGER DEFAULT 3,
  last_checked TIMESTAMP,
  activity_level TEXT DEFAULT 'medium',
  tweets_per_week FLOAT DEFAULT 0,
  next_check_date TIMESTAMP,
  last_tweet_date TIMESTAMP
);

-- Create the tweets_cache table
CREATE TABLE IF NOT EXISTS tweets_cache (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES x_accounts(id) ON DELETE CASCADE,
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT,
  tweet_url TEXT,
  created_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW(),
  engagement_score FLOAT DEFAULT 0,
  summary TEXT,
  vibe_tags JSONB DEFAULT '[]',
  processed_at TIMESTAMP,
  public_metrics JSONB DEFAULT '{}'
);

-- Create the accounts_to_review table
CREATE TABLE IF NOT EXISTS accounts_to_review (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  notes TEXT
);

-- Create the api_usage_stats table
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  calls_made INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 500,
  reset_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tweets_cache_account_id ON tweets_cache(account_id);
CREATE INDEX IF NOT EXISTS idx_tweets_cache_created_at ON tweets_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_to_review_status ON accounts_to_review(status);
CREATE INDEX IF NOT EXISTS idx_x_accounts_next_check_date ON x_accounts(next_check_date);
CREATE INDEX IF NOT EXISTS idx_x_accounts_activity_level ON x_accounts(activity_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_stats_date ON api_usage_stats(date);
```

### Step 1.2: Create Database Migration Script

Create a TypeScript script to execute the SQL migrations:

```typescript
// src/db-migrations/x-scraping-migration.ts
import { SupabaseService } from '../services/supabase/SupabaseService';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting X-scraping database migration...');
    
    const supabaseService = SupabaseService.getInstance();
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'x-scraping-schema.sql'), 
      'utf8'
    );
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      const { error } = await supabaseService.client.rpc('exec_sql', {
        sql_query: statement + ';'
      });
      
      if (error) {
        console.error('Error executing SQL statement:', error);
        console.error('Statement:', statement);
        throw error;
      }
    }
    
    console.log('X-scraping database migration completed successfully');
  } catch (error) {
    console.error('Error running X-scraping migration:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
```

### Step 1.3: Create Migration Test Script

Create a script to test the database migration:

```typescript
// src/test-x-scraping-migration.ts
import { runMigration } from './db-migrations/x-scraping-migration';
import { SupabaseService } from '../services/supabase/SupabaseService';

async function testMigration() {
  try {
    // Run the migration
    await runMigration();
    
    // Test that the tables were created
    const supabaseService = SupabaseService.getInstance();
    
    // Test x_accounts table
    const { data: xAccounts, error: xAccountsError } = await supabaseService.client
      .from('x_accounts')
      .select('*')
      .limit(1);
    
    if (xAccountsError && xAccountsError.code !== 'PGRST116') {
      console.error('Error testing x_accounts table:', xAccountsError);
    } else {
      console.log('x_accounts table created successfully');
    }
    
    // Test tweets_cache table
    const { data: tweetsCache, error: tweetsCacheError } = await supabaseService.client
      .from('tweets_cache')
      .select('*')
      .limit(1);
    
    if (tweetsCacheError && tweetsCacheError.code !== 'PGRST116') {
      console.error('Error testing tweets_cache table:', tweetsCacheError);
    } else {
      console.log('tweets_cache table created successfully');
    }
    
    // Test accounts_to_review table
    const { data: accountsToReview, error: accountsToReviewError } = await supabaseService.client
      .from('accounts_to_review')
      .select('*')
      .limit(1);
    
    if (accountsToReviewError && accountsToReviewError.code !== 'PGRST116') {
      console.error('Error testing accounts_to_review table:', accountsToReviewError);
    } else {
      console.log('accounts_to_review table created successfully');
    }
    
    // Test api_usage_stats table
    const { data: apiUsageStats, error: apiUsageStatsError } = await supabaseService.client
      .from('api_usage_stats')
      .select('*')
      .limit(1);
    
    if (apiUsageStatsError && apiUsageStatsError.code !== 'PGRST116') {
      console.error('Error testing api_usage_stats table:', apiUsageStatsError);
    } else {
      console.log('api_usage_stats table created successfully');
    }
    
    console.log('Migration test completed');
  } catch (error) {
    console.error('Error testing migration:', error);
  }
}

testMigration();
```

## Phase 2: Core Service Implementation

### Step 2.1: Create Types

Create TypeScript interfaces for the data structures:

```typescript
// types/x-scraping.ts
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

export interface TweetCache {
  id: number;
  account_id: number;
  tweet_id: string;
  tweet_text: string;
  tweet_url: string;
  created_at: string;
  fetched_at: string;
  engagement_score: number;
  summary: string;
  vibe_tags: string[];
  processed_at: string;
  public_metrics: Record<string, any>;
}

export interface AccountToReview {
  id: number;
  handle: string;
  error_message: string;
  error_code: string;
  created_at: string;
  status: 'pending' | 'fixed' | 'ignored';
  notes: string | null;
}

export interface ApiUsageStats {
  id: number;
  date: string;
  calls_made: number;
  daily_limit: number;
  reset_time: string | null;
  created_at: string;
}

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
```

### Step 2.2: Create Twitter Monitor Service

Create a service to handle Twitter API interactions:

```typescript
// services/monitoring/TwitterMonitorService.ts
import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { RateLimitInfo, TweetCache } from '../../types/x-scraping';

export class TwitterMonitorService {
  private static instance: TwitterMonitorService;
  private twitterClient: TwitterApi;
  private readOnlyClient: TwitterApi;
  private userIdCache: Map<string, string> = new Map();
  private readonly USER_CACHE_FILE: string;
  
  private constructor() {
    this.twitterClient = new TwitterApi(config.twitter.bearerToken);
    this.readOnlyClient = this.twitterClient.readOnly;
    this.USER_CACHE_FILE = path.join(__dirname, '..', '..', 'cache', 'user_id_cache.json');
    this.loadUserIdCache();
  }
  
  public static getInstance(): TwitterMonitorService {
    if (!TwitterMonitorService.instance) {
      TwitterMonitorService.instance = new TwitterMonitorService();
    }
    return TwitterMonitorService.instance;
  }
  
  // Load user ID cache from file
  private loadUserIdCache(): void {
    try {
      if (fs.existsSync(this.USER_CACHE_FILE)) {
        const cacheData = JSON.parse(fs.readFileSync(this.USER_CACHE_FILE, 'utf8'));
        Object.entries(cacheData).forEach(([handle, id]) => {
          this.userIdCache.set(handle, id as string);
        });
        console.log(`Loaded ${this.userIdCache.size} user IDs from cache.`);
      }
    } catch (error) {
      console.error('Error loading user ID cache:', error);
    }
  }
  
  // Save user ID cache to file
  private saveUserIdCache(): void {
    try {
      // Create cache directory if it doesn't exist
      const cacheDir = path.dirname(this.USER_CACHE_FILE);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      const cacheData: Record<string, string> = {};
      this.userIdCache.forEach((id, handle) => {
        cacheData[handle] = id;
      });
      fs.writeFileSync(this.USER_CACHE_FILE, JSON.stringify(cacheData, null, 2));
      console.log(`Saved ${this.userIdCache.size} user IDs to cache.`);
    } catch (error) {
      console.error('Error saving user ID cache:', error);
    }
  }
  
  // Get user ID from handle (with caching)
  public async getUserId(handle: string): Promise<string | null> {
    // Check cache first
    if (this.userIdCache.has(handle)) {
      return this.userIdCache.get(handle) || null;
    }
    
    // If not in cache, fetch from API
    try {
      const user = await this.readOnlyClient.v2.userByUsername(handle);
      
      if (!user || !user.data) {
        console.error(`User @${handle} not found.`);
        return null;
      }
      
      const userId = user.data.id;
      
      // Add to cache
      this.userIdCache.set(handle, userId);
      
      // Save cache periodically (every 10 new entries)
      if (this.userIdCache.size % 10 === 0) {
        this.saveUserIdCache();
      }
      
      return userId;
    } catch (error: any) {
      console.error(`Error fetching user ID for @${handle}:`, error);
      
      // Handle rate limit errors
      if (error.code === 429) {
        throw error; // Let the caller handle rate limits
      }
      
      // Handle validation errors (username format/length)
      if (error.code === 400 && 
          error.errors && 
          error.errors.some((e: any) => e.message && e.message.includes('username') && e.message.includes('does not match'))) {
        
        // Extract the specific error message
        const validationError = error.errors.find((e: any) => e.message && e.message.includes('username'));
        const errorMessage = validationError ? validationError.message : 'Username validation error';
        
        console.error(`Validation error for @${handle}: ${errorMessage}`);
        
        // Return special error code to indicate validation error
        throw {
          code: 'VALIDATION_ERROR',
          originalError: error,
          message: errorMessage
        };
      }
      
      return null;
    }
  }
  
  // Fetch recent tweets for a user
  public async fetchRecentTweets(
    handle: string, 
    count: number = 10, 
    includeReplies: boolean = true, 
    includeRetweets: boolean = true,
    sinceDate: string | null = null
  ): Promise<TweetCache[]> {
    let rateLimitInfo: RateLimitInfo | null = null;
    try {
      console.log(`Fetching recent tweets for @${handle}...`);
      
      // Get user ID (from cache if possible)
      const userId = await this.getUserId(handle);
      
      if (!userId) {
        return [];
      }
      
      // Build the request parameters
      const requestParams: any = {
        max_results: 30, // Fetch more tweets to ensure we have enough after filtering
        'tweet.fields': [
          'created_at', 
          'text', 
          'id', 
          'referenced_tweets',
          'public_metrics', // Includes retweet_count, reply_count, like_count, quote_count
          'context_annotations', // For topic categorization
          'entities', // Hashtags, mentions, URLs
          'lang' // Language of the tweet
        ]
      };
      
      // Only add the exclude parameter if we want to exclude replies
      if (!includeReplies) {
        requestParams.exclude = ['replies'];
      }
      
      // Add start_time parameter if we have a sinceDate
      if (sinceDate) {
        // Add a small buffer (1 second) to avoid missing any tweets
        const startTime = new Date(new Date(sinceDate).getTime() - 1000);
        requestParams.start_time = startTime.toISOString();
        console.log(`Fetching tweets for @${handle} since ${startTime.toISOString()}`);
      }
      
      // Fetch tweets for the user with engagement metrics
      const tweets = await this.readOnlyClient.v2.userTimeline(userId, requestParams);
      
      if (!tweets || !tweets.data || tweets.data.length === 0) {
        console.log(`No tweets found for @${handle}.`);
        return [];
      }
      
      // Ensure we have an array of tweets to work with
      let filteredTweets: any[] = [];
      
      // Standard Twitter API v2 response format
      if (tweets.data && Array.isArray(tweets.data)) {
        console.log(`Found ${tweets.data.length} tweets in standard format`);
        filteredTweets = tweets.data;
      }
      // Handle paginated results where tweets might be in _realData.data
      else if (tweets._realData && tweets._realData.data && Array.isArray(tweets._realData.data)) {
        console.log(`Found ${tweets._realData.data.length} tweets in _realData format`);
        filteredTweets = tweets._realData.data;
      }
      // Handle case where the library might have already extracted the data
      else if (tweets.tweets && Array.isArray(tweets.tweets)) {
        console.log(`Found ${tweets.tweets.length} tweets in tweets property`);
        filteredTweets = tweets.tweets;
      }
      // Handle case where we might have a single tweet object
      else if (tweets.data && typeof tweets.data === 'object' && tweets.data.id) {
        console.log(`Found a single tweet object`);
        filteredTweets = [tweets.data];
      }
      // If we still don't have an array, log the error and return empty
      else {
        console.error(`Unexpected response format for @${handle}. Could not find tweet data.`);
        console.log("Response keys:", Object.keys(tweets));
        if (tweets.data) {
          console.log("Data keys:", Object.keys(tweets.data));
        }
        return [];
      }
      
      // Filter out retweets if necessary
      if (!includeRetweets) {
        filteredTweets = filteredTweets.filter(tweet => {
          return !tweet.referenced_tweets || !tweet.referenced_tweets.some((ref: any) => ref.type === 'retweeted');
        });
      }
      
      // Take only the requested number of tweets
      const limitedTweets = filteredTweets.slice(0, count);
      
      // Check if we found any tweets after filtering
      if (limitedTweets.length === 0) {
        console.log(`No tweets found for @${handle} after filtering.`);
        return [];
      }
      
      // Format the tweets for storage with engagement metrics
      const formattedTweets: TweetCache[] = limitedTweets.map(tweet => {
        // Calculate engagement score
        const publicMetrics = tweet.public_metrics || {};
        const retweetCount = publicMetrics.retweet_count || 0;
        const replyCount = publicMetrics.reply_count || 0;
        const likeCount = publicMetrics.like_count || 0;
        const quoteCount = publicMetrics.quote_count || 0;
        
        // Weighted engagement score formula
        // Weights: Retweets (1.5), Quotes (1.2), Replies (1.0), Likes (0.8)
        const engagementScore = (
          (retweetCount * 1.5) + 
          (quoteCount * 1.2) + 
          (replyCount * 1.0) + 
          (likeCount * 0.8)
        );
        
        // Extract hashtags for vibe tags
        const hashtags = tweet.entities?.hashtags?.map((tag: any) => tag.tag) || [];
        
        // Generate a simple summary (first 50 chars + "...")
        const summary = tweet.text.length > 50 
          ? `${tweet.text.substring(0, 50)}...` 
          : tweet.text;
        
        return {
          id: 0, // Will be assigned by the database
          account_id: 0, // Will be assigned by the caller
          tweet_id: tweet.id,
          tweet_text: tweet.text,
          tweet_url: `https://twitter.com/${handle}/status/${tweet.id}`,
          created_at: new Date(tweet.created_at).toISOString(),
          fetched_at: new Date().toISOString(),
          engagement_score: engagementScore,
          summary: summary,
          vibe_tags: hashtags,
          processed_at: new Date().toISOString(),
          public_metrics: publicMetrics
        };
      });
      
      console.log(`Fetched ${formattedTweets.length} tweets for @${handle}.`);
      
      // If we have rate limit info, attach it to the result
      if ((tweets as any).rateLimit) {
        rateLimitInfo = (tweets as any).rateLimit;
        // Add rate limit info to the result
        (formattedTweets as any).rateLimit = rateLimitInfo;
      }
      
      return formattedTweets;
    } catch (error: any) {
      console.error(`Error fetching tweets for @${handle}:`, error);
      
      // Handle rate limit errors
      if (error.code === 429) {
        const resetTime = error.rateLimit?.reset;
        if (resetTime) {
          const resetDate = new Date(resetTime * 1000);
          console.error(`Rate limit exceeded. Resets at ${resetDate.toISOString()}`);
          
          // Store rate limit info to return to caller
          rateLimitInfo = error.rateLimit;
        }
        
        // Enhance error with rate limit info
        error.rateLimit = rateLimitInfo;
        throw error; // Let the caller handle rate limits
      }
      
      // Return empty array with rate limit info if available
      const result: any = [];
      if (rateLimitInfo) {
        result.rateLimit = rateLimitInfo;
      }
      return result;
    }
  }
  
  // Function to add a delay between API calls to respect rate limits
  public delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Exponential backoff for retries
  public async exponentialBackoff(retryCount: number, baseDelay: number = 1000): Promise<void> {
    // Use a more aggressive backoff strategy for rate limits
    const delayMs = baseDelay * Math.pow(2.5, retryCount);
    const jitter = Math.random() * 2000; // Add more jitter
    const totalDelay = delayMs + jitter;
    console.log(`Exponential backoff: Waiting ${Math.round(totalDelay / 1000)} seconds before retry #${retryCount + 1}...`);
    await this.delay(totalDelay);
  }
  
  // Function to check current rate limits
  public async checkRateLimits(): Promise<{ success: boolean; rateLimitInfo?: RateLimitInfo; error?: any }> {
    try {
      // Make a lightweight API call to check rate limits
      const response = await this.readOnlyClient.v2.get('users/me');
      
      // Extract rate limit information
      const rateLimitInfo = (response as any).rateLimit;
      
      return {
        success: true,
        rateLimitInfo
      };
    } catch (error: any) {
      console.error('Error checking rate limits:', error);
      
      // If we got rate limit info even in the error, return it
      if (error.rateLimit) {
        return {
          success: false,
          rateLimitInfo: error.rateLimit,
          error
        };
      }
      
      return {
        success: false,
        error
      };
    }
  }
}
```

### Step 2.3: Create Account Monitor Service

Create a service to handle account monitoring:

```typescript
// services/monitoring/AccountMonitorService.ts
import { SupabaseService } from '../supabase/SupabaseService';
import { TwitterMonitorService } from './TwitterMonitorService';
import { XAccount, TweetCache, AccountToReview, ApiUsageStats, RateLimitInfo } from '../../types/x-scraping';
import { config } from '../../config';

export class AccountMonitorService {
  private static instance: AccountMonitorService;
  private supabaseService: SupabaseService;
  private twitterMonitorService: TwitterMonitorService;
  
  private constructor() {
    this.supabaseService = SupabaseService.getInstance();
    this.twitterMonitorService = TwitterMonitorService.getInstance();
  }
  
  public static getInstance(): AccountMonitorService {
    if (!AccountMonitorService.instance) {
      AccountMonitorService.instance = new AccountMonitorService();
    }
    return AccountMonitorService.instance;
  }
  
  // Initialize database tables if they don't exist
  public async initializeDatabase(): Promise<boolean> {
    try {
      console.log('Checking database tables...');
      
      // We don't need to create the tables here since we've already created them in the migration
      console.log('Using existing tables in Supabase...');
      
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      return false;
    }
  }
  
  // Get all accounts to monitor
  public async getAccountsToMonitor(): Promise<XAccount[]> {
    try {
      const now = new Date().toISOString();
      
      // First, get all accounts in the review list with status 'pending'
      const { data: accountsToReview, error: reviewError } = await this.supabaseService.client
        .from('accounts_to_review')
        .select('handle')
        .eq('status', 'pending');
      
      if (reviewError) {
        console.error('Error fetching accounts to review:', reviewError);
        return [];
      }
      
      // Create a set of handles to exclude
      const excludeHandles = new Set((accountsToReview || []).map(a => a.handle));
      
      // Get accounts that are due for checking (next_check_date is null or in the past)
      // Order by next_check_date first (oldest first), then by priority
      // Exclude accounts that are in the review list with status 'pending'
      const { data, error } = await this.supabaseService.client
        .from('x_accounts')
        .select('*')
        .or(`next_check_date.is.null,next_check_date.lt.${now}`) // Only get accounts that are due for checking
        .order('next_check_date', { ascending: true }) // Process accounts that are most overdue first
        .order('priority', { ascending: true });       // Then consider priority as a secondary factor
      
      if (error) {
        console.error('Error fetching accounts:', error);
        return [];
      }
      
      // Filter out accounts that are in the review list with status 'pending'
      const filteredAccounts = data ? data.filter(account => !excludeHandles.has(account.handle)) : [];
      
      console.log(`Filtered out ${data ? data.length - filteredAccounts.length : 0} accounts that are in the review list with status 'pending'`);
      
      return filteredAccounts;
    } catch (error) {
      console.error('Error in getAccountsToMonitor:', error);
      return [];
    }
  }
  
  // Get all accounts regardless of next_check_date
  public async getAllAccounts(): Promise<XAccount[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('x_accounts')
        .select('*')
        .order('handle', { ascending: true });
      
      if (error) {
        console.error('Error fetching all accounts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllAccounts:', error);
      return [];
    }
  }
  
  // Update the last_checked timestamp and set next_check_date based on activity level
  public async updateLastChecked(accountId: number): Promise<boolean> {
    try {
      // First, get the account to determine its activity level
      const { data: account, error: getError } = await this.supabaseService.client
        .from('x_accounts')
        .select('activity_level')
        .eq('id', accountId)
        .single();
      
      if (getError) {
        console.error(`Error getting activity level for account ${accountId}:`, getError);
        return false;
      }
      
      // Calculate next check date based on activity level
      const now = new Date();
      let nextCheckDate = new Date(now);
      
      switch (account.activity_level) {
        case 'high':
          // Check high activity accounts daily
          nextCheckDate.setDate(now.getDate() + 1);
          break;
        case 'medium':
          // Check medium activity accounts every 3 days
          nextCheckDate.setDate(now.getDate() + 3);
          break;
        case 'low':
          // Check low activity accounts weekly
          nextCheckDate.setDate(now.getDate() + 7);
          break;
        default:
          // Default to medium (3 days)
          nextCheckDate.setDate(now.getDate() + 3);
      }
      
      // Update the account
      const { error } = await this.supabaseService.client
        .from('x_accounts')
        .update({ 
          last_checked: now.toISOString(),
          next_check_date: nextCheckDate.toISOString()
        })
        .eq('id', accountId);
      
      if (error) {
        console.error(`Error updating last_checked for account ${accountId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateLastChecked:', error);
      return false;
    }
  }
  
  // Get cached tweets for an account
  public async getCachedTweets(accountId: number): Promise<TweetCache[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('tweets_cache')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`Error fetching cached tweets for account ${accountId}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCachedTweets:', error);
      return [];
    }
  }
  
  // Delete all cached tweets for an account
  public async deleteCachedTweets(accountId: number): Promise<boolean> {
    try {
