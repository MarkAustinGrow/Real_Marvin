import { TwitterService } from '../services/twitter/TwitterService';
import { ContentGenerator } from '../services/content/ContentGenerator';

async function main() {
    try {
        // Initialize services
        const twitterService = TwitterService.getInstance();
        const contentGenerator = ContentGenerator.getInstance();
        
        console.log('Initializing content generator...');
        await contentGenerator.initialize();

        // Generate a tweet based on a category
        const categories = [
            'Drip Drop',
            'Toolbox',
            'Neural Notes',
            'Field Notes',
            'Push Lab',
            'News'
        ];
        
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
        } catch (contentError) {
            console.error('Error generating or posting content:', contentError);
            console.log('Unable to complete the tweet generation and posting process.');
        }
    } catch (error) {
        console.error('Critical error in application initialization:', error);
        console.log('The application could not be initialized properly. Please check your configuration and try again.');
    }
}

// Run the main function
main();
