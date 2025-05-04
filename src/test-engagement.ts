import { TwitterService } from '../services/twitter/TwitterService';
import { EngagementService } from '../services/engagement/EngagementService';
import { GrokService } from '../services/grok/GrokService';

/**
 * Test script for the engagement system
 * This script demonstrates the engagement monitoring and response features
 */
async function testEngagement() {
    try {
        console.log('Starting engagement system test...');
        
        // Initialize services
        const twitterService = TwitterService.getInstance();
        const engagementService = EngagementService.getInstance();
        const grokService = GrokService.getInstance();
        
        console.log('Services initialized successfully');
        
        // Test 1: Monitor engagements for a specific tweet
        console.log('\n--- Test 1: Monitor engagements for a specific tweet ---');
        
        // You can replace this with an actual tweet ID from your account
        const tweetId = process.argv[2] || 'REPLACE_WITH_ACTUAL_TWEET_ID';
        
        if (tweetId === 'REPLACE_WITH_ACTUAL_TWEET_ID') {
            console.log('No tweet ID provided. Please provide a tweet ID as a command line argument.');
            console.log('Usage: npm run test-engagement <tweet_id>');
            return;
        }
        
        console.log(`Monitoring engagements for tweet ID: ${tweetId}`);
        await twitterService.monitorEngagements(tweetId);
        
        // Test 2: Generate a humorous reply with Grok
        console.log('\n--- Test 2: Generate a humorous reply with Grok ---');
        const testContext = '@TestUser just liked a tweet that says: "Neon whispers, binary beats 🎧 Glitched graffiti...". Write a clever, funny thank-you tweet or reaction. Keep it short.';
        
        console.log('Generating humorous reply with context:', testContext);
        const reply = await grokService.generateHumorousReply(testContext);
        
        console.log('Generated reply:', reply);
        
        // Test 3: Detect recurring fans
        console.log('\n--- Test 3: Detect recurring fans ---');
        const recurringFans = await engagementService.detectRecurringFans(2, 30); // Lower threshold for testing
        
        console.log(`Found ${recurringFans.length} recurring fans:`);
        console.log(JSON.stringify(recurringFans, null, 2));
        
        // Test 4: Generate daily wrap-up
        console.log('\n--- Test 4: Generate daily wrap-up ---');
        const wrapup = await engagementService.generateDailyWrapup();
        
        console.log('Daily wrap-up:', wrapup);
        
        // Test 5: Simulate an engagement and response
        console.log('\n--- Test 5: Simulate an engagement and response ---');
        
        // Create a mock engagement
        const mockEngagement = {
            user_id: '12345',
            username: 'test_user',
            engagement_type: 'like' as const,
            tweet_id: tweetId,
            tweet_content: 'This is a test tweet for engagement simulation'
        };
        
        console.log('Logging mock engagement:', mockEngagement);
        await engagementService.logEngagement(mockEngagement);
        
        console.log('Engagement test completed successfully');
    } catch (error) {
        console.error('Error in engagement test:', error);
    }
}

// Run the test
testEngagement().catch(console.error);
