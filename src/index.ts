import { TwitterService } from '../services/twitter/TwitterService';
import { ContentGenerator } from '../services/content/ContentGenerator';
import { ImageTweetService } from '../services/content/ImageTweetService';
import { startWebServer } from './web-server-with-rate-settings';
import { engagementScheduler } from './engagement-scheduler';
import { config } from '../config';

// Categories for tweet generation
const categories = [
    'Drip Drop',
    'Toolbox',
    'Neural Notes',
    'Field Notes',
    'Push Lab',
    'News'
];

// Function to generate and post a tweet
async function generateAndPostTweet() {
    try {
        // Initialize services
        const twitterService = TwitterService.getInstance();
        const contentGenerator = ContentGenerator.getInstance();
        
        console.log('Initializing content generator...');
        await contentGenerator.initialize();

        // Select a random category
        const category = categories[Math.floor(Math.random() * categories.length)];
        console.log(`Selected category: ${category}`);
        
        try {
            // Generate content using Marvin's character
            console.log('Generating tweet content...');
            const tweetContent = await contentGenerator.generateTweet(category);
            
            // Format the content for Twitter
            const formattedContent = twitterService.formatContent(tweetContent);
            
            console.log('\n--- Generated Tweet Content ---');
            console.log(formattedContent.text);
            if (formattedContent.hashtags && formattedContent.hashtags.length > 0) {
                console.log(`Hashtags: ${formattedContent.hashtags.join(', ')}`);
            }
            console.log('-------------------------------\n');
            
            // Try to post the tweet
            console.log('Attempting to post to Twitter...');
            const postResult = await twitterService.postTweet(formattedContent);
            
            if (postResult.success) {
                console.log(`✅ ${postResult.message}`);
            } else {
                console.log(`\n❌ ERROR: Tweet could not be posted to Twitter`);
                console.log(`Error details: ${postResult.message}`);
                console.log('\nPossible solutions:');
                console.log('1. Check Twitter API credentials in .env file');
                console.log('2. Verify app permissions at developer.twitter.com');
                console.log('3. Ensure the Twitter account has write permissions');
                console.log('4. Check if the Twitter API service is currently available');
            }
            
            return postResult.success;
        } catch (contentError) {
            console.error('Error generating or posting content:', contentError);
            console.log('Unable to complete the tweet generation and posting process.');
            return false;
        }
    } catch (error) {
        console.error('Critical error in application initialization:', error);
        console.log('The application could not be initialized properly. Please check your configuration and try again.');
        return false;
    }
}

// Function to calculate milliseconds until next scheduled time
function getMillisecondsUntilTime(hour: number, minute: number = 0): number {
    const now = new Date();
    const targetTime = new Date(now);
    
    targetTime.setHours(hour, minute, 0, 0);
    
    // If the target time has already passed today, schedule for tomorrow
    if (now > targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
    }
    
    return targetTime.getTime() - now.getTime();
}

// Function to schedule the next tweet (only 1:00 PM image tweet)
function scheduleNextTweet() {
    const afternoonHour = 13; // 1:00 PM
    
    const msUntilNextTweet = getMillisecondsUntilTime(afternoonHour);
    const hoursUntilNextTweet = Math.floor(msUntilNextTweet / (1000 * 60 * 60));
    const minutesUntilNextTweet = Math.floor((msUntilNextTweet % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`Next image tweet scheduled in ${hoursUntilNextTweet} hours and ${minutesUntilNextTweet} minutes at ${afternoonHour}:00`);
    
    return setTimeout(async () => {
        console.log(`It's time to post a scheduled image tweet!`);
        
        // Post an image tweet
        const imageTweetService = ImageTweetService.getInstance();
        await imageTweetService.generateAndPostImageTweet();
        
        // Schedule the next tweet after this one completes
        scheduleNextTweet();
    }, msUntilNextTweet);
}

// Main function to start the application
async function main() {
    console.log('Starting Marvin AI Agent with scheduled posting...');
    console.log('Image tweets will be posted daily at 1:00 PM');
    
    // Start the web server
    startWebServer();
    console.log('Web interface is available for testing tweets');
    
    // Start the engagement scheduler
    engagementScheduler.start();
    console.log('Engagement monitoring and response system activated');
    
    // Start the blog post scheduler if enabled
    if (config.blogPostScheduler?.enabled) {
        const { blogPostScheduler } = require('./blog-post-scheduler');
        blogPostScheduler.start();
        console.log('Blog post scheduler activated');
    }
    
    // Schedule the first tweet
    scheduleNextTweet();
    
    // Keep the process running
    process.on('SIGINT', () => {
        console.log('Received SIGINT. Gracefully shutting down...');
        process.exit(0);
    });
    
    console.log('Marvin AI Agent is now running in the background');
}

// Run the main function
main().catch(error => {
    console.error('Fatal error in main process:', error);
    process.exit(1);
});
