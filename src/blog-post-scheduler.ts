import { TwitterService } from '../services/twitter/TwitterService';
import { SupabaseService } from '../services/supabase/SupabaseService';
import { PostContent } from '../types';
import { config } from '../config';

/**
 * Utility for retrying operations with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
    let retries = 0;
    let delay = initialDelay;
    
    while (true) {
        try {
            return await operation();
        } catch (error: any) {
            retries++;
            
            // Check if we've exceeded max retries
            if (retries >= maxRetries) {
                throw error;
            }
            
            // Check if this is a rate limit error (Twitter API returns 429)
            const isRateLimit = error.code === 429;
            
            // If it's a rate limit error, use the retry-after header if available
            if (isRateLimit && error.response?.headers?.['retry-after']) {
                const retryAfter = parseInt(error.response.headers['retry-after'], 10) * 1000;
                delay = retryAfter || delay * 2;
            } else {
                // Otherwise use exponential backoff
                delay *= 2;
            }
            
            console.log(`Retrying operation after ${delay}ms (attempt ${retries} of ${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Scheduler for checking and posting blog posts to Twitter
 */
class BlogPostScheduler {
    private twitterService: TwitterService;
    private supabaseService: SupabaseService;
    private postQueue: any[] = []; // Queue for failed posts to retry later
    
    constructor() {
        this.twitterService = TwitterService.getInstance();
        this.supabaseService = SupabaseService.getInstance();
        console.log('Blog post scheduler initialized');
    }
    
    /**
     * Start the scheduler
     */
    public start(): void {
        console.log('Starting blog post scheduler');
        
        // Schedule blog post checks based on configuration
        config.blogPostScheduler.scheduleDays.forEach(day => {
            this.scheduleBlogPostCheck(
                day, 
                config.blogPostScheduler.scheduleHour, 
                config.blogPostScheduler.scheduleMinute
            );
        });
        
        // Process any queued posts every hour
        this.scheduleQueueProcessing(60);
        
        console.log('Blog post scheduler started');
    }
    
    /**
     * Schedule blog post check on a specific day of the week
     * @param dayOfWeek Day of the week (0-6, where 0 is Sunday)
     * @param hour Hour of the day (0-23)
     * @param minute Minute of the hour (0-59)
     */
    private scheduleBlogPostCheck(dayOfWeek: number, hour: number, minute: number): void {
        console.log(`Scheduling blog post check for day ${dayOfWeek} at ${hour}:${minute.toString().padStart(2, '0')}`);
        
        const calculateNextRun = () => {
            const now = new Date();
            const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7;
            
            const nextRun = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + daysUntilNext,
                hour,
                minute,
                0
            );
            
            // If the time has already passed today and it's the target day, schedule for next week
            if (daysUntilNext === 0 && nextRun.getTime() <= now.getTime()) {
                nextRun.setDate(nextRun.getDate() + 7);
            }
            
            return nextRun.getTime() - now.getTime();
        };
        
        // Schedule the first run
        const timeUntilFirstRun = calculateNextRun();
        const daysUntilFirstRun = timeUntilFirstRun / (1000 * 60 * 60 * 24);
        console.log(`First blog post check in ${daysUntilFirstRun.toFixed(2)} days`);
        
        setTimeout(() => {
            this.checkAndPostBlogPosts();
            
            // Schedule subsequent runs every week on the same day
            setInterval(() => {
                this.checkAndPostBlogPosts();
            }, 7 * 24 * 60 * 60 * 1000);
        }, timeUntilFirstRun);
    }
    
    /**
     * Schedule processing of the failed posts queue
     * @param intervalMinutes Interval in minutes
     */
    private scheduleQueueProcessing(intervalMinutes: number): void {
        console.log(`Scheduling queue processing every ${intervalMinutes} minutes`);
        
        setInterval(() => {
            this.processQueue();
        }, intervalMinutes * 60 * 1000);
    }
    
    /**
     * Process any posts in the retry queue
     */
    private async processQueue(): Promise<void> {
        if (this.postQueue.length === 0) {
            return;
        }
        
        console.log(`Processing ${this.postQueue.length} queued posts`);
        
        // Take up to 5 posts from the queue to avoid rate limits
        const postsToProcess = this.postQueue.splice(0, 5);
        
        for (const post of postsToProcess) {
            try {
                await this.processBlogPost(post);
            } catch (error: any) {
                console.error(`Error processing queued post ${post.id}:`, error);
                // Put back in queue if it's a retryable error
                if (error.code === 429 || error.code >= 500) {
                    this.postQueue.push(post);
                }
            }
        }
    }
    
    /**
     * Check for blog posts ready to tweet and process them
     */
    private async checkAndPostBlogPosts(): Promise<void> {
        try {
            console.log('Checking for blog posts ready to tweet');
            
            // Query for the oldest blog post with "ready_to_tweet" status
            const { data: blogPosts, error } = await this.supabaseService.client
                .from('blog_posts')
                .select('*')
                .eq('status', 'ready_to_tweet')
                .order('created_at', { ascending: true }) // Get oldest first
                .limit(1); // Only get one post
                
            if (error) {
                console.error('Error fetching blog posts:', error);
                return;
            }
            
            if (blogPosts.length === 0) {
                console.log('No blog posts ready to tweet');
                return;
            }
            
            const post = blogPosts[0];
            console.log(`Found blog post ready to tweet: ${post.id} - ${post.title}`);
            
            // Process the single blog post
            try {
                await this.processBlogPost(post);
            } catch (error: any) {
                console.error(`Error processing blog post ${post.id}:`, error);
                // Add to retry queue if it's a retryable error
                if (error.code === 429 || error.code >= 500) {
                    this.postQueue.push(post);
                }
            }
        } catch (error: any) {
            console.error('Error in blog post check:', error);
        }
    }
    
    /**
     * Process a single blog post
     * @param post The blog post to process
     */
    private async processBlogPost(post: any): Promise<void> {
        console.log(`Processing blog post: ${post.id} - ${post.title}`);
        
        // Skip processing if in dry run mode
        if (config.blogPostScheduler.dryRun) {
            console.log(`[DRY RUN] Would post blog: ${post.title}`);
            console.log(`[DRY RUN] Content preview: ${this.createExcerpt(post.markdown, 100)}...`);
            
            // Update status in dry run mode if configured
            if (config.blogPostScheduler.updateStatusInDryRun) {
                await this.updateBlogPostStatus(post.id, 'posted');
            }
            
            return;
        }
        
        // Determine if we should post as a regular tweet or attempt X Article
        let postResult;
        
        if (config.blogPostScheduler.useXArticles && this.isXArticlesApiAvailable()) {
            // When X Articles API becomes available
            postResult = await this.postAsXArticle(post);
        } else {
            // For now, use regular tweets
            postResult = await this.postAsRegularTweet(post);
        }
        
        if (postResult.success) {
            console.log(`Successfully posted content for blog post: ${post.id}`);
            
            // Update blog post status and store tweet URL
            await this.updateBlogPostStatus(post.id, 'posted', postResult.tweetId);
            
            // Create tweet draft record
            await this.createTweetDraftRecord(
                post.id, 
                postResult.text, 
                postResult.tweetId,
                postResult.allTweetIds
            );
            
            // Optional: Send notification of successful posting
            if (config.blogPostScheduler.notifications?.enabled) {
                await this.sendNotification(
                    'Blog Post Published', 
                    `Successfully posted "${post.title}" to Twitter.`
                );
            }
        } else {
            console.error(`Failed to post content for blog post: ${post.id}`, postResult.message);
            
            // Add to retry queue if it's a retryable error
            if (postResult.retryable) {
                this.postQueue.push(post);
            }
        }
    }
    
    /**
     * Post blog content as a regular tweet
     * @param post The blog post to process
     */
    private async postAsRegularTweet(post: any): Promise<{ 
        success: boolean; 
        tweetId?: string; 
        allTweetIds?: string[];
        text: string; 
        message?: string;
        retryable?: boolean;
    }> {
        try {
            // Generate tweet content
            const tweetContent = this.generateTweetContent(post);
            
            // Check if content exceeds Premium character limit (25,000)
            if (tweetContent.text.length > 25000) {
                // If exceeds limit, create a thread instead
                return await this.postAsThread(post);
            }
            
            // Post to Twitter as a single tweet using retry utility
            const result = await retryWithBackoff(() => 
                this.twitterService.postTweet(tweetContent)
            );
            
            if (result.success) {
                return {
                    success: true,
                    tweetId: result.tweetId,
                    allTweetIds: [result.tweetId!],
                    text: tweetContent.text
                };
            } else {
                return {
                    success: false,
                    text: tweetContent.text,
                    message: result.message,
                    retryable: this.isRetryableError(result.error)
                };
            }
        } catch (error: any) {
            return {
                success: false,
                text: '',
                message: `Error posting tweet: ${error.message}`,
                retryable: this.isRetryableError(error)
            };
        }
    }
    
    /**
     * Post blog content as a thread
     * @param post The blog post to process
     */
    private async postAsThread(post: any): Promise<{ 
        success: boolean; 
        tweetId?: string; 
        allTweetIds?: string[];
        text: string; 
        message?: string;
        retryable?: boolean;
    }> {
        try {
            // Generate full content
            const fullContent = this.generateFullContent(post);
            
            // Split content into chunks for threading
            const chunks = this.splitContentForThread(fullContent);
            
            let previousTweetId: string | undefined;
            let firstTweetId: string | undefined;
            const allTweetIds: string[] = [];
            
            // Post each chunk as a reply to the previous tweet
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const threadIndicator = ` (${i+1}/${chunks.length})`;
                const tweetText = chunk.length + threadIndicator.length <= 280 
                    ? chunk + threadIndicator 
                    : chunk.substring(0, 280 - threadIndicator.length) + threadIndicator;
                
                const tweetContent = {
                    text: tweetText,
                    platform: 'Twitter'
                };
                
                // Post tweet with retry utility
                const result = await retryWithBackoff(() => 
                    this.twitterService.postTweet(
                        tweetContent, 
                        undefined, // No media IDs
                        previousTweetId // Reply to previous tweet if not the first one
                    )
                );
                
                if (!result.success) {
                    return {
                        success: false,
                        text: fullContent,
                        message: `Failed to post thread part ${i+1}: ${result.message}`,
                        retryable: this.isRetryableError(result.error)
                    };
                }
                
                // Store the tweet ID
                allTweetIds.push(result.tweetId!);
                
                // Store the first tweet ID
                if (i === 0) {
                    firstTweetId = result.tweetId;
                }
                
                // Update previous tweet ID for the next iteration
                previousTweetId = result.tweetId;
            }
            
            return {
                success: true,
                tweetId: firstTweetId,
                allTweetIds: allTweetIds,
                text: fullContent
            };
        } catch (error: any) {
            return {
                success: false,
                text: '',
                message: `Error posting thread: ${error.message}`,
                retryable: this.isRetryableError(error)
            };
        }
    }
    
    /**
     * Post blog content as an X Article (placeholder for future implementation)
     * @param post The blog post to process
     */
    private async postAsXArticle(post: any): Promise<{ 
        success: boolean; 
        tweetId?: string; 
        allTweetIds?: string[];
        text: string; 
        message?: string;
        retryable?: boolean;
    }> {
        // This is a placeholder for future implementation
        // Will be implemented when X Articles API becomes available
        return {
            success: false,
            text: '',
            message: 'X Articles API not yet implemented',
            retryable: false
        };
    }
    
    /**
     * Generate tweet content from a blog post
     * @param post The blog post
     */
    private generateTweetContent(post: any): PostContent {
        // Create a tweet with title, excerpt, and URL
        const excerpt = post.markdown ? this.createExcerpt(post.markdown, 100) : '';
        const tweetText = `${post.title}\n\n${excerpt}...\n\n${post.post_url || 'Read more on our website'}`;
        
        return {
            text: tweetText,
            platform: 'Twitter'
        };
    }
    
    /**
     * Generate full content for a thread or long post
     * @param post The blog post
     */
    private generateFullContent(post: any): string {
        // For threads or long posts, create a more comprehensive version
        return `${post.title}\n\n${this.markdownToPlainText(post.markdown)}\n\n${post.post_url || 'Read more on our website'}`;
    }
    
    /**
     * Create a short excerpt from markdown content
     * @param markdown The markdown content
     * @param length The desired excerpt length
     */
    private createExcerpt(markdown: string, length: number): string {
        // Convert markdown to plain text and create excerpt
        const plainText = this.markdownToPlainText(markdown);
        return plainText.length > length 
            ? plainText.substring(0, length) 
            : plainText;
    }
    
    /**
     * Convert markdown to plain text
     * @param markdown The markdown content
     */
    private markdownToPlainText(markdown: string): string {
        // Simple markdown to plain text conversion
        // This is a basic implementation that handles common markdown elements
        return markdown
            .replace(/#+\s+(.*)/g, '$1') // Remove headings
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
            .replace(/`(.*?)`/g, '$1') // Remove inline code
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/>\s+(.*)/g, '$1') // Remove blockquotes
            .replace(/!\[(.*?)\]\(.*?\)/g, '[Image: $1]') // Replace images with text
            .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
            .trim();
    }
    
    /**
     * Split content into chunks for a thread
     * @param content The content to split
     */
    private splitContentForThread(content: string): string[] {
        const maxLength = 280;
        const chunks: string[] = [];
        
        let remainingText = content;
        while (remainingText.length > 0) {
            // Find a good breaking point (end of sentence or paragraph)
            let breakPoint = Math.min(maxLength, remainingText.length);
            
            if (breakPoint < remainingText.length) {
                // Try to break at a paragraph
                const paragraphBreak = remainingText.lastIndexOf('\n\n', breakPoint);
                if (paragraphBreak > maxLength / 2) {
                    breakPoint = paragraphBreak + 2;
                } else {
                    // Try to break at a sentence
                    const sentenceBreak = remainingText.lastIndexOf('. ', breakPoint);
                    if (sentenceBreak > maxLength / 2) {
                        breakPoint = sentenceBreak + 2;
                    } else {
                        // Try to break at a space
                        const spaceBreak = remainingText.lastIndexOf(' ', breakPoint);
                        if (spaceBreak > maxLength / 2) {
                            breakPoint = spaceBreak + 1;
                        }
                    }
                }
            }
            
            chunks.push(remainingText.substring(0, breakPoint).trim());
            remainingText = remainingText.substring(breakPoint).trim();
        }
        
        return chunks;
    }
    
    /**
     * Update blog post status in the database
     * @param postId The blog post ID
     * @param status The new status
     * @param tweetId Optional tweet ID
     */
    private async updateBlogPostStatus(postId: string, status: string, tweetId?: string): Promise<void> {
        try {
            // Get tweet URL if we have a tweet ID
            let postUrl = null;
            if (tweetId) {
                // Construct the tweet URL
                const username = await this.twitterService.getOwnUsername();
                postUrl = `https://twitter.com/${username}/status/${tweetId}`;
            }
            
            // Update the blog post status
            const { error } = await this.supabaseService.client
                .from('blog_posts')
                .update({ 
                    status: status,
                    post_url: postUrl
                })
                .eq('id', postId);
                
            if (error) {
                console.error(`Error updating blog post ${postId}:`, error);
            }
        } catch (error: any) {
            console.error(`Error updating blog post ${postId}:`, error);
        }
    }
    
    /**
     * Create a tweet draft record in the database
     * @param blogPostId The blog post ID
     * @param text The tweet text
     * @param tweetId Optional tweet ID
     * @param allTweetIds Optional array of all tweet IDs (for threads)
     */
    private async createTweetDraftRecord(
        blogPostId: string, 
        text: string, 
        tweetId?: string,
        allTweetIds?: string[]
    ): Promise<void> {
        try {
            // Construct the tweet URL if we have a tweet ID
            let postUrl = null;
            if (tweetId) {
                const username = await this.twitterService.getOwnUsername();
                postUrl = `https://twitter.com/${username}/status/${tweetId}`;
            }
            
            // Create a record in the tweet_drafts table
            const { error } = await this.supabaseService.client
                .from('tweet_drafts')
                .insert({
                    blog_post_id: blogPostId,
                    text: text,
                    post_url: postUrl,
                    status: 'posted',
                    // Store all tweet IDs as metadata (if available)
                    metadata: allTweetIds ? { tweet_ids: allTweetIds } : null
                });
                
            if (error) {
                console.error(`Error creating tweet draft record:`, error);
            }
        } catch (error: any) {
            console.error(`Error creating tweet draft record:`, error);
        }
    }
    
    /**
     * Check if X Articles API is available
     */
    private isXArticlesApiAvailable(): boolean {
        // This is a placeholder - in reality, you might check for API availability
        // or use a feature flag in your configuration
        return false;
    }
    
    /**
     * Check if an error is retryable
     * @param error The error to check
     */
    private isRetryableError(error: any): boolean {
        // Rate limit errors and server errors are retryable
        return error && (error.code === 429 || error.code >= 500);
    }
    
    /**
     * Send a notification
     * @param title The notification title
     * @param message The notification message
     */
    private async sendNotification(title: string, message: string): Promise<void> {
        // This is a placeholder for a notification system
        // In a real implementation, you might send an email, Slack message, etc.
        console.log(`[NOTIFICATION] ${title}: ${message}`);
    }
}

// Export the scheduler
export const blogPostScheduler = new BlogPostScheduler();
