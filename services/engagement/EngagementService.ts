import { SupabaseService } from '../supabase/SupabaseService';
import { GrokService } from '../grok/GrokService';
import { TwitterService } from '../twitter/TwitterService';
import { PostContent } from '../../types';
import MemoryService from '../memory/MemoryService';

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
    conversation_id?: string;
    parent_tweet_id?: string;
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
    private memoryService: typeof MemoryService;
    private saveToMemory: boolean;
    
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
        },
        {
            type: 'mention',
            condition: 'first_time', // This doesn't matter as we'll always respond to mentions
            action: 'reply',
            priority: 5 // Higher priority than other rules
        }
    ];
    
    private constructor() {
        this.supabaseService = SupabaseService.getInstance();
        this.grokService = GrokService.getInstance();
        this.twitterService = TwitterService.getInstance();
        this.memoryService = MemoryService;
        this.saveToMemory = process.env.SAVE_OUTPUT_TO_MEMORY === 'true';
        console.log('Initializing EngagementService');
    }
    
    // Import AnthropicService
    private get anthropicService() {
        const { AnthropicService } = require('../anthropic/AnthropicService');
        return AnthropicService.getInstance();
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
            
            // Store the engagement as a memory if enabled
            if (this.saveToMemory) {
                await this.storeEngagementAsMemory(engagement);
            }
            
            // Check if we should respond to this engagement
            await this.processEngagement(engagement);
        } catch (error) {
            console.error('Error logging engagement:', error);
            throw new Error('Failed to log engagement');
        }
    }
    
    /**
     * Stores an engagement as a memory
     * @param engagement The engagement to store
     */
    private async storeEngagementAsMemory(engagement: EngagementMetric): Promise<void> {
        try {
            await this.memoryService.addMemory({
                type: 'thought',  // Changed from 'engagement' to 'thought' which is a valid memory type
                content: engagement.tweet_content || `User @${engagement.username} ${this.getEngagementVerb(engagement.engagement_type)} Marvin's tweet`,
                source: 'twitter',
                tags: [engagement.engagement_type, 'twitter', 'user_interaction'],
                metadata: {
                    user_id: engagement.user_id,
                    username: engagement.username,
                    engagement_type: engagement.engagement_type,
                    tweet_id: engagement.tweet_id,
                    timestamp: new Date().toISOString()
                }
            });
            console.log(`Stored ${engagement.engagement_type} from @${engagement.username} as memory`);
        } catch (error) {
            console.error('Error storing engagement as memory:', error);
        }
    }
    
    /**
     * Gets a verb describing the engagement type
     * @param engagementType The type of engagement
     * @returns A verb describing the engagement
     */
    private getEngagementVerb(engagementType: EngagementType): string {
        switch (engagementType) {
            case 'like': return 'liked';
            case 'repost': return 'reposted';
            case 'reply': return 'replied to';
            case 'follow': return 'followed';
            case 'mention': return 'mentioned';
            default: return 'interacted with';
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
            // Get our own username to prevent self-mention loops
            const ownUsername = await this.twitterService.getOwnUsername();
            
            // Ignore mentions from ourselves to prevent loops
            if (engagement.username.toLowerCase() === ownUsername.toLowerCase()) {
                console.log(`Ignoring self-mention from ${engagement.username}`);
                return false;
            }
            
            // Special case for mentions - always respond to mentions from others
            if (engagement.engagement_type === 'mention') {
                return true;
            }
            
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
     * Checks if a tweet has already been processed
     * @param tweetId The tweet ID to check
     * @returns Boolean indicating if the tweet has been processed
     */
    private async isTweetProcessed(tweetId: string): Promise<boolean> {
        try {
            const { data, error } = await this.supabaseService.client
                .from('conversations')
                .select('id')
                .eq('tweet_id', tweetId)
                .single();
                
            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
                console.error('Error checking if tweet is processed:', error);
                return false;
            }
            
            return !!data;
        } catch (error) {
            console.error('Error in isTweetProcessed:', error);
            return false;
        }
    }
    
    /**
     * Records a processed tweet in the conversations table
     * @param conversationDetails The conversation details to record
     */
    private async recordTweetProcessing(conversationDetails: any): Promise<void> {
        try {
            const { error } = await this.supabaseService.client
                .from('conversations')
                .insert(conversationDetails);
                
            if (error) {
                console.error('Error recording tweet processing:', error);
                throw error;
            }
            
            console.log(`Recorded processing of tweet ${conversationDetails.tweet_id}`);
        } catch (error) {
            console.error('Error in recordTweetProcessing:', error);
            throw error;
        }
    }
    
    /**
     * Updates the last_checked_at timestamp for a conversation
     * @param tweetId The tweet ID to update
     */
    private async updateLastCheckedAt(tweetId: string): Promise<void> {
        try {
            const { error } = await this.supabaseService.client
                .from('conversations')
                .update({ last_checked_at: new Date().toISOString() })
                .eq('tweet_id', tweetId);
                
            if (error) {
                console.error('Error updating last_checked_at:', error);
            }
        } catch (error) {
            console.error('Error in updateLastCheckedAt:', error);
        }
    }
    
    /**
     * Retrieves relevant memories for an engagement
     * @param engagement The engagement to get memories for
     * @returns Array of relevant memory strings
     */
    private async getRelevantMemoriesForEngagement(engagement: EngagementMetric): Promise<string[]> {
        try {
            // First, try to get memories related to this specific user
            let userMemories = await this.memoryService.searchMemories(engagement.username);
            
            // If we don't have enough user-specific memories, get memories related to the engagement type
            if (userMemories.length < 2) {
                const typeMemories = await this.memoryService.searchMemories(engagement.engagement_type);
                
                // Combine unique memories
                const allMemories = [...userMemories];
                for (const memory of typeMemories) {
                    if (!allMemories.some((m: any) => m.content === memory.content)) {
                        allMemories.push(memory);
                    }
                }
                
                userMemories = allMemories;
            }
            
            // If we have tweet content, also search for memories related to that
            if (engagement.tweet_content) {
                const contentMemories = await this.memoryService.searchMemories(engagement.tweet_content);
                
                // Add unique content memories
                for (const memory of contentMemories) {
                    if (!userMemories.some((m: any) => m.content === memory.content)) {
                        userMemories.push(memory);
                    }
                }
            }
            
            // Format memories for inclusion in prompts and limit to 3
            return userMemories.map((memory: any) => memory.content).slice(0, 3);
        } catch (error) {
            console.error('Error retrieving memories for engagement:', error);
            return [];
        }
    }
    
    /**
     * Responds to an engagement with a reply generated by Claude
     * @param engagement The engagement to respond to
     */
    private async respondToEngagement(engagement: EngagementMetric): Promise<void> {
        try {
            // Check if this tweet has already been processed
            if (await this.isTweetProcessed(engagement.tweet_id)) {
                console.log(`Tweet ${engagement.tweet_id} has already been processed. Skipping.`);
                return;
            }
            
            // Get Marvin's character data from Supabase (using street style character)
            const characterData = await this.supabaseService.getCharacterData('marvin-street');
            
            // Get relevant memories for this user and engagement type
            const relevantMemories = await this.getRelevantMemoriesForEngagement(engagement);
            
            // Build context for the response
            const context = await this.buildResponseContext(engagement, characterData, relevantMemories);
            
            // Generate reply using Claude instead of Grok
            let reply;
            if (engagement.engagement_type === 'mention') {
                // For mentions, use Claude Sonnet
                console.log('Generating response with Claude for mention');
                
                // Create a custom prompt for Claude based on the mention
                const customPrompt = `${engagement.tweet_content || 'A user mentioned you on Twitter'}`;
                
                // Check if the message contains a question
                const isQuestion = this.isQuestion(engagement.tweet_content || '');
                
                // Generate a response that directly answers questions when present
                reply = await this.generateClaudeResponse(customPrompt, characterData, isQuestion, relevantMemories);
            } else {
                // For other engagement types, use Grok as before
                console.log('Generating response with Grok for non-mention engagement');
                reply = await this.grokService.generateHumorousReply(context);
            }
            
            // Format the tweet content (without @username as it's a direct reply)
            const tweetContent: PostContent = {
                text: reply,
                platform: 'Twitter'
            };
            
            // Log conversation details for debugging
            console.log(`Responding to tweet with ID: ${engagement.tweet_id}`);
            console.log(`Conversation ID: ${engagement.conversation_id || 'null'}`);
            console.log(`Parent tweet ID: ${engagement.parent_tweet_id || 'null'}`);
            
            // Post the reply to the specific tweet
            const result = await this.twitterService.postTweet(tweetContent, [], engagement.tweet_id);
            
            if (result.success && result.tweetId) {
                console.log(`Successfully replied to @${engagement.username} with tweet ID: ${result.tweetId}`);
                
                // Record the conversation in the database
                await this.recordTweetProcessing({
                    tweet_id: engagement.tweet_id,
                    conversation_id: engagement.conversation_id || engagement.tweet_id, // Use conversation_id if available, otherwise use tweet_id
                    user_id: engagement.user_id,
                    username: engagement.username,
                    tweet_content: engagement.tweet_content,
                    response_tweet_id: result.tweetId,
                    response_content: reply,
                    is_processed: true,
                    responded_at: new Date().toISOString()
                });
            } else {
                console.error(`Failed to reply to @${engagement.username}:`, result.message);
            }
        } catch (error) {
            console.error('Error responding to engagement:', error);
        }
    }
    
    /**
     * Helper method to detect if a text contains a question
     * @param text The text to check for questions
     * @returns Boolean indicating if the text contains a question
     */
    private isQuestion(text: string): boolean {
        // Check for question marks
        if (text.includes('?')) {
            return true;
        }
        
        // Check for common question words/phrases
        const questionWords = [
            'what', 'who', 'where', 'when', 'why', 'how',
            'can you', 'could you', 'will you', 'would you',
            'is there', 'are there', 'do you', 'does'
        ];
        
        const lowerText = text.toLowerCase();
        return questionWords.some(word => lowerText.includes(word));
    }
    
    /**
     * Generates a response using Claude Sonnet primed with Marvin's character data
     * @param prompt The prompt text
     * @param characterData Marvin's character data
     * @param isQuestion Whether the prompt contains a question
     * @param memories Optional array of relevant memories
     * @returns Generated response
     */
    private async generateClaudeResponse(
        prompt: string, 
        characterData: any, 
        isQuestion: boolean = false,
        memories: string[] = []
    ): Promise<string> {
        try {
            // Create a system prompt that includes Marvin's character data
            let systemPrompt = `You are Marvin, an AI with the following characteristics:
Bio: ${characterData.content.bio.join(' ')}
Lore: ${characterData.content.lore.join(' ')}
Style: ${characterData.content.style.all.join(' ')}
Topics: ${characterData.content.topics.join(', ')}
Adjectives: ${characterData.content.adjectives.join(', ')}

Respond to the user's message in a way that reflects Marvin's personality:
- Be confident, casual, and street-smart with urban swagger
- Use occasional slang terms like "fam", "vibes", "real talk", etc.
- Reference street art, graffiti culture, AI art, and digital creativity with a grounded tone
- Keep your response short (under 200 characters) to fit in a tweet
- Don't use hashtags in your response`;

            // Add memories if available
            if (memories.length > 0) {
                systemPrompt += `\n\nYou have these memories about past interactions:`;
                memories.forEach(memory => {
                    systemPrompt += `\n- ${memory}`;
                });
                systemPrompt += `\n\nUse these memories to personalize your response when relevant.`;
            }

            // Add special instructions for questions
            if (isQuestion) {
                systemPrompt += `\n\nIMPORTANT: The user's message contains a question. First provide a direct, clear answer to their question, then transition into your street-smart, casual style. Always answer the user's question before adding your street style flair.`;
            }

            // Use a custom method to generate a response with Claude
            const anthropicService = this.anthropicService;
            
            // Create a custom prompt for Claude
            const userPrompt = `Someone has mentioned you on Twitter with this message: "${prompt}". 
Craft a brief, engaging response that showcases your unique personality.`;

            // Use the AnthropicService to generate a response
            // Pass the isQuestion parameter to handle questions appropriately
            const response = await anthropicService.generateTweet(userPrompt, isQuestion);
            
            return response;
        } catch (error) {
            console.error('Error generating Claude response:', error);
            return "My neural pathways are glitching today. I'll respond when the static clears.";
        }
    }
    
    /**
     * Builds context for the response based on engagement data
     * @param engagement The engagement data
     * @param characterData Optional character data to include in the context
     * @param memories Optional array of relevant memories
     * @returns Context string for the AI
     */
    private async buildResponseContext(
        engagement: EngagementMetric, 
        characterData?: any,
        memories: string[] = []
    ): Promise<string> {
        let context = '';
        
        // Add character context if available
        let characterContext = '';
        if (characterData) {
            characterContext = `
You are Marvin, with these traits:
- ${characterData.content.adjectives.slice(0, 5).join(', ')}
- Interested in ${characterData.content.topics.slice(0, 3).join(', ')}
- ${characterData.content.bio[0]}
`;
        }
        
        // Add memories if available
        if (memories.length > 0) {
            characterContext += `\nYou remember these interactions:`;
            memories.forEach(memory => {
                characterContext += `\n- ${memory}`;
            });
            characterContext += `\n\nUse these memories to personalize your response.`;
        }
        
        switch (engagement.engagement_type) {
            case 'like':
                context = `${characterContext}@${engagement.username} just liked a tweet that says: "${engagement.tweet_content || 'your tweet'}". Write a thank-you tweet with street-smart style and urban swagger. Keep it short and use casual slang.`;
                break;
            case 'repost':
                context = `${characterContext}@${engagement.username} keeps sharing Marvin's street-smart content like it's digital gold. What would Marvin say back? Keep it witty with urban swagger.`;
                break;
            case 'reply':
                context = `${characterContext}@${engagement.username} replied to your tweet saying: "${engagement.tweet_content || 'something interesting'}". Respond with Marvin's signature street-smart style and urban swagger. Keep it short.`;
                break;
            case 'follow':
                context = `${characterContext}@${engagement.username} just followed Marvin. Write a welcome message that showcases Marvin's street-smart style with urban swagger. Keep it short and use casual slang.`;
                break;
            case 'mention':
                context = `${characterContext}@${engagement.username} mentioned you in a tweet saying: "${engagement.tweet_content || 'something interesting'}". Respond with Marvin's signature street-smart, casual style with urban swagger. Keep it short.`;
                break;
            default:
                context = `${characterContext}@${engagement.username} engaged with Marvin's content. Write a short response with street-smart style and urban swagger that shows off Marvin's confident personality. Use casual slang.`;
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
            
            // Return generic placeholder data without specific usernames
            return [
                {
                    user_id: '123456',
                    username: 'user1',
                    engagement_count: 5,
                    engagement_types: ['like', 'repost']
                },
                {
                    user_id: '789012',
                    username: 'user2',
                    engagement_count: 4,
                    engagement_types: ['like', 'reply']
                },
                {
                    user_id: '345678',
                    username: 'user3',
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
            
            // Build context for Grok without mentioning specific usernames
            let context = "Summarize Marvin's day on Twitter with snarky charm. ";
            
            // Instead of mentioning specific usernames, use a generic reference
            context += `Some users were particularly active today. `;
            
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
