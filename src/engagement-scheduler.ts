import { TwitterService } from '../services/twitter/TwitterService';
import { EngagementService } from '../services/engagement/EngagementService';
import { PostContent } from '../types';

/**
 * Scheduler for engagement monitoring and daily wrap-up
 * This script sets up scheduled tasks for engagement features with optimized API usage
 */
class EngagementScheduler {
    private twitterService: TwitterService;
    private engagementService: EngagementService;
    private cachedUsername: string | null = null;
    private lastUsernameCheck: Date | null = null;
    
    constructor() {
        this.twitterService = TwitterService.getInstance();
        this.engagementService = EngagementService.getInstance();
        
        console.log('Engagement scheduler initialized with API optimization');
    }
    
    /**
     * Start the scheduler
     */
    public start(): void {
        console.log('Starting engagement scheduler with smart time-based monitoring');
        
        // Schedule smart engagement monitoring with time-based intervals
        this.scheduleSmartEngagementMonitoring();
        
        // Schedule daily wrap-up at 9:00 PM
        // this.scheduleDailyWrapup(21, 0);  // Commented out to stop the 9 PM Grok posts
        
        console.log('Engagement scheduler started with optimized API usage');
    }
    
    /**
     * Schedule smart engagement monitoring with time-based intervals
     * Peak hours: 11am-5pm (1-hour intervals) = 6 calls
     * Off-peak: 6am-11am, 5pm-10pm (2-hour intervals) = 5 calls  
     * Overnight: 10pm-6am (4-hour intervals) = 2 calls
     * Total: ~13 calls/day instead of 48
     */
    private scheduleSmartEngagementMonitoring(): void {
        console.log('Setting up smart time-based engagement monitoring');
        
        // Run initial check
        this.monitorEngagements();
        
        // Schedule the next check
        this.scheduleNextEngagementCheck();
    }
    
    /**
     * Schedule the next engagement check based on current time
     */
    private scheduleNextEngagementCheck(): void {
        const now = new Date();
        const currentHour = now.getHours();
        let nextCheckMinutes: number;
        let description: string;
        
        // Determine next check interval based on time of day
        if (currentHour >= 11 && currentHour < 17) {
            // Peak hours: 11am-5pm - check every hour
            nextCheckMinutes = 60;
            description = 'peak hours';
        } else if ((currentHour >= 6 && currentHour < 11) || (currentHour >= 17 && currentHour < 22)) {
            // Off-peak: 6am-11am, 5pm-10pm - check every 2 hours
            nextCheckMinutes = 120;
            description = 'off-peak hours';
        } else {
            // Overnight: 10pm-6am - check every 4 hours
            nextCheckMinutes = 240;
            description = 'overnight hours';
        }
        
        console.log(`Next engagement check in ${nextCheckMinutes} minutes (${description})`);
        
        setTimeout(() => {
            this.monitorEngagements();
            this.scheduleNextEngagementCheck(); // Schedule the next one
        }, nextCheckMinutes * 60 * 1000);
    }
    
    /**
     * Check if we're in emergency quota mode (< 30 remaining calls)
     */
    private async isEmergencyQuotaMode(): Promise<boolean> {
        try {
            // Check if we have token bucket info
            const tokenBucket = (this.twitterService as any).tokenBucket;
            if (tokenBucket && tokenBucket.tokens < 30) {
                console.log(`Emergency quota mode activated. Only ${Math.floor(tokenBucket.tokens)} API calls remaining.`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking quota mode:', error);
            return false;
        }
    }
    
    /**
     * Get cached username or fetch if needed (cache for 24 hours)
     */
    private async getCachedUsername(): Promise<string | null> {
        const now = new Date();
        
        // Check if we have a cached username that's less than 24 hours old
        if (this.cachedUsername && this.lastUsernameCheck) {
            const hoursSinceCheck = (now.getTime() - this.lastUsernameCheck.getTime()) / (1000 * 60 * 60);
            if (hoursSinceCheck < 24) {
                return this.cachedUsername;
            }
        }
        
        // Fetch fresh username
        try {
            this.cachedUsername = await this.twitterService.getOwnUsername();
            this.lastUsernameCheck = now;
            console.log(`Cached username: ${this.cachedUsername}`);
            return this.cachedUsername;
        } catch (error) {
            console.error('Error caching username:', error);
            return this.cachedUsername; // Return old cached value if available
        }
    }
    
    /**
     * Schedule engagement monitoring at regular intervals (legacy method)
     * @param intervalMinutes Interval in minutes
     */
    private scheduleEngagementMonitoring(intervalMinutes: number): void {
        console.log(`Scheduling engagement monitoring every ${intervalMinutes} minutes`);
        
        // Run immediately
        this.monitorEngagements();
        
        // Schedule for future runs
        setInterval(() => {
            this.monitorEngagements();
        }, intervalMinutes * 60 * 1000);
    }
    
    /**
     * Schedule daily wrap-up at a specific time
     * @param hour Hour of the day (0-23)
     * @param minute Minute of the hour (0-59)
     */
    private scheduleDailyWrapup(hour: number, minute: number): void {
        console.log(`Scheduling daily wrap-up at ${hour}:${minute.toString().padStart(2, '0')}`);
        
        const calculateNextRun = () => {
            const now = new Date();
            const nextRun = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                hour,
                minute,
                0
            );
            
            // If the time has already passed today, schedule for tomorrow
            if (nextRun.getTime() <= now.getTime()) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            
            return nextRun.getTime() - now.getTime();
        };
        
        // Schedule the first run
        const timeUntilFirstRun = calculateNextRun();
        console.log(`First daily wrap-up in ${Math.round(timeUntilFirstRun / (60 * 1000))} minutes`);
        
        setTimeout(() => {
            this.generateAndPostDailyWrapup();
            
            // Schedule subsequent runs every 24 hours
            setInterval(() => {
                this.generateAndPostDailyWrapup();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilFirstRun);
    }
    
    /**
     * Monitor engagements from Twitter with optimized API usage
     */
    private async monitorEngagements(): Promise<void> {
        try {
            console.log('Running scheduled engagement monitoring');
            
            // Check if we're rate limited
            if (this.twitterService.isRateLimited) {
                const resetTime = this.twitterService.rateLimitResetTime;
                console.log(`Skipping engagement monitoring due to rate limit. Will reset at ${resetTime?.toLocaleString() || 'unknown time'}`);
                return;
            }
            
            // Check if we're in emergency quota mode
            if (await this.isEmergencyQuotaMode()) {
                console.log('Skipping engagement monitoring due to emergency quota mode');
                return;
            }
            
            // Use optimized monitoring that only checks mentions (saves API calls)
            await this.twitterService.monitorEngagements();
            
            console.log('Engagement monitoring completed');
        } catch (error) {
            console.error('Error in scheduled engagement monitoring:', error);
        }
    }
    
    /**
     * Generate and post daily wrap-up
     */
    private async generateAndPostDailyWrapup(): Promise<void> {
        try {
            console.log('Generating daily engagement wrap-up');
            
            // Check if we're rate limited
            if (this.twitterService.isRateLimited) {
                const resetTime = this.twitterService.rateLimitResetTime;
                console.log(`Skipping daily wrap-up due to rate limit. Will reset at ${resetTime?.toLocaleString() || 'unknown time'}`);
                return;
            }
            
            // Check if we're in emergency quota mode
            if (await this.isEmergencyQuotaMode()) {
                console.log('Skipping daily wrap-up due to emergency quota mode');
                return;
            }
            
            // Generate the wrap-up
            const wrapupText = await this.engagementService.generateDailyWrapup();
            
            // Only post if there's something interesting to say
            if (wrapupText && !wrapupText.includes('No engagements today')) {
                console.log('Posting daily wrap-up:', wrapupText);
                
                // Create the tweet content (without hashtags)
                const tweetContent: PostContent = {
                    text: wrapupText,
                    platform: 'Twitter'
                };
                
                // Format the content (this will remove any hashtags)
                const formattedContent = this.twitterService.formatContent(tweetContent);
                
                // Post the tweet
                const result = await this.twitterService.postTweet(formattedContent);
                
                if (result.success) {
                    console.log('Daily wrap-up posted successfully');
                } else {
                    console.error('Failed to post daily wrap-up:', result.message);
                }
            } else {
                console.log('No significant engagements today, skipping wrap-up post');
            }
        } catch (error) {
            console.error('Error in daily wrap-up:', error);
        }
    }
}

// Export the scheduler
export const engagementScheduler = new EngagementScheduler();
