import { TwitterService } from '../services/twitter/TwitterService';
import { EngagementService } from '../services/engagement/EngagementService';
import { PostContent } from '../types';

/**
 * Scheduler for engagement monitoring and daily wrap-up
 * This script sets up scheduled tasks for engagement features
 */
class EngagementScheduler {
    private twitterService: TwitterService;
    private engagementService: EngagementService;
    
    constructor() {
        this.twitterService = TwitterService.getInstance();
        this.engagementService = EngagementService.getInstance();
        
        console.log('Engagement scheduler initialized');
    }
    
    /**
     * Start the scheduler
     */
    public start(): void {
        console.log('Starting engagement scheduler');
        
        // Schedule engagement monitoring every 30 minutes
        this.scheduleEngagementMonitoring(30);
        
        // Schedule daily wrap-up at 9:00 PM
        // this.scheduleDailyWrapup(21, 0);  // Commented out to stop the 9 PM Grok posts
        
        console.log('Engagement scheduler started');
    }
    
    /**
     * Schedule engagement monitoring at regular intervals
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
     * Monitor engagements from Twitter
     */
    private async monitorEngagements(): Promise<void> {
        try {
            console.log('Running scheduled engagement monitoring');
            
            // Get recent tweets from our account
            // For now, we'll just monitor mentions
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
            
            // Generate the wrap-up
            const wrapupText = await this.engagementService.generateDailyWrapup();
            
            // Only post if there's something interesting to say
            if (wrapupText && !wrapupText.includes('No engagements today')) {
                console.log('Posting daily wrap-up:', wrapupText);
                
                // Create the tweet content
                const tweetContent: PostContent = {
                    text: wrapupText,
                    hashtags: ['MarvinDigitalDebrief', 'AILife'],
                    platform: 'Twitter'
                };
                
                // Post the tweet
                const result = await this.twitterService.postTweet(tweetContent);
                
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
