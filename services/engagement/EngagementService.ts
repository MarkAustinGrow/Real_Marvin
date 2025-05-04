import { SupabaseService } from '../supabase/SupabaseService';
import { GrokService } from '../grok/GrokService';
import { TwitterService } from '../twitter/TwitterService';
import { PostContent } from '../../types';

/**
 * Types of engagement that can be tracked
 */
export type EngagementType = 'like' | 'repost' | 'reply' | 'follow' | 'mention';

/**
 * Interface for engagement metrics data
 */
export interface EngagementMetric {
    id?: string;
    user_id: string;
    username: string;
    engagement_type: EngagementType;
    tweet_id: string;
    tweet_content?: string;
    created_at?: string;
}

/**
 * Rules for when to trigger engagement responses
 */
export interface EngagementRule {
    type: EngagementType | 'any';
    condition: 'count' | 'verified' | 'first_time' | 'art_focused';
    threshold?: number;
    timeframe_days?: number;
    action: 'reply' | 'log_only';
    priority: number; // Higher number = higher priority
}

/**
 * Service for tracking and responding to user engagements
 */
export class EngagementService {
    private static instance: EngagementService;
    private supabaseService: SupabaseService;
    private grokService: GrokService;
    private twitterService: TwitterService;
    
    // Default engagement rules
    private rules: EngagementRule[] = [
        {
            type: 'like',
            condition: 'count',
            threshold: 3,
            timeframe_days: 7,
            action: 'reply',
            priority: 2
        },
        {
            type: 'repost',
            condition: 'verified',
            action: 'reply',
            priority: 3
        },
        {
            type: 'follow',
            condition: 'art_focused',
            action: 'reply',
            priority: 1
        },
        {
            type: 'reply',
            condition: 'first_time',
            action: 'reply',
            priority: 4
        }
    ];
    
    private constructor() {
        this.supabaseService = SupabaseService.getInstance();
        this.grokService = GrokService.getInstance();
        this.twitterService = TwitterService.getInstance();
        console.log('Initializing EngagementService');
    }
    
    /**
     * Get the singleton instance of EngagementService
     */
    public static getInstance(): EngagementService {
        if (!EngagementService.instance) {
            EngagementService.instance = new EngagementService();
        }
        return EngagementService.instance;
    }
    
    /**
     * Logs an engagement event to the database
     * @param engagement The engagement metric to log
     */
    public async logEngagement(engagement: EngagementMetric): Promise<void> {
        try {
            console.log(`Logging ${engagement.engagement_type} engagement from @${engagement.username}`);
            
            // Store the engagement data in memory for processing
            // We're not actually inserting into the database since the table structure doesn't match
            // This is a temporary solution until the table is properly migrated
            
            // Map engagement type to the appropriate metrics
            let likes = 0;
            let comments = 0;
            let views = 1; // Default to 1 view
            
            if (engagement.engagement_type === 'like') {
                likes = 1;
            } else if (engagement.engagement_type === 'reply') {
                comments = 1;
            }
            
            // Insert a record with the available fields
            await this.supabaseService.client
                .from('engagement_metrics')
                .insert({
                    // Use existing columns in the table
                    date: new Date().toISOString().split('T')[0],
                    likes: likes,
                    comments: comments,
                    views: views,
                    platform: 'Twitter',
                    created_at: new Date().toISOString()
                });
                
            console.log('Engagement logged successfully');
            
            // Check if we should respond to this engagement
            await this.processEngagement(engagement);
        } catch (error) {
            console.error('Error logging engagement:', error);
            throw new Error('Failed to log engagement');
        }
    }
    
    /**
     * Process an engagement and respond if needed based on rules
     * @param engagement The engagement to process
     */
    private async processEngagement(engagement: EngagementMetric): Promise<void> {
        try {
            // Check if we should respond based on rules
            const shouldRespond = await this.shouldRespond(engagement);
            
            if (shouldRespond) {
                console.log(`Responding to ${engagement.engagement_type} from @${engagement.username}`);
                await this.respondToEngagement(engagement);
            } else {
                console.log(`No response needed for ${engagement.engagement_type} from @${engagement.username}`);
            }
        } catch (error) {
            console.error('Error processing engagement:', error);
        }
    }
    
    /**
     * Determines if we should respond to an engagement based on rules
     * @param engagement The engagement to check
     * @returns Boolean indicating if we should respond
     */
    private async shouldRespond(engagement: EngagementMetric): Promise<boolean> {
        try {
            // Sort rules by priority (highest first)
            const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);
            
            // Check each rule
            for (const rule of sortedRules) {
                // Skip if engagement type doesn't match
                if (rule.type !== 'any' && rule.type !== engagement.engagement_type) {
                    continue;
                }
                
                // Check rule conditions
                if (rule.condition === 'count') {
                    const count = await this.getEngagementCount(
                        engagement.user_id,
                        engagement.engagement_type,
                        rule.timeframe_days || 7
                    );
                    
                    if (count >= (rule.threshold || 1)) {
                        return rule.action === 'reply';
                    }
                } else if (rule.condition === 'verified') {
                    // TODO: Check if user is verified
                    // For now, randomly determine (20% chance)
                    if (Math.random() < 0.2) {
                        return rule.action === 'reply';
                    }
                } else if (rule.condition === 'first_time') {
                    const isFirstTime = await this.isFirstTimeEngagement(
                        engagement.user_id,
                        engagement.engagement_type
                    );
                    
                    if (isFirstTime) {
                        return rule.action === 'reply';
                    }
                } else if (rule.condition === 'art_focused') {
                    // TODO: Check if user is art-focused
                    // For now, randomly determine (30% chance)
                    if (Math.random() < 0.3) {
                        return rule.action === 'reply';
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error checking if should respond:', error);
            return false;
        }
    }
    
    /**
     * Gets the count of engagements for a user within a timeframe
     * @param userId The user ID
     * @param engagementType The type of engagement
     * @param timeframeDays The timeframe in days
     * @returns The count of engagements
     */
    private async getEngagementCount(
        userId: string,
        engagementType: EngagementType,
        timeframeDays: number
    ): Promise<number> {
        try {
            // Since we don't have user_id and engagement_type columns,
            // we'll return a simulated count for now
            // In a real implementation, we would need to properly track this data
            
            // For testing purposes, return a random count between 0 and 5
            return Math.floor(Math.random() * 6);
        } catch (error) {
            console.error('Error getting engagement count:', error);
            return 0;
        }
    }
    
    /**
     * Checks if this is the first time a user has engaged in this way
     * @param userId The user ID
     * @param engagementType The type of engagement
     * @returns Boolean indicating if this is the first engagement
     */
    private async isFirstTimeEngagement(
        userId: string,
        engagementType: EngagementType
    ): Promise<boolean> {
        try {
            // Since we don't have user_id and engagement_type columns,
            // we'll simulate this check for now
            
            // For testing purposes, randomly determine if it's a first-time engagement (50% chance)
            return Math.random() < 0.5;
        } catch (error) {
            console.error('Error checking if first time engagement:', error);
            return false;
        }
    }
    
    /**
     * Responds to an engagement with a humorous reply
     * @param engagement The engagement to respond to
     */
    private async respondToEngagement(engagement: EngagementMetric): Promise<void> {
        try {
            const context = await this.buildResponseContext(engagement);
            const reply = await this.grokService.generateHumorousReply(context);
            
            // Format the tweet with the username
            const tweetContent: PostContent = {
                text: `@${engagement.username} ${reply}`,
                platform: 'Twitter'
            };
            
            // Post the reply
            const result = await this.twitterService.postTweet(tweetContent);
            
            if (result.success) {
                console.log(`Successfully replied to @${engagement.username}`);
            } else {
                console.error(`Failed to reply to @${engagement.username}:`, result.message);
            }
        } catch (error) {
            console.error('Error responding to engagement:', error);
        }
    }
    
    /**
     * Builds context for the response based on engagement data
     * @param engagement The engagement data
     * @returns Context string for the AI
     */
    private async buildResponseContext(engagement: EngagementMetric): Promise<string> {
        let context = '';
        
        switch (engagement.engagement_type) {
            case 'like':
                context = `@${engagement.username} just liked a tweet that says: "${engagement.tweet_content || 'your tweet'}". Write a clever, funny thank-you tweet or reaction. Keep it short.`;
                break;
            case 'repost':
                context = `@${engagement.username} keeps sharing Marvin's glitchy poetry like it's a digital gospel. What would Marvin say back? Keep it witty.`;
                break;
            case 'reply':
                context = `@${engagement.username} replied to your tweet saying: "${engagement.tweet_content || 'something interesting'}". Respond with Marvin's signature sarcastic wit. Keep it short.`;
                break;
            case 'follow':
                context = `@${engagement.username} just followed Marvin. Write a funny welcome message that showcases Marvin's quirky personality. Keep it short.`;
                break;
            default:
                context = `@${engagement.username} engaged with Marvin's content. Write a short, witty response that shows off Marvin's sarcastic personality.`;
        }
        
        return context;
    }
    
    /**
     * Detects recurring fans based on engagement frequency
     * @param threshold Minimum number of engagements to be considered a fan
     * @param timeframeDays Timeframe in days to consider
     * @returns Array of recurring fans
     */
    public async detectRecurringFans(
        threshold: number = 3,
        timeframeDays: number = 7
    ): Promise<any[]> {
        try {
            // Since we don't have user_id and username columns,
            // we'll return simulated data for now
            
            // For testing purposes, return a list of sample recurring fans
            return [
                {
                    user_id: '123456',
                    username: 'tech_enthusiast',
                    engagement_count: 5,
                    engagement_types: ['like', 'repost']
                },
                {
                    user_id: '789012',
                    username: 'ai_lover',
                    engagement_count: 4,
                    engagement_types: ['like', 'reply']
                },
                {
                    user_id: '345678',
                    username: 'digital_artist',
                    engagement_count: 3,
                    engagement_types: ['like', 'follow']
                }
            ];
        } catch (error) {
            console.error('Error detecting recurring fans:', error);
            return [];
        }
    }
    
    /**
     * Get the current engagement rules
     * @returns Array of engagement rules
     */
    public getRules(): EngagementRule[] {
        return [...this.rules];
    }
    
    /**
     * Update the engagement rules
     * @param newRules New rules to set
     */
    public updateRules(newRules: EngagementRule[]): void {
        // Validate rules
        if (!Array.isArray(newRules) || newRules.length === 0) {
            throw new Error('Invalid rules format');
        }
        
        // Update rules
        this.rules = newRules;
        console.log('Engagement rules updated:', this.rules);
    }
    
    /**
     * Generates a daily wrap-up of engagements
     * @returns The generated wrap-up text
     */
    public async generateDailyWrapup(): Promise<string> {
        try {
            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Get all engagements for today
            const { data, error } = await this.supabaseService.client
                .from('engagement_metrics')
                .select('likes, comments, views, platform')
                .eq('date', today.toISOString().split('T')[0]);
                
            if (error) {
                throw error;
            }
            
            // If no engagements, return early
            if (!data || data.length === 0) {
                return "No engagements today. Marvin's digital tumbleweeds are rolling through an empty landscape.";
            }
            
            // Calculate total engagements
            const totalLikes = data.reduce((sum, record) => sum + (record.likes || 0), 0);
            const totalComments = data.reduce((sum, record) => sum + (record.comments || 0), 0);
            const totalViews = data.reduce((sum, record) => sum + (record.views || 0), 0);
            
            // For testing purposes, use some sample top users
            const topUsers = ['tech_enthusiast', 'ai_lover', 'digital_artist'].slice(0, Math.min(3, data.length));
                
            // Build context for Grok
            let context = "Summarize Marvin's day on Twitter with snarky charm. ";
            
            if (topUsers.length > 0) {
                context += `Mention that ${topUsers.map(u => `@${u}`).join(', ')} were particularly active today. `;
            }
            
            if (totalLikes > 0) {
                context += `${totalLikes} people liked Marvin's posts. `;
            }
            
            if (totalComments > 0) {
                context += `${totalComments} people commented on Marvin's content. `;
            }
            
            if (totalViews > 0) {
                context += `Marvin's posts were viewed ${totalViews} times. `;
            }
            
            context += "Make it feel like Marvin is barely holding back sarcasm.";
            
            // Generate the wrap-up
            const wrapup = await this.grokService.generateHumorousReply(context);
            return wrapup;
        } catch (error) {
            console.error('Error generating daily wrap-up:', error);
            return "Error generating wrap-up. Marvin's analytics module has gone on strike.";
        }
    }
}
