import { TwitterApi } from 'twitter-api-v2';
import { config } from '../../config';
import { PostContent } from '../../types';
import { EngagementService, EngagementMetric } from '../engagement/EngagementService';

export class TwitterService {
    private client: TwitterApi;
    private static instance: TwitterService;

    private constructor() {
        this.client = new TwitterApi({
            appKey: config.twitter.apiKey,
            appSecret: config.twitter.apiSecret,
            accessToken: config.twitter.accessToken,
            accessSecret: config.twitter.accessTokenSecret,
        });
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

            const result = await this.client.v2.tweet(tweetOptions);
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
            const mediaId = await this.client.v1.uploadMedia(mediaPath);
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

        // Hashtags are no longer added to tweets
        // This was removed to keep tweets cleaner

        return {
            ...content,
            text: formattedText
        };
    }
    
    /**
     * Fetches recent engagements (likes, reposts, replies)
     * @param tweetId Optional tweet ID to filter by
     * @param sinceId Optional tweet ID to fetch engagements since
     * @returns Array of engagement data
     */
    public async fetchRecentEngagements(tweetId?: string, sinceId?: string): Promise<any[]> {
        try {
            console.log('Fetching recent engagements from Twitter');
            
            // If a specific tweet ID is provided, get engagements for that tweet
            if (tweetId) {
                console.log(`Fetching engagements for tweet ID: ${tweetId}`);
                
                // Get likes for the tweet
                const likersResponse = await this.client.v2.tweetLikedBy(tweetId);
                const likers = likersResponse.data || [];
                
                // Get retweets of the tweet
                const retweetersResponse = await this.client.v2.tweetRetweetedBy(tweetId);
                const retweeters = retweetersResponse.data || [];
                
                // Get replies to the tweet (this requires a search)
                const repliesResponse = await this.client.v2.search({
                    query: `conversation_id:${tweetId}`,
                    "tweet.fields": ["author_id", "conversation_id", "created_at", "text", "referenced_tweets"],
                    "expansions": ["referenced_tweets.id", "in_reply_to_user_id"]
                });
                // Extract the tweets from the response
                const replies = repliesResponse.tweets || [];
                
                // Process and return the combined engagement data
                return this.processEngagementData(tweetId, likers, retweeters, replies);
            }
            
            // If no tweet ID is provided, get recent mentions
            console.log('Fetching recent mentions');
            
            // Get the authenticated user's ID
            const me = await this.client.v2.me();
            
            // Search parameters
            const searchParams: any = {
                query: `@${me.data.username}`,
                "tweet.fields": ["author_id", "conversation_id", "created_at", "text", "referenced_tweets"],
                "user.fields": ["id", "username", "name"],
                "expansions": ["author_id", "referenced_tweets.id", "in_reply_to_user_id"]
            };
            
            // Add since_id if provided
            if (sinceId) {
                searchParams.since_id = sinceId;
                console.log(`Fetching mentions since tweet ID: ${sinceId}`);
            }
            
            // Search for recent mentions
            const mentionsResponse = await this.client.v2.search(searchParams);
            
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
        } catch (error) {
            console.error('Error fetching engagements:', error);
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
                created_at: new Date().toISOString() // Twitter API doesn't provide this timestamp
            });
        }
        
        // Process retweets
        for (const retweeter of retweeters || []) {
            engagements.push({
                type: 'repost',
                tweet_id: tweetId,
                user_id: retweeter.id,
                username: retweeter.username,
                created_at: new Date().toISOString() // Twitter API doesn't provide this timestamp
            });
        }
        
        // Process replies
        for (const reply of replies || []) {
            engagements.push({
                type: 'reply',
                tweet_id: tweetId,
                user_id: reply.author_id,
                text: reply.text,
                created_at: reply.created_at
            });
        }
        
        return engagements;
    }
    
    /**
     * Monitors and logs recent engagements
     * @param tweetId Optional tweet ID to monitor
     */
    public async monitorEngagements(tweetId?: string): Promise<void> {
        try {
            console.log('Monitoring engagements');
            
            // Get the engagement service
            const engagementService = EngagementService.getInstance();
            
            // Fetch recent engagements
            const engagements = await this.fetchRecentEngagements(tweetId);
            
            // Log each engagement
            for (const engagement of engagements) {
                const engagementMetric: EngagementMetric = {
                    user_id: engagement.user_id,
                    username: engagement.username || 'unknown_user',
                    engagement_type: engagement.type,
                    tweet_id: engagement.tweet_id,
                    tweet_content: engagement.text
                };
                
                await engagementService.logEngagement(engagementMetric);
            }
            
            console.log(`Logged ${engagements.length} engagements`);
        } catch (error) {
            console.error('Error monitoring engagements:', error);
        }
    }
}
