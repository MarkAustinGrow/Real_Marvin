import { TwitterApi, TweetV2 } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { RateLimitInfo, TweetCache } from '../../types/x-scraping';
import { ApiCallLogger } from './ApiCallLogger';

/**
 * Service for interacting with the Twitter API to monitor accounts and fetch tweets
 */
export class TwitterMonitorService {
  private static instance: TwitterMonitorService;
  private client: TwitterApi;
  private apiLogger: ApiCallLogger;
  private userIdCache: Map<string, string> = new Map();
  private readonly USER_CACHE_FILE: string;
  
  private constructor() {
    // Initialize Twitter client with credentials
    this.client = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessTokenSecret,
    });
    
    // Initialize the API call logger
    this.apiLogger = ApiCallLogger.getInstance();
    
    this.USER_CACHE_FILE = path.join(__dirname, '..', '..', 'cache', 'user_id_cache.json');
    this.loadUserIdCache();
  }
  
  /**
   * Get the singleton instance of the TwitterMonitorService
   */
  public static getInstance(): TwitterMonitorService {
    if (!TwitterMonitorService.instance) {
      TwitterMonitorService.instance = new TwitterMonitorService();
    }
    return TwitterMonitorService.instance;
  }
  
  /**
   * Load user ID cache from file
   */
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
  
  /**
   * Save user ID cache to file
   */
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
  
  /**
   * Get user ID from handle (with caching)
   * @param handle Twitter handle (without @)
   * @returns User ID or null if not found
   */
  public async getUserId(handle: string): Promise<string | null> {
    // Check cache first
    if (this.userIdCache.has(handle)) {
      return this.userIdCache.get(handle) || null;
    }
    
    // If not in cache, fetch from API with logging
    try {
      const user = await this.apiLogger.wrapApiCall(
        'users/by/username',
        'TwitterMonitorService',
        async () => await this.client.v2.userByUsername(handle),
        { handle }
      );
      
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
  
  /**
   * Fetch recent tweets for a user
   * @param handle Twitter handle (without @)
   * @param count Number of tweets to fetch
   * @param includeReplies Whether to include replies
   * @param includeRetweets Whether to include retweets
   * @param sinceDate Only fetch tweets after this date
   * @returns Array of tweets
   */
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
      
      // Fetch tweets for the user with engagement metrics and API logging
      const response = await this.apiLogger.wrapApiCall(
        'users/:id/tweets',
        'TwitterMonitorService',
        async () => await this.client.v2.userTimeline(userId, requestParams),
        { userId, handle, ...requestParams }
      );
      
      // Get the tweets from the response
      const tweets = [];
      
      // Collect tweets from the paginator (up to 30)
      for await (const tweet of response) {
        tweets.push(tweet);
        if (tweets.length >= 30) break;
      }
      
      if (tweets.length === 0) {
        console.log(`No tweets found for @${handle}.`);
        return [];
      }
      
      console.log(`Found ${tweets.length} tweets for @${handle}`);
      
      // Create a copy of the tweets array for filtering
      let filteredTweets = [...tweets];
      
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
        const publicMetrics = tweet.public_metrics || { retweet_count: 0, reply_count: 0, like_count: 0, quote_count: 0 };
        const retweetCount = (publicMetrics as any).retweet_count || 0;
        const replyCount = (publicMetrics as any).reply_count || 0;
        const likeCount = (publicMetrics as any).like_count || 0;
        const quoteCount = (publicMetrics as any).quote_count || 0;
        
        // Weighted engagement score formula
        // Weights: Retweets (1.5), Quotes (1.2), Replies (1.0), Likes (0.8)
        const engagementScore = (
          (retweetCount * 1.5) + 
          (quoteCount * 1.2) + 
          (replyCount * 1.0) + 
          (likeCount * 0.8)
        );
        
        // Extract hashtags for vibe tags
        const hashtags = tweet.entities?.hashtags?.map((tag: any) => tag.tag).join(',') || null;
        
        // Generate a simple summary (first 50 chars + "...")
        const summary = tweet.text.length > 50 
          ? `${tweet.text.substring(0, 50)}...` 
          : tweet.text;
        
        // Handle created_at date safely
        const createdAt = tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString();
        
        return {
          id: 0, // Will be assigned by the database
          account_id: 0, // Will be assigned by the caller
          tweet_id: tweet.id,
          tweet_text: tweet.text,
          tweet_url: `https://twitter.com/${handle}/status/${tweet.id}`,
          created_at: createdAt,
          fetched_at: new Date().toISOString(),
          engagement_score: engagementScore,
          summary: summary,
          vibe_tags: hashtags,
          embedding_vector: null, // Will be generated separately if needed
          processed_at: new Date().toISOString(),
          public_metrics: JSON.stringify(publicMetrics),
          archived: false,
          memory_ids: []
        };
      });
      
      console.log(`Fetched ${formattedTweets.length} tweets for @${handle}.`);
      
      // If we have rate limit info, attach it to the result
      if ((response as any).rateLimit) {
        rateLimitInfo = (response as any).rateLimit;
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
  
  /**
   * Add a delay between API calls to respect rate limits
   * @param ms Milliseconds to delay
   */
  public delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Exponential backoff for retries
   * @param retryCount Current retry count
   * @param baseDelay Base delay in milliseconds
   */
  public async exponentialBackoff(retryCount: number, baseDelay: number = 1000): Promise<void> {
    // Use a more aggressive backoff strategy for rate limits
    const delayMs = baseDelay * Math.pow(2.5, retryCount);
    const jitter = Math.random() * 2000; // Add more jitter
    const totalDelay = delayMs + jitter;
    console.log(`Exponential backoff: Waiting ${Math.round(totalDelay / 1000)} seconds before retry #${retryCount + 1}...`);
    await this.delay(totalDelay);
  }
  
  /**
   * Check current rate limits
   * @returns Object with rate limit information
   */
  public async checkRateLimits(): Promise<{ success: boolean; rateLimitInfo?: RateLimitInfo; error?: any }> {
    try {
      // Make a lightweight API call to check rate limits
      const response = await this.apiLogger.wrapApiCall(
        'users/me',
        'TwitterMonitorService',
        async () => await this.client.v2.get('users/me')
      );
      
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
