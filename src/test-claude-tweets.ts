import { ContentGenerator } from '../services/content/ContentGenerator';
import { GrokService } from '../services/grok/GrokService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to verify Claude is being used for all tweet generation
 */
async function testClaudeTweets() {
    console.log('Starting Claude tweet generation test...');
    
    try {
        // Test regular tweet generation
        console.log('\n--- Testing Regular Tweet Generation ---');
        const contentGenerator = ContentGenerator.getInstance();
        const regularTweet = await contentGenerator.generateTweet('Technology');
        console.log('Generated regular tweet:');
        console.log(regularTweet.text);
        
        // Test Grok fallback
        console.log('\n--- Testing Grok Fallback (should use Claude) ---');
        const grokService = GrokService.getInstance();
        const grokTweet = await grokService.generateHumorousReply('Someone just liked your tweet about AI. Write a thank you tweet.');
        console.log('Generated tweet via Grok fallback:');
        console.log(grokTweet);
        
        console.log('\nAll tests completed successfully');
    } catch (error) {
        console.error('Error in Claude tweet test:', error);
    }
}

// Run the test
testClaudeTweets().catch(console.error);
