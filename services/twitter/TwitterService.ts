import { TwitterApi } from 'twitter-api-v2';
import { config } from '../../config';
import { PostContent } from '../../types';
import { EngagementService, EngagementMetric } from '../engagement/EngagementService';
import { ApiCallLogger } from '../monitoring/ApiCallLogger';

/**
 * Token bucket for rate limiting
 * Implements a token bucket algorithm for API rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number; // tokens per millisecond
  
  constructor(maxTokens: number, refillRatePerDay: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = refillRatePerDay / (24 * 60 * 60 * 1000);
  }
  
  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();
    
    if (this.tokens < tokens) {
      console.log(`Rate limit would be exceeded. Available tokens: ${this.tokens}, requested: ${tokens}`);
      return false;
    }
    
    this.tokens -= tokens;
    return true;
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
  
  get remainingTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

export class TwitterService {
    private client: TwitterApi;
    private static instance: TwitterService;
    private apiLogger: ApiCallLogger;
    
    // Rate limiting properties
    public isRateLimited: boolean = false;
    public rateLimitResetTime: Date | null = null;
    private tokenBucket: TokenBucket;
    
    // Caching properties
    private cachedUsername: string | null = null;
    private lastUsernameCheck: Date | null = null;

    private constructor() {
        this.client = new TwitterApi({
            appKey: config.twitter.apiKey,
            appSecret: config.twitter.apiSecret,
            accessToken: config.twitter.accessToken,
            accessSecret: config.twitter.accessTokenSecret,
        });
        
        // Initialize the token bucket with Twitter's daily rate limit (250 requests per day)
        this.tokenBucket = new TokenBucket(250, 250);
        
        // Initialize the API call logger
        this.apiLogger = ApiCallLogger.getInstance();
    }

    public static getInstance(): TwitterService {
        if (!TwitterService.instance) {
            TwitterService.instance = new TwitterService();
        }
        return TwitterService.instance;
    }

    /**
     * Posts content to Twitter with optional media and reply functionality
     * @param content The content to post
     * @param mediaIds Optional array of media IDs to attach
     * @param replyToTweetId Optional tweet ID to reply to
     * @returns Object containing success status, tweet ID, and any error information
     */
    public async postTweet(content: PostContent, mediaIds?: string[], replyToTweetId?: string): Promise<{ success: boolean; error?: any; message?: string; tweetId?: string }> {
        try {
            const tweetOptions: any = {
                text: content.text,
            };

            if (mediaIds && mediaIds.length > 0) {
                tweetOptions.media = { media_ids: mediaIds };
            }

            // Add reply parameter if replyToTweetId is provided
            if (replyToTweetId) {
                tweetOptions.reply = { in_reply_to_tweet_id: replyToTweetId };
                console.log(`Creating a reply to tweet ID: ${replyToTweetId}`);
            }

            const result = await this.apiLogger.wrapApiCall(
                'tweets',
                'TwitterService',
                async () => await this.client.v2.tweet(tweetOptions),
                tweetOptions
            );
            return { 
                success: true, 
                message: `Tweet posted successfully with ID: ${result.data.id}`,
                tweetId: result.data.id
            };
        } catch (error: any) {
            console.error('Error posting tweet:', error);
            
            // Handle different types of errors
            if (error.code === 401) {
                return { 
                    success: false, 
                    error, 
                    message: 'Authentication failed. Please check your Twitter API credentials.' 
                };
            } else if (error.code === 403) {
                return { 
                    success: false, 
                    error, 
                    message: 'Permission denied. Your Twitter app may not have write permissions or the account may be restricted.' 
                };
            } else if (error.code === 429) {
                return { 
                    success: false, 
                    error, 
                    message: 'Rate limit exceeded. Please try again later.' 
                };
            } else {
                return { 
                    success: false, 
                    error, 
                    message: `Failed to post tweet: ${error.message || 'Unknown error'}` 
                };
            }
        }
    }


    /**
     * Uploads media to Twitter
     * @param mediaPath Path to the media file
     * @returns Media ID string
     */
    public async uploadMedia(mediaPath: string): Promise<string> {
        try {
            console.log(`Uploading media from path: ${mediaPath}`);
            const mediaId = await this.apiLogger.wrapApiCall(
                'media/upload',
                'TwitterService',
                async () => await this.client.v1.uploadMedia(mediaPath),
                { mediaPath }
            );
            console.log(`Media uploaded successfully with ID: ${mediaId}`);
            return mediaId;
        } catch (error) {
            console.error('Error uploading media:', error);
            throw new Error('Failed to upload media');
        }
    }

    /**
     * Formats content according to Twitter's requirements
     * @param content Raw content to format
     * @returns Formatted content ready for Twitter
     */
    public formatContent(content: PostContent): PostContent {
        // Ensure content meets Twitter's character limit
        const maxLength = 280;
        let formattedText = content.text;

        if (formattedText.length > maxLength) {
            formattedText = formattedText.substring(0, maxLength - 3) + '...';
        }

        // Remove any hashtags that might have been included in the text
        formattedText = this.removeHashtags(formattedText);

        // Hashtags are no longer added to tweets
        // This was removed to keep tweets cleaner

        return {
            ...content,
            text: formattedText,
            hashtags: [] // Ensure hashtags array is empty
        };
    }

    /**
     * Removes hashtags from text
     * @param text Text to remove hashtags from
     * @returns Text without hashtags
     */
    private removeHashtags(text: string): string {
        // More comprehensive regex to catch hashtags in various formats
        // This will match:
        // - Standard hashtags (#word)
        // - Hashtags with numbers (#word123)
        // - Hashtags with underscores (#word_word)
        // - Hashtags with hyphens (#word-word)
        return text.replace(/#[\w\-_]+\b/g, '')
            .replace(/\s+/g, ' ') // Remove extra spaces
            .trim();
    }
    
    /**
     * Gets the authenticated user's username with caching (24-hour cache)
     * @returns The username of the authenticated user
     */
    public async getOwnUsername(): Promise<string> {
        const now = new Date();
        
        // Check if we have a cached username that's less than 24 hours old
        if (this.cachedUsername && this.lastUsernameCheck) {
            const hoursSinceCheck = (now.getTime() - this.lastUsernameCheck.getTime()) / (1000 * 60 * 60);
            if (hoursSinceCheck < 24) {
                return this.cachedUsername;
            }
        }
        
        // Fetch fresh username with API logging
        return await this.apiLogger.wrapApiCall(
            'users/me',
            'TwitterService',
            async () => {
                const me = await this.client.v2.me();
                this.cachedUsername = me.data.username;
                this.lastUsernameCheck = now;
                console.log(`Cached username: ${this.cachedUsername}`);
                return this.cachedUsername;
            }
        ).catch(error => {
            console.error('Error getting own username:', error);
            return this.cachedUsername || 'Yona_AI_Music'; // Return cached value or fallback
        });
    }
    
    /**
     * Check if we're in emergency quota mode (< 30 remaining calls)
     */
    public isEmergencyQuotaMode(): boolean {
        const remaining = this.tokenBucket.remainingTokens;
        if (remaining < 30) {
            console.log(`Emergency quota mode activated. Only ${remaining} API calls remaining.`);
            return true;
        }
        return false;
    }
    
    /**
     * Fetches recent engagements (optimized to reduce API calls)
     * @param tweetId Optional tweet ID to filter by
     * @param sinceId Optional tweet ID to fetch engagements since
     * @returns Array of engagement data
     */
    public async fetchRecentEngagements(tweetId?: string, sinceId?: string): Promise<any[]> {
        try {
            console.log('Fetching recent engagements from Twitter (optimized)');
            
            // Skip expensive engagement calls for specific tweets to save API quota
            if (tweetId) {
                console.log(`Skipping expensive engagement calls for tweet ID: ${tweetId} to conserve API quota`);
                return []; // Return empty array to save API calls
            }
            
            // If no tweet ID is provided, get recent mentions only (most important)
            console.log('Fetching recent mentions');
            
            // Use cached username to avoid extra API call
            const username = await this.getOwnUsername();
            
            // Search parameters
            const searchParams: any = {
                query: `@${username}`,
                "tweet.fields": ["author_id", "conversation_id", "created_at", "text", "referenced_tweets"],
                "user.fields": ["id", "username", "name"],
                "expansions": ["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
                "max_results": 10 // Limit results to reduce processing time
            };
            
            // Add since_id if provided
            if (sinceId) {
                searchParams.since_id = sinceId;
                console.log(`Fetching mentions since tweet ID: ${sinceId}`);
            }
            
            // Search for recent mentions with API logging
            const mentionsResponse = await this.apiLogger.wrapApiCall(
                'tweets/search/recent',
                'TwitterService',
                async () => await this.client.v2.search(searchParams),
                searchParams
            );
            
            // Extract the tweets from the response
            const mentions = mentionsResponse.tweets || [];
            
            // Extract the users from the response
            const users = mentionsResponse.includes?.users || [];
            
            // Create a map of user IDs to usernames for quick lookup
            const userMap = new Map();
            users.forEach(user => {
                userMap.set(user.id, user.username);
            });
            
            return mentions.map((mention: any) => {
                // Look up the username from the user map
                const username = userMap.get(mention.author_id) || 'unknown_user';
                
                // Determine if this is a reply and get the parent tweet ID
                let parentTweetId = null;
                if (mention.referenced_tweets && mention.referenced_tweets.length > 0) {
                    const replyTo = mention.referenced_tweets.find((ref: any) => ref.type === 'replied_to');
                    if (replyTo) {
                        parentTweetId = replyTo.id;
                    }
                }
                
                return {
                    type: 'mention',
                    tweet_id: mention.id,
                    user_id: mention.author_id,
                    username: username, // Include the username
                    text: mention.text,
                    created_at: mention.created_at,
                    conversation_id: mention.conversation_id,
                    parent_tweet_id: parentTweetId
                };
            });
        } catch (error: any) {
            console.error('Error fetching engagements:', error);
            
            // Handle rate limit errors
            if (error.code === 429) {
                await this.handleRateLimit(error);
            }
            
            return [];
        }
    }
    
    /**
     * Processes raw engagement data into a standardized format
     * @param tweetId The tweet ID
     * @param likers Users who liked the tweet
     * @param retweeters Users who retweeted the tweet
     * @param replies Replies to the tweet
     * @returns Processed engagement data
     */
    private processEngagementData(
        tweetId: string,
        likers: any[],
        retweeters: any[],
        replies: any[]
    ): any[] {
        const engagements = [];
        
        // Process likes
        for (const liker of likers || []) {
            engagements.push({
                type: 'like',
                tweet_id: tweetId,
                user_id: liker.id,
                username: liker.username,
                created_at: new Date().toISOString(), // Twitter API doesn't provide this timestamp
                conversation_id: tweetId, // Use the tweet ID as the conversation ID for likes
                parent_tweet_id: null
            });
        }
        
        // Process retweets
        for (const retweeter of retweeters || []) {
            engagements.push({
                type: 'repost',
                tweet_id: tweetId,
                user_id: retweeter.id,
                username: retweeter.username,
                created_at: new Date().toISOString(), // Twitter API doesn't provide this timestamp
                conversation_id: tweetId, // Use the tweet ID as the conversation ID for reposts
                parent_tweet_id: null
            });
        }
        
        // Process replies
        for (const reply of replies || []) {
            engagements.push({
                type: 'reply',
                tweet_id: reply.id,
                user_id: reply.author_id,
                text: reply.text,
                created_at: reply.created_at,
                conversation_id: reply.conversation_id || tweetId, // Use the conversation_id from the reply or fallback to tweetId
                parent_tweet_id: tweetId // The parent is the original tweet
            });
        }
        
        return engagements;
    }
    
    /**
     * Handles rate limit errors
     * @param error The error object from the Twitter API
     */
    private async handleRateLimit(error: any): Promise<void> {
        if (error.code === 429) {
            // Extract reset time from headers
            const resetTime = error.rateLimit?.reset;
            if (resetTime) {
                const resetDate = new Date(resetTime * 1000);
                const waitTime = resetDate.getTime() - Date.now();
                
                console.log(`Rate limit exceeded. Will reset at ${resetDate.toLocaleString()}`);
                console.log(`Waiting for ${Math.ceil(waitTime / 1000 / 60)} minutes before retrying`);
                
                // Store this information for other components to use
                this.rateLimitResetTime = resetDate;
                this.isRateLimited = true;
                
                // Schedule a job to reset the rate limit flag
                setTimeout(() => {
                    this.isRateLimited = false;
                    console.log('Rate limit reset. Resuming normal operations.');
                }, waitTime + 1000); // Add 1 second buffer
            }
        }
    }
    
    /**
     * Monitors and logs recent engagements with optimized API usage
     * @param tweetId Optional tweet ID to monitor
     */
    public async monitorEngagements(tweetId?: string): Promise<void> {
        try {
            console.log('Monitoring engagements');
            
            // Check if we're rate limited
            if (this.isRateLimited) {
                const resetTime = this.rateLimitResetTime;
                console.log(`Skipping engagement monitoring due to rate limit. Will reset at ${resetTime?.toLocaleString() || 'unknown time'}`);
                return;
            }
            
            // Check if we're in emergency quota mode
            if (this.isEmergencyQuotaMode()) {
                console.log('Skipping engagement monitoring due to emergency quota mode');
                return;
            }
            
            // Check if we have enough tokens in the bucket
            if (!(await this.tokenBucket.consume(1))) {
                console.log('Rate limit would be exceeded based on token bucket. Skipping engagement monitoring.');
                return;
            }
            
            // Get the engagement service
            const engagementService = EngagementService.getInstance();
            
            // Fetch recent engagements (optimized to only check mentions)
            const engagements = await this.fetchRecentEngagements(tweetId);
            
            // Log each engagement
            for (const engagement of engagements) {
                const engagementMetric: EngagementMetric = {
                    user_id: engagement.user_id,
                    username: engagement.username || 'unknown_user',
                    engagement_type: engagement.type,
                    tweet_id: engagement.tweet_id,
                    tweet_content: engagement.text,
                    conversation_id: engagement.conversation_id,
                    parent_tweet_id: engagement.parent_tweet_id
                };
                
                console.log(`Processing engagement with conversation_id: ${engagement.conversation_id}`);
                await engagementService.logEngagement(engagementMetric);
            }
            
            console.log(`Logged ${engagements.length} engagements`);
        } catch (error) {
            console.error('Error monitoring engagements:', error);
        }
    }
    
    /**
     * Get current API usage statistics
     */
    public getApiUsageStats(): { remaining: number; total: number; percentage: number } {
        const remaining = this.tokenBucket.remainingTokens;
        const total = 250;
        const percentage = Math.round((remaining / total) * 100);
        
        return {
            remaining,
            total,
            percentage
        };
    }
}
